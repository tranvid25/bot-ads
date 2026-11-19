const { _electron } = require('playwright');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const env = { ...process.env, BOTADS_DESKTOP_DATA_DIR: path.resolve(`test-results/packaged-${Date.now()}`), BOTADS_TEST_HIDDEN: '1' };
  delete env.ELECTRON_RUN_AS_NODE;
  const desktop = await _electron.launch({ executablePath: path.resolve(process.env.BOTADS_PACKAGED_EXE || 'release/win-unpacked/BotAds.exe'), args: [], env, timeout: 45000 });
  try {
    const window = await desktop.firstWindow();
    await window.locator('#pair-form').waitFor();
    const result = await desktop.evaluate(async ({ app }) => {
      const load = process.mainModule.require.bind(process.mainModule);
      const path = load('node:path');
      const metadata = load(path.join(app.getAppPath(), 'package.json'));
      process.env.BOTADS_BROWSER_MODE = metadata.botadsBrowserMode || 'bundled';
      process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(process.resourcesPath, 'browsers');
      process.env.BOTADS_DATA_DIR = app.getPath('userData');
      const { launchBrowser } = load(path.join(app.getAppPath(), 'packages/automation/browser_helper.js'));
      const session = await launchBrowser({ headless: true });
      try {
        await session.page.setContent('<title>BotAds packaged browser check</title>');
        return { packaged: app.isPackaged, version: app.getVersion(), title: await session.page.title(),
          membership: typeof load(path.join(app.getAppPath(), 'packages/automation/membership_only.cjs')).main,
          membershipClient: typeof load(path.join(app.getAppPath(), 'apps/companion/membership-client.cjs')) };
      } finally { await session.context.close(); await session.browser.close(); }
    });
    assert.equal(result.packaged, true);
    assert.equal(result.version, require('../package.json').version);
    assert.equal(result.membership, 'function');
    assert.equal(result.membershipClient, 'function');
    assert.equal(result.title, 'BotAds packaged browser check');
    console.log('PASS: packaged Windows executable opens with the current version; membership modules load and configured browser runs. No Facebook actions.');
  } finally { await desktop.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
