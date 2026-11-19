const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'botads-simple-session-'));
process.env.BOTADS_DATA_DIR = dir;
const { chromium } = require('playwright');
const managed = require('../packages/automation/managed_session.cjs');
test('manual browser stays open across sequential task leases; wrong account is refused', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const manual = await context.newPage();
  await manual.setContent('<h1>Customer page stays open</h1>');
  await context.addCookies([{ name: 'c_user', value: 'owner', domain: '.facebook.com', path: '/' }]);
  managed.keep({ browser, context, page: manual });
  try {
    for (let i=0; i<2; i++) {
      const task = await managed.lease('owner');
      await task.page.setContent('<h1>Task</h1>');
      assert.notEqual(task.page, manual);
      await task.context.close(); await task.browser.close();
      assert.equal(manual.isClosed(), false);
      assert.equal(browser.isConnected(), true);
      assert.equal(context.pages().length, 1);
    }
    const retained = await managed.lease('owner');
    managed.retain(retained);
    await retained.context.close(); await retained.browser.close();
    assert.equal(retained.page.isClosed(), false, 'membership questions must stay open after task release');
    assert.equal(manual.isClosed(), false);
    assert.equal(context.pages().length, 2);
    await context.addCookies([{ name: 'c_user', value: 'another', domain: '.facebook.com', path: '/' }]);
    await assert.rejects(managed.lease('owner'), { code: 'FACEBOOK_ACCOUNT_CHANGED' });
  } finally { await managed.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});
test('automatic login completes without closing the authenticated window', async () => {
  const { EventEmitter } = require('node:events');
  const browser = Object.assign(new EventEmitter(), { isConnected: () => true });
  const context = Object.assign(new EventEmitter(), { pages: () => [{ url: () => 'https://www.facebook.com/', isClosed: () => false }], cookies: async () => [{ name:'c_user', value:'owner' }] });
  let saves = 0;
  await require('../packages/automation/login_session.cjs').waitForLogin({ browser, context }, { autoFinish: true, save: async () => saves++, sleep: async () => {}, log() {} });
  assert.equal(saves, 2);
  assert.equal(browser.listenerCount('disconnected'), 0);
  assert.equal(browser.isConnected(), true);
});
