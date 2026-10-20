const { chromium, _electron: electron } = require("playwright");
const fs = require("fs");
const path = require("path");
const assert = require("assert/strict");
(async () => {
  fs.mkdirSync("test-results", { recursive: true });
  const browser = await chromium.launch({ headless: true });
  let desktop;
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1050 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:8899");
    await page.getByRole("button", { name: "Đăng ký", exact: true }).click();
    await page.getByLabel("Tên của bạn").fill("Khách kiểm thử");
    await page
      .getByLabel("Email", { exact: true })
      .fill(`smoke-${Date.now()}@example.com`);
    await page
      .getByLabel("Mật khẩu", { exact: true })
      .fill("smoke-test-only-long-password");
    await page
      .getByRole("button", { name: "Tạo tài khoản", exact: true })
      .click();
    await page.getByRole("heading", { name: /Chào/ }).waitFor();
    await page
      .getByRole("button", { name: "Tạo chiến dịch", exact: true })
      .first()
      .click();
    await page
      .getByLabel("Tên chiến dịch", { exact: true })
      .fill("Chiến dịch kiểm thử giao diện");
    await page
      .getByLabel("Nội dung bài 1", { exact: true })
      .fill("Bài tự soạn dùng để kiểm thử giao diện. Không gửi lên Facebook.");
    await page.getByRole("button", { name: /Nhóm mục tiêu/ }).click();
    await page
      .getByLabel("Từ khóa chủ đề, mỗi dòng một từ khóa")
      .fill("học tiếng Anh\nenglish");
    await page.getByRole("button", { name: /Lịch & giới hạn/ }).click();
    await page.getByLabel("Tối đa lượt gửi/ngày").fill("50");
    await page
      .getByRole("button", { name: "Lưu chiến dịch", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page
      .getByRole("heading", {
        name: "Chiến dịch kiểm thử giao diện",
        exact: true,
      })
      .waitFor();
    await page.screenshot({
      path: "test-results/dashboard.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
    await page.getByLabel("Tối đa lượt gửi mỗi ngày").fill("50");
    await page
      .getByRole("button", { name: "Lưu thay đổi", exact: true })
      .click();
    await page.getByRole("status").waitFor();
    await page.getByRole("button", { name: "Thiết bị", exact: true }).click();
    await page
      .getByRole("button", { name: "Tạo mã liên kết", exact: true })
      .click();
    const code = await page.locator(".pair-code").innerText();
    assert.match(code, /^[a-f0-9-]{19}$/);
    const env = {
      ...process.env,
      BOTADS_DESKTOP_DATA_DIR: path.resolve(
        `test-results/desktop-${Date.now()}`,
      ),
      BOTADS_TEST_HIDDEN: "1",
    };
    delete env.ELECTRON_RUN_AS_NODE;
    desktop = await electron.launch({
      args: [path.resolve("apps/companion/main.cjs")],
      env,
      timeout: 30000,
    });
    const win = await desktop.firstWindow();
    await win.locator("#server").fill("http://127.0.0.1:8899");
    await win.locator("#code").fill(code);
    await win
      .getByRole("button", { name: "Liên kết máy tính", exact: true })
      .click();
    await win.locator("#connected").waitFor({ state: "visible" });
    assert.equal(
      await win.locator("#facebook-status").innerText(),
      "Chưa đăng nhập trên trình duyệt BotAds",
    );
    const saved = fs.readFileSync(
      path.join(env.BOTADS_DESKTOP_DATA_DIR, "credentials.bin"),
    );
    assert.equal(saved.includes(Buffer.from("http://127.0.0.1")), false);
    await win.screenshot({ path: "test-results/desktop.png" });
    await page.reload();
    await page.getByRole("button", { name: "Thiết bị", exact: true }).click();
    await page.getByRole("button", { name: "Thu hồi", exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Tổng quan", exact: true }).click();
    await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "Mobile must not overflow horizontally",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: web registration, manual campaign, 50/day, desktop pairing, encrypted credentials, mobile layout. No Facebook actions.",
    );
  } finally {
    if (desktop) await desktop.close();
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
