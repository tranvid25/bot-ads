import { error } from "../../middleware/security.mjs";
import { providerFetch } from "./http.mjs";
export async function blueskyIdentity(env, handle, appPassword) {
  const clean = handle.trim().replace(/^@/, "");
  let response;
  try {
    response = await providerFetch(
      env,
      "https://bsky.social/xrpc/com.atproto.server.createSession",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: clean,
          password: appPassword.trim(),
        }),
      },
    );
  } catch {
    throw error(502, "Không kết nối được Bluesky. Vui lòng kiểm tra mạng.");
  }
  if (!response.ok) {
    throw error(
      400,
      "Tên tài khoản hoặc Mật khẩu ứng dụng Bluesky không đúng.",
    );
  }
  const session = await response.json();
  if (!session.did || !session.handle) {
    throw error(502, "Bluesky trả thông tin phiên không hợp lệ.");
  }
  let avatarUrl = "";
  try {
    const profRes = await providerFetch(
      env,
      `https://bsky.social/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(session.did)}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessJwt}`,
        },
      },
    );
    if (profRes.ok) {
      const prof = await profRes.json();
      if (typeof prof.avatar === "string")
        avatarUrl = prof.avatar.slice(0, 500);
    }
  } catch {}
  return {
    actorId: session.did,
    name: `@${session.handle}`,
    avatarUrl,
    credential: {
      did: session.did,
      handle: session.handle,
      appPassword: appPassword.trim(),
    },
  };
}
