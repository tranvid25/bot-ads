// Every browser uses Playwright's temporary profile. Never attach a customer's
// normal Chrome/Edge profile, debugging port or existing browser process.
async function launchBrowser(options = {}, dependencies = {}) {
  const chromium = dependencies.chromium || require("playwright").chromium;
  const env = dependencies.env || process.env;
  if (env.BOTADS_BROWSER_CHANNEL)
    return chromium.launch({ ...options, channel: env.BOTADS_BROWSER_CHANNEL });
  if (env.BOTADS_BROWSER_MODE !== "system") {
    const channel =
      env.BOTADS_BROWSER_MODE === "bundled" && options.headless
        ? { channel: "chromium" }
        : {};
    return chromium.launch({ ...options, ...channel });
  }
  const platform = dependencies.platform || process.platform;
  const channels =
    platform === "win32" ? ["msedge", "chrome"] : ["chrome", "msedge"];
  for (const channel of channels) {
    try {
      return await chromium.launch({ ...options, channel });
    } catch {
      /* Try the other supported browser, without installing or altering it. */
    }
  }
  throw Object.assign(
    new Error(
      "BotAds Lite chưa mở được Microsoft Edge hoặc Google Chrome. Hãy cài/cập nhật một trong hai trình duyệt và thử lại, hoặc dùng bộ cài BotAds đầy đủ. Nếu máy do công ty quản lý, kiểm tra quyền mở trình duyệt với bộ phận IT.",
    ),
    { code: "BROWSER_UNAVAILABLE" },
  );
}
module.exports = { launchBrowser };
