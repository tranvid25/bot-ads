export function fail(message) {
  throw Object.assign(new Error(message), { status: 400 });
}
export function integer(value, min, max, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max)
    fail(`${label}: nhập số nguyên từ ${min} đến ${max}.`);
  return number;
}
const text = (value, max = 10000) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
export function groupUrl(value) {
  try {
    const url = new URL(value);
    const match = url.pathname.match(/^\/groups\/([\w.-]+)\/?$/);
    if (
      !["facebook.com", "www.facebook.com", "m.facebook.com"].includes(
        url.hostname,
      ) ||
      !["http:", "https:"].includes(url.protocol) ||
      !match ||
      ["feed", "discover", "search", "joins", "create"].includes(match[1])
    )
      return null;
    return `https://www.facebook.com/groups/${match[1].toLowerCase()}`;
  } catch {
    return null;
  }
}
export function validateCampaign(input, maxDaily = 100) {
  const name = text(input.name, 100);
  if (!name) fail("Nhập tên chiến dịch.");
  if (!["manual", "gemini"].includes(input.mode))
    fail("Chọn bài tự soạn hoặc Gemini.");
  const keywords = [
    ...new Set(
      (Array.isArray(input.keywords) ? input.keywords : [])
        .map((v) => text(v, 80))
        .filter(Boolean),
    ),
  ].slice(0, 15);
  if (!keywords.length) fail("Nhập ít nhất một từ khóa chủ đề.");
  const urls = Array.isArray(input.groupUrls)
    ? input.groupUrls.map((v) => text(v, 500)).filter(Boolean)
    : [];
  if (urls.some((v) => !groupUrl(v))) fail("Link nhóm Facebook không hợp lệ.");
  const posts = (Array.isArray(input.posts) ? input.posts : [])
    .slice(0, 50)
    .map((p, i) => ({
      id: text(p.id, 80) || `post-${i}`,
      title: text(p.title, 120) || `Bài ${i + 1}`,
      content: text(p.content, 12000),
      assetId: text(p.assetId, 80),
      selected: p.selected !== false,
    }));
  const autoGenerate = input.mode === "gemini" && input.autoGenerate === true;
  const prompt = text(input.prompt, 6000);
  if (autoGenerate && !prompt) fail("Nhập yêu cầu cho Gemini.");
  if (!autoGenerate && !posts.some((p) => p.selected && p.content))
    fail("Chọn ít nhất một bài có nội dung.");
  let timezone = text(input.timezone, 80) || "Asia/Ho_Chi_Minh";
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
  } catch {
    fail("Múi giờ không hợp lệ.");
  }
  const time = text(input.time, 5) || "09:00";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) fail("Giờ chạy không hợp lệ.");
  const weekdays = [...new Set(input.weekdays || [1, 2, 3, 4, 5])];
  if (
    !weekdays.length ||
    weekdays.some((v) => !Number.isInteger(v) || v < 0 || v > 6)
  )
    fail("Chọn ngày chạy trong tuần.");
  const commentUrl = text(input.commentUrl, 500);
  if (input.commentEnabled) {
    try {
      const u = new URL(commentUrl);
      if (!["http:", "https:"].includes(u.protocol) || u.username || u.password)
        throw 0;
    } catch {
      fail("Nhập link website HTTP/HTTPS cho bình luận.");
    }
  }
  return {
    name,
    mode: input.mode,
    product: text(input.product, 3000),
    prompt,
    posts,
    autoGenerate,
    keywords,
    excludedKeywords: (input.excludedKeywords || [])
      .slice(0, 30)
      .map((v) => text(v, 80))
      .filter(Boolean),
    groupUrls: [...new Set(urls.map(groupUrl))].slice(0, 200),
    autoDiscover: input.autoDiscover !== false,
    autoJoin: input.autoJoin !== false,
    policyMode:
      input.policyMode === "explicit-permission"
        ? "explicit-permission"
        : "exclude-prohibited",
    dailyLimit: integer(input.dailyLimit, 1, maxDaily, "Giới hạn ngày"),
    cooldownDays: integer(input.cooldownDays ?? 7, 1, 365, "Khoảng nghỉ nhóm"),
    time,
    weekdays,
    timezone,
    commentEnabled: Boolean(input.commentEnabled),
    commentUrl,
    commentText:
      text(input.commentText, 2000) || "Bạn có thể xem thêm tại đây:",
    enabled: Boolean(input.enabled),
  };
}
export function localClock(now, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (key) => parts.find((p) => p.type === key)?.value;
  const day = `${get("year")}-${get("month")}-${get("day")}`;
  return {
    day,
    time: `${get("hour")}:${get("minute")}`,
    weekday: new Date(`${day}T12:00:00Z`).getUTCDay(),
  };
}
export function isDue(campaign, now = new Date()) {
  const clock = localClock(now, campaign.timezone);
  // Only catch up within two hours; never accumulate several missed days.
  const minutes = (v) => Number(v.slice(0, 2)) * 60 + Number(v.slice(3));
  const delta = minutes(clock.time) - minutes(campaign.time);
  return campaign.weekdays.includes(clock.weekday) && delta >= 0 && delta < 120
    ? clock.day
    : null;
}
