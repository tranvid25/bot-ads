import { error } from "../../middleware/security.mjs";
import { vaultReady } from "../../services/marketing-vault.mjs";
export const b64 = (b) =>
  btoa(String.fromCharCode(...new Uint8Array(b)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
export function appOrigin(env) {
  try {
    const url = new URL(env.PUBLIC_APP_URL);
    if (
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      url.username ||
      url.password ||
      (url.protocol !== "https:" &&
        !(
          url.protocol === "http:" &&
          ["127.0.0.1", "localhost"].includes(url.hostname)
        ))
    )
      throw 0;
    return url.origin;
  } catch {
    throw error(503, "Cần cấu hình PUBLIC_APP_URL là địa chỉ gốc của website.");
  }
}
export function blueskyOAuthClientId(origin) {
  if (origin.startsWith("https:")) return `${origin}/client-metadata.json`;
  return `http://localhost?${new URLSearchParams({
    redirect_uri: `${origin}/api/marketing/bluesky/callback`,
    scope: "atproto transition:generic",
  })}`;
}
export function blueskyClientMetadata(env) {
  let origin = "https://bot.salesora.space";
  try {
    const detected = appOrigin(env);
    if (detected) origin = detected;
  } catch {}
  return {
    client_id: `${origin}/client-metadata.json`,
    client_name: "BotSalesOra",
    client_uri: origin,
    logo_uri: `${origin}/brand/logo-512.png`,
    tos_uri: `${origin}/terms.html`,
    policy_uri: `${origin}/privacy.html`,
    // Web clients must not include loopback callbacks. Development uses the
    // authorization server's virtual localhost client below instead.
    redirect_uris: [`${origin}/api/marketing/bluesky/callback`],
    scope: "atproto transition:generic",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    application_type: "web",
    token_endpoint_auth_method: "none",
    dpop_bound_access_tokens: true,
  };
}
export function marketingCapabilities(env) {
  const encryption = vaultReady(env);
  let origin = false;
  try {
    origin = Boolean(appOrigin(env));
  } catch {}
  return {
    encryption,
    dev: encryption && origin,
    bluesky: Boolean(encryption),
    linkedin: Boolean(
      encryption &&
      origin &&
      env.LINKEDIN_CLIENT_ID &&
      env.LINKEDIN_CLIENT_SECRET,
    ),
    manual: true,
    cadenceMinutes: 5,
  };
}
