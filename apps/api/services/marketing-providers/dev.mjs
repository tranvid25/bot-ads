import { error } from "../../middleware/security.mjs";
import { devHeaders } from "./oauth.mjs";
import { providerFetch } from "./http.mjs";
export async function devIdentity(env, apiKey) {
  let response;
  try {
    response = await providerFetch(env, "https://dev.to/api/users/me", {
      headers: devHeaders(apiKey),
    });
  } catch {
    throw error(502, "Không kết nối được DEV. Vui lòng thử lại.");
  }
  if (!response.ok)
    throw error(
      400,
      "API key DEV không hợp lệ hoặc tài khoản chưa được phép truy cập.",
    );
  const user = await response.json();
  if (!user.id || !user.username)
    throw error(502, "DEV trả thông tin tài khoản không hợp lệ.");
  return {
    actorId: String(user.id),
    name: String(user.name || user.username).slice(0, 100),
    avatarUrl:
      typeof user.profile_image === "string"
        ? user.profile_image.slice(0, 500)
        : "",
  };
}
