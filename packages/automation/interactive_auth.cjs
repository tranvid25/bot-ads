// storageState() visits unseen origins in a temporary page. During interactive
// login, read only existing frames so saving cannot open/focus/close any tabs.
async function interactiveState(context) {
  const cookies = await context.cookies();
  const origins = new Map();
  for (const page of context.pages()) {
    if (page.isClosed()) continue;
    for (const frame of page.frames()) {
      let origin;
      try {
        const url = new URL(frame.url());
        if (url.protocol !== 'https:' || !/(^|\.)facebook\.com$/.test(url.hostname)) continue;
        origin = url.origin;
      } catch { continue; }
      if (origins.has(origin)) continue;
      try {
        const localStorage = await frame.evaluate(() =>
          Object.keys(window.localStorage).sort().map(name => ({ name, value: window.localStorage.getItem(name) })));
        if (localStorage.length) origins.set(origin, { origin, localStorage });
      } catch {
        // A navigating/detached frame can be captured on the next polling pass.
      }
    }
  }
  return { cookies, origins: [...origins.values()] };
}
module.exports = { interactiveState };
