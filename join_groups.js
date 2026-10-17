const { launchBrowser } = require('./browser_helper');
const { loadConfig } = require('./settings');
const { loadState, updateGroup } = require('./history');
const { sleep, assertAccountReady, checkStop, HaltError, cli } = require('./runtime');
async function joinGroup(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(3000); await assertAccountReady(page);
  const joined = page.getByRole('button', { name: /^(Joined|Đã tham gia)$/i }).first();
  const requested = page.getByRole('button', { name: /^(Cancel request|Hủy yêu cầu|Requested|Đã gửi yêu cầu)$/i }).first();
  if (await joined.isVisible()) return 'joined';
  if (await requested.isVisible()) return 'requested';
  const button = page.getByRole('button', { name: /^(Join group|Tham gia nhóm)$/i }).first();
  if (!await button.isVisible()) return 'not_found';
  await button.click(); await sleep(2000); await assertAccountReady(page);
  if (await page.getByRole('dialog').first().isVisible()) return 'manual_required';
  if (await joined.isVisible()) return 'joined';
  if (await requested.isVisible()) return 'requested';
  return 'unknown';
}
async function main({ config = loadConfig(), dependencies = {} } = {}) {
  const state = loadState();
  const targets = config.discoveredGroups.filter(url => {
    const group = state.groups[url] || {};
    return group.advertisingAllowed === true && !require('./group_policy').permissionReason(group, config) && !['joined', 'requested', 'manual_required', 'unknown'].includes(group.membership);
  }).slice(0, config.maxJoinsPerRun);
  if (!targets.length) { console.log('Không có nhóm đã cho phép cần tham gia.'); return; }
  const session = await (dependencies.launchBrowser || launchBrowser)({ headless: config.headless ?? false });
  try {
    for (const url of targets) {
      checkStop();
      try {
        const membership = await (dependencies.joinGroup || joinGroup)(session.page, url);
        updateGroup(url, { membership }); console.log(url, membership);
        if (membership === 'joined') {
          const { read, write } = require('./storage');
          const raw = read('config.json', {});
          raw.groups = [...new Set([...(raw.groups || []), url])];
          write('config.json', raw);
        }
        if (membership === 'unknown') console.warn('Chưa rõ kết quả xin tham gia; giữ trạng thái nhóm này và tiếp tục nhóm khác.');
        if (membership === 'manual_required') console.log('Nhóm có câu hỏi/nội quy: hoàn tất thủ công trên Facebook rồi đồng bộ lại.');
      } catch (error) {
        if (error instanceof HaltError) throw error;
        // The request may have reached Facebook before a timeout; do not blindly repeat it.
        updateGroup(url, { membership: 'unknown', joinError: error.message });
        console.warn(`Bỏ qua nhóm ${url} do lỗi: ${error.message}. Tiếp tục nhóm khác.`);
      }
      if (url !== targets.at(-1)) await (dependencies.sleep || sleep)(config.minDelaySeconds * 1000);
    }
  } finally { await session.context.close().catch(() => {}); await session.browser.close().catch(() => {}); }
}
if (require.main === module) cli(() => main());
module.exports = { main, joinGroup };
