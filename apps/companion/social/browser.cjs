const { launchBrowser } = require("../../../packages/browser-launcher.cjs");
const { identity } = require("../../../packages/social-contract.cjs");
const homes = {
  threads: "https://www.threads.com",
  instagram: "https://www.instagram.com",
};
function failure(message, state = "failed") {
  return Object.assign(new Error(message), { state });
}
async function open(provider, auth) {
  if (!homes[provider]) throw failure("Kênh không hợp lệ.");
  const browser = await launchBrowser({ headless: false });
  try {
    const context = await browser.newContext({
      storageState: auth || undefined,
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    return {
      browser,
      context,
      page,
      close: async () => {
        await context.close().catch(() => {});
        await browser.close().catch(() => {});
      },
    };
  } catch (e) {
    await browser.close();
    throw e;
  }
}
async function readIdentity(page, provider) {
  const urls = await page.locator("a[href]").evaluateAll((links) =>
    links
      .filter((a) => {
        if (!a.getClientRects().length) return false;
        const labels = [
          a.getAttribute("aria-label"),
          a.textContent,
          ...Array.from(a.querySelectorAll("[aria-label]")).map((n) =>
            n.getAttribute("aria-label"),
          ),
        ];
        return labels.some((value) =>
          /^(profile|trang cá nhân|hồ sơ)$/i.test((value || "").trim()),
        );
      })
      .map((a) => a.href),
  );
  for (const value of urls) {
    const url = new URL(value),
      ownHost = new URL(homes[provider]).hostname.replace(/^www\./, "");
    if (url.hostname.replace(/^www\./, "") !== ownHost) continue;
    const match = url.pathname.match(
      provider === "threads"
        ? /^\/@([a-z0-9_.]+)\/?$/i
        : /^\/([a-z0-9_.]+)\/?$/i,
    );
    if (!match || ["accounts", "explore", "direct", "reels"].includes(match[1]))
      continue;
    return identity(provider, { actorId: match[1] });
  }
  throw failure(
    "Chưa xác định được tài khoản từ liên kết Trang cá nhân. Đăng nhập và mở trang chủ trong cửa sổ BotAds.",
    "needs_reauth",
  );
}
async function ready(page) {
  const url = page.url();
  if (/challenge|checkpoint|two_factor|consent|accounts\/login/.test(url))
    throw failure(
      "Nền tảng yêu cầu đăng nhập hoặc xác minh. Kết nối lại và tự hoàn thành trong trình duyệt BotAds.",
      "needs_reauth",
    );
}
async function login(provider, auth, guard, deps = {}) {
  const session = await (deps.open || open)(provider, auth);
  try {
    await session.page.goto(homes[provider], {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    const deadline = Date.now() + 10 * 60000;
    while (Date.now() < deadline) {
      guard();
      try {
        await ready(session.page);
        const account = await readIdentity(session.page, provider);
        return {
          identity: account,
          auth: await session.context.storageState(),
        };
      } catch (e) {
        if (session.page.isClosed()) throw e;
      }
      await session.page.waitForTimeout(1500);
    }
    throw failure(
      "Hết thời gian đăng nhập. Tạo yêu cầu kết nối mới trên website.",
      "needs_reauth",
    );
  } finally {
    await session.close();
  }
}
module.exports = { open, login, ready, readIdentity, homes, failure };
