const { permalink } = require("../../../packages/social-contract.cjs");
const { failure } = require("./browser.cjs");
async function prepare(page, content) {
  const create = page
    .getByRole("button", {
      name: /^(create|new thread|tạo|tạo bài viết|bài viết mới)$/i,
    })
    .first();
  if (await create.isVisible()) await create.click();
  else {
    const link = page
      .getByRole("link", { name: /^(create|tạo|tạo bài viết)$/i })
      .first();
    if (!(await link.isVisible()))
      throw failure(
        "Chưa tìm thấy nút tạo bài Threads. Giao diện có thể đã thay đổi.",
      );
    await link.click();
  }
  const dialog = page.getByRole("dialog").last();
  await dialog.waitFor({ state: "visible", timeout: 15000 });
  const editor = dialog
    .locator(
      '[contenteditable="true"][role="textbox"], [contenteditable="true"][data-lexical-editor="true"]',
    )
    .first();
  await editor.fill(content);
  if (
    (await editor.innerText()).replace(/\r/g, "") !== content.replace(/\r/g, "")
  )
    throw failure("Nội dung trong ô soạn khác bản đã duyệt. Chưa gửi bài.");
  const button = dialog.getByRole("button", { name: /^(post|đăng)$/i }).last();
  await button.waitFor({ state: "visible", timeout: 10000 });
  return button;
}
async function evidence(page) {
  const link = page
    .getByRole("link", { name: /^(view|view post|xem|xem bài viết)$/i })
    .last();
  await link.waitFor({ state: "visible", timeout: 30000 });
  const result = permalink(
    "threads",
    new URL(await link.getAttribute("href"), page.url()).href,
  );
  if (!result)
    throw failure(
      "Đã gửi nhưng chưa lấy được link bài Threads. Cần kiểm tra trước khi gửi lại.",
      "unknown",
    );
  return result;
}
module.exports = { prepare, evidence };
