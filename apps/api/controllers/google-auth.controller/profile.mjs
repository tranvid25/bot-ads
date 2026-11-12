import { createRemoteJWKSet, jwtVerify } from "jose";
import { hash } from "../../middleware/security.mjs";
import { fail } from "./config.mjs";
export const googleKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
export async function verifiedProfile(env, code, pending) {
  let response;
  try {
    response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
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
      picture:
        typeof payload.picture === "string" &&
        payload.picture.startsWith("https://")
          ? payload.picture.slice(0, 500)
          : null,
    };
  } catch {
    throw fail("identity");
  }
}
