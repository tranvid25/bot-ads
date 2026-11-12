const providers = ["threads", "instagram"];
function fail(message) {
  throw Object.assign(new Error(message), { status: 400 });
}
function identity(provider, value) {
  if (!providers.includes(provider)) fail("Kênh máy tính không hợp lệ.");
  const handle = String(value?.actorId || "")
    .replace(/^@/, "")
    .toLowerCase();
  if (!/^[a-z0-9_][a-z0-9_.]{0,29}$/.test(handle))
    fail("Chưa xác định được tài khoản đã đăng nhập.");
  return { actorId: handle, name: "@" + handle };
}
function variant(provider, value, asset) {
  if (!providers.includes(provider)) fail("Kênh máy tính không hợp lệ.");
  const content = String(value?.content || "").trim();
  const max = provider === "threads" ? 500 : 2200;
  if (!content || [...content].length > max)
    fail(`Nội dung ${provider} cần từ 1 đến ${max} ký tự.`);
  if (provider === "threads" && value.assetId)
    fail(
      "Bản Threads máy tính hiện hỗ trợ bài chữ/link. Bỏ ảnh ở phiên bản Threads.",
    );
  if (
    provider === "instagram" &&
    (!value.assetId ||
      !asset ||
      !["image/jpeg", "image/png"].includes(asset.mime))
  )
    fail(
      "Instagram cần một ảnh JPG hoặc PNG. Video/carousel chưa được hỗ trợ trong bản này.",
    );
  return { ...value, content };
}
function permalink(provider, value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const host = url.hostname.replace(/^www\./, "");
    const match =
      provider === "threads" && ["threads.com", "threads.net"].includes(host)
        ? url.pathname.match(/^\/@[a-z0-9_.]+\/post\/([a-zA-Z0-9_-]+)\/?$/)
        : provider === "instagram" && host === "instagram.com"
          ? url.pathname.match(/^\/p\/([a-zA-Z0-9_-]+)\/?$/)
          : null;
    return match
      ? { permalink: url.origin + url.pathname, remoteId: match[1] }
      : null;
  } catch {
    return null;
  }
}
module.exports = { providers, identity, variant, permalink };
