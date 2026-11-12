const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { scenario } = require("./helpers/social-browser.cjs");
const {
  resultFromResponse,
} = require("../apps/companion/social/instagram-result.cjs");
let browser;
before(async () => {
  browser = await chromium.launch({ headless: true });
});
after(async () => {
  await browser.close();
});
for (const provider of ["threads", "instagram"]) {
  test(`${provider} browser adapter fills exact content, reserves once and confirms its post link`, async () => {
    const { result, clicks, reserves } = await scenario(browser, provider);
    assert.equal(result.status, "published", JSON.stringify(result));
    assert.equal(result.remoteId, "created");
    assert.equal(clicks, 1);
    assert.equal(reserves, 1);
  });
  test(`${provider} wrong account and cancellation cannot click submit`, async () => {
    const wrong = await scenario(browser, provider, { actorId: "other" });
    assert.equal(wrong.result.status, "needs_reauth");
    assert.equal(wrong.clicks, 0);
    assert.equal(wrong.reserves, 0);
    const canceled = await scenario(browser, provider, { deny: true });
    assert.equal(canceled.result.status, "failed");
    assert.equal(canceled.clicks, 0);
    assert.equal(canceled.reserves, 1);
  });
}
test("Instagram observed response must match exact account and caption", () => {
  const value = {
    status: "ok",
    media: {
      user: { username: "fixture" },
      caption: { text: "content" },
      code: "created",
    },
  };
  assert.equal(
    resultFromResponse(value, "fixture", "content").remoteId,
    "created",
  );
  assert.equal(resultFromResponse(value, "other", "content"), null);
  assert.equal(resultFromResponse(value, "fixture", "different"), null);
});
