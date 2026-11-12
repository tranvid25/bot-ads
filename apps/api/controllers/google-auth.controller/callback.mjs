import { hash, token } from "../../middleware/security.mjs";
import { one, run } from "../../models/database.mjs";
import { appOrigin } from "../marketing.controller.mjs";
import { googleAuthErrors } from "../../../../packages/contracts/google-auth.mjs";
import { fail } from "./config.mjs";
import { readCookie } from "./config.mjs";
import { googleReady } from "./config.mjs";
import { redirect } from "./config.mjs";
import { verifiedProfile } from "./profile.mjs";
import { resolveUser } from "./identity.mjs";
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
    return redirect(
      env,
      pending.user_id ? "linked" : "success",
      session,
      profile.picture,
    );
  } catch (e) {
    const reason = Object.hasOwn(googleAuthErrors, e?.reason || "")
      ? e.reason
      : "failed";
    console.warn("Google OAuth failed:", reason); // Fixed code only, never provider payloads.
    return redirect(env, reason);
  }
}
