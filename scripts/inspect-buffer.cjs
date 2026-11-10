const { chromium } = require("playwright");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const root = "docs/research/buffer";
  fs.mkdirSync(root, { recursive: true });
  try {
    await page.goto("https://buffer.com/publish", {
      waitUntil: "domcontentloaded",
    });
    const heading = page
      .getByRole("heading", { name: "All Channels", exact: true })
      .first();
    await heading.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${root}/source-calendar-desktop.png` });
    const metadata = await heading.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        font: s.fontFamily,
        size: s.fontSize,
        weight: s.fontWeight,
        color: s.color,
      };
    });
    const newPost = page
      .getByRole("link", { name: "New Post", exact: true })
      .first();
    console.log("newPost links:", await newPost.count());
    // Public marketing demo supports a composer without logging into an account.
    const demos = await page.locator("button").allTextContents();
    fs.writeFileSync(
      `${root}/observations.json`,
      JSON.stringify({ heading: metadata, buttons: demos }, null, 2),
    );
    const createHeading = page
      .getByText("Create Post", { exact: true })
      .first();
    if (await createHeading.count()) {
      await createHeading.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${root}/source-composer-desktop.png` });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await heading.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${root}/source-calendar-mobile.png` });
    console.log(JSON.stringify(metadata));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
