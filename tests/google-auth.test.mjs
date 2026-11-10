import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare, Response } from "miniflare";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { testWorker } from "../scripts/test-worker.mjs";

const base = "https://bot.salesora.space";
const bindings = {
  AUTH_SECRET: "google-test-auth-secret-at-least-thirty-two-characters",
  GOOGLE_CLIENT_ID: "fixture.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "fixture-secret",
  PUBLIC_APP_URL: base,
  ALLOW_REGISTRATION: "true",
};
let mf,
  mfConfig,
  db,
  keys,
  otherKeys,
  jwk,
  nonce,
  mode = "success",
  subject = "google-member-1",
  email = "member@gmail.com",
  calls = [],
  sequence = 0;
async function req(
  path,
  { data, cookie, origin = base, method = data ? "POST" : "GET" } = {},
) {
  const response = await mf.dispatchFetch(base + "/api" + path, {
    method,
    redirect: "manual",
    headers: {
      Origin: origin,
      "CF-Connecting-IP": `google-ip-${++sequence}`,
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  return {
    status: response.status,
    data: await response
      .clone()
      .json()
      .catch(() => null),
    headers: response.headers,
  };
}
async function start(cookie, link = false) {
  const result = await req("/auth/google/start", {
    data: { mode: link ? "link" : "signin" },
    cookie,
  });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  const url = new URL(result.data.url);
  nonce = url.searchParams.get("nonce");
  return {
    ...result,
    state: url.searchParams.get("state"),
    cookie: result.headers.get("set-cookie").split(";")[0],
    url,
  };
}
async function callback(started, suffix = "&code=fixture-code") {
  return req(`/auth/google/callback?state=${started.state}${suffix}`, {
    cookie: started.cookie,
  });
}
function session(result) {
  return result.headers
    .getSetCookie()
    .find((c) => c.startsWith("botads_session="))
    ?.split(";")[0];
}
before(async () => {
  keys = await generateKeyPair("RS256");
  otherKeys = await generateKeyPair("RS256");
  jwk = {
    ...(await exportJWK(keys.publicKey)),
    kid: "fixture-key",
    alg: "RS256",
    use: "sig",
  };
  mf = new Miniflare(
    (mfConfig = {
      ...(await testWorker()),
      compatibilityDate: "2025-09-01",
      d1Databases: ["DB"],
      r2Buckets: ["MEDIA"],
      bindings,
      outboundService: async (request) => {
        const url = new URL(request.url);
        calls.push(url.pathname);
        if (
          url.hostname === "www.googleapis.com" &&
          url.pathname === "/oauth2/v3/certs"
        )
          return Response.json(
            { keys: [jwk] },
            { headers: { "Cache-Control": "public,max-age=3600" } },
          );
        if (
          url.hostname !== "oauth2.googleapis.com" ||
          url.pathname !== "/token"
        )
          throw new Error("Unexpected external request");
        const input = new URLSearchParams(await request.text());
        assert.equal(input.get("client_id"), bindings.GOOGLE_CLIENT_ID);
        assert.equal(input.get("client_secret"), bindings.GOOGLE_CLIENT_SECRET);
        assert.equal(
          input.get("redirect_uri"),
          base + "/api/auth/google/callback",
        );
        assert.match(input.get("code_verifier"), /^[a-f0-9]{64}$/);
        if (mode === "network")
          throw new Error("fixture transport error; secret must not leak");
        if (mode === "client")
          return Response.json(
            {
              error: "invalid_client",
              error_description: "secret must not leak",
            },
            { status: 401 },
          );
        const claims = {
          sub: subject,
          email,
          email_verified: mode !== "unverified",
          name: "Google Member",
          nonce: mode === "nonce" ? "wrong" : nonce,
        };
        const jwt = await new SignJWT(claims)
          .setProtectedHeader({ alg: "RS256", kid: "fixture-key" })
          .setIssuer(
            mode === "issuer"
              ? "https://attacker.example"
              : "https://accounts.google.com",
          )
          .setAudience(
            mode === "audience" ? "another-client" : bindings.GOOGLE_CLIENT_ID,
          )
          .setIssuedAt()
          .setExpirationTime(
            mode === "expired" ? Math.floor(Date.now() / 1000) - 60 : "5m",
          )
          .sign(mode === "signature" ? otherKeys.privateKey : keys.privateKey);
        return Response.json({
          id_token: jwt,
          access_token: "must-not-be-persisted",
        });
      },
    }),
  );
  db = await mf.getD1Database("DB");
  for (const name of ["0001_init.sql", "0004_google_auth.sql"]) {
    const sql = await readFile(`apps/api/migrations/${name}`, "utf8");
    await db.batch(
      sql
        .split(";")
        .map((v) => v.trim())
        .filter(Boolean)
        .map((v) => db.prepare(v)),
    );
  }
});
after(async () => {
  await mf?.dispose();
});

test("Google start uses browser-bound state, nonce, PKCE and fixed redirect/scopes", async () => {
  const result = await start();
  assert.equal(result.url.origin, "https://accounts.google.com");
  assert.equal(result.url.searchParams.get("scope"), "openid email profile");
  assert.equal(result.url.searchParams.get("code_challenge_method"), "S256");
  assert.match(result.headers.get("set-cookie"), /HttpOnly; SameSite=Lax/);
  assert.match(result.headers.get("set-cookie"), /Secure/);
  assert.equal(
    (
      await req("/auth/google/start", {
        data: {},
        origin: "https://attacker.example",
      })
    ).status,
    403,
  );
  assert.equal(
    (await req("/auth/google/start", { data: { mode: "link" } })).status,
    401,
  );
});
test("verified Google sign-up creates one workspace and returns an HttpOnly BotAds session", async () => {
  const result = await callback(await start());
  assert.equal(result.status, 303);
  assert.equal(result.headers.get("location"), base + "/?google_auth=success");
  assert.ok(session(result));
  const rows = await db.prepare("SELECT * FROM users").all();
  assert.equal(rows.results.length, 1);
  assert.equal(rows.results[0].password_hash, "");
  assert.equal(
    (await db.prepare("SELECT count(*) AS n FROM workspaces").first()).n,
    1,
  );
  const identity = await db.prepare("SELECT * FROM auth_identities").first();
  assert.equal(identity.subject, subject);
  assert.ok(!JSON.stringify(identity).includes("must-not-be-persisted"));
  const result2 = await callback(await start());
  assert.ok(session(result2));
  assert.equal(
    (await db.prepare("SELECT count(*) AS n FROM users").first()).n,
    1,
  );
  const account = await req("/auth/google/account", {
    cookie: session(result),
  });
  assert.equal(account.data.canUnlink, false);
  assert.equal(
    (
      await req("/auth/google/account", {
        cookie: session(result),
        method: "DELETE",
      })
    ).status,
    409,
  );
});
test("Google callback rejects invalid signature, issuer, audience, nonce, expiry and unverified email", async () => {
  for (const value of [
    "signature",
    "issuer",
    "audience",
    "nonce",
    "expired",
    "unverified",
  ]) {
    mode = value;
    const result = await callback(await start());
    assert.equal(
      result.headers.get("location"),
      base + "/?google_auth=identity",
      value,
    );
    assert.equal(session(result), undefined);
  }
  mode = "success";
});
test("OAuth state rejects cross-browser, replay and expiry; cancelled consent makes no token request", async () => {
  const started = await start();
  const wrong = await req(
    `/auth/google/callback?state=${started.state}&code=fixture`,
    { cookie: "botads_google=" + "a".repeat(64) },
  );
  assert.equal(wrong.headers.get("location"), base + "/?google_auth=state");
  assert.ok(session(await callback(started)));
  assert.equal(
    (await callback(started)).headers.get("location"),
    base + "/?google_auth=state",
  );
  const expiring = await start();
  await db.prepare("UPDATE google_auth_states SET expires_at=0").run();
  assert.equal(
    (await callback(expiring)).headers.get("location"),
    base + "/?google_auth=state",
  );
  const cancel = await start(),
    before = calls.length;
  assert.equal(
    (await callback(cancel, "&error=access_denied")).headers.get("location"),
    base + "/?google_auth=access_denied",
  );
  assert.equal(calls.length, before);
});
test("email collisions require explicit authenticated linking and cannot take over a password account", async () => {
  email = "existing@example.com";
  subject = "another-google-member";
  const password = "fixture-password-at-least-12";
  const existing = await req("/auth/register", {
    data: { email, name: "Password Owner", password },
  });
  const cookie = existing.headers.get("set-cookie").split(";")[0];
  assert.equal(
    (await callback(await start())).headers.get("location"),
    base + "/?google_auth=link_required",
  );
  assert.equal(
    (
      await db
        .prepare("SELECT count(*) AS n FROM auth_identities WHERE subject=?")
        .bind(subject)
        .first()
    ).n,
    0,
  );
  const linked = await callback(await start(cookie, true));
  assert.equal(linked.headers.get("location"), base + "/?google_auth=linked");
  const owner = await db
    .prepare("SELECT id FROM users WHERE email=?")
    .bind(email)
    .first();
  assert.equal(
    (
      await db
        .prepare("SELECT user_id FROM auth_identities WHERE subject=?")
        .bind(subject)
        .first()
    ).user_id,
    owner.id,
  );
  assert.ok(session(await callback(await start())));
  assert.equal(
    (await req("/auth/google/account", { cookie, method: "DELETE" })).status,
    200,
  );
  assert.equal(
    (await req("/auth/login", { data: { email, password } })).status,
    200,
  );
});
test("linking cannot attach another user's Google identity or proceed after the initiating session is revoked", async () => {
  const account = await req("/auth/register", {
    data: {
      email: "second@example.com",
      name: "Second",
      password: "fixture-password-123456789",
    },
  });
  const cookie = account.headers.get("set-cookie").split(";")[0];
  subject = "google-member-1";
  email = "member@gmail.com";
  assert.equal(
    (await callback(await start(cookie, true))).headers.get("location"),
    base + "/?google_auth=conflict",
  );
  const revoked = await start(cookie, true);
  await req("/auth/logout", { cookie, data: {} });
  assert.equal(
    (await callback(revoked)).headers.get("location"),
    base + "/?google_auth=state",
  );
});
test("Google failures do not leak codes, tokens or provider descriptions", async () => {
  for (const value of ["network", "client"]) {
    mode = value;
    const result = await callback(await start());
    assert.equal(
      result.headers.get("location"),
      base + `/?google_auth=${value}`,
    );
    assert.equal(session(result), undefined);
  }
  mode = "success";
});

test("closed registration blocks new Google accounts but permits linked Google sign-in", async () => {
  await mf.setOptions({
    ...mfConfig,
    bindings: { ...bindings, ALLOW_REGISTRATION: "false" },
  });
  db = await mf.getD1Database("DB");
  subject = "closed-registration-new-user";
  email = "closed@gmail.com";
  assert.equal(
    (await callback(await start())).headers.get("location"),
    base + "/?google_auth=registration_closed",
  );
  assert.equal(
    (
      await db
        .prepare("SELECT count(*) AS n FROM users WHERE email=?")
        .bind(email)
        .first()
    ).n,
    0,
  );
  subject = "google-member-1";
  email = "member@gmail.com";
  assert.ok(session(await callback(await start())));
});
