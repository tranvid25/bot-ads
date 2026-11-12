const assert = require("node:assert/strict");
const { launchBrowser } = require("../packages/browser-launcher.cjs");
(async () => {
  const browser = await launchBrowser({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(
      "data:text/html,<input aria-label='Content'><button onclick=\"document.title='clicked'\">Post</button>",
    );
    await page
      .getByRole("textbox", { name: "Content" })
      .fill("BotAds local runtime check");
    assert.equal(
      await page.getByRole("textbox").inputValue(),
      "BotAds local runtime check",
    );
    await page.getByRole("button", { name: "Post" }).click();
    assert.equal(await page.title(), "clicked");
    await context.addCookies([
      { name: "fixture", value: "isolated", domain: "botads.test", path: "/" },
    ]);
    const second = await browser.newContext();
    assert.deepEqual(await second.cookies("https://botads.test"), []);
    await second.close();
    await context.close();
    console.log(
      `PASS: ${process.env.BOTADS_BROWSER_CHANNEL || process.env.BOTADS_BROWSER_MODE || "default"} ${browser.version()}: local navigation/input/click and isolated sessions. No social account or personal profile.`,
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
