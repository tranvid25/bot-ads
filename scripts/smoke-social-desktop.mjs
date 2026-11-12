import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { setupFacebookBrowser } from "./helpers/facebook-browser.mjs";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const fixture = await setupFacebookBrowser(page);
  fixture.marketing.brands.push({
    id: "brand",
    name: "XayWebsite",
    website: "https://xaywebsite.com",
    language: "vi",
  });
  fixture.social.device = {
    name: "Customer PC",
    social_supported: 1,
    last_seen: Date.now(),
  };
  await page.goto(fixture.base);
  for (const provider of ["threads", "instagram"]) {
    await page.locator(".channel-add-action-btn").first().click();
    const modal = page.getByRole("dialog", { name: "Connect a New Channel" });
    await modal
      .locator(".channel-grid-card")
      .filter({
        has: page.locator(`.channel-card-title`, {
          hasText: provider === "threads" ? "Threads" : "Instagram",
        }),
      })
      .click();
    await modal
      .getByLabel("Thương hiệu", { exact: true })
      .selectOption("brand");
    assert.equal(await modal.getByText(/Tự động 100%/).count(), 0);
    if (provider === "instagram") {
      await page.setViewportSize({ width: 390, height: 844 });
      assert.ok((await modal.boundingBox()).width <= 390);
      await mkdir("test-results", { recursive: true });
      await page.screenshot({
        path: "test-results/instagram-desktop-connect-mobile.png",
        fullPage: true,
      });
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
    await modal.getByRole("button", { name: /Mở đăng nhập/ }).click();
    await page
      .getByText(`${provider} · Chờ máy mở trình duyệt`, { exact: true })
      .waitFor();
    assert.equal(
      fixture.marketing.channels.length,
      provider === "threads" ? 0 : 1,
      "Requesting login cannot create a fake connected channel",
    );
    fixture.social.tasks[0].status = "completed";
    fixture.marketing.channels.push({
      id: provider,
      provider,
      brand_id: "brand",
      actor_id: "fixture",
      name: `@fixture-${provider}`,
      transport: "desktop",
      status: "connected",
    });
    await page.reload();
    await page
      .getByText(`@fixture-${provider}`, { exact: true })
      .first()
      .waitFor();
  }
  await page.screenshot({
    path: "test-results/social-desktop-connected.png",
    fullPage: true,
  });
  assert.deepEqual(fixture.errors, []);
  console.log(
    "PASS: Threads/Instagram request desktop login, remain pending until confirmation, show connected identities and fit mobile. No real social accounts.",
  );
} finally {
  await browser.close();
}
