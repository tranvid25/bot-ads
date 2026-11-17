const { test } = require('node:test');
const assert = require('node:assert/strict');
const readiness = require('../apps/companion/receiving-state.js');
const receiving = require('../apps/companion/runtime/receiving.cjs');
const ready = { linked: true, facebookReady: true, online: true, receivingEnabled: false };
test('receiving is locked until pairing, login, network and work conditions permit it', () => {
  assert.equal(readiness(ready).canStart, true);
  for (const change of [{ linked: false }, { facebookReady: false }, { online: false }, { facebookLogin: true }, { currentJob: 'job' }, { busy: true }, { currentSocial: {} }]) {
    const state = readiness({ ...ready, ...change });
    assert.equal(state.canStart, false);
    assert.ok(state.reason);
  }
  assert.equal(readiness({ ...ready, receivingEnabled: true }).canStart, false);
});
test('backend command refuses unready start; persists start and stop, and rolls back failed saves', async () => {
  let current = { ...ready, online: false }, ticks = 0;
  const ctx = { credentials: {}, state: () => current, saveCredentials() {}, notify() {}, log() {}, tick: async () => ticks++ };
  await assert.rejects(receiving(ctx, true), /máy chủ/);
  assert.equal(ticks, 0);
  current = ready;
  await receiving(ctx, true);
  assert.equal(ctx.credentials.facebookReceiving, true);
  assert.equal(ticks, 1);
  await receiving(ctx, false);
  assert.equal(ctx.credentials.facebookReceiving, false);
  assert.equal(ctx.stoppedByUser, false);
  ctx.saveCredentials = () => { throw Error('disk'); };
  await assert.rejects(receiving(ctx, true), /disk/);
  assert.equal(ctx.credentials.facebookReceiving, false);
});
