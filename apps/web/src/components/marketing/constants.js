export const onboardingProviders = {
  linkedin: "LinkedIn",
  bluesky: "Bluesky",
  dev: "DEV Community",
  medium: "Medium",
  reddit: "Reddit",
  indiehackers: "Indie Hackers",
};

export const providers = {
  linkedin: "LinkedIn",
  bluesky: "Bluesky",
  facebook: "Facebook",
  instagram: "Instagram",
  threads: "Threads",
  dev: "DEV Community",
  medium: "Medium",
  reddit: "Reddit",
  indiehackers: "Indie Hackers",
  youtube: "YouTube",
  tiktok: "TikTok",
  substack: "Substack",
  mastodon: "Mastodon",
};

export const manual = [
  "facebook",
  "instagram",
  "threads",
  "medium",
  "reddit",
  "indiehackers",
  "youtube",
  "tiktok",
  "substack",
  "mastodon",
];

export const destinations = {
  bluesky: "https://bsky.app",
  facebook: "https://www.facebook.com",
  instagram: "https://www.instagram.com",
  threads: "https://www.threads.net",
  linkedin: "https://www.linkedin.com/feed",
  medium: "https://medium.com/new-story",
  reddit: "https://www.reddit.com/submit",
  indiehackers: "https://www.indiehackers.com/new-post",
  youtube: "https://studio.youtube.com",
  tiktok: "https://www.tiktok.com/upload",
  mastodon: "https://mastodon.social",
  substack: "https://substack.com",
};

export const states = {
  draft: "Bản nháp",
  approved: "Đã duyệt",
  scheduled: "Đã lên lịch",
  publishing: "Đang gửi",
  published: "API xác nhận đã đăng",
  awaiting_manual: "Cần tự đăng",
  user_reported_published: "Bạn xác nhận đã đăng",
  unknown: "Chưa rõ — cần kiểm tra",
  needs_reauth: "Cần kết nối lại",
  retry_wait: "Chờ thử lại",
  failed: "Lỗi",
  canceled: "Đã hủy",
};

export const date = (value) => new Date(value).toLocaleString("vi-VN");

export const variant = (provider) => ({
  provider,
  title: "",
  content: "",
  tags: [],
  canonicalUrl: "",
  assetId: "",
  publicImageConsent: false,
});

export const emptyBrand = {
  name: "",
  website: "",
  audience: "",
  language: "en",
  ctaUrl: "",
};

