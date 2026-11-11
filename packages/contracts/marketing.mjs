export const PROVIDERS = [
  "dev",
  "linkedin",
  "medium",
  "reddit",
  "indiehackers",
  "instagram",
  "threads",
  "facebook",
  "bluesky",
  "substack",
  "youtube",
  "tiktok",
  "mastodon",
];
export const MANUAL_PROVIDERS = [
  "medium",
  "reddit",
  "indiehackers",
  "instagram",
  "threads",
  "facebook",
  "substack",
  "youtube",
  "tiktok",
  "mastodon",
];
export const fail = (message) => {
  throw Object.assign(new Error(message), { status: 400 });
};
function text(value, limit, label, required = false) {
  if (
    typeof value !== "string" ||
    value.length > limit ||
    (required && !value.trim())
  ) {
    if (!required && (value === undefined || value === null)) return "";
    fail(`${label}: dữ liệu không hợp lệ hoặc quá ${limit} ký tự.`);
  }
  return value;
}
export function publicUrl(value, label = "URL", optional = false) {
  if (!value && optional) return "";
  try {
    const u = new URL(value);
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      !u.hostname.includes(".") ||
      u.hostname === "localhost"
    )
      throw 0;
    return u.href;
  } catch {
    fail(`${label}: cần địa chỉ HTTPS hợp lệ.`);
  }
}
export function validateBrand(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    fail("Thông tin thương hiệu không hợp lệ.");
  return {
    name: text(input.name, 100, "Tên thương hiệu", true).trim(),
    website: publicUrl(input.website, "Website"),
    audience: text(input.audience, 2000, "Khách hàng mục tiêu"),
    language: text(input.language || "en", 30, "Ngôn ngữ", true),
    ctaUrl: publicUrl(input.ctaUrl, "Link liên hệ", true),
  };
}
export function validateMarketingPost(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    fail("Nội dung bài không hợp lệ.");
  const title = text(input.title, 200, "Tên nội dung", true);
  if (
    !Array.isArray(input.variants) ||
    !input.variants.length ||
    input.variants.length > 5
  )
    fail("Chọn 1–5 bản nội dung theo kênh.");
  const seen = new Set();
  const variants = input.variants.map((v) => {
    if (!v || typeof v !== "object" || Array.isArray(v))
      fail("Bản nội dung theo kênh không hợp lệ.");
    if (!PROVIDERS.includes(v.provider) || seen.has(v.provider))
      fail("Kênh không hợp lệ hoặc bị trùng.");
    seen.add(v.provider);
    const content = text(
      v.content,
      v.provider === "linkedin" ? 3000 : 50000,
      "Nội dung",
      true,
    );
    const tags = v.tags || [];
    if (
      !Array.isArray(tags) ||
      tags.length > 4 ||
      tags.some((t) => typeof t !== "string" || !/^[a-z0-9]{1,30}$/.test(t))
    )
      fail("DEV hỗ trợ tối đa 4 tag chữ thường hoặc số.");
    if (
      v.assetId &&
      ["dev", "linkedin"].includes(v.provider) &&
      v.publicImageConsent !== true
    )
      fail("Xác nhận cho phép chia sẻ công khai ảnh đính kèm khi đăng.");
    return {
      provider: v.provider,
      title: text(v.title || title, 200, "Tiêu đề", true),
      content,
      canonicalUrl: publicUrl(v.canonicalUrl, "Canonical", true),
      assetId: text(v.assetId, 80, "Ảnh"),
      tags,
      publicImageConsent: v.publicImageConsent === true,
    };
  });
  return {
    title,
    sourceUrl: publicUrl(input.sourceUrl, "Bài gốc", true),
    variants,
  };
}
export function validateSchedule(input, now = Date.now()) {
  if (
    !Array.isArray(input.channelIds) ||
    !input.channelIds.length ||
    input.channelIds.length > 20 ||
    input.channelIds.some((id) => typeof id !== "string" || id.length > 80)
  )
    fail("Chọn 1–20 tài khoản đích.");
  const at = input.scheduledAt
    ? new Date(input.scheduledAt).getTime()
    : Math.ceil(now / 60000) * 60000;
  if (!Number.isFinite(at) || at < now - 60000 || at > now + 366 * 86400000)
    fail("Chọn thời gian từ hiện tại đến một năm tới.");
  return { channelIds: [...new Set(input.channelIds)], scheduledAt: at };
}
export function validatePermalink(provider, value) {
  const href = publicUrl(value, "Link bài đã đăng");
  const u = new URL(href);
  const domain = {
    dev: "dev.to",
    linkedin: "linkedin.com",
    medium: "medium.com",
    reddit: "reddit.com",
    indiehackers: "indiehackers.com",
    instagram: "instagram.com",
    threads: "threads.net",
    facebook: "facebook.com",
    bluesky: "bsky.app",
    substack: "substack.com",
    youtube: "youtube.com",
    tiktok: "tiktok.com",
    mastodon: "mastodon.social",
  }[provider];
  if (
    !domain ||
    !(u.hostname === domain || u.hostname.endsWith(`.${domain}`)) ||
    u.pathname === "/"
  )
    fail("Link bài không thuộc nền tảng đã chọn.");
  return href;
}
export function utmUrl(url, source, campaign) {
  const u = new URL(publicUrl(url));
  u.searchParams.set("utm_source", source);
  u.searchParams.set("utm_medium", "social");
  u.searchParams.set("utm_campaign", campaign);
  return u.href;
}
