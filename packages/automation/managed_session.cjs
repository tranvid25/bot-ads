let shared = null;
function keep(session) {
  shared = session;
}
async function lease(expectedUserId) {
  if (!shared) return null;
  try {
    if (!shared.browser.isConnected()) {
      shared = null;
      return null;
    }
    if (expectedUserId) {
      const uid = (
        await shared.context.cookies(["https://www.facebook.com"])
      ).find((c) => c.name === "c_user")?.value;
      if (uid !== expectedUserId)
        throw Object.assign(
          new (require("./runtime").HaltError)(
            "Phiên Facebook đã đổi tài khoản hoặc hết hạn. Kết nối lại đúng tài khoản trên BotAds.",
          ),
          { code: uid ? "FACEBOOK_ACCOUNT_CHANGED" : "FACEBOOK_AUTH_REQUIRED" },
        );
    }
    const page = await shared.context.newPage();
    let retained = false;
    const release = async () => {
      if (!retained) await page.close().catch(() => {});
    };
    return {
      page,
      retainPage: () => { retained = true; },
      context: new Proxy(shared.context, {
        get: (target, key) =>
          key === "close"
            ? release
            : typeof target[key] === "function"
              ? target[key].bind(target)
              : target[key],
      }),
      browser: new Proxy(shared.browser, {
        get: (target, key) =>
          key === "close"
            ? release
            : typeof target[key] === "function"
              ? target[key].bind(target)
              : target[key],
      }),
    };
  } catch (error) {
    if (['FACEBOOK_AUTH_REQUIRED','FACEBOOK_ACCOUNT_CHANGED'].includes(error.code)) throw error;
    shared = null;
    return null;
  }
}
async function close() {
  const session = shared;
  shared = null;
  if (session) {
    await session.context.close().catch(() => {});
    await session.browser.close().catch(() => {});
  }
}
function retain(session) {
  if (session.retainPage) session.retainPage();
  else keep(session);
}
module.exports = { keep, lease, close, retain };
