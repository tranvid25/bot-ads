import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare } from "miniflare";
import { scheduled } from "../apps/api/services/jobs.service.mjs";
let mf, db, a, b, device, deviceId, job, campaignId, attemptId;
const base = "http://localhost";
async function request(
  path,
  {
    method = "GET",
    data,
    cookie,
    bearer,
    origin = base,
    headers = {},
    raw,
  } = {},
) {
  const response = await mf.dispatchFetch(base + "/api" + path, {
    method,
    headers: {
      ...(method !== "GET" ? { Origin: origin } : {}),
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(bearer ? { Authorization: "Bearer " + bearer } : {}),
      ...headers,
    },
    body: raw || (data ? JSON.stringify(data) : undefined),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    result = null;
  }
  return {
    status: response.status,
    data: result,
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
const input = {
  name: "Chiến dịch test",
  mode: "manual",
  keywords: ["english"],
  posts: [
    {
      id: "p1",
      title: "Bài test",
      content: "Nội dung khách tự soạn giữ nguyên.",
      selected: true,
    },
  ],
  dailyLimit: 50,
  cooldownDays: 7,
  enabled: false,
};
before(async () => {
  mf = new Miniflare({
    modules: true,
    scriptPath: "apps/api/worker.mjs",
    modulesRules: [{ type: "ESModule", include: ["**/*.mjs"] }],
    compatibilityDate: "2025-09-01",
    d1Databases: ["DB"],
    r2Buckets: ["MEDIA"],
    bindings: {
      AUTH_SECRET: "test-secret-at-least-32-characters-long",
      ALLOW_REGISTRATION: "true",
      MAX_DAILY_POSTS: "100",
    },
  });
  db = await mf.getD1Database("DB");
  const schema = await readFile("apps/api/migrations/0001_init.sql", "utf8");
  await db.batch(
    schema
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => db.prepare(s)),
  );
  a = await request("/auth/register", {
    method: "POST",
    data: {
      name: "Khách A",
      email: "a@example.com",
      password: "correct horse battery staple",
    },
  });
  b = await request("/auth/register", {
    method: "POST",
    data: {
      name: "Khách B",
      email: "b@example.com",
      password: "another password 1234",
    },
  });
});
after(async () => {
  await mf?.dispose();
});
test("register, login and logout use private HttpOnly sessions", async () => {
  assert.equal(a.status, 200);
  assert.ok(a.cookie);
  assert.equal(b.status, 200);
  const denied = await request("/dashboard");
  assert.equal(denied.status, 401);
  const wrong = await request("/auth/login", {
    method: "POST",
    data: { email: "a@example.com", password: "wrong password 12345" },
  });
  assert.equal(wrong.status, 401);
  const login = await request("/auth/login", {
    method: "POST",
    data: { email: "a@example.com", password: "correct horse battery staple" },
  });
  assert.equal(login.status, 200);
  await request("/auth/logout", {
    method: "POST",
    cookie: login.cookie,
    data: {},
  });
  assert.equal(
    (await request("/dashboard", { cookie: login.cookie })).status,
    401,
  );
});
test("CSRF and tenant boundaries protect campaign access", async () => {
  assert.equal(
    (
      await request("/settings", {
        method: "PUT",
        cookie: a.cookie,
        origin: "https://other.example",
        data: { dailyLimit: 50 },
      })
    ).status,
    403,
  );
  const created = await request("/campaigns", {
    method: "POST",
    cookie: a.cookie,
    data: input,
  });
  assert.equal(created.status, 200);
  campaignId = created.data.id;
  assert.equal(
    (
      await request("/campaigns/" + campaignId, {
        method: "PUT",
        cookie: b.cookie,
        data: input,
      })
    ).status,
    404,
  );
  assert.equal(
    (await request("/dashboard", { cookie: b.cookie })).data.campaigns.length,
    0,
  );
});
test("pairing is one-time and devices cannot access user APIs", async () => {
  const pair = await request("/pairings", {
    method: "POST",
    cookie: a.cookie,
    data: {},
  });
  assert.equal(pair.status, 200);
  const result = await request("/device/pair", {
    method: "POST",
    data: { code: pair.data.code, name: "Test PC" },
  });
  assert.equal(result.status, 200);
  device = result.data.token;
  deviceId = result.data.deviceId;
  assert.equal(
    (
      await request("/device/pair", {
        method: "POST",
        data: { code: pair.data.code },
      })
    ).status,
    400,
  );
  assert.equal((await request("/dashboard", { bearer: device })).status, 401);
  assert.equal(
    (await request("/pairings", { method: "POST", cookie: a.cookie, data: {} }))
      .status,
    409,
  );
});
test("manual jobs require a ready device and only one job can be claimed", async () => {
  const queued = await request(`/campaigns/${campaignId}/run`, {
    method: "POST",
    cookie: a.cookie,
    data: {},
  });
  assert.equal(queued.status, 200);
  assert.equal(
    (
      await request("/device/claim", {
        method: "POST",
        bearer: device,
        data: {},
      })
    ).data.job,
    null,
  );
  await request("/device/heartbeat", {
    method: "POST",
    bearer: device,
    data: { facebookReady: true },
  });
  const claim = await request("/device/claim", {
    method: "POST",
    bearer: device,
    data: {},
  });
  assert.equal(claim.status, 200);
  job = claim.data.job;
  assert.ok(job.id);
  assert.equal(
    (
      await request("/device/claim", {
        method: "POST",
        bearer: device,
        data: {},
      })
    ).data.job,
    null,
  );
});
test("atomic reservations enforce account daily limit and duplicate protection", async () => {
  await request("/settings", {
    method: "PUT",
    cookie: a.cookie,
    data: { dailyLimit: 2 },
  });
  const reserve = (group, attemptId = crypto.randomUUID()) =>
    request("/device/reserve", {
      method: "POST",
      bearer: device,
      data: {
        jobId: job.id,
        attemptId,
        groupUrl: `https://www.facebook.com/groups/${group}`,
        title: "Bài test",
      },
    });
  const id1 = crypto.randomUUID();
  attemptId = id1;
  assert.equal((await reserve("alpha", id1)).status, 200);
  assert.equal((await reserve("alpha")).status, 409);
  assert.equal((await reserve("beta")).status, 200);
  assert.equal((await reserve("gamma")).status, 409);
  assert.equal((await reserve("alpha", id1)).status, 409);
  const dashboard = await request("/dashboard", { cookie: a.cookie });
  assert.equal(dashboard.data.usage, 2);
  assert.equal(
    (await request("/dashboard", { cookie: b.cookie })).data.usage,
    0,
  );
});
test("cancel stops further reservations and heartbeats ask the agent to stop", async () => {
  await request(`/jobs/${job.id}/cancel`, {
    method: "POST",
    cookie: a.cookie,
    data: {},
  });
  const hb = await request("/device/heartbeat", {
    method: "POST",
    bearer: device,
    data: { jobId: job.id, facebookReady: true },
  });
  assert.equal(hb.data.stop, true);
  const reserve = await request("/device/reserve", {
    method: "POST",
    bearer: device,
    data: {
      jobId: job.id,
      attemptId: crypto.randomUUID(),
      groupUrl: "https://www.facebook.com/groups/delta",
    },
  });
  assert.equal(reserve.status, 409);
  await request("/device/report", {
    method: "POST",
    bearer: device,
    data: { jobId: job.id, finished: true, events: [] },
  });
  const dashboard = await request("/dashboard", { cookie: a.cookie });
  assert.equal(dashboard.data.jobs[0].status, "canceled");
});
test("assets are private and non-image uploads are rejected", async () => {
  const invalid = await request("/assets", {
    method: "POST",
    cookie: a.cookie,
    headers: { "content-type": "image/png", "content-length": "4" },
    raw: new Uint8Array([1, 2, 3, 4]),
  });
  assert.equal(invalid.status, 415);
  const image = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
    "base64",
  );
  const upload = await request("/assets", {
    method: "POST",
    cookie: a.cookie,
    headers: {
      "content-type": "image/png",
      "content-length": String(image.length),
      "x-file-name": "test.png",
    },
    raw: image,
  });
  assert.equal(upload.status, 200);
  assert.equal(
    (await request("/assets/" + upload.data.id, { cookie: b.cookie })).status,
    404,
  );
  assert.equal(
    (await request("/assets/" + upload.data.id, { cookie: a.cookie })).status,
    200,
  );
  assert.equal(
    (
      await request("/campaigns", {
        method: "POST",
        cookie: b.cookie,
        data: {
          ...input,
          posts: [{ content: "Bài", assetId: upload.data.id }],
        },
      })
    ).status,
    400,
  );
});
test("missing Gemini key gives actionable error, manual content remains available", async () => {
  const response = await request("/generate", {
    method: "POST",
    cookie: a.cookie,
    data: { prompt: "Viết bài" },
  });
  assert.equal(response.status, 503);
  assert.match(response.data.error, /tự soạn/);
});
test("device report updates attempt status, post permalinks, and comment outcomes", async () => {
  const permalink = "https://www.facebook.com/groups/alpha/posts/10001/";
  const report = await request("/device/report", {
    method: "POST",
    bearer: device,
    data: {
      jobId: job.id,
      attempts: [
        {
          id: attemptId,
          status: "success",
          postUrl: permalink,
          comment: { status: "confirmed" },
        },
      ],
      events: [{ id: crypto.randomUUID(), text: "Đã đăng bài thành công." }],
      finished: false,
    },
  });
  assert.equal(report.status, 200);
  const dashboard = await request("/dashboard", { cookie: a.cookie });
  const found = dashboard.data.attempts.find((att) => att.id === attemptId);
  assert.ok(found);
  assert.equal(found.status, "success");
  assert.equal(found.postUrl, permalink);
  assert.equal(found.comment?.status, "confirmed");
});
test("device revocation disconnects device and allows new pairing", async () => {
  assert.ok(deviceId);
  const revoke = await request(`/devices/${deviceId}`, {
    method: "DELETE",
    cookie: a.cookie,
  });
  assert.equal(revoke.status, 200);

  // Revoked device token is rejected with 401
  const hb = await request("/device/heartbeat", {
    method: "POST",
    bearer: device,
    data: { facebookReady: true },
  });
  assert.equal(hb.status, 401);

  // User can now generate a new pairing code
  const pairNew = await request("/pairings", {
    method: "POST",
    cookie: a.cookie,
    data: {},
  });
  assert.equal(pairNew.status, 200);
  assert.ok(pairNew.data.code);
});
test("scheduled cron triggers due campaigns, prevents duplicate slots, and expires stale leases", async () => {
  // Update campaign to be enabled with schedule at 09:00
  await request(`/campaigns/${campaignId}`, {
    method: "PUT",
    cookie: a.cookie,
    data: {
      ...input,
      time: "09:00",
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      enabled: true,
    },
  });

  // 09:05 in Asia/Ho_Chi_Minh is 02:05 UTC on 2026-10-17
  const testTime = new Date("2026-10-17T02:05:00Z");
  await scheduled({ DB: db }, testTime);

  const slotKey = `schedule:${campaignId}:2026-10-17`;
  const scheduledJob = await db
    .prepare("SELECT * FROM jobs WHERE slot=?")
    .bind(slotKey)
    .first();
  assert.ok(scheduledJob);
  assert.equal(scheduledJob.status, "queued");

  // Re-running scheduled at 09:10 (02:10 UTC) does not create duplicate jobs
  await scheduled({ DB: db }, new Date("2026-10-17T02:10:00Z"));
  const count = await db
    .prepare("SELECT count(*) as count FROM jobs WHERE slot=?")
    .bind(slotKey)
    .first();
  assert.equal(count.count, 1);

  // An interrupted job whose lease expired is marked needs_review (not blindly retried)
  const staleId = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO jobs(id,workspace_id,campaign_id,slot,snapshot,status,created_at,updated_at,lease_until) VALUES (?,?,?,?,?,'running',?,?,?)",
    )
    .bind(
      staleId,
      scheduledJob.workspace_id,
      campaignId,
      `manual:stale-${Date.now()}`,
      scheduledJob.snapshot,
      Date.now() - 100000,
      Date.now() - 100000,
      Date.now() - 10000,
    )
    .run();

  await scheduled({ DB: db }, new Date("2026-10-17T02:15:00Z"));
  const stale = await db
    .prepare("SELECT status FROM jobs WHERE id=?")
    .bind(staleId)
    .first();
  assert.equal(stale.status, "needs_review");
});

