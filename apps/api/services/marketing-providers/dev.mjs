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
  if (response.status === 401)
    throw error(
      400,
      "DEV không chấp nhận API key này. Kiểm tra key hoặc tạo key mới trong tài khoản DEV.",
    );
  if (response.status === 403)
    throw error(
      502,
      "DEV từ chối yêu cầu kết nối (HTTP 403). Có thể do bộ lọc truy cập hoặc quyền tài khoản; chưa thể kết luận API key sai.",
    );
  if (response.status === 429)
    throw error(
      429,
      "DEV đang giới hạn số yêu cầu. Đợi một lúc rồi kết nối lại.",
    );
  if (!response.ok)
    throw error(
      502,
      `DEV trả HTTP ${response.status}. Vui lòng thử kết nối lại sau.`,
    );
  let user;
  try {
    user = await response.json();
  } catch {
    throw error(
      502,
      "DEV trả phản hồi không phải JSON hợp lệ. Vui lòng thử lại sau.",
    );
  }
  if (!user || typeof user !== "object")
    throw error(502, "DEV trả thông tin tài khoản không hợp lệ.");
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
