const { test } = require("node:test");
const assert = require("node:assert/strict");
const { launchBrowser } = require("../packages/browser-launcher.cjs");
function engine(missing = []) {
  const calls = [],
    browser = {};
  return {
    browser,
    calls,
    chromium: {
      launch: async (options) => {
        calls.push(options);
        if (missing.includes(options.channel))
          throw new Error("Browser unavailable");
        return browser;
      },
    },
  };
}
test("development keeps existing Playwright browser selection", async () => {
  const fake = engine();
  await launchBrowser({ headless: true }, { ...fake, env: {} });
  assert.deepEqual(fake.calls, [{ headless: true }]);
});
test("full package can run headless with its full Chromium and no separate shell", async () => {
  const fake = engine();
  await launchBrowser(
    { headless: true },
    { ...fake, env: { BOTADS_BROWSER_MODE: "bundled" } },
  );
  assert.deepEqual(fake.calls, [{ headless: true, channel: "chromium" }]);
});
test("Lite uses Edge first on Windows without a personal user data directory", async () => {
  const fake = engine();
  await launchBrowser(
    { headless: false },
    { ...fake, env: { BOTADS_BROWSER_MODE: "system" }, platform: "win32" },
  );
  assert.deepEqual(fake.calls, [{ headless: false, channel: "msedge" }]);
  assert.equal("userDataDir" in fake.calls[0], false);
});
test("Lite falls back to Chrome if Edge is unavailable", async () => {
  const fake = engine(["msedge"]);
  const result = await launchBrowser(
    { headless: false },
    { ...fake, env: { BOTADS_BROWSER_MODE: "system" }, platform: "win32" },
  );
  assert.equal(result, fake.browser);
  assert.deepEqual(
    fake.calls.map((c) => c.channel),
    ["msedge", "chrome"],
  );
});
test("Lite reports missing browsers instead of installing or silently launching an unrelated profile", async () => {
  const fake = engine(["msedge", "chrome"]);
  await assert.rejects(
    launchBrowser(
      {},
      { ...fake, env: { BOTADS_BROWSER_MODE: "system" }, platform: "win32" },
    ),
    (error) =>
      error.code === "BROWSER_UNAVAILABLE" && /đầy đủ/.test(error.message),
  );
  assert.equal(fake.calls.length, 2);
});
test("explicit developer browser choice is preserved", async () => {
  const fake = engine();
  await launchBrowser(
    {},
    {
      ...fake,
      env: { BOTADS_BROWSER_MODE: "system", BOTADS_BROWSER_CHANNEL: "chrome" },
    },
  );
  assert.deepEqual(fake.calls, [{ channel: "chrome" }]);
});
