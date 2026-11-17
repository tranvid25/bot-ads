const cell = (value) => {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
};
export function reportCsv(attempts) {
  const keys = [
    "id",
    "title",
    "group_url",
    "status",
    "postUrl",
    "error",
    "updated_at",
  ];
  return (
    "\uFEFF" +
    [
      keys.join(","),
      ...attempts.map((row) => keys.map((key) => cell(row[key])).join(",")),
    ].join("\r\n")
  );
}
export function trackingUrl(url, campaign, content = "") {
  const result = new URL(url);
  if (result.protocol !== "https:" || result.username || result.password)
    throw new Error("Nhập URL HTTPS hợp lệ.");
  result.searchParams.set("utm_source", "facebook");
  result.searchParams.set("utm_medium", "social");
  result.searchParams.set(
    "utm_campaign",
    campaign.trim() || "facebook_campaign",
  );
  if (content.trim()) result.searchParams.set("utm_content", content.trim());
  return result.href;
}
