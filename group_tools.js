const { canonicalGroup } = require('./storage');
const { loadConfig } = require('./settings');
const { checkStop, sleep, assertAccountReady } = require('./runtime');
async function collectGroups(page, config = loadConfig()) {
  const found = new Map();
  let unchanged = 0;
  for (let scroll = 0; scroll < config.maxScrolls && unchanged < 3; scroll++) {
    checkStop(); await assertAccountReady(page);
    const previous = found.size;
    const links = await page.locator('a[href*="/groups/"]').evaluateAll(els => els.map(el => ({ href: el.href, name: el.innerText.trim() })));
    for (const link of links) {
      const url = canonicalGroup(link.href);
      if (url && !config.excludedKeywords.some(word => word && link.name.toLowerCase().includes(word.toLowerCase()))) {
        if (!found.has(url) || link.name) found.set(url, link.name);
      }
    }
    const moved = await page.evaluate(() => {
      const root = document.scrollingElement;
      const candidates = [root, ...document.querySelectorAll('[role="main"], [role="main"] div, [role="feed"]')]
        .filter(el => el && el.scrollHeight > el.clientHeight + 10 && (el === root || /auto|scroll/.test(getComputedStyle(el).overflowY)));
      candidates.sort((a, b) => b.clientHeight - a.clientHeight);
      const container = candidates[0] || root;
      const before = container.scrollTop;
      container.scrollBy(0, 1500);
      return container.scrollTop !== before;
    });
    unchanged = previous === found.size && !moved ? unchanged + 1 : 0;
    await sleep(1500);
  }
  return found;
}
module.exports = { collectGroups };
