import { createRemoteJWKSet, jwtVerify } from "jose";
import {
  body,
  cookieHeader,
  error,
  hash,
  identity,
  rate,
  token,
} from "../middleware/security.mjs";
import { one, run } from "../models/database.mjs";
import { id, json, maxDaily } from "../lib/http.mjs";
import { appOrigin } from "./marketing.controller.mjs";
import { googleAuthErrors } from "../../../packages/contracts/google-auth.mjs";

const googleKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
const fail = (reason) =>
  Object.assign(new Error("Google authentication failed"), { reason });
const readCookie = (request, name) =>
  (request.headers.get("cookie") || "")
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${name}=`))
    ?.slice(name.length + 1) || "";
export function googleReady(env) {
  try {
    return Boolean(
      appOrigin(env) &&
      env.GOOGLE_CLIENT_ID?.trim() &&
      env.GOOGLE_CLIENT_SECRET?.trim() &&
      env.AUTH_SECRET?.length >= 32,
    );
  } catch {
    return false;
  }
}
function browserCookie(origin, value, age = 600) {
  return `botads_google=${value}; HttpOnly; SameSite=Lax; Path=/api/auth/google; Max-Age=${age}${origin.startsWith("https:") ? "; Secure" : ""}`;
}
function redirect(env, reason, session) {
  const origin = appOrigin(env);
  const headers = new Headers({
    Location: `${origin}/?google_auth=${reason}`,
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  });
  headers.append("Set-Cookie", browserCookie(origin, "", 0));
  if (session)
    headers.append("Set-Cookie", cookieHeader(new Request(origin), session));
  return new Response(null, { status: 303, headers });
}
export async function googleStart(request, env) {
  if (!googleReady(env)) throw error(503, googleAuthErrors.unavailable);
  await rate(
    env,
    `google-start:${await hash(request.headers.get("CF-Connecting-IP") || "local")}`,
    20,
    900,
  );
  const input = await body(request, 2000);
  if (input.mode && !["signin", "link"].includes(input.mode))
    throw error(400, "Chế độ đăng nhập không hợp lệ.");
  let context;
  if (input.mode === "link") context = await identity(request, env);
  const origin = appOrigin(env);
  // Vite's local proxy forwards to Wrangler's loopback port. Never trust an
  // arbitrary forwarded host or accept alternate production origins.
  const requestOrigin = new URL(request.url).origin;
  if (
    requestOrigin !== origin &&
    !(
      origin === "http://127.0.0.1:5173" &&
      requestOrigin === "http://127.0.0.1:8899"
    )
  )
    throw error(
      400,
      "Hãy đăng nhập Google từ địa chỉ website chính đã cấu hình.",
    );
  const state = token(),
    browser = token(),
    nonce = token(),
    verifier = token();
  const challenge = btoa(
    String.fromCharCode(
      ...new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(verifier),
        ),
      ),
    ),
  )
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const redirectUri = `${origin}/api/auth/google/callback`;
  await run(
    env,
    "DELETE FROM google_auth_states WHERE expires_at<=?",
    Date.now(),
  );
  await run(
    env,
    "INSERT INTO google_auth_states VALUES (?,?,?,?,?,?,?,?)",
    await hash(state),
    await hash(browser),
    await hash(nonce),
    verifier,
    redirectUri,
    context?.user.id || null,
    context ? await hash(readCookie(request, "botads_session")) : null,
    Date.now() + 600000,
  );
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  for (const [key, value] of Object.entries({
    client_id: env.GOOGLE_CLIENT_ID.trim(),
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }))
    url.searchParams.set(key, value);
  return json({ url: url.href }, 200, {
    "Set-Cookie": browserCookie(origin, browser),
  });
}
async function verifiedProfile(env, code, pending) {
  let response;
  try {
    response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: env.GOOGLE_CLIENT_ID.trim(),
        client_secret: env.GOOGLE_CLIENT_SECRET.trim(),
        redirect_uri: pending.redirect_uri,
        code_verifier: pending.verifier,
      }),
    });
  } catch {
    throw fail("network");
  }
  if (response.status >= 500 || response.status === 429) throw fail("network");
  if (!response.ok) throw fail("client");
  try {
    const data = await response.json();
    if (typeof data.id_token !== "string") throw 0;
    const { payload } = await jwtVerify(data.id_token, googleKeys, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: env.GOOGLE_CLIENT_ID.trim(),
      algorithms: ["RS256"],
      requiredClaims: ["sub", "exp", "iat", "nonce", "email", "email_verified"],
      maxTokenAge: "10m",
      clockTolerance: 5,
    });
    if (
      typeof payload.sub !== "string" ||
      !payload.sub ||
      payload.sub.length > 255 ||
      payload.email_verified !== true ||
      typeof payload.email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) ||
      payload.email.length > 254 ||
      typeof payload.nonce !== "string" ||
      (await hash(payload.nonce)) !== pending.nonce_hash ||
      (payload.azp && payload.azp !== env.GOOGLE_CLIENT_ID.trim())
    )
      throw 0;
    return {
      subject: payload.sub,
      email: payload.email.trim().toLowerCase(),
      name: String(payload.name || payload.email.split("@")[0]).slice(0, 80),
    };
  } catch {
    throw fail("identity");
  }
}
async function resolveUser(env, profile, pending) {
  const linked = await one(
    env,
    "SELECT user_id FROM auth_identities WHERE provider='google' AND subject=?",
    profile.subject,
  );
  if (pending.user_id) {
    const session = await one(
      env,
      "SELECT user_id FROM sessions WHERE token_hash=? AND user_id=? AND expires_at>?",
      pending.session_hash,
      pending.user_id,
      Date.now(),
    );
    if (!session) throw fail("state");
    if (linked && linked.user_id !== pending.user_id) throw fail("conflict");
    const other = await one(
      env,
      "SELECT subject FROM auth_identities WHERE provider='google' AND user_id=?",
      pending.user_id,
    );
    if (other && other.subject !== profile.subject) throw fail("conflict");
    const saved = await run(
      env,
      "INSERT INTO auth_identities(provider,subject,user_id,email,created_at) VALUES ('google',?,?,?,?) ON CONFLICT(provider,subject) DO UPDATE SET email=excluded.email WHERE auth_identities.user_id=excluded.user_id",
      profile.subject,
      pending.user_id,
      profile.email,
      Date.now(),
    );
    if (!saved.meta.changes) throw fail("conflict");
    return pending.user_id;
  }
  if (linked) return linked.user_id;
  if (await one(env, "SELECT id FROM users WHERE email=?", profile.email))
    throw fail("link_required");
  if (env.ALLOW_REGISTRATION !== "true") throw fail("registration_closed");
  const userId = id(),
    workspaceId = id();
  try {
    // Empty hash cannot authenticate via password; no generated password is shared.
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO users(id,email,name,password_hash,salt,created_at) VALUES (?,?,?,'','',?)",
      ).bind(userId, profile.email, profile.name, Date.now()),
      env.DB.prepare(
        "INSERT INTO workspaces(id,owner_id,daily_limit) VALUES (?,?,?)",
      ).bind(workspaceId, userId, Math.min(30, maxDaily(env))),
      env.DB.prepare(
        "INSERT INTO auth_identities(provider,subject,user_id,email,created_at) VALUES ('google',?,?,?,?)",
      ).bind(profile.subject, userId, profile.email, Date.now()),
    ]);
  } catch (e) {
    if (!String(e).includes("UNIQUE")) throw e;
    const concurrent = await one(
      env,
      "SELECT user_id FROM auth_identities WHERE provider='google' AND subject=?",
      profile.subject,
    );
    if (concurrent) return concurrent.user_id;
    throw fail("link_required");
  }
  return userId;
}
export async function googleCallback(request, env) {
  if (!googleReady(env)) return redirect(env, "unavailable");
  const url = new URL(request.url),
    state = url.searchParams.get("state") || "",
    browser = readCookie(request, "botads_google");
  if (!/^[a-f0-9]{64}$/.test(state) || !/^[a-f0-9]{64}$/.test(browser))
    return redirect(env, "state");
  const pending = await one(
    env,
    "DELETE FROM google_auth_states WHERE state_hash=? AND browser_hash=? AND expires_at>? RETURNING *",
    await hash(state),
    await hash(browser),
    Date.now(),
  );
  if (
    !pending ||
    pending.redirect_uri !== `${appOrigin(env)}/api/auth/google/callback`
  )
    return redirect(env, "state");
  try {
    if (url.searchParams.has("error"))
      throw fail(
        url.searchParams.get("error") === "access_denied"
          ? "access_denied"
          : "client",
      );
    const code = url.searchParams.get("code");
    if (!code || code.length > 4000) throw fail("state");
    const profile = await verifiedProfile(env, code, pending);
    const userId = await resolveUser(env, profile, pending);
    const session = token();
    await run(
      env,
      "INSERT INTO sessions VALUES (?,?,?)",
      await hash(session),
      userId,
      Date.now() + 604800000,
    );
    return redirect(env, pending.user_id ? "linked" : "success", session);
  } catch (e) {
    const reason = Object.hasOwn(googleAuthErrors, e?.reason || "")
      ? e.reason
      : "failed";
    console.warn("Google OAuth failed:", reason); // Fixed code only, never provider payloads.
    return redirect(env, reason);
  }
}
export async function googleAccount(request, env, context) {
  const account = await one(
    env,
    "SELECT email,created_at FROM auth_identities WHERE provider='google' AND user_id=?",
    context.user.id,
  );
  const user = await one(
    env,
    "SELECT password_hash FROM users WHERE id=?",
    context.user.id,
  );
  if (request.method === "DELETE") {
    if (!user.password_hash)
      throw error(
        409,
        "Tài khoản này chỉ đăng nhập bằng Google. Cần thiết lập phương thức đăng nhập khác trước khi ngắt.",
      );
    await run(
      env,
      "DELETE FROM auth_identities WHERE provider='google' AND user_id=?",
      context.user.id,
    );
    return json({ ok: true });
  }
  return json({
    account: account || null,
    available: googleReady(env),
    canUnlink: Boolean(user.password_hash),
  });
}
