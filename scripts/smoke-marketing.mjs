import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { Miniflare, Response } from "miniflare";
import { chromium } from "playwright";
import { LEGAL_PATHS } from "../apps/web/legal/pages.mjs";

// Isolated D1/R2 and provider fixture: no real accounts, tokens or public posts.
let mf,
  browser,
  submissions = 0;
const dist = path.resolve("apps/web/dist");
const server = createServer(async (req, res) => {
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    if (req.url.startsWith("/api/")) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const response = await mf.dispatchFetch(origin + req.url, {
        method: req.method,
        headers: req.headers,
        body: ["GET", "HEAD"].includes(req.method)
          ? undefined
          : Buffer.concat(chunks),
      });
      res.statusCode = response.status;
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() !== "set-cookie") res.setHeader(key, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) res.setHeader("Set-Cookie", cookies);
      res.end(Buffer.from(await response.arrayBuffer()));
    } else {
      const pathname = new URL(req.url, origin).pathname;
      const legalPath = pathname.replace(/\/$/, "");
      const asset = LEGAL_PATHS.includes(legalPath)
        ? path.join(dist, `${legalPath.slice(1)}.html`)
        : /^(\/assets\/|\/brand\/|\/favicon\.ico$|\/site\.webmanifest$|\/legal\.(js|css)$)/.test(
              pathname,
            )
          ? path.resolve(dist, `.${decodeURIComponent(pathname)}`)
          : path.join(dist, "index.html");
      if (!asset.startsWith(dist + path.sep))
        throw new Error("Invalid asset path");
      res.setHeader(
        "Content-Type",
        asset.endsWith(".js")
          ? "text/javascript"
          : asset.endsWith(".css")
            ? "text/css"
            : asset.endsWith(".png")
              ? "image/png"
              : asset.endsWith(".ico")
                ? "image/x-icon"
                : asset.endsWith(".webmanifest")
                  ? "application/manifest+json"
                  : "text/html",
      );
      res.end(await readFile(asset));
    }
  } catch (e) {
    res.statusCode = 500;
    res.end("Local smoke fixture failed");
  }
});
try {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  mf = new Miniflare({
    modules: true,
    scriptPath: "apps/api/worker.mjs",
    modulesRules: [{ type: "ESModule", include: ["**/*.mjs"] }],
    compatibilityDate: "2025-09-01",
    d1Databases: ["DB"],
    r2Buckets: ["MEDIA"],
    bindings: {
      AUTH_SECRET: "browser-test-secret-longer-than-thirty-two-characters",
      TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 3).toString("base64"),
      PUBLIC_APP_URL: origin,
      ALLOW_REGISTRATION: "true",
    },
    serviceBindings: {
      PROVIDER_HTTP: async (request) => {
        const url = new URL(request.url);
        if (url.pathname === "/api/users/me")
          return Response.json({
            id: 55,
            name: "DEV browser fixture",
            username: "fixture",
          });
        if (url.pathname === "/api/articles") {
          submissions++;
          const body = await request.json();
          assert.equal(
            body.article.body_markdown,
            "Original DEV content\nSecond line",
          );
          assert.deepEqual(body.article.tags, ["webdev", "javascript"]);
          return Response.json(
            { id: 555, url: "https://dev.to/fixture/verified-post" },
            { status: 201 },
          );
        }
        throw new Error("Unexpected provider call in browser test");
      },
    },
  });
  const db = await mf.getD1Database("DB");
  for (const name of [
    "0001_init.sql",
    "0002_marketing.sql",
    "0003_support.sql",
  ]) {
    const sql = await readFile(`apps/api/migrations/${name}`, "utf8");
    await db.batch(
      sql
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => db.prepare(s)),
    );
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (response) => {
    if (response.url().startsWith(origin + "/api/") && response.status() >= 500)
      errors.push(
        `API ${response.status()}: ${new URL(response.url()).pathname}`,
      );
  });
  await page.goto(origin);
  for (const route of LEGAL_PATHS) {
    const response = await page.request.get(origin + route);
    assert.equal(response.status(), 200);
    const html = await response.text();
    assert.ok(html.includes("XayWebsite") && html.includes('<main id="main">'));
    assert.equal(
      html.includes('id="root"'),
      false,
      "Public policy must contain readable HTML, not an empty SPA shell",
    );
  }
  await page.getByRole("button", { name: "Đăng ký", exact: true }).waitFor();
  await page.waitForFunction(() => {
    const logo = document.querySelector(".brand-mark");
    return (
      logo instanceof HTMLImageElement && logo.complete && logo.naturalWidth > 0
    );
  });
  const faviconPath = await page
    .locator('link[rel="icon"][sizes="32x32"]')
    .getAttribute("href");
  const favicon = await page.request.get(origin + faviconPath);
  assert.equal(favicon.status(), 200);
  assert.ok(favicon.headers()["content-type"].includes("image/png"));
  assert.deepEqual(
    [...(await favicon.body()).subarray(0, 4)],
    [137, 80, 78, 71],
  );
  await page.getByRole("button", { name: "Đăng ký", exact: true }).click();
  await page.getByLabel("Tên của bạn").fill("Marketing Pilot");
  await page
    .getByLabel("Email", { exact: true })
    .fill("browser-pilot@example.com");
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("browser-test-password-123");
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Từ một ý tưởng, đến đúng người đọc." })
    .waitFor();
  await page.getByRole("button", { name: "Tạo thương hiệu đầu tiên" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên thương hiệu").fill("XayWebsite Pilot");
  await dialog.getByLabel("Website HTTPS").fill("https://xaywebsite.com");
  await dialog.getByRole("button", { name: "Lưu thương hiệu" }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByRole("tab", { name: "Kết nối kênh" }).click();
  await page.getByLabel(/^Nền tảng/).selectOption("medium");
  await page.getByLabel("Tên tài khoản để dễ nhận biết").fill("Pilot Medium");
  await page
    .getByRole("button", { name: "Thêm tài khoản", exact: true })
    .click();
  await page.getByText("Pilot Medium", { exact: true }).waitFor();
  await page.getByLabel(/^Nền tảng/).selectOption("dev");
  await page.getByLabel("API key DEV").fill("fixture-api-key");
  await page
    .getByRole("button", { name: "Thêm tài khoản", exact: true })
    .click();
  await page.getByText("DEV browser fixture", { exact: true }).waitFor();
  async function createPost(provider, title, content) {
    await page
      .getByRole("button", { name: "Tạo bài tự soạn", exact: true })
      .click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Tên nội dung", { exact: true }).fill(title);
    await d
      .getByRole("checkbox", {
        name: provider === "dev" ? "DEV Community" : "Medium",
        exact: true,
      })
      .check();
    await d.getByRole("checkbox", { name: "LinkedIn", exact: true }).uncheck();
    await d.getByLabel(/^Nội dung/).fill(content);
    if (provider === "dev")
      await d.getByLabel(/^Tags DEV/).fill("webdev,javascript");
    await d.getByRole("button", { name: "Xem trước nội dung" }).click();
    await d.getByRole("button", { name: "Lưu bản nháp" }).click();
    await d.waitFor({ state: "hidden" });
    const card = page
      .locator(".mk-post")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    await card.getByRole("button", { name: "Duyệt nội dung" }).click();
    await card.getByRole("button", { name: "Lên lịch đăng" }).click();
    const schedule = page.getByRole("dialog");
    await schedule.getByRole("checkbox").first().check();
    await schedule.getByRole("button", { name: "Xác nhận lịch đăng" }).click();
    await schedule.waitFor({ state: "hidden" });
  }
  await page.getByRole("tab", { name: "Kho nội dung" }).click();
  await createPost(
    "medium",
    "Manual pilot",
    "Helpful content written by the owner.",
  );
  const manualRow = page.getByRole("row").filter({ hasText: "Manual pilot" });
  await manualRow
    .getByRole("button", { name: "Tôi đã đăng · nhập link" })
    .click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Permalink bài viết")
    .fill("https://medium.com/@pilot/manual-post");
  await dialog.getByRole("button", { name: "Ghi nhận tôi đã đăng" }).click();
  await dialog.waitFor({ state: "hidden" });
  await manualRow.getByText("Bạn xác nhận đã đăng").waitFor();
  await manualRow.getByRole("button", { name: "Nhập số liệu" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Lượt về website").fill("12");
  await dialog.getByLabel("Lead nhận được").fill("2");
  await dialog.getByLabel("Nguồn dữ liệu / kỳ đo").fill("GA4 pilot fixture");
  await dialog.getByRole("button", { name: "Lưu số liệu" }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByRole("tab", { name: "Kho nội dung" }).click();
  await createPost("dev", "API pilot", "Original DEV content\nSecond line");
  await db
    .prepare(
      "UPDATE marketing_publications SET scheduled_at=? WHERE status='scheduled'",
    )
    .bind(Date.now() - 1000)
    .run();
  await page.getByRole("button", { name: "Xử lý bài đến hạn" }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "API pilot" })
    .getByText("API xác nhận đã đăng", { exact: true })
    .waitFor({ timeout: 25000 });
  assert.equal(submissions, 1);
  await page.goto(origin + "/support?topic=deletion");
  await page.getByLabel("Tên / Name", { exact: true }).fill("Marketing Pilot");
  await page
    .getByLabel("Email phản hồi / Reply email")
    .fill("browser-pilot@example.com");
  assert.equal(
    await page.getByLabel("Loại yêu cầu / Request type").inputValue(),
    "deletion",
  );
  await page
    .getByLabel("Mô tả / Description")
    .fill("Please review deletion of this isolated test fixture only.");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Gửi yêu cầu / Submit request" })
    .click();
  await page.getByRole("status").filter({ hasText: "Đã tiếp nhận" }).waitFor();
  const tickets = await db
    .prepare(
      "SELECT count(*) AS n FROM support_requests WHERE category='deletion'",
    )
    .first();
  assert.equal(tickets.n, 1);
  await page.goto(origin + "/privacy");
  await page.screenshot({ path: "test-results/privacy-desktop.png", fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin + "/privacy");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "Privacy page must fit mobile viewport",
  );
  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/privacy-mobile.png",
    fullPage: false,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(origin);
  await page
    .getByRole("heading", { name: "Từ một ý tưởng, đến đúng người đọc." })
    .waitFor();
  await page.getByRole("tab", { name: "Lịch & kết quả" }).click();
  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/marketing-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "Kho nội dung" }).click();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "Marketing must fit mobile viewport",
  );
  await page.screenshot({
    path: "test-results/marketing-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: signup, brand, manual/DEV connections, exact content, tags, preview, approval, schedule, manual confirmation, metrics, cloud publish fixture, desktop/mobile. No real external posts.",
  );
} catch (error) {
  const page = browser?.contexts()[0]?.pages()[0];
  if (page) {
    await mkdir("test-results", { recursive: true });
    await page
      .screenshot({
        path: "test-results/marketing-failure.png",
        fullPage: true,
      })
      .catch(() => {});
    console.error((await page.locator("body").innerText()).slice(-7000));
  }
  throw error;
} finally {
  if (browser) await browser.close();
  if (mf) await mf.dispose();
  await new Promise((resolve) => server.close(resolve));
}
