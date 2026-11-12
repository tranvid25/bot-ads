import {
  body,
  error,
  hash,
  identity,
  rate,
  token,
} from "../../middleware/security.mjs";
import { run } from "../../models/database.mjs";
import { json } from "../../lib/http.mjs";
import { appOrigin } from "../marketing.controller.mjs";
import { googleAuthErrors } from "../../../../packages/contracts/google-auth.mjs";
import { readCookie } from "./config.mjs";
import { googleReady } from "./config.mjs";
import { browserCookie } from "./config.mjs";
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
  return json(
    {
      url: url.href,
    },
    200,
    {
      "Set-Cookie": browserCookie(origin, browser),
    },
  );
}
