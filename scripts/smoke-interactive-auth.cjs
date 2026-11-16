const assert = require('node:assert/strict');
const { launchBrowser } = require('../packages/browser-launcher.cjs');
const { saveAuth, setManagedAuth } = require('../packages/automation/browser_helper');
(async () => {
  const browser = await launchBrowser({ headless: true }, { env: { BOTADS_BROWSER_MODE: 'system' } });
  try {
    const context = await browser.newContext();
    await context.route('**/*', route => route.fulfill({
      contentType: 'text/html',
      body: new URL(route.request().url()).hostname === 'www.facebook.com'
        ? '<script>localStorage.setItem("fixture", "saved")</script><iframe src="https://www.fbsbx.com/fixture"></iframe>'
        : '<script>localStorage.setItem("auxiliary", "fixture")</script>',
    }));
    const page = await context.newPage();
    await page.goto('https://www.facebook.com/', { waitUntil: 'load' });
    await context.addCookies([{ name: 'c_user', value: 'fixture', domain: '.facebook.com', path: '/', secure: true }]);
    const cdp = await browser.newBrowserCDPSession();
    await cdp.send('Target.setDiscoverTargets', { discover: true });
    let temporaryTargets = 0;
    cdp.on('Target.targetCreated', ({ targetInfo }) => {
      if (targetInfo.type === 'page') temporaryTargets++;
    });
    await context.storageState();
    assert.ok(temporaryTargets > 0, 'Baseline storageState should reproduce a temporary browser tab');
    temporaryTargets = 0;
    let newPages = 0, saves = 0, snapshot;
    context.on('page', () => { newPages++; });
    setManagedAuth({ save: async state => { saves++; snapshot = state; } });
    for (let i = 0; i < 5; i++) await saveAuth(context, { interactive: true });
    assert.equal(newPages, 0, 'Saving interactive state must not open temporary tabs');
    assert.equal(temporaryTargets, 0, 'No temporary tab targets, including internal Playwright pages');
    assert.equal(context.pages().length, 1);
    assert.equal(page.isClosed(), false);
    assert.equal(saves, 1);
    assert.equal(snapshot.cookies.find(c => c.name === 'c_user').value, 'fixture');
    assert.equal(snapshot.origins[0].localStorage[0].value, 'saved');
    console.log('PASS: real browser saved Facebook state with an fbsbx iframe five times without opening/closing tabs.');
  } finally {
    setManagedAuth(null);
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
