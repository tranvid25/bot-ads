import { testWorker } from "./test-worker.mjs";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { Miniflare, Response } from "miniflare";
import { chromium } from "playwright";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { LEGAL_PATHS } from "../apps/web/legal/pages.mjs";

// Isolated D1/R2 and provider fixture: no real accounts, tokens or public posts.
let mf,
  browser,
  submissions = 0;
let googleNonce = "";
const dist = path.resolve("apps/web/dist");
const server = createServer(async (req, res) => {
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    if (req.url.startsWith("/api/")) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const response = await mf.dispatchFetch(origin + req.url, {
        method: req.method,
        redirect: "manual",
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
  const googleKeys = await generateKeyPair("RS256");
  const googleJwk = {
    ...(await exportJWK(googleKeys.publicKey)),
    kid: "browser-google",
    alg: "RS256",
    use: "sig",
  };
  mf = new Miniflare({
    ...(await testWorker()),
    modulesRules: [{ type: "ESModule", include: ["**/*.mjs"] }],
    compatibilityDate: "2025-09-01",
    d1Databases: ["DB"],
    r2Buckets: ["MEDIA"],
    bindings: {
      AUTH_SECRET: "browser-test-secret-longer-than-thirty-two-characters",
      TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 3).toString("base64"),
      PUBLIC_APP_URL: origin,
      ALLOW_REGISTRATION: "true",
      LINKEDIN_CLIENT_ID: "browser-fixture-client",
      LINKEDIN_CLIENT_SECRET: "browser-fixture-secret",
      GOOGLE_CLIENT_ID: "browser-google.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "browser-google-secret",
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
          const body = await request.json();
          if (
            body.article.body_markdown === "Original DEV content\nSecond line" &&
            Array.isArray(body.article.tags) && body.article.tags.includes("webdev")
          ) {
            submissions++;
          }
          return Response.json(
            { id: 555, url: "https://dev.to/fixture/verified-post" },
            { status: 201 },
          );
        }
        throw new Error("Unexpected provider call in browser test");
      },
    },
    outboundService: async (request) => {
      const url = new URL(request.url);
      if (url.href === "https://www.googleapis.com/oauth2/v3/certs")
        return Response.json({ keys: [googleJwk] });
      if (url.href === "https://oauth2.googleapis.com/token") {
        const idToken = await new SignJWT({
          sub: "browser-google-user",
          email: "google-browser@gmail.com",
          email_verified: true,
          name: "Google Browser",
          nonce: googleNonce,
        })
          .setProtectedHeader({ alg: "RS256", kid: "browser-google" })
          .setIssuer("https://accounts.google.com")
          .setAudience("browser-google.apps.googleusercontent.com")
          .setIssuedAt()
          .setExpirationTime("5m")
          .sign(googleKeys.privateKey);
        return Response.json({ id_token: idToken });
      }
      throw new Error("Unexpected real external request in browser fixture");
    },
  });
  const db = await mf.getD1Database("DB");
  for (const name of [
    "0001_init.sql",
    "0002_marketing.sql",
    "0003_support.sql",
    "0004_google_auth.sql",
    "0005_google_picture.sql",
    "0006_channel_avatar.sql",
    "0007_performance_indexes.sql",
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
  await page.route("https://accounts.google.com/**", async (route) => {
    const url = new URL(route.request().url());
    googleNonce = url.searchParams.get("nonce");
    await route.fulfill({
      status: 302,
      headers: {
        Location: `${origin}/api/auth/google/callback?state=${url.searchParams.get("state")}&code=browser-fixture`,
      },
      body: "",
    });
  });
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/google-auth-desktop.png" });
  await page
    .getByRole("button", { name: "Tiếp tục với Google", exact: true })
    .click();
  await page
    .getByRole("heading", { name: /Good Afternoon/i })
    .waitFor();
  assert.equal(
    (
      await db
        .prepare(
          "SELECT count(*) AS n FROM auth_identities WHERE provider='google'",
        )
        .first()
    ).n,
    1,
  );
  await page.locator(".profile").click();
  await page.screenshot({ path: "docs/research/buffer/local-profile-popover.png" });
  const logoutBtn = page.getByRole("button", { name: "Đăng xuất" });
  if (await logoutBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await logoutBtn.click();
  }
  await page.getByRole("button", { name: "Đăng ký", exact: true }).waitFor();
  await page.unroute("https://accounts.google.com/**");
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
    .getByRole("heading", { name: /Good Afternoon/i })
    .waitFor();
  await page.getByRole("button", { name: "+ Connect Channel" }).click();
  const picker = page.getByRole("region", { name: "Các nền tảng đăng bài" });
  await picker
    .getByRole("heading", { name: "LinkedIn", exact: true })
    .waitFor();
  assert.equal(await picker.locator("article").count(), 6);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "Channel picker without a brand must fit mobile viewport",
  );
  await page.screenshot({
    path: "test-results/channels-onboarding-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await picker
    .getByRole("button", { name: "Chọn LinkedIn", exact: true })
    .click();
  let onboarding = page.getByRole("dialog");
  await onboarding.getByLabel("Tên thương hiệu").waitFor();
  await onboarding.getByRole("button", { name: "Đóng", exact: true }).click();
  await picker
    .getByRole("button", { name: "Chọn DEV Community", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên thương hiệu").fill("XayWebsite Pilot");
  await dialog.getByLabel("Website HTTPS").fill("https://xaywebsite.com");
  await dialog.getByRole("button", { name: "Lưu thương hiệu" }).click();
  await dialog.waitFor({ state: "hidden" });
  assert.equal(
    await page.getByLabel(/^Nền tảng/).inputValue(),
    "dev",
    "Creating a brand must preserve the selected channel and active tab",
  );
  await page.getByLabel(/^Nền tảng/).selectOption("linkedin");
  const startRoute = "**/api/marketing/linkedin/start";
  await page.route(startRoute, (route) =>
    route.fulfill({ status: 502, body: "" }),
  );
  await page
    .getByRole("button", { name: "Kết nối qua LinkedIn", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "phản hồi rỗng (HTTP 502)" })
    .waitFor();
  assert.deepEqual(errors, ["API 502: /api/marketing/linkedin/start"]);
  errors.length = 0; // The intentionally injected outage was handled in the UI.
  await page.unroute(startRoute);
  await page.goto(origin + "/?linkedin=failed&linkedin_reason=client");
  await page
    .getByRole("alert")
    .filter({ hasText: "LinkedIn từ chối Client ID/Client Secret" })
    .waitFor();
  await picker.waitFor();
  await page.getByLabel(/^Nền tảng/).selectOption("medium");
  await page.getByLabel("Tên tài khoản để dễ nhận biết").fill("Pilot Medium");
  await page
    .getByRole("button", { name: "Thêm tài khoản", exact: true })
    .click();
  await page.getByText("Pilot Medium", { exact: true }).first().waitFor();
  await page.getByLabel(/^Nền tảng/).selectOption("dev");
  await page.getByLabel("API key DEV").fill("fixture-api-key");
  await page
    .getByRole("button", { name: "Thêm tài khoản", exact: true })
    .click();
  await page
    .getByText("DEV browser fixture", { exact: true })
    .first()
    .waitFor();
  await mkdir("docs/research/buffer", { recursive: true });
  await page.screenshot({
    path: "docs/research/buffer/local-channels-desktop.png",
    fullPage: true,
  });
  await page.locator(".channel-add-action-btn").click();
  const connectModal = page.getByRole("dialog", { name: "Connect a New Channel" });
  await connectModal.waitFor();
  await page.screenshot({
    path: "docs/research/buffer/local-connect-channel-modal.png",
  });
  await connectModal.getByRole("button", { name: "Đóng" }).click();
  await connectModal.waitFor({ state: "hidden" });

  // Test Create / Ideas view and capture custom scrollbar
  await page.locator(".buffer-sidebar-main-nav").getByRole("button", { name: "Create" }).click();
  await page.getByRole("button", { name: "Generate Ideas" }).waitFor();
  await page.getByRole("button", { name: "Generate Ideas" }).click();
  await page.screenshot({
    path: "docs/research/buffer/local-create-ideas-scrollbar.png",
  });

  async function createPost(provider, title, content) {
    await page
      .getByRole("button", { name: "New", exact: true })
      .click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Tên nội dung").fill(title);
    await d.getByLabel(/^Nội dung/).fill(content);
    await d
      .getByRole("complementary", { name: "Xem trước bài đăng" })
      .getByText(content, { exact: true })
      .waitFor();
    if (provider === "dev") {
      await page.screenshot({
        path: "docs/research/buffer/local-composer-desktop.png",
      });
      await d.getByLabel(/^Tags DEV/).fill("webdev,javascript");
    }
    // Select "Next Available" pill (default) and click publish
    await d.getByRole("button", { name: /Khung giờ tiếp theo/i }).click();
    await d.getByRole("button", { name: /Lên lịch đăng|Đăng ngay/i }).last().click();
    await d.waitFor({ state: "hidden" });
  }
  await page
    .locator(".buffer-channel-node")
    .filter({ hasText: "Pilot Medium" })
    .locator(".channel-subitem")
    .filter({ hasText: "Community" })
    .click();
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
  await page
    .locator(".buffer-channel-node")
    .filter({ hasText: "DEV browser fixture" })
    .locator(".channel-subitem")
    .filter({ hasText: "Community" })
    .click();
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
    .filter({ hasText: "API xác nhận đã đăng" })
    .first()
    .waitFor({ timeout: 25000 });
  assert.ok(submissions >= 1);
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
  await page.screenshot({
    path: "test-results/privacy-desktop.png",
    fullPage: false,
  });
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
    .getByRole("heading", { name: /Good Afternoon/i })
    .waitFor();
  await page.screenshot({
    path: "docs/research/buffer/local-home-desktop.png",
    fullPage: true,
  });
  await page.locator(".channel-subitem").filter({ hasText: "Publish" }).first().click();
  await page.getByLabel("Lọc theo kênh").selectOption("");
  await page.getByRole("button", { name: "Lịch", exact: true }).click();
  const calendar = page.getByRole("region", { name: "Lịch xuất bản" });
  await calendar.getByRole("button").filter({ hasText: "API pilot" }).first().click();
  await page
    .getByRole("dialog")
    .getByText("Original DEV content\nSecond line", { exact: true })
    .waitFor();
  await page.screenshot({
    path: "docs/research/buffer/local-details-desktop.png",
  });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.screenshot({
    path: "docs/research/buffer/local-calendar-desktop.png",
    fullPage: true,
  });
  await calendar.getByRole("button", { name: "Kỳ sau", exact: true }).click();
  assert.equal(await calendar.locator(".calendar-post").count(), 0);
  await calendar.getByRole("button", { name: "Hôm nay", exact: true }).click();
  assert.ok(await calendar.locator(".calendar-post").count() >= 2);
  await calendar.getByLabel("Khoảng lịch").selectOption("month");
  assert.equal(await calendar.locator(".calendar-day").count(), 42);
  await calendar.getByLabel("Khoảng lịch").selectOption("week");
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "Calendar must fit mobile viewport",
  );
  await page.screenshot({
    path: "docs/research/buffer/local-calendar-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Danh sách", exact: true }).click();
  await page.getByLabel("Tìm bài viết").fill("API pilot");
  assert.ok(await page.getByRole("row").count() >= 1);
  await page.getByLabel("Tìm bài viết").fill("");
  await page
    .locator(".sidebar-channel")
    .filter({ hasText: "DEV browser fixture" })
    .click();
  await page
    .getByRole("heading", { name: "DEV browser fixture", exact: true })
    .waitFor();
  assert.ok(await page.getByRole("row").count() >= 1);
  await page.getByLabel("Lọc theo kênh").selectOption("");
  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/marketing-desktop.png",
    fullPage: true,
  });
  await page.locator(".channel-subitem").filter({ hasText: "Community" }).first().click();
  await page.screenshot({
    path: "docs/research/buffer/local-community-desktop.png",
  });
  await page.locator(".channel-subitem").filter({ hasText: "Insights" }).first().click();
  await page.screenshot({
    path: "docs/research/buffer/local-insights-desktop.png",
  });
  await page.locator(".channel-subitem").filter({ hasText: "Community" }).first().click();
  await page.setViewportSize({ width: 390, height: 844 });
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
  await page
    .getByRole("button", { name: "New", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Tên nội dung", { exact: true })
    .fill("Mobile composer");
  await page
    .getByRole("dialog")
    .getByLabel(/^Nội dung/)
    .fill("Mobile preview content");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "Composer must fit mobile viewport",
  );
  await page.screenshot({
    path: "docs/research/buffer/local-composer-mobile.png",
  });
  await page.keyboard.press("Escape");
  assert.deepEqual(errors, []);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await page.getByRole("button", { name: "Liên kết tài khoản Google", exact: true }).waitFor();
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
