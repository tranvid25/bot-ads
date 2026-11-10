import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare, Response } from "miniflare";
import { dispatchMarketing } from "../apps/api/services/marketing-publisher.mjs";
import {
  seal,
  unseal,
  credentialContext,
} from "../apps/api/services/marketing-vault.mjs";
import {
  validateMarketingPost,
  validateBrand,
  utmUrl,
} from "../packages/contracts/marketing.mjs";
import { publishToProvider } from "../apps/api/services/marketing-providers.mjs";
const base = "https://bot.salesora.space";
const config = {
  AUTH_SECRET: "test-auth-secret-with-at-least-thirty-two-characters",
  TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  PUBLIC_APP_URL: base,
  ALLOW_REGISTRATION: "true",
  LINKEDIN_CLIENT_ID: "app-id",
  LINKEDIN_CLIENT_SECRET: "app-secret",
  LINKEDIN_API_VERSION: "202610",
};
let mf,
  db,
  env,
  counter = 0,
  mode = "success",
  sent = [],
  actorCounter = 0;
const actors = new Map();
async function provider(request) {
  const url = new URL(typeof request === "string" ? request : request.url);
  const req = typeof request === "string" ? new Request(request) : request;
  if (url.pathname === "/api/users/me") {
    const key = req.headers.get("api-key");
    if (!actors.has(key)) actors.set(key, ++actorCounter);
    return Response.json({
      id: actors.get(key),
      username: "tester",
      name: "DEV tester",
    });
  }
  if (url.pathname === "/oauth/v2/accessToken")
    return Response.json({
      access_token: "linkedin-access-token",
      expires_in: 3600,
      scope: "openid profile w_member_social",
    });
  if (url.pathname === "/v2/userinfo")
    return Response.json({ sub: "member123", name: "LinkedIn Tester" });
  if (url.pathname === "/rest/images")
    return Response.json({
      value: {
        uploadUrl:
          mode === "evil-upload"
            ? "https://attacker.example/upload"
            : "https://www.linkedin.com/upload-image",
        image: "urn:li:image:123",
      },
    });
  if (url.pathname === "/upload-image")
    return new Response(null, { status: 201 });
  if (url.pathname === "/api/articles" || url.pathname === "/rest/posts") {
    sent.push({
      url: url.href,
      body: await req.json(),
      headers: Object.fromEntries(req.headers),
    });
    if (mode === "lost-response")
      throw new Error("Transport lost after remote accepted the post");
    if (mode === "rate")
      return Response.json(
        { error: "do not expose token" },
        { status: 429, headers: { "Retry-After": "120" } },
      );
    if (mode === "forbidden") return new Response(null, { status: 403 });
    if (mode === "unauthorized") return new Response(null, { status: 401 });
    if (mode === "missing-id") return Response.json({});
    if (url.pathname === "/rest/posts")
      return new Response(null, {
        status: 201,
        headers: { "x-restli-id": "urn:li:share:123456" },
      });
    return Response.json(
      { id: sent.length, url: `https://dev.to/tester/post-${sent.length}` },
      { status: 201 },
    );
  }
  throw new Error(`Unexpected external request: ${url.origin}${url.pathname}`);
}
const providerBinding = {
  fetch: (url, init) => provider(new Request(url, init)),
};
async function req(
  path,
  { cookie, method = "GET", data, headers = {}, raw } = {},
) {
  const response = await mf.dispatchFetch(base + "/api" + path, {
    method,
    redirect: "manual",
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(method !== "GET" ? { Origin: base } : {}),
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: raw || (data ? JSON.stringify(data) : undefined),
  });
  const result = await response
    .clone()
    .json()
    .catch(() => null);
  return {
    status: response.status,
    data: result,
    headers: response.headers,
    response,
  };
}
async function customer() {
  const n = ++counter;
  const result = await req("/auth/register", {
    method: "POST",
    headers: { "CF-Connecting-IP": `192.0.2.${n}` },
    data: {
      name: `Owner ${n}`,
      email: `owner${n}@example.com`,
      password: "test-only-password-12345",
    },
  });
  assert.equal(result.status, 200);
  const cookie = result.headers.get("set-cookie").split(";")[0];
  const brand = await req("/marketing/brands", {
    method: "POST",
    cookie,
    data: {
      name: `Brand ${n}`,
      website: "https://xaywebsite.com",
      audience: "US small business",
      language: "en",
    },
  });
  assert.equal(brand.status, 200);
  return { cookie, brandId: brand.data.id };
}
async function channel(customer, platform = "dev", key) {
  const result = await req(
    `/marketing/channels/${platform === "dev" ? "dev" : "manual"}`,
    {
      cookie: customer.cookie,
      method: "POST",
      data: {
        brandId: customer.brandId,
        provider: platform,
        name: "My account",
        apiKey: key || `dev-secret-${counter}`,
      },
    },
  );
  assert.equal(result.status, 200, JSON.stringify(result.data));
  return result.data.id;
}
async function post(customer, platform = "dev", extra = {}) {
  const result = await req("/marketing/posts", {
    cookie: customer.cookie,
    method: "POST",
    data: {
      brandId: customer.brandId,
      title: "A useful article",
      sourceUrl: "https://xaywebsite.com/resources/test",
      variants: [
        {
          provider: platform,
          title: "Exact title",
          content: "  Exact manual text\nhttps://xaywebsite.com\n",
          tags: [],
          ...extra,
        },
      ],
    },
  });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  return result.data.id;
}
async function schedule(customer, postId, channelId) {
  const approved = await req(`/marketing/posts/${postId}/approve`, {
    cookie: customer.cookie,
    method: "POST",
    data: { revision: 1 },
  });
  assert.equal(approved.status, 200);
  const at = new Date(Date.now() - 1000).toISOString();
  const result = await req(`/marketing/posts/${postId}/schedule`, {
    cookie: customer.cookie,
    method: "POST",
    data: { revision: 1, channelIds: [channelId], scheduledAt: at },
  });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  return result.data.publications[0].id;
}
async function publication(id) {
  return db
    .prepare("SELECT * FROM marketing_publications WHERE id=?")
    .bind(id)
    .first();
}
async function pump(id) {
  const p = await publication(id);
  return dispatchMarketing(env, { workspaceId: p.workspace_id });
}
before(async () => {
  mf = new Miniflare({
    modules: true,
    scriptPath: "apps/api/worker.mjs",
    modulesRules: [{ type: "ESModule", include: ["**/*.mjs"] }],
    compatibilityDate: "2025-09-01",
    d1Databases: ["DB"],
    r2Buckets: ["MEDIA"],
    bindings: config,
    serviceBindings: { PROVIDER_HTTP: provider },
  });
  db = await mf.getD1Database("DB");
  for (const file of ["0001_init.sql", "0002_marketing.sql"]) {
    const sql = await readFile(`apps/api/migrations/${file}`, "utf8");
    await db.batch(
      sql
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => db.prepare(s)),
    );
  }
  env = {
    ...config,
    DB: db,
    MEDIA: await mf.getR2Bucket("MEDIA"),
    PROVIDER_HTTP: providerBinding,
  };
});
after(async () => {
  await mf?.dispose();
});

