import { one } from "../../models/database.mjs";
import { error, hash } from "../../middleware/security.mjs";
import { exchangeLinkedIn } from "../../services/marketing-providers.mjs";
import {
  linkedinErrors,
  linkedinReason,
} from "../../../../packages/contracts/linkedin-errors.mjs";
import { appOrigin } from "./config.mjs";
import { saveChannel } from "./channel-store.mjs";
export async function linkedinCallback(request, env) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const browser = (request.headers.get("cookie") || "")
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith("botads_oauth="))
    ?.slice(13);
  if (!browser || !/^[a-f0-9]{64}$/.test(state))
    throw error(
      403,
      "Phiên kết nối LinkedIn không hợp lệ. Bắt đầu lại từ website.",
    );
  const pending = await one(
    env,
    "DELETE FROM marketing_oauth_states WHERE state_hash=? AND browser_hash=? AND expires_at>? RETURNING *",
    await hash(state),
    await hash(browser),
    Date.now(),
  );
  if (!pending || new URL(pending.redirect_uri).origin !== appOrigin(env))
    throw error(403, "Yêu cầu kết nối đã hết hạn hoặc đã được sử dụng.");
  let result = "connected";
  let reason = "failed";
  let stage = "exchange";
  try {
    if (url.searchParams.has("error"))
      throw {
        oauthReason: linkedinReason(url.searchParams.get("error")),
      };
    const code = url.searchParams.get("code");
    if (!code || code.length > 4000) throw 0;
    const identity = await exchangeLinkedIn(env, code, pending.redirect_uri);
    stage = "storage";
    await saveChannel(
      env,
      pending.workspace_id,
      pending.brand_id,
      "linkedin",
      identity,
    );
  } catch (e) {
    result = "failed";
    reason =
      e?.oauthReason && Object.hasOwn(linkedinErrors, e.oauthReason)
        ? e.oauthReason
        : stage === "storage"
          ? "storage"
          : "failed";
    console.warn("LinkedIn OAuth failed:", reason);
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: `${appOrigin(env)}/?linkedin=${result}${result === "failed" ? `&linkedin_reason=${reason}` : ""}`,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "Set-Cookie": `botads_oauth=; HttpOnly; SameSite=Lax; Path=/api/marketing/linkedin; Max-Age=0${url.protocol === "https:" ? "; Secure" : ""}`,
    },
  });
}
