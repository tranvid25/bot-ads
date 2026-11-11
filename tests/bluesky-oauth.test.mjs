import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare, Response } from "miniflare";
import { decodeProtectedHeader, importJWK, jwtVerify } from "jose";
import { testWorker } from "../scripts/test-worker.mjs";
import {
  blueskyClientMetadata,
  blueskyOAuthClientId,
} from "../apps/api/controllers/marketing.controller.mjs";

const base = "https://bot.salesora.space";
const config = {
  PUBLIC_APP_URL: base,
  AUTH_SECRET: "bluesky-test-secret-at-least-thirty-two-characters",
  TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 8).toString("base64"),
  ALLOW_REGISTRATION: "true",
};
let mf,
  db,
  cookie,
  brandId,
  mode = "success",
  par,
  calls = [];
async function req(
  path,
  { data, auth = cookie, method = data ? "POST" : "GET" } = {},
) {
  const response = await mf.dispatchFetch(base + path, {
    method,
    redirect: "manual",
    headers: {
      Origin: base,
      ...(auth ? { Cookie: auth } : {}),
      ...(data ? { "Content-Type": "application/json" } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  return {
    response,
    status: response.status,
    headers: response.headers,
    data: await response
      .clone()
      .json()
      .catch(() => null),
  };
}
async function start() {
  return req("/api/marketing/bluesky/start", { data: { brandId } });
}
async function proof(request) {
  const value = request.headers.get("dpop"),
    header = decodeProtectedHeader(value);
  const { payload } = await jwtVerify(
    value,
    await importJWK(header.jwk, "ES256"),
    { algorithms: ["ES256"] },
  );
  assert.equal(payload.htm, request.method);
  assert.equal(
    payload.htu,
    new URL(request.url).origin + new URL(request.url).pathname,
  );
  return payload;
}
before(async () => {
  mf = new Miniflare({
    ...(await testWorker()),
    compatibilityDate: "2025-09-01",
    d1Databases: ["DB"],
    r2Buckets: ["MEDIA"],
    bindings: config,
    serviceBindings: {
      PROVIDER_HTTP: async (request) => {
        const url = new URL(request.url);
        calls.push(url.pathname);
        const p = await proof(request);
        if (url.pathname === "/oauth/par") {
          if (mode === "redirect")
            return Response.json(
              {
                error: "invalid_redirect_uri",
                error_description: "provider-private-debug",
              },
              { status: 400 },
            );
          if (mode === "empty") return new Response(null, { status: 200 });
          const input = new URLSearchParams(await request.text());
          assert.equal(input.get("client_id"), base + "/client-metadata.json");
          assert.equal(
            input.get("redirect_uri"),
            base + "/api/marketing/bluesky/callback",
          );
          if (p.nonce !== "par-nonce")
            return Response.json(
              { error: "use_dpop_nonce" },
              { status: 400, headers: { "DPoP-Nonce": "par-nonce" } },
            );
          par = input;
          return Response.json(
            {
              request_uri: "urn:ietf:params:oauth:request_uri:fixture",
              expires_in: 90,
            },
            { status: 201 },
          );
        }
        if (url.pathname === "/oauth/token") {
          if (p.nonce !== "token-nonce")
            return Response.json(
              { error: "use_dpop_nonce" },
              { status: 400, headers: { "DPoP-Nonce": "token-nonce" } },
            );
          const input = new URLSearchParams(await request.text());
          const digest = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(input.get("code_verifier")),
          );
          assert.equal(
            Buffer.from(digest).toString("base64url"),
            par.get("code_challenge"),
          );
          return Response.json({
            access_token: "fixture-access",
            sub: "did:plc:blueskyfixture",
            token_type: "DPoP",
            expires_in: 3600,
          });
        }
        if (url.pathname === "/xrpc/app.bsky.actor.getProfile") {
          assert.equal(
            request.headers.get("Authorization"),
            "DPoP fixture-access",
          );
          assert.equal(
            p.ath,
            Buffer.from(
              await crypto.subtle.digest(
                "SHA-256",
                new TextEncoder().encode("fixture-access"),
              ),
            ).toString("base64url"),
          );
          return Response.json({
            did: "did:plc:blueskyfixture",
            handle: "fixture.bsky.social",
            displayName: "Bluesky Fixture",
          });
        }
        throw new Error("Unexpected outbound request");
      },
    },
  });
  db = await mf.getD1Database("DB");
  for (const name of [
    "0001_init.sql",
    "0002_marketing.sql",
    "0006_channel_avatar.sql",
  ]) {
    const sql = await readFile(`apps/api/migrations/${name}`, "utf8");
    await db.batch(
      sql
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => db.prepare(s)),
    );
  }
  const user = await req("/api/auth/register", {
    data: {
      name: "Bluesky Owner",
      email: "bluesky-fixture@example.com",
      password: "fixture-password-123456789",
    },
  });
  cookie = user.headers.get("set-cookie").split(";")[0];
  const brand = await req("/api/marketing/brands", {
    data: { name: "Test", website: "https://example.com", language: "en" },
  });
  brandId = brand.data.id;
});
after(async () => {
  await mf?.dispose();
});

test("production Bluesky metadata never mixes web HTTPS and native loopback redirects", async () => {
  const localClient = new URL(blueskyOAuthClientId("http://127.0.0.1:5173"));
  assert.equal(localClient.origin, "http://localhost");
  assert.equal(
    localClient.searchParams.get("redirect_uri"),
    "http://127.0.0.1:5173/api/marketing/bluesky/callback",
  );
  const staticMetadata = JSON.parse(
    await readFile("apps/web/public/client-metadata.json", "utf8"),
  );
  const dynamic = (await req("/client-metadata.json", { auth: "" })).data;
  for (const metadata of [
    staticMetadata,
    dynamic,
    blueskyClientMetadata(config),
  ]) {
    assert.equal(metadata.application_type, "web");
    assert.deepEqual(metadata.redirect_uris, [
      base + "/api/marketing/bluesky/callback",
    ]);
    assert.equal(metadata.client_id, base + "/client-metadata.json");
    assert.equal(metadata.dpop_bound_access_tokens, true);
  }
  const routes = JSON.parse(
    await readFile("apps/web/public/_routes.json", "utf8"),
  );
  assert.ok(routes.include.includes("/client-metadata.json"));
});
test("Bluesky OAuth succeeds with PKCE, DPoP nonce retry and token hash binding", async () => {
  const result = await start();
  assert.equal(result.status, 200, JSON.stringify(result.data));
  const browser = result.headers.get("set-cookie").split(";")[0];
  const path = `/api/marketing/bluesky/callback?state=${par.get("state")}&code=fixture&iss=https%3A%2F%2Fbsky.social`;
  const callback = await req(path, { auth: browser });
  assert.equal(callback.status, 303);
  assert.equal(callback.headers.get("location"), base + "/?bluesky=connected");
  const channel = await db
    .prepare("SELECT * FROM marketing_channels WHERE provider='bluesky'")
    .first();
  assert.equal(channel.actor_id, "did:plc:blueskyfixture");
  assert.match(channel.name, /Bluesky Fixture/);
  assert.ok(
    !JSON.stringify((await req("/api/marketing")).data).includes(
      "fixture-access",
    ),
  );
  assert.match(
    (await req(path, { auth: browser })).headers.get("location"),
    /bluesky_reason=expired/,
  );
});
test("PAR failures return actionable safe errors and do not leave pending OAuth states", async () => {
  for (const value of ["redirect", "empty"]) {
    mode = value;
    const result = await start();
    assert.equal(result.status, 502);
    assert.ok(!result.data.error.includes("provider-private-debug"));
    if (value === "redirect")
      assert.match(result.data.error, /callback.*HTTPS/);
    assert.equal(
      (
        await db
          .prepare("SELECT count(*) AS n FROM marketing_oauth_states")
          .first()
      ).n,
      0,
    );
  }
  mode = "success";
});
test("a mismatched OAuth issuer never sends a token exchange", async () => {
  const result = await start(),
    browser = result.headers.get("set-cookie").split(";")[0];
  calls = [];
  const callback = await req(
    `/api/marketing/bluesky/callback?state=${par.get("state")}&code=fixture&iss=https%3A%2F%2Fattacker.example`,
    { auth: browser },
  );
  assert.match(callback.headers.get("location"), /bluesky=failed/);
  assert.equal(calls.length, 0);
});
