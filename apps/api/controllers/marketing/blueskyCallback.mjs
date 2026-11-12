import { one } from "../../models/database.mjs";
import { error, hash } from "../../middleware/security.mjs";
import { unseal, credentialContext } from "../../services/marketing-vault.mjs";
import { fetchWithDPoP } from "../../services/marketing-providers.mjs";
import { appOrigin } from "./config.mjs";
import { saveChannel } from "./channel-store.mjs";
export async function blueskyCallback(request, env) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const cookieHeader = request.headers.get("cookie") || "";
  const bskyCookie =
    cookieHeader
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith("botads_bsky_oauth="))
      ?.slice("botads_bsky_oauth=".length) || "";
  const [browser, sealedRaw] = bskyCookie.split(".");
  if (!state || !browser || !sealedRaw) {
    return new Response(null, {
      status: 303,
      headers: {
        Location: `${appOrigin(env)}/?bluesky=failed&bluesky_reason=expired`,
        "Cache-Control": "no-store",
      },
    });
  }
  const pending = await one(
    env,
    "DELETE FROM marketing_oauth_states WHERE state_hash=? AND browser_hash=? AND expires_at>? RETURNING *",
    await hash(state),
    await hash(browser),
    Date.now(),
  );
  if (!pending) {
    return new Response(null, {
      status: 303,
      headers: {
        Location: `${appOrigin(env)}/?bluesky=failed&bluesky_reason=expired`,
        "Cache-Control": "no-store",
      },
    });
  }
  if (new URL(pending.redirect_uri).origin !== appOrigin(env))
    throw error(
      403,
      "Địa chỉ callback đã thay đổi. Bắt đầu lại từ website chính.",
    );
  let result = "connected";
  let reason = "failed";
  try {
    if (url.searchParams.get("iss") !== "https://bsky.social")
      throw new Error("Unexpected authorization issuer");
    if (url.searchParams.has("error")) {
      throw new Error(url.searchParams.get("error"));
    }
    const code = url.searchParams.get("code");
    if (!code) throw new Error("Missing code");
    const sessionPayload = await unseal(
      env,
      credentialContext({
        workspace_id: pending.workspace_id,
        provider: "bluesky_oauth",
        id: state,
      }),
      decodeURIComponent(sealedRaw),
    );
    const tokenUrl = "https://bsky.social/oauth/token";
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: pending.redirect_uri,
      client_id: sessionPayload.clientId,
      code_verifier: sessionPayload.verifier,
    });
    const tokenRes = await fetchWithDPoP(
      env,
      tokenUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tokenBody.toString(),
      },
      sessionPayload.privateJwk,
      sessionPayload.publicJwk,
    );
    if (!tokenRes.ok) {
      console.warn("Bluesky token exchange failed:", tokenRes.status);
      throw new Error("Token exchange failed");
    }
    const tokenData = await tokenRes.json();
    const did = tokenData.sub;
    if (
      typeof did !== "string" ||
      !/^did:(plc|web):/.test(did) ||
      typeof tokenData.access_token !== "string" ||
      tokenData.token_type?.toLowerCase() !== "dpop"
    )
      throw new Error("Invalid token response");
    const profileUrl = `https://bsky.social/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`;
    const profileRes = await fetchWithDPoP(
      env,
      profileUrl,
      {
        method: "GET",
      },
      sessionPayload.privateJwk,
      sessionPayload.publicJwk,
      tokenData.access_token,
    );
    let handle = did;
    let avatarUrl = "";
    let displayName = "";
    if (profileRes.ok) {
      const pData = await profileRes.json();
      handle = pData.handle || did;
      avatarUrl = pData.avatar || "";
      displayName = pData.displayName || "";
    }
    const identity = {
      actorId: did,
      name: displayName ? `${displayName} (@${handle})` : `@${handle}`,
      avatarUrl,
      credential: {
        authMode: "oauth",
        did,
        handle,
        tokenData,
        privateJwk: sessionPayload.privateJwk,
        publicJwk: sessionPayload.publicJwk,
        clientId: sessionPayload.clientId,
      },
    };
    await saveChannel(
      env,
      pending.workspace_id,
      pending.brand_id,
      "bluesky",
      identity,
    );
  } catch (err) {
    console.warn("Bluesky OAuth callback failed.");
    result = "failed";
    reason = "oauth_error";
  }
  const destUrl = `${appOrigin(env)}/?bluesky=${result}${result === "failed" ? `&bluesky_reason=${reason}` : ""}`;
  return new Response(null, {
    status: 303,
    headers: {
      Location: destUrl,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "Set-Cookie": `botads_bsky_oauth=; HttpOnly; SameSite=Lax; Path=/api/marketing/bluesky; Max-Age=0${url.protocol === "https:" ? "; Secure" : ""}`,
    },
  });
}
