// Only fixed diagnostic codes may leave the OAuth handler. Never forward provider
// descriptions, tokens, authorization codes or response bodies to the browser.
export const linkedinErrors = {
  access_denied:
    "Bạn chưa cấp quyền LinkedIn hoặc đã hủy kết nối. Hãy kết nối lại và đồng ý cấp quyền.",
  scope:
    "LinkedIn chưa cấp đủ quyền. Trong Developer App → Products, bật Share on LinkedIn và Sign In with LinkedIn using OpenID Connect, rồi kiểm tra Auth có openid, profile và w_member_social.",
  client:
    "LinkedIn từ chối Client ID/Client Secret. Kiểm tra hai GitHub Secrets đúng với app rồi deploy lại.",
  redirect:
    "LinkedIn từ chối callback hoặc mã kết nối đã hết hạn. Lưu đúng https://bot.salesora.space/api/marketing/linkedin/callback trong Auth → Authorized redirect URLs, rồi bắt đầu kết nối mới.",
  identity:
    "Không đọc được hồ sơ LinkedIn. Kiểm tra sản phẩm Sign In with LinkedIn using OpenID Connect và quyền openid, profile.",
  provider_response:
    "LinkedIn trả dữ liệu rỗng hoặc không hợp lệ. Hãy bắt đầu kết nối lại sau.",
  network: "Không kết nối được API LinkedIn. Hãy thử lại sau.",
  storage:
    "Chưa lưu được kết nối LinkedIn. Chủ hệ thống cần kiểm tra migration D1 và TOKEN_ENCRYPTION_KEY trên Worker.",
  failed:
    "Kết nối LinkedIn chưa thành công. Kiểm tra quyền app, callback và thử lại.",
};
export function linkedinReason(code) {
  if (
    [
      "access_denied",
      "user_cancelled_login",
      "user_cancelled_authorize",
    ].includes(code)
  )
    return "access_denied";
  if (
    [
      "unauthorized_scope_error",
      "invalid_scope",
      "insufficient_scope",
    ].includes(code)
  )
    return "scope";
  if (
    ["invalid_client", "invalid_client_id", "unauthorized_client"].includes(
      code,
    )
  )
    return "client";
  if (
    ["invalid_redirect_uri", "redirect_uri_mismatch", "invalid_grant"].includes(
      code,
    )
  )
    return "redirect";
  return "failed";
}
