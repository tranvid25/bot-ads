const { test } = require('node:test');
const assert = require('node:assert/strict');
test('interactive Facebook login keeps its device online without claiming work', async () => {
  const calls = [];
  const ctx = { facebookLogin: true, credentials: { connection: { token: 'fixture' } }, state: () => ({ facebookReady: true }),
    request: async (route) => { calls.push(route); return {}; }, notify() {}, social: { busy: () => assert.fail('must not claim') } };
  await require('../apps/companion/runtime/jobs.cjs')(ctx).tick();
  assert.deepEqual(calls, ['/heartbeat']);
  assert.equal(ctx.polling, false);
});