test("manual content is preserved and invalid channels, unsafe URLs, tags and image consent are rejected", () => {
  const content = "  Keep this exactly\n\n";
  const valid = { title: "Title", variants: [{ provider: "dev", content }] };
  assert.equal(validateMarketingPost(valid).variants[0].content, content);
  assert.throws(() =>
    validateMarketingPost({
      ...valid,
      variants: [{ provider: "dev", content, assetId: "asset" }],
    }),
  );
  assert.throws(() =>
    validateMarketingPost({
      ...valid,
      variants: [{ provider: "linkedin", content: "a".repeat(3001) }],
    }),
  );
  assert.throws(() =>
    validateMarketingPost({
      ...valid,
      variants: [{ provider: "dev", content, tags: ["not-a-valid-tag"] }],
    }),
  );
  assert.throws(() =>
    validateBrand({ name: "Test", website: "javascript:alert(1)" }),
  );
  const link = new URL(
    utmUrl("https://xaywebsite.com?existing=1", "linkedin", "launch"),
  );
  assert.equal(link.searchParams.get("utm_source"), "linkedin");
  assert.equal(link.searchParams.get("existing"), "1");
});
test("AES-GCM credentials are tenant-bound and previous key can decrypt during rotation", async () => {
  const sealed = await seal(config, "owner-a:dev:account", {
    apiKey: "top-secret",
  });
  assert.equal(sealed.includes("top-secret"), false);
  assert.deepEqual(await unseal(config, "owner-a:dev:account", sealed), {
    apiKey: "top-secret",
  });
  await assert.rejects(() => unseal(config, "owner-b:dev:account", sealed));
  const rotated = {
    ...config,
    TOKEN_KEY_VERSION: "v2",
    TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 8).toString("base64"),
    TOKEN_KEY_VERSION_PREVIOUS: "v1",
    TOKEN_ENCRYPTION_KEY_PREVIOUS: config.TOKEN_ENCRYPTION_KEY,
  };
  assert.deepEqual(await unseal(rotated, "owner-a:dev:account", sealed), {
    apiKey: "top-secret",
  });
});
test("brand, account, content, schedule and metrics are isolated between customers", async () => {
  const a = await customer(),
    b = await customer();
  const ch = await channel(a, "medium"),
    pid = await post(a, "medium");
  assert.equal(
    (
      await req("/marketing/posts", {
        cookie: b.cookie,
        method: "POST",
        data: {
          brandId: a.brandId,
          title: "Steal",
          variants: [{ provider: "medium", content: "test" }],
        },
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await req(`/marketing/posts/${pid}/approve`, {
        cookie: b.cookie,
        method: "POST",
        data: { revision: 1 },
      })
    ).status,
    404,
  );
  const pub = await schedule(a, pid, ch);
  assert.equal(
    (
      await req(`/marketing/publications/${pub}/confirm`, {
        cookie: b.cookie,
        method: "POST",
        data: { permalink: "https://medium.com/@tester/post" },
      })
    ).status,
    404,
  );
  const dashboard = await req("/marketing", { cookie: b.cookie });
  assert.equal(dashboard.data.posts.length, 0);
  assert.equal(dashboard.data.publications.length, 0);
});
test("manual publication only becomes user-reported after a platform permalink is supplied", async () => {
  const a = await customer(),
    ch = await channel(a, "medium"),
    pid = await post(a, "medium"),
    pub = await schedule(a, pid, ch);
  assert.equal((await publication(pub)).status, "awaiting_manual");
  assert.equal(
    (
      await req(`/marketing/publications/${pub}/confirm`, {
        cookie: a.cookie,
        method: "POST",
        data: { permalink: "https://evil.example/post" },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await req(`/marketing/publications/${pub}/confirm`, {
        cookie: a.cookie,
        method: "POST",
        data: { permalink: "https://medium.com/@tester/post" },
      })
    ).status,
    200,
  );
  assert.equal((await publication(pub)).status, "user_reported_published");
  assert.equal(
    (
      await req(`/marketing/publications/${pub}/metrics`, {
        cookie: a.cookie,
        method: "POST",
        data: { visits: 7, leads: 2, note: "GA4, one week" },
      })
    ).status,
    200,
  );
  assert.equal(
    (await req("/marketing", { cookie: a.cookie })).data.publications[0].leads,
    2,
  );
});
test("DEV credentials never leave the server and duplicate queue execution submits once", async () => {
  mode = "success";
  sent = [];
  const a = await customer(),
    ch = await channel(a),
    pid = await post(a),
    pub = await schedule(a, pid, ch);
  const account = await db
    .prepare("SELECT * FROM marketing_channels WHERE id=?")
    .bind(ch)
    .first();
  assert.equal(account.credential.includes(`dev-secret-${counter}`), false);
  const dashboard = await req("/marketing", { cookie: a.cookie });
  assert.equal(
    JSON.stringify(dashboard.data).includes(account.credential),
    false,
  );
  const p = await publication(pub);
  await Promise.all([
    dispatchMarketing(env, { workspaceId: p.workspace_id }),
    dispatchMarketing(env, { workspaceId: p.workspace_id }),
  ]);
  assert.equal(sent.length, 1);
  assert.equal(
    sent[0].body.article.body_markdown,
    "  Exact manual text\nhttps://xaywebsite.com\n",
  );
  assert.equal((await publication(pub)).status, "published");
  await pump(pub);
  assert.equal(sent.length, 1);
});
test("editing requires reapproval and cannot alter a previously scheduled snapshot", async () => {
  const a = await customer(),
    ch = await channel(a, "reddit"),
    pid = await post(a, "reddit"),
    pub = await schedule(a, pid, ch);
  const data = {
    brandId: a.brandId,
    revision: 1,
    title: "Edited",
    variants: [{ provider: "reddit", content: "New content" }],
  };
  assert.equal(
    (
      await req(`/marketing/posts/${pid}`, {
        cookie: a.cookie,
        method: "PUT",
        data,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await req(`/marketing/posts/${pid}`, {
        cookie: a.cookie,
        method: "PUT",
        data,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await req(`/marketing/posts/${pid}/approve`, {
        cookie: a.cookie,
        method: "POST",
        data: { revision: 1 },
      })
    ).status,
    409,
  );
  assert.equal(
    JSON.parse((await publication(pub)).snapshot).content,
    "  Exact manual text\nhttps://xaywebsite.com\n",
  );
});
test("ambiguous provider responses are not retried and cannot be rescheduled to bypass protection", async () => {
  mode = "missing-id";
  sent = [];
  const a = await customer(),
    ch = await channel(a),
    pid = await post(a),
    pub = await schedule(a, pid, ch);
  await pump(pub);
  assert.equal((await publication(pub)).status, "unknown");
  assert.equal(
    (
      await req(`/marketing/publications/${pub}/retry`, {
        cookie: a.cookie,
        method: "POST",
        data: {},
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await req(`/marketing/posts/${pid}/schedule`, {
        cookie: a.cookie,
        method: "POST",
        data: {
          revision: 1,
          channelIds: [ch],
          scheduledAt: new Date(Date.now() + 3600000).toISOString(),
        },
      })
    ).status,
    409,
  );
  await pump(pub);
  assert.equal(sent.length, 1);
  mode = "success";
});
test("429 waits and 401 requests reconnection rather than retrying indefinitely", async () => {
  mode = "rate";
  const a = await customer(),
    ch = await channel(a),
    pid = await post(a),
    pub = await schedule(a, pid, ch);
  await pump(pub);
  assert.equal((await publication(pub)).status, "retry_wait");
  assert.ok((await publication(pub)).scheduled_at >= Date.now() + 100000);
  await db
    .prepare(
      "UPDATE marketing_account_slots SET until_at=0 WHERE owner_token=(SELECT claim_token FROM marketing_publications WHERE id=?)",
    )
    .bind(pub)
    .run();
  await db
    .prepare("UPDATE marketing_publications SET scheduled_at=0 WHERE id=?")
    .bind(pub)
    .run();
  mode = "unauthorized";
  await pump(pub);
  assert.equal((await publication(pub)).status, "needs_reauth");
  assert.equal(
    (await req("/marketing", { cookie: a.cookie })).data.channels[0].status,
    "needs_reauth",
  );
  mode = "success";
});
test("disconnect cancels queued publications and removes encrypted credentials", async () => {
  const a = await customer(),
    ch = await channel(a),
    pid = await post(a),
    pub = await schedule(a, pid, ch);
  assert.equal(
    (
      await req(`/marketing/channels/${ch}`, {
        cookie: a.cookie,
        method: "DELETE",
      })
    ).status,
    200,
  );
  assert.equal((await publication(pub)).status, "canceled");
  assert.equal(
    (
      await db
        .prepare("SELECT credential FROM marketing_channels WHERE id=?")
        .bind(ch)
        .first()
    ).credential,
    null,
  );
  sent = [];
  await pump(pub);
  assert.equal(sent.length, 0);
});
test("OAuth state is browser-bound, single-use and works without the Strict session cookie on callback", async () => {
  mode = "success";
  const a = await customer();
  const start = await req("/marketing/linkedin/start", {
    cookie: a.cookie,
    method: "POST",
    data: { brandId: a.brandId },
  });
  assert.equal(start.status, 200);
  assert.match(start.headers.get("set-cookie"), /SameSite=Lax/);
  const state = new URL(start.data.url).searchParams.get("state");
  const path = `/marketing/linkedin/callback?state=${state}&code=code-123`;
  assert.equal((await req(path, { cookie: "botads_oauth=wrong" })).status, 403);
  const callback = await req(path, {
    cookie: start.headers.get("set-cookie").split(";")[0],
  });
  assert.equal(callback.status, 303);
  assert.equal(callback.headers.get("location"), `${base}/?linkedin=connected`);
  assert.equal(
    (await req(path, { cookie: start.headers.get("set-cookie").split(";")[0] }))
      .status,
    403,
  );
  const dashboard = await req("/marketing", { cookie: a.cookie });
  assert.equal(dashboard.data.channels[0].actor_id, "urn:li:person:member123");
  assert.equal(
    JSON.stringify(dashboard.data).includes("linkedin-access-token"),
    false,
  );
  const pid = await post(a, "linkedin"),
    pub = await schedule(a, pid, dashboard.data.channels[0].id);
  sent = [];
  await pump(pub);
  assert.equal((await publication(pub)).status, "published");
  assert.equal(sent[0].body.author, "urn:li:person:member123");
  assert.equal(sent[0].headers["linkedin-version"], "202610");
});
test("approved image is copied to public media without exposing the private asset URL", async () => {
  const a = await customer(),
    ch = await channel(a);
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const image = await req("/assets", {
    cookie: a.cookie,
    method: "POST",
    raw: bytes,
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(bytes.length),
      "X-File-Name": "test.png",
    },
  });
  assert.equal(image.status, 200);
  const pid = await post(a, "dev", {
      assetId: image.data.id,
      publicImageConsent: true,
    }),
    pub = await schedule(a, pid, ch);
  assert.equal((await req(`/assets/${image.data.id}`)).status, 401);
  sent = [];
  await pump(pub);
  const publicUrl = sent[0].body.article.main_image;
  assert.ok(publicUrl.startsWith(`${base}/api/marketing/media/`));
  const media = await req(publicUrl.slice(base.length + 4));
  assert.equal(media.status, 200);
  assert.equal(media.headers.get("content-type"), "image/png");
});
test("a lost lease before submit is recoverable; a lost lease after submit remains unknown", async () => {
  const a = await customer(),
    ch = await channel(a),
    pid = await post(a),
    pub = await schedule(a, pid, ch);
  await db
    .prepare(
      "UPDATE marketing_publications SET status='publishing',claim_token='dead',lease_until=0,submit_started_at=1 WHERE id=?",
    )
    .bind(pub)
    .run();
  sent = [];
  await pump(pub);
  assert.equal((await publication(pub)).status, "unknown");
  assert.equal(sent.length, 0);
  const pid2 = await post(a),
    pub2 = await schedule(a, pid2, ch);
  await db
    .prepare(
      "UPDATE marketing_publications SET status='publishing',claim_token='dead',lease_until=0 WHERE id=?",
    )
    .bind(pub2)
    .run();
  await pump(pub2);
  assert.equal((await publication(pub2)).status, "published");
});
test("a transport loss after provider acceptance is held as unknown", async () => {
  mode = "lost-response";
  sent = [];
  const a = await customer(),
    ch = await channel(a),
    pid = await post(a),
    pub = await schedule(a, pid, ch);
  await pump(pub);
  assert.equal((await publication(pub)).status, "unknown");
  await pump(pub);
  assert.equal(sent.length, 1);
  const insufficient = await req(`/marketing/publications/${pub}/not-posted`, {
    cookie: a.cookie,
    method: "POST",
    data: { checked: false, note: "not verified yet" },
  });
  assert.equal(insufficient.status, 400);
  const verified = await req(`/marketing/publications/${pub}/not-posted`, {
    cookie: a.cookie,
    method: "POST",
    data: {
      checked: true,
      note: "Checked account directly; this is an isolated test fixture.",
    },
  });
  assert.equal(verified.status, 200);
  assert.equal((await publication(pub)).status, "failed");
  mode = "success";
});
test("daily quota is enforced across multiple publications without sending the extra post", async () => {
  sent = [];
  const a = await customer(),
    ch = await channel(a);
  assert.equal(
    (
      await req("/settings", {
        cookie: a.cookie,
        method: "PUT",
        data: { dailyLimit: 1 },
      })
    ).status,
    200,
  );
  const p1 = await schedule(a, await post(a), ch),
    p2 = await schedule(a, await post(a), ch);
  await pump(p1);
  await db
    .prepare(
      "UPDATE marketing_account_slots SET until_at=0 WHERE owner_token IN (SELECT claim_token FROM marketing_publications WHERE id IN (?,?))",
    )
    .bind(p1, p2)
    .run();
  await db
    .prepare(
      "UPDATE marketing_publications SET scheduled_at=0 WHERE id IN (?,?) AND status='retry_wait'",
    )
    .bind(p1, p2)
    .run();
  await pump(p2);
  const outcomes = [
    (await publication(p1)).status,
    (await publication(p2)).status,
  ].sort();
  assert.deepEqual(outcomes, ["failed", "published"]);
  assert.equal(sent.length, 1);
});
test("the same remote account in different workspaces shares a sending cooldown", async () => {
  sent = [];
  const a = await customer(),
    b = await customer();
  const ca = await channel(a, "dev", "shared-key-only-in-test"),
    cb = await channel(b, "dev", "shared-key-only-in-test");
  const pa = await schedule(a, await post(a), ca),
    pb = await schedule(b, await post(b), cb);
  await pump(pa);
  await pump(pb);
  assert.equal((await publication(pa)).status, "published");
  assert.equal((await publication(pb)).status, "retry_wait");
  assert.equal(sent.length, 1);
});
test("LinkedIn upload cannot leak bearer credentials to an unexpected host", async () => {
  mode = "evil-upload";
  sent = [];
  let started = false;
  await assert.rejects(
    () =>
      publishToProvider(
        env,
        { provider: "linkedin", actor_id: "urn:li:person:test" },
        { accessToken: "never-send-to-attacker" },
        { title: "Picture", content: "Safe content" },
        {
          image: { mime: "image/png", bytes: new Uint8Array([1]) },
          beforeSubmit: async () => {
            started = true;
          },
        },
      ),
    /đường dẫn tải ảnh không hợp lệ/,
  );
  assert.equal(started, false);
  assert.equal(sent.length, 0);
  mode = "success";
});
