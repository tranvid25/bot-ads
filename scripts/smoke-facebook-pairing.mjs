import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { setupFacebookBrowser } from "./helpers/facebook-browser.mjs";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });

  const fixture = await setupFacebookBrowser(page);
  const { base, dashboard, errors } = fixture;
  await page.goto(`${base}/?page=settings`);
  await page
    .getByRole("button", { name: "Thiết bị & mã liên kết", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Ghép máy tính của bạn", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Tạo mã liên kết", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("status", { name: "Mã liên kết máy tính" })
      .innerText(),
    "abcd-1234-ef56-7890",
  );
  assert.equal(fixture.pairingCalls(), 1);
  await page.reload();
  await page
    .getByRole("heading", { name: "Ghép máy tính của bạn", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Facebook Groups", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Thư viện nhóm Facebook", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("region", { name: "Hướng dẫn bắt đầu Facebook" })
      .locator("li")
      .count(),
    4,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Tìm nhóm, chưa đăng bài", exact: true })
      .isDisabled(),
    true,
  );
  await page
    .getByLabel("Link nhóm bạn đã biết")
    .fill("https://www.facebook.com/groups/website");
  await page
    .getByRole("button", { name: "Thêm nhóm, chưa duyệt", exact: true })
    .click();
  const choose = page.getByRole("checkbox", {
    name: "Chọn nhóm Website owners",
    exact: true,
  });
  await choose.waitFor();
  assert.equal(await choose.isDisabled(), true);
  await page.getByRole("button", { name: "Duyệt nhóm", exact: true }).click();
  await choose.check();
  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/facebook-guide-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Soạn bài cho 1 nhóm đã chọn", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Một chiến dịch mới" });
  await dialog
    .getByLabel("Tên chiến dịch", { exact: true })
    .fill("XayWebsite Facebook pilot");
  const content = "Dịch vụ thiết kế website tại https://xaywebsite.com";
  await dialog.getByLabel("Nội dung bài 1", { exact: true }).fill(content);
  await dialog.getByRole("button", { name: /Nhóm mục tiêu/ }).click();
  await dialog
    .getByLabel("Từ khóa chủ đề, mỗi dòng một từ khóa")
    .fill("thiết kế website\ncần làm website");
  assert.equal(
    await dialog
      .getByRole("checkbox", { name: "Website owners", exact: true })
      .isChecked(),
    true,
  );
  await dialog.getByRole("button", { name: /Lịch & giới hạn/ }).click();
  await dialog.getByLabel(/^Tối đa lượt gửi\/ngày/).fill("3");
  await dialog
    .getByRole("button", { name: "Lưu chiến dịch", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  await page
    .getByRole("heading", { name: "XayWebsite Facebook pilot", exact: true })
    .waitFor();
  assert.equal(fixture.savedCampaign().posts[0].content, content);
  assert.deepEqual(fixture.savedCampaign().groupIds, ["group"]);
  assert.equal(fixture.savedCampaign().autoDiscover, false);
  assert.equal(fixture.savedCampaign().autoJoin, false);
  assert.equal(fixture.savedCampaign().dailyLimit, 3);
  await page
    .getByRole("button", { name: "Facebook Groups", exact: true })
    .click();
  dashboard.devices = [
    {
      id: "device",
      name: "My PC",
      last_seen: Date.now(),
      facebook_ready: 1,
      discovery_supported: 1,
    },
  ];
  await page.reload();
  await page
    .getByLabel("Từ khóa tìm nhóm, mỗi dòng một từ khóa")
    .fill("thiết kế website");
  await page
    .getByRole("button", { name: "Tìm nhóm, chưa đăng bài", exact: true })
    .click();
  await page.getByText("Chờ máy nhận việc", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Tạo chiến dịch", exact: true })
    .click();
  await page.getByRole("dialog", { name: "Một chiến dịch mới" }).waitFor();
  await page
    .getByRole("dialog", { name: "Một chiến dịch mới" })
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Facebook Groups", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "Facebook guide fits mobile viewport",
  );
  assert.equal(
    await page
      .locator(".fb-workspace .panel")
      .evaluateAll((panels) =>
        panels.every(
          (panel) =>
            panel.getBoundingClientRect().right <= innerWidth &&
            panel.getBoundingClientRect().left >= 0,
        ),
      ),
    true,
    "Panels must fit the viewport even when the shell hides overflow",
  );
  await page.screenshot({
    path: "test-results/facebook-guide-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: pairing, four-step guide, import/review/select groups, campaign composer, discovery and mobile; no live posting.",
  );
} finally {
  await browser.close();
}
