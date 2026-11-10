import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare } from "miniflare";
import { cleanupSupport } from "../apps/api/controllers/support.controller.mjs";
import { LEGAL_PATHS, renderLegalPage } from "../apps/web/legal/pages.mjs";
let mf,
  db,
  sequence = 0;
const base = "https://bot.salesora.space";
const valid = {
  name: "Customer",
  email: "customer@example.com",
  category: "deletion",
  message: "Please review removal of my connected account data.",
  acknowledged: true,
};
async function request(
  path,
  { method = "GET", data, cookie, origin = base, ip } = {},
) {
  const response = await mf.dispatchFetch(base + "/api" + path, {
    method,
    headers: {
      ...(method !== "GET" ? { Origin: origin } : {}),
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      "CF-Connecting-IP": ip || `test-ip-${++sequence}`,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  return {
    status: response.status,
    data: await response.json(),
    headers: response.headers,
  };
}
async function owner() {
  const registered = await request("/auth/register", {
    method: "POST",
    data: {
      name: "Owner",
      email: `owner-${++sequence}@example.com`,
      password: "test-only-password-12345",
    },
  });
  assert.equal(registered.status, 200);
  return registered.headers.get("set-cookie").split(";")[0];
}
before(async () => {
  mf = new Miniflare({
    modules: true,
    scriptPath: "apps/api/worker.mjs",
    modulesRules: [{ type: "ESModule", include: ["**/*.mjs"] }],
    compatibilityDate: "2025-09-01",
    d1Databases: ["DB"],
    r2Buckets: ["MEDIA"],
    bindings: {
      AUTH_SECRET: "support-test-secret-at-least-thirty-two-characters",
      ALLOW_REGISTRATION: "true",
    },
  });
  db = await mf.getD1Database("DB");
  for (const file of ["0001_init.sql", "0003_support.sql"]) {
    const schema = await readFile(`apps/api/migrations/${file}`, "utf8");
    await db.batch(
      schema
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => db.prepare(s)),
    );
  }
});
after(async () => {
  await mf?.dispose();
});

test("all policy pages contain readable public HTML, operator and contact links without JavaScript", () => {
  for (const route of LEGAL_PATHS) {
    const html = renderLegalPage(route);
    assert.ok(html.includes("XayWebsite"));
    assert.ok(html.includes('<main id="main">'));
    assert.ok(html.includes("href='/support'"));
    assert.equal(html.includes('id="root"'), false);
    assert.equal(renderLegalPage(route + ".html"), html);
    assert.equal(renderLegalPage(route + "/"), html);
  }
  assert.equal(renderLegalPage("/privacy").includes('src="/legal.js"'), false);
  assert.equal(renderLegalPage("/unknown"), null);
});
test("a public deletion request creates a receipt and never automatically deletes account data", async () => {
  const cookie = await owner();
  const countBefore = (
    await db.prepare("SELECT count(*) AS n FROM users").first()
  ).n;
  const result = await request("/support/requests", {
    method: "POST",
    data: { ...valid, workspaceId: "someone-else" },
  });
  assert.equal(result.status, 201);
  assert.equal(result.data.status, "open");
  const ticket = await db
    .prepare("SELECT * FROM support_requests WHERE id=?")
    .bind(result.data.id)
    .first();
  assert.equal(ticket.workspace_id, null);
  assert.equal(ticket.policy_version, "2026-11-10");
  assert.equal(
    (await db.prepare("SELECT count(*) AS n FROM users").first()).n,
    countBefore,
  );
  assert.equal(
    (await request("/support/requests", { cookie })).data.requests.length,
    0,
  );
});
test("only an authenticated owner can read their linked tickets, with no access by another customer", async () => {
  const a = await owner(),
    b = await owner();
  const ticket = await request("/support/requests", {
    method: "POST",
    cookie: a,
    data: valid,
  });
  assert.equal(ticket.status, 201);
  assert.equal(
    (await request("/support/requests", { cookie: a })).data.requests[0].id,
    ticket.data.id,
  );
  assert.equal(
    (await request("/support/requests", { cookie: b })).data.requests.length,
    0,
  );
  assert.equal((await request("/support/requests")).status, 401);
});
test("support rejects CSRF, missing acknowledgement, invalid email and invalid category", async () => {
  assert.equal(
    (
      await request("/support/requests", {
        method: "POST",
        origin: "https://attacker.example",
        data: valid,
      })
    ).status,
    403,
  );
  for (const invalid of [
    { acknowledged: false },
    { email: "invalid" },
    { category: "erase-now" },
    { message: "short" },
  ]) {
    assert.equal(
      (
        await request("/support/requests", {
          method: "POST",
          data: { ...valid, ...invalid },
        })
      ).status,
      400,
    );
  }
});
test("anonymous support intake is rate-limited", async () => {
  for (let n = 0; n < 8; n++)
    assert.equal(
      (
        await request("/support/requests", {
          method: "POST",
          ip: "rate-test",
          data: valid,
        })
      ).status,
      201,
    );
  assert.equal(
    (
      await request("/support/requests", {
        method: "POST",
        ip: "rate-test",
        data: valid,
      })
    ).status,
    429,
  );
});
test("retention cleanup removes only closed requests older than 180 days", async () => {
  const create = async () =>
    (await request("/support/requests", { method: "POST", data: valid })).data
      .id;
  const oldClosed = await create(),
    oldOpen = await create(),
    recent = await create();
  await db
    .prepare(
      "UPDATE support_requests SET status='completed',closed_at=? WHERE id=?",
    )
    .bind(Date.now() - 181 * 86400000, oldClosed)
    .run();
  await db
    .prepare("UPDATE support_requests SET created_at=? WHERE id=?")
    .bind(Date.now() - 200 * 86400000, oldOpen)
    .run();
  await db
    .prepare(
      "UPDATE support_requests SET status='rejected',closed_at=? WHERE id=?",
    )
    .bind(Date.now(), recent)
    .run();
  await cleanupSupport({ DB: db });
  assert.equal(
    await db
      .prepare("SELECT id FROM support_requests WHERE id=?")
      .bind(oldClosed)
      .first(),
    null,
  );
  assert.ok(
    await db
      .prepare("SELECT id FROM support_requests WHERE id=?")
      .bind(oldOpen)
      .first(),
  );
  assert.ok(
    await db
      .prepare("SELECT id FROM support_requests WHERE id=?")
      .bind(recent)
      .first(),
  );
});
