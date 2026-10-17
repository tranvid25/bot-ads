const { launchBrowser } = require('./browser_helper');
const { loadConfig } = require('./settings');
const { loadState, updateGroup } = require('./history');
const { classifyGroup } = require('./group_policy');
const { sleep, checkStop, assertAccountReady, HaltError, cli } = require('./runtime');
async function inspectGroup(page, url) {
  await page.goto(url + '/about', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(2500); await assertAccountReady(page);
  const extract = () => page.evaluate(() => {
    const main = document.querySelector('[role="main"]');
    if (!main) return { name: '', description: '', rules: '' };
    const copy = main.cloneNode(true);
    copy.querySelectorAll('[role="feed"], [role="article"], [role="navigation"], [hidden], [aria-hidden="true"], script, style').forEach(el => el.remove());
    copy.querySelectorAll('p, div, li, h1, h2, h3, section').forEach(el => { el.prepend('\n'); el.append('\n'); });
    return { name: main.querySelector('h1')?.innerText.trim() || '', description: copy.textContent.slice(0, 30000), rules: '' };
  });
  const evidence = await extract();
  const rules = page.getByRole('button', { name: /^(Group rules|Nội quy nhóm|Quy tắc nhóm)$/i }).first();
  if (await rules.isVisible()) {
    await rules.click(); await sleep(1000); await assertAccountReady(page);
    evidence.rules = await page.getByRole('dialog').first().innerText({ timeout: 3000 }).catch(() => '');
  }
  return evidence;
}
async function main({ config = loadConfig(), dependencies = {} } = {}) {
  if (!config.groupSelection.enabled) return;
  const state = loadState();
  const candidates = [...new Set([...config.groups, ...config.discoveredGroups])].filter(url => {
    const group = state.groups[url] || {};
    if (group.blocked || group.advertisingAllowed && group.approvalSource !== 'automatic') return false;
    return group.selection?.policyMode !== config.groupSelection.mode || !group.selection?.checkedAt || Date.now() - new Date(group.selection.checkedAt) >= config.groupSelection.recheckDays * 86400000;
  }).sort((a, b) => {
    const first = state.groups[a] || {}, second = state.groups[b] || {};
    return Number(second.membership === 'joined') - Number(first.membership === 'joined') ||
      (second.syncedAt || '').localeCompare(first.syncedAt || '');
  }).slice(0, config.groupSelection.maxGroupsPerRun);
  if (!candidates.length) return;
  const session = await (dependencies.launchBrowser || launchBrowser)({ headless: config.headless ?? false });
  try {
    for (const url of candidates) {
      checkStop();
      try {
        const evidence = await (dependencies.inspectGroup || inspectGroup)(session.page, url);
        const result = classifyGroup(evidence, config);
        updateGroup(url, { name: evidence.name || state.groups[url]?.name || '', advertisingAllowed: result.allowed,
          approvalSource: 'automatic', selection: { ...result, policyMode: config.groupSelection.mode, checkedAt: new Date().toISOString(), url: url + '/about' } });
        console.log(`${result.allowed ? 'CHỌN' : 'BỎ QUA'} ${url} — ${result.reason}`);
      } catch (error) {
        if (error instanceof HaltError) throw error;
        updateGroup(url, { advertisingAllowed: false, approvalSource: 'automatic', selection: { allowed: false, policyMode: config.groupSelection.mode, reason: error.message, checkedAt: new Date().toISOString() } });
      }
      if (url !== candidates.at(-1)) await sleep(1000);
    }
  } finally { await session.context.close().catch(() => {}); await session.browser.close().catch(() => {}); }
}
if (require.main === module) cli(() => main());
module.exports = { main, inspectGroup };
