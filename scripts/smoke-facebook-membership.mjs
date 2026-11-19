import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { setupFacebookBrowser } from './helpers/facebook-browser.mjs';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const { base, dashboard, library, errors } = await setupFacebookBrowser(page);
  dashboard.devices = [{ id: 'pc', facebook_ready: 1, last_seen: Date.now() }];
  library.groups = ['Website owners', 'Small business', 'Questions group'].map((name, i) => ({
    id: 'g' + i, name, url: `https://www.facebook.com/groups/g${i}`, source: 'search', account_key: 'a'.repeat(64),
    membership: 'unknown', eligibility: 'unreviewed', reason: 'Kiểm tra nội quy trước khi duyệt.',
  }));
  const calls = [];
  let holdLibrary = false, releaseLibrary, notifyHeld;
  const libraryHeld = new Promise(resolve => { notifyHeld = resolve; });
  await page.route(`${base}/api/facebook`, async route => {
    if (holdLibrary) {
      holdLibrary = false;
      const stale = structuredClone(library);
      await new Promise(resolve => {
        releaseLibrary = async () => { await route.fulfill({ json: stale }); resolve(); };
        notifyHeld();
      });
    } else await route.fulfill({ json: library });
  });
  await page.route(`${base}/api/facebook/groups/membership`, route => {
    const input = route.request().postDataJSON(); calls.push(input);
    const groups = library.groups.filter(g => input.ids.includes(g.id));
    const results = groups.map((g, i) => ({ group_id: g.id, status: input.operation === 'open' ? 'manual_required' : i ? 'requested' : 'joined', note: input.operation === 'open' ? 'Hoàn tất câu hỏi trên máy rồi kiểm tra trạng thái.' : 'Kết quả fixture' }));
    results.forEach(result => Object.assign(library.groups.find(g => g.id === result.group_id), { membership: result.status, membership_note: result.note }));
    library.tasks.unshift({ id: 't' + calls.length, kind: 'membership', status: 'completed', groups_seen: groups.length,
      config: { operation: input.operation, limit: groups.length, groups }, results });
    return route.fulfill({ json: { id: 't' + calls.length, count: groups.length } });
  });
  await page.goto(`${base}/?page=facebook`);
  await page.getByRole('checkbox', { name: 'Chọn nhóm Website owners', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Chọn nhóm Small business', exact: true }).check();
  const bulk = page.locator('[aria-label="Tham gia các nhóm đã chọn"]');
  holdLibrary = true;
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await libraryHeld;
  await bulk.getByRole('button', { name: 'Xin tham gia nhóm đã chọn', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Đã xếp lượt xử lý 2 nhóm.' }).waitFor();
  await releaseLibrary();
  await page.getByText('Đã tham gia: 1 · Chờ quản trị viên: 1', { exact: true }).waitFor();
  assert.deepEqual(calls[0], { ids: ['g0', 'g1'], operation: 'join', confirmed: true });
  assert.equal(library.groups[0].eligibility, 'unreviewed', 'membership must not approve marketing');
  await page.getByText('Chi tiết từng nhóm', { exact: true }).first().click();
  await page.locator('.fb-task-result').filter({ hasText: 'Website owners' }).waitFor();
  await bulk.getByRole('button', { name: 'Kiểm tra trạng thái', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.fb-task').length === 2);
  assert.equal(calls[1].operation, 'check');
  await page.locator('.fb-group-row').filter({ hasText: 'Questions group' }).getByRole('button', { name: 'Mở trên máy BotAds', exact: true }).click();
  await page.locator('.fb-group-row').filter({ hasText: 'Questions group' }).getByText('Cần bạn hoàn tất câu hỏi', { exact: false }).waitFor();
  assert.equal(calls[2].operation, 'open'); assert.deepEqual(calls[2].ids, ['g2']);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  assert.deepEqual(errors, []);
  console.log('PASS: select groups → join → per-group outcomes → check → open authenticated desktop; stale in-flight refresh cannot hide a new task; mobile layout fits.');
} finally { await browser.close(); }
