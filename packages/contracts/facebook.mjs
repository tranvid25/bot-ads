import { groupUrl, fail } from "./campaign.mjs";

export function discoveryConfig(input) {
  if (
    !Array.isArray(input.keywords) ||
    (input.excludedKeywords !== undefined &&
      !Array.isArray(input.excludedKeywords))
  )
    fail("Danh sách từ khóa không hợp lệ.");
  const keywords = [
    ...new Set(
      (input.keywords || []).map((v) => String(v).trim()).filter(Boolean),
    ),
  ];
  if (
    !keywords.length ||
    keywords.length > 10 ||
    keywords.some((v) => v.length > 80)
  )
    fail("Nhập 1–10 từ khóa, mỗi từ khóa tối đa 80 ký tự.");
  const limit = Number(input.limit ?? 20);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50)
    fail("Mỗi lượt tìm từ 1 đến 50 nhóm.");
  return {
    keywords,
    limit,
    excludedKeywords: (input.excludedKeywords || [])
      .slice(0, 20)
      .map((v) => String(v).slice(0, 80)),
  };
}
export function discoveredGroup(input) {
  const url = groupUrl(input.url);
  if (!url) fail("Link nhóm Facebook không hợp lệ.");
  return {
    url,
    name: String(input.name || url).slice(0, 200),
    membership: ["joined", "requested", "not_joined"].includes(input.membership)
      ? input.membership
      : "unknown",
    reason: String(
      input.reason || "Cần kiểm tra nhóm và quyền đăng trước khi duyệt.",
    ).slice(0, 1000),
    source: input.source === "joined" ? "joined" : "search",
  };
}
