import { error } from "../../middleware/security.mjs";
import { one, run } from "../../models/database.mjs";
import { json } from "../../lib/http.mjs";
import { googleReady } from "./config.mjs";
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
    return json({
      ok: true,
    });
  }
  return json({
    account: account || null,
    available: googleReady(env),
    canUnlink: Boolean(user.password_hash),
  });
}
