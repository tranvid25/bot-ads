const { permalink } = require("../../../packages/social-contract.cjs");
const { failure } = require("./browser.cjs");
const { resultFromResponse } = require("./instagram-result.cjs");
const observed = new WeakMap();
async function prepare(page, content, image, actorId) {
  const observation = { result: null, armed: false };
  observed.set(page, observation);
  page.on("response", async (response) => {
    if (
      !["instagram.com", "www.instagram.com"].includes(
        new URL(response.url()).hostname,
      )
    )
      return;
    if (
      !observation.armed ||
      response.request().method() !== "POST" ||
      !/\/(?:web\/create\/configure|media\/configure)\/?(?:\?|$)/.test(
        new URL(response.url()).pathname,
      )
    )
      return;
    try {
      observation.result = resultFromResponse(
        await response.json(),
        actorId,
        content,
      );
    } catch {}
  });
  const name = /^(create|new post|tạo|tạo bài viết|bài viết mới)$/i;
  const button = page.getByRole("link", { name }).first();
  if (await button.isVisible()) await button.click();
  else
    await page.getByRole("button", { name }).first().click({ timeout: 10000 });
  const dialog = page.getByRole("dialog").last();
  await dialog.waitFor({ state: "visible", timeout: 15000 });
  await page.locator('input[type="file"]').last().setInputFiles(image);
  const next = dialog.getByRole("button", { name: /^(next|tiếp)$/i }).last();
  for (let step = 0; step < 3; step++) {
    if (!(await next.isVisible())) break;
    await next.click();
    await page.waitForTimeout(700);
  }
  const caption = dialog
    .locator('textarea[aria-label], [contenteditable="true"][role="textbox"]')
    .first();
  await caption.fill(content);
  const actual = await caption.evaluate((node) => node.value ?? node.innerText);
  if (actual.replace(/\r/g, "") !== content.replace(/\r/g, ""))
    throw failure("Caption khác bản đã duyệt. Chưa chia sẻ.");
  const share = dialog
    .getByRole("button", { name: /^(share|chia sẻ)$/i })
    .last();
  await share.waitFor({ state: "visible", timeout: 10000 });
  return {
    click: async (options) => {
      observation.armed = true;
      await share.click(options);
    },
  };
}
async function evidence(page) {
  const confirmation = page
    .getByText(
      /^(your post has been shared\.?|bài viết của bạn đã được chia sẻ\.?)$/i,
    )
    .first();
  await confirmation.waitFor({ state: "visible", timeout: 45000 });
  for (let check = 0; check < 4; check++) {
    if (observed.get(page)?.result) return observed.get(page).result;
    await page.waitForTimeout(500);
  }
  // Require a link associated with the completion dialog, never guess the latest profile post.
  const dialog = page.getByRole("dialog").last();
  const urls = await dialog
    .locator('a[href*="/p/"]')
    .evaluateAll((links) => links.map((link) => link.href));
  for (const url of urls) {
    const result = permalink("instagram", url);
    if (result) return result;
  }
  throw failure(
    "Instagram báo đã chia sẻ nhưng chưa cung cấp link xác nhận. Mở Instagram kiểm tra và nhập link trên web; không tự đăng lại.",
    "unknown",
  );
}
module.exports = { prepare, evidence };
