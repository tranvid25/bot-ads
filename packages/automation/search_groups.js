const { launchBrowser } = require('./browser_helper');
const { read, write } = require('./storage');
const { loadConfig } = require('./settings');
const { updateGroup, loadState } = require('./history');
const { collectGroups } = require('./group_tools');
const { sleep, assertAccountReady, cli } = require('./runtime');
async function main({ config = loadConfig(), query } = {}) {
  const session = await launchBrowser({ headless: config.headless ?? false });
  const found = new Map();
  try {
    for (const keyword of query ? [query] : config.searchKeywords) {
      console.log('Tìm nhóm:', keyword);
      await session.page.goto(`https://www.facebook.com/search/groups/?q=${encodeURIComponent(keyword)}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await sleep(3000); await assertAccountReady(session.page);
      const groups = await collectGroups(session.page, config);
      for (const [url, name] of groups) found.set(url, name);
    }
    const raw = read('config.json', {});
    raw.discoveredGroups = [...new Set([...(raw.discoveredGroups || []), ...found.keys()])];
    write('config.json', raw);
    const state = loadState();
    if (found.size) state.lastDiscoveryAt = new Date().toISOString();
    for (const [url, name] of found) state.groups[url] = { ...state.groups[url], name: name || state.groups[url]?.name || '', discoveredAt: new Date().toISOString() };
    write('automation_state.json', state);
    console.log(`Đã tìm ${found.size} nhóm. Bước tiếp theo tự đánh giá và chọn nhóm.`);
    return [...found.keys()];
  } finally { await session.context.close().catch(() => {}); await session.browser.close().catch(() => {}); }
}
if (require.main === module) cli(() => main({ query: process.argv[2] }));
module.exports = { main };
