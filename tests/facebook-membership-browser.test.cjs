const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { perform } = require('../packages/automation/membership_browser.cjs');
const runtime = require('../packages/automation/runtime');
let browser, context, page, clicks = 0;
const url = 'https://www.facebook.com/groups/fixture';
const task = { group: { id: 'fixture', name: 'Fixture', url, allowJoin: true }, operation: 'join', expectedUid: 'owner' };
before(async () => {
  browser = await chromium.launch({ headless: true }); context = await browser.newContext();
  await context.addCookies([{ name: 'c_user', value: 'owner', domain: '.facebook.com', path: '/' }]);
  page = await context.newPage();
  page.on('console', message => { if (message.text() === 'join-click') clicks++; });
});
after(async () => { runtime.setExecutionGuard(null); await browser?.close(); });
async function fixture(mode) {
  clicks = 0;
  await page.unroute('**/*');
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: `<main><h1>Fixture group</h1><button id="join" onclick="console.log('join-click'); ${mode === 'questions' ? "this.remove();document.querySelector('main').innerHTML += '<div role=dialog><h2>Membership questions</h2><textarea></textarea><button>Submit</button></div>'" : `this.textContent='${mode === 'pending' ? 'Cancel request' : 'Joined'}'`}">Join group</button></main>` }));
}
test('joins once and distinguishes immediately joined from pending admin approval', async () => {
  for (const [mode, status] of [['joined', 'joined'], ['pending', 'requested']]) {
    await fixture(mode);
    assert.equal((await perform(page, task, { sleep: async () => {} })).status, status);
    assert.equal(clicks, 1);
  }
});
test('questions require user action and are never auto answered or submitted', async () => {
  await fixture('questions');
  assert.equal((await perform(page, task, { sleep: async () => {} })).status, 'manual_required');
  assert.equal(await page.getByRole('textbox').inputValue(), '');
  assert.equal(clicks, 1);
});
test('check/open operations and uncertain prior results never send a join request', async () => {
  for (const overrides of [{ operation: 'check' }, { operation: 'open' }, { group: { ...task.group, allowJoin: false } }]) {
    await fixture('joined');
    assert.equal((await perform(page, { ...task, ...overrides }, { sleep: async () => {} })).status, 'not_joined');
    assert.equal(clicks, 0);
  }
});
test('wrong Facebook account stops before Join, and stop guard is honored', async () => {
  await fixture('joined');
  await assert.rejects(perform(page, { ...task, expectedUid: 'another' }), { code: 'FACEBOOK_ACCOUNT_CHANGED' });
  assert.equal(clicks, 0);
  runtime.setExecutionGuard(() => { throw new runtime.HaltError('Canceled'); });
  await assert.rejects(perform(page, task), /Canceled/);
  runtime.setExecutionGuard(null);
  assert.equal(clicks, 0);
});
test('manual questions keep the authenticated browser page open for the customer', async () => {
  let closes = 0, retained = 0, focused = 0;
  const session = { page: { bringToFront: async () => focused++ }, context: { close: async () => closes++ }, browser: { close: async () => closes++ } };
  const result = await require('../packages/automation/membership_only.cjs').main(task, {
    launchBrowser: async () => session, perform: async () => ({ status: 'manual_required', note: 'Answer questions' }), retain: () => retained++,
  });
  assert.equal(result.status, 'manual_required'); assert.equal(closes, 0); assert.equal(retained, 1); assert.equal(focused, 1);
});
