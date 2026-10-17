const { launchBrowser } = require('./browser_helper');
const { read, write } = require('./storage');
const { loadConfig } = require('./settings');
const { loadState } = require('./history');
const { collectGroups } = require('./group_tools');
const { sleep, assertAccountReady, cli } = require('./runtime');
async function main({ config = loadConfig() } = {}) {
  const session = await launchBrowser({ headless: config.headless ?? false });
  try {
    await session.page.goto('https://www.facebook.com/groups/joins/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(4000); await assertAccountReady(session.page);
    const found = await collectGroups(session.page, { ...config, excludedKeywords: [] });
    if (!found.size) { console.warn('Chưa đọc được nhóm đã tham gia. Giữ nguyên danh sách cũ và tiếp tục các bước còn lại.'); return []; }
    const raw = read('config.json', {});
    // Merge: a partial/virtualized listing must not erase previously configured groups.
    raw.groups = [...new Set([...(raw.groups || []), ...found.keys()])];
    write('config.json', raw);
    const state = loadState();
    for (const [url, name] of found) state.groups[url] = { ...state.groups[url], name: name || state.groups[url]?.name || '', membership: 'joined', syncedAt: new Date().toISOString() };
    write('automation_state.json', state);
    console.log(`Đã đồng bộ ${found.size} nhóm. Nhóm chưa cho phép quảng cáo vẫn bị bỏ qua.`);
    return [...found.keys()];
  } finally { await session.context.close().catch(() => {}); await session.browser.close().catch(() => {}); }
}
if (require.main === module) cli(() => main());
module.exports = { main };
