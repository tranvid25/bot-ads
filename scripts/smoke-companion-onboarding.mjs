import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(() => {
    const listeners = [];
    window.fixture = { linked: false, logs: [], facebookReady: false, online: false, receivingEnabled: false, socialAccounts: {} };
    window.emitFixture = change => { Object.assign(window.fixture, change); listeners.forEach(fn => fn(window.fixture)); };
    window.botads = { onState: fn => listeners.push(fn), command: async name => {
      if (window.failCommand) throw Error("Fixture: không liên lạc được máy chủ.");
      if (name === "resume") window.emitFixture({ receivingEnabled: true });
      if (name === "stop") window.emitFixture({ receivingEnabled: false });
      return window.fixture;
    } };
  });
  await page.goto(pathToFileURL(path.resolve("apps/companion/index.html")).href);
  await page.evaluate(() => window.emitFixture({ linked: true }));
  assert.equal(await page.locator("#resume").isDisabled(), true);
  await page.evaluate(() => window.emitFixture({ facebookReady: true, online: true, facebookLogin: true }));
  assert.equal(await page.locator("#resume").isDisabled(), true);
  assert.equal(await page.locator("#finish-login").isEnabled(), true);
  await page.evaluate(() => window.emitFixture({ facebookLogin: false }));
  assert.equal(await page.locator("#resume").isEnabled(), true);
  await page.evaluate(() => { window.failCommand = true; });
  await page.locator("#login").click();
  await page.getByRole("alert").filter({ hasText: "Fixture: không liên lạc được máy chủ." }).waitFor();
  await page.evaluate(() => { window.failCommand = false; });
  await page.locator("#resume").click();
  await page.getByText(/Đang nhận việc · Chờ chiến dịch/).waitFor();
  assert.equal(await page.locator("#resume").isDisabled(), true);
  await page.locator("#stop").click();
  assert.equal(await page.locator("#resume").isEnabled(), true);
  await page.screenshot({ path: "test-results/companion-onboarding.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log("PASS: desktop guide, prerequisite locks, explicit receiving feedback and pause.");
} finally { await browser.close(); }
