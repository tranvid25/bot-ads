const path = require("node:path");
const assert = require("node:assert/strict");
const root = path.resolve(process.argv[2]);
const metadata = require(path.join(root, "package.json"));
process.env.BOTADS_BROWSER_MODE = metadata.botadsBrowserMode;
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(path.dirname(root), "browsers");
const { launchBrowser } = require(path.join(root, "packages/browser-launcher.cjs"));
(async () => {
  assert.ok(["system", "bundled"].includes(metadata.botadsBrowserMode));
  const browser = await launchBrowser({ headless: true });
  console.log(`Checking packaged ${metadata.botadsBrowserMode} browser ${browser.version()}`);
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("data:text/html,<input aria-label='Content'><button onclick=\"document.title='verified'\">Post</button>");
    await page.getByRole("textbox").fill("Local packaged runtime");
    await page.getByRole("button").click({ timeout: 15000 });
    assert.equal(await page.title(), "verified");
    await context.close();
    console.log(`PASS: actual packaged ${metadata.botadsBrowserMode} runtime launches ${browser.version()} and performs isolated local browser actions.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exit(1); });
