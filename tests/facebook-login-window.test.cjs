const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { waitForLogin } = require('../packages/automation/login_session.cjs');
const fs = require('node:fs');
const vm = require('node:vm');

function stoppedRuntime() {
  const sandbox = { module: { exports: {} }, Date, setTimeout, process,
    require: name => name === 'fs' ? { existsSync: () => true }
      : name === './storage' ? { file: name => name } : require(name) };
  vm.runInNewContext(fs.readFileSync('packages/automation/runtime.js', 'utf8'), sandbox);
  return sandbox.module.exports;
}

test('login stays open with a previous STOP file and leaves the stop flag effective for automation', async () => {
  const runtime = stoppedRuntime();
  const s = session(); let pauses = 0, saves = 0, closes = 0;
  s.page = { goto: async () => {} };
  s.context.close = s.browser.close = async () => { closes++; };
  const sandbox = { module: { exports: {} }, console,
    require: name => name === './browser_helper'
      ? { launchBrowser: async () => s, saveAuth: async (_, options) => { assert.equal(options.interactive, true); saves++; } }
      : name === './runtime' ? { sleep: async (ms, options) => {
        await runtime.sleep(0, options);
        if (++pauses === 2) s.browser.emit('disconnected');
      } } : { waitForLogin } };
  vm.runInNewContext(fs.readFileSync('packages/automation/login.js', 'utf8'), sandbox);
  await sandbox.module.exports.main();
  assert.equal(saves, 2);
  assert.equal(pauses, 2);
  assert.equal(closes, 2);
  await assert.rejects(runtime.sleep(0), /resume/);
});

test('allowing a previous STOP file still honors a new stop command', async () => {
  const runtime = stoppedRuntime();
  runtime.setExecutionGuard(() => { throw new Error('new stop command'); });
  await assert.rejects(runtime.sleep(0, { allowStopped: true }), /new stop command/);
});
function session() {
  const browser = new EventEmitter(), context = new EventEmitter();
  context.pages = () => [{ isClosed: () => false, url: () => 'https://www.facebook.com/' }];
  context.cookies = async () => [{ name: 'c_user', value: 'fixture' }];
  return { browser, context };
}
test('authenticated login remains open past six minutes until the user closes it', async () => {
  const s = session(); let iterations = 0, saves = 0, time = 0;
  await waitForLogin(s, { save: async () => { saves++; }, now: () => time, log() {},
    sleep: async () => { time += 7 * 60000; if (++iterations === 3) s.browser.emit('disconnected'); } });
  assert.equal(iterations, 3); assert.equal(saves, 3);
  assert.equal(s.browser.listenerCount('disconnected'), 0);
});

test('closing the last page completes login even while browser/context remain connected', async () => {
  const s = session(); let saves = 0;
  s.browser.isConnected = () => true;
  await waitForLogin(s, { save: async () => { saves++; }, log() {},
    sleep: async () => { s.context.pages = () => []; } });
  assert.equal(saves, 1);
  assert.equal(s.browser.isConnected(), true);
});

test('closing the last page before authentication does not connect', async () => {
  const s = session(); s.context.cookies = async () => [];
  await assert.rejects(waitForLogin(s, { save: async () => assert.fail(), log() {},
    sleep: async () => { s.context.pages = () => []; } }), /trước/);
});

test('last-page close is detected with a real browser that remains connected', async () => {
  const { launchBrowser } = require('../packages/browser-launcher.cjs');
  const browser = await launchBrowser({ headless: true }, {
    env: process.platform === 'win32' ? { BOTADS_BROWSER_MODE: 'system' } : {},
  });
  try {
    const context = await browser.newContext();
    await context.route('https://www.facebook.com/**', route => route.fulfill({ body: '<html>Fixture only</html>', contentType: 'text/html' }));
    await context.addCookies([{ name: 'c_user', value: 'fixture', domain: '.facebook.com', path: '/' }]);
    const page = await context.newPage();
    await page.goto('https://www.facebook.com/');
    let saved = false;
    await waitForLogin({ browser, context, page }, {
      save: async () => { saved = true; }, log() {},
      sleep: async () => { await page.close(); },
    });
    assert.equal(saved, true);
    assert.equal(browser.isConnected(), true);
  } finally { await browser.close(); }
});
test('closing without login is not reported as connected', async () => {
  const s = session(); s.context.cookies = async () => [];
  await assert.rejects(waitForLogin(s, { save: async () => assert.fail(), log() {},
    sleep: async () => s.context.emit('close') }), /chưa|trước/);
});
test('unauthenticated login still times out and removes listeners', async () => {
  const s = session(); s.context.cookies = async () => []; let time = 0;
  await assert.rejects(waitForLogin(s, { save: async () => assert.fail(), log() {}, now: () => time,
    sleep: async () => { time += 6 * 60000; } }), /6 phút/);
  assert.equal(s.context.listenerCount('close'), 0);
});
