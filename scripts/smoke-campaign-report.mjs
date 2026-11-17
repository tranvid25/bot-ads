import { chromium } from "playwright";
import assert from "node:assert/strict";
import { setupFacebookBrowser } from "./helpers/facebook-browser.mjs";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const { base, dashboard, errors } = await setupFacebookBrowser(page);
  dashboard.campaigns = [{ id: "website", name: "XayWebsite campaign", posts: [{ selected: true }], dailyLimit: 3 }];
  dashboard.jobs = [{ id: "job-website", campaign_id: "website", status: "completed", created_at: Date.now() }];
  let rechecked = false;
  await page.route(`${base}/api/campaigns/website/results*`, route => {
    const url = new URL(route.request().url());
    const filtered = url.searchParams.get("status") === "unknown";
    return route.fulfill({ json: {
      campaign: dashboard.campaigns[0], jobs: dashboard.jobs, counts: { success: 120, unknown: 5 },
      total: filtered ? 5 : 125, page: Number(url.searchParams.get("page") || 1), pageSize: 20,
      attempts: [{ id: "attempt", title: "Website content", status: "unknown", job_id: "job-website", group_url: "https://www.facebook.com/groups/website", submittedContent: "Original owner content", recheck_status: rechecked ? "queued" : undefined }],
    } });
  });
  await page.route(`${base}/api/attempts/attempt/recheck`, route => { rechecked = true; return route.fulfill({ json: { message: "Đã yêu cầu kiểm tra, không đăng lại bài." } }); });
  await page.route(`${base}/api/jobs/job-website/events`, route => route.fulfill({ json: { events: [{ text: "Owner job log", created_at: Date.now() }] } }));
  await page.goto(`${base}/?page=campaigns`);
  await page.getByRole("button", { name: "Nhật ký chiến dịch", exact: true }).click();
  const report = page.getByRole("region", { name: "Nhật ký chi tiết chiến dịch" });
  await report.getByRole("heading", { name: "Nhật ký chiến dịch: XayWebsite campaign" }).waitFor();
  assert.ok((await report.getByLabel("Thống kê toàn chiến dịch").innerText()).includes("120"));
  await report.getByLabel("Trạng thái", { exact: true }).selectOption("unknown");
  await report.getByText(/Có 5 kết quả theo bộ lọc/).waitFor();
  await report.getByText("Chi tiết lần gửi", { exact: true }).click();
  await report.getByText("Original owner content", { exact: true }).waitFor();
  await report.getByRole("button", { name: "Kiểm tra lại kết quả", exact: true }).click();
  await report.getByText("Chờ máy đã đăng nhận kiểm tra", { exact: true }).waitFor();
  assert.equal(await report.getByRole("button", { name: "Kiểm tra lại kết quả", exact: true }).isDisabled(), true);
  await report.getByRole("button", { name: "Xem log lượt chạy", exact: true }).click();
  await report.getByText(/Owner job log/).waitFor();
  await page.screenshot({ path: "test-results/campaign-report-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: "test-results/campaign-report-mobile.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log("PASS: campaign journal navigation, full counts, filters, attempt evidence, recheck feedback, logs and mobile.");
} finally { await browser.close(); }
