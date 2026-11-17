const { test } = require('node:test');
const assert = require('node:assert/strict');
const createClient = require('../apps/companion/runtime/rechecks.cjs');
test('recheck retries unsent results after a network failure without opening or posting twice', async () => {
  const files = new Map();
  let launches = 0, reports = 0, fail = true;
  const ctx = {
    path: require('node:path'), dataDir: () => 'fixture', credentials: { facebookReceiving: true },
    read: (path, fallback) => files.get(path) || fallback,
    atom: (path, value) => files.set(path, structuredClone(value)),
    fs: { unlinkSync: path => files.delete(path) },
    state: () => ({ facebookReady: true }), notify() {}, log() {},
    spawnRunner: async input => { launches++; assert.equal(input.action, 'recheck'); return {}; },
    reportAttempts: ids => [{ id: ids[0], status: 'success' }],
    request: async route => {
      if (route.endsWith('/claim')) return { task: { attempt_id: 'attempt', job_id: 'job' } };
      if (route === '/report') { reports++; if (fail) throw Error('offline'); }
      return {};
    },
  };
  const tick = createClient(ctx);
  await tick();
  assert.equal(files.size, 1);
  fail = false;
  await tick();
  assert.equal(launches, 1);
  assert.equal(reports, 2);
  assert.equal(files.size, 0);
});
test('Facebook pause does not send stop to a running Threads/Instagram browser', async () => {
  let sent = false;
  const ctx = { credentials: {}, social: { busy: () => true }, child: { connected: true, send: () => { sent = true; } }, saveCredentials() {}, notify() {}, log() {}, state: () => ({}) };
  await require('../apps/companion/runtime/receiving.cjs')(ctx, false);
  assert.equal(sent, false);
  assert.equal(ctx.credentials.facebookReceiving, false);
  assert.notEqual(ctx.stoppedByUser, true);
});
