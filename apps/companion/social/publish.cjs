const { variant } = require("../../../packages/social-contract.cjs");
const browser = require("./browser.cjs");
async function publish(
  task,
  sessionState,
  image,
  beforeSubmit,
  guard,
  deps = {},
) {
  const { provider, config } = task;
  const data = variant(
    provider,
    config.variant,
    image ? { mime: image.mime } : null,
  );
  const session = await (deps.open || browser.open)(provider, sessionState);
  let submitted = false;
  try {
    guard();
    await session.page.goto(browser.homes[provider], {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await session.page.waitForTimeout(2000);
    await browser.ready(session.page);
    const account = await (deps.readIdentity || browser.readIdentity)(
      session.page,
      provider,
    );
    if (account.actorId !== config.actorId)
      throw browser.failure(
        "Tài khoản đang mở khác tài khoản đã chọn. Kết nối lại đúng tài khoản trước khi đăng.",
        "needs_reauth",
      );
    const adapter = deps.adapter || require(`./${provider}.cjs`);
    const button = await adapter.prepare(
      session.page,
      data.content,
      image?.path,
      config.actorId,
    );
    guard();
    const current = await (deps.readIdentity || browser.readIdentity)(
      session.page,
      provider,
    );
    if (current.actorId !== account.actorId)
      throw browser.failure(
        "Tài khoản thay đổi trong lúc soạn. Chưa gửi bài.",
        "needs_reauth",
      );
    await beforeSubmit();
    guard();
    submitted = true;
    await button.click({ timeout: 15000 });
    const result = await adapter.evidence(session.page);
    return { status: "published", ...result };
  } catch (e) {
    return {
      status: submitted ? "unknown" : e.state || "failed",
      error: e.message,
    };
  } finally {
    await session.close();
  }
}
module.exports = { publish };
