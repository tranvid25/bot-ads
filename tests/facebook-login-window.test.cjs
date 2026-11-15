const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { waitForLogin } = require('../packages/automation/login_session.cjs');
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
