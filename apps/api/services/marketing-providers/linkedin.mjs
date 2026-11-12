import { linkedinReason } from "../../../../packages/contracts/linkedin-errors.mjs";
import { oauthError } from "./oauth.mjs";
import { oauthJson } from "./oauth.mjs";
import { providerFetch } from "./http.mjs";
export async function exchangeLinkedIn(env, code, redirectUri) {
  let response;
  try {
    response = await providerFetch(
      env,
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: env.LINKEDIN_CLIENT_ID.trim(),
          client_secret: env.LINKEDIN_CLIENT_SECRET.trim(),
        }).toString(),
      },
    );
  } catch {
    throw oauthError("network");
  }
  const token = await oauthJson(response);
  if (!response.ok) throw oauthError(linkedinReason(token.error));
  if (
    !token.access_token ||
    !Number.isFinite(Number(token.expires_in)) ||
    Number(token.expires_in) <= 0
  )
    throw oauthError("provider_response");
  if (token.scope && !token.scope.split(/[ ,]+/).includes("w_member_social"))
    throw oauthError("scope");
  let identity;
  try {
    identity = await providerFetch(
      env,
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
        },
      },
    );
  } catch {
    throw oauthError("network");
  }
  if (!identity.ok) throw oauthError("identity");
  const user = await oauthJson(identity);
  if (typeof user.sub !== "string" || !/^[\w-]+$/.test(user.sub))
    throw oauthError("identity");
  return {
    actorId: `urn:li:person:${user.sub}`,
    name: String(user.name || "LinkedIn").slice(0, 100),
    avatarUrl:
      typeof user.picture === "string" ? user.picture.slice(0, 500) : "",
    credential: {
      accessToken: token.access_token,
    },
    expiresAt: Date.now() + Number(token.expires_in) * 1000,
    scopes: token.scope || "openid profile w_member_social",
  };
}
