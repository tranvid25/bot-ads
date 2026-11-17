const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const change = require('../apps/companion/runtime/facebook-login.cjs');
const auth = uid => ({ cookies: [{ name: 'c_user', value: uid }] });
function fixture() {
  const ctx = {
    credentials: { connection: { token: 'device' }, auth: auth('old'), social: { threads: {} } },
    hasWork: () => false, notify() {}, log() {}, saveCredentials() {},
    state: () => ({ facebookReady: !!ctx.credentials.auth }),
    request: async () => {},
    spawnRunner: async () => ({ error: '' }),
  };
  return ctx;
}

test('changing Facebook persists a clean session, preserves pairing and other channels, and pauses claims', async () => {
  const ctx = fixture(), connection = ctx.credentials.connection, social = ctx.credentials.social;
  let persisted = false;
  ctx.saveCredentials = () => { persisted = ctx.credentials.auth === null; };
  ctx.request = async (_, __, payload) => {
    assert.equal(payload.facebookReady, false);
    assert.equal(ctx.facebookLogin, true);
  };
  ctx.spawnRunner = async message => {
    assert.equal(persisted, true);
    assert.equal(ctx.credentials.auth, null);
    assert.equal(ctx.stoppedByUser, true);
    assert.equal(message.action, 'login');
    ctx.credentials.auth = auth('new');
    return {};
  };
  await change(ctx, { changeAccount: true });
  assert.equal(ctx.credentials.connection, connection);
  assert.equal(ctx.credentials.social, social);
  assert.equal(ctx.credentials.auth.cookies[0].value, 'new');
  assert.equal(ctx.facebookLogin, false);
  assert.equal(ctx.stoppedByUser, true);
});

test('regular login retains the existing Facebook session', async () => {
  const ctx = fixture(), previous = ctx.credentials.auth;
  ctx.spawnRunner = async () => { assert.equal(ctx.credentials.auth, previous); return {}; };
  await change(ctx);
  assert.equal(ctx.credentials.auth, previous);
  assert.equal(ctx.stoppedByUser, undefined);
});

test('changing account is blocked during work or an in-flight heartbeat', async () => {
  for (const field of ['work', 'polling', 'facebookLogin']) {
    const ctx = fixture(), previous = ctx.credentials.auth;
    ctx.hasWork = () => field === 'work';
    if (field !== 'work') ctx[field] = true;
    await assert.rejects(change(ctx, { changeAccount: true }), /Đợi/);
    assert.equal(ctx.credentials.auth, previous);
  }
});

test('failed credential persistence restores old session and never opens a browser', async () => {
  const ctx = fixture(), previous = ctx.credentials.auth;
  ctx.saveCredentials = () => { throw new Error('disk failed'); };
  ctx.spawnRunner = async () => assert.fail('must not launch');
  await assert.rejects(change(ctx, { changeAccount: true }), /disk failed/);
  assert.equal(ctx.credentials.auth, previous);
  assert.equal(ctx.facebookLogin, false);
});

test('failed new login keeps the old account cleared and lets the user try again', async () => {
  const ctx = fixture();
  ctx.spawnRunner = async () => ({ error: 'login canceled' });
  await assert.rejects(change(ctx, { changeAccount: true }), /login canceled/);
  assert.equal(ctx.credentials.auth, null);
  assert.equal(ctx.facebookLogin, false);
});

test('polling does not claim jobs while a fresh Facebook login is opening', async () => {
  const ctx = fixture();
  ctx.facebookLogin = true;
  const calls = [];
  ctx.request = async route => { calls.push(route); return {}; };
  await require('../apps/companion/runtime/jobs.cjs')(ctx).tick();
  assert.deepEqual(calls, ['/heartbeat']);
  assert.equal(ctx.error, '');
});

for (const cleared of [false, true]) {
  test(`runner ${cleared ? 'accepts a new account after explicit reset' : 'rejects an unexpected account change'}`, async () => {
    const ctx = fixture();
    if (cleared) ctx.credentials.auth = null;
    const child = new EventEmitter();
    child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
    let started;
    child.send = message => {
      if (message.type === 'start') {
        started = message;
        queueMicrotask(() => child.emit('message', { type: 'auth', id: 'auth', state: auth('new') }));
      } else if (message.type === 'reply') {
        queueMicrotask(() => child.emit('message', { type: 'done', error: message.error }));
      }
    };
    Object.assign(ctx, {
      fs: { mkdirSync() {} }, dataDir: () => 'fixture',
      path: require('node:path'), app: { isPackaged: false }, baseDir: '.',
      fork: () => child, socialEvent: async () => false,
    });
    const result = await require('../apps/companion/runtime/runner.cjs')(ctx).spawnRunner({ action: 'login' });
    assert.equal(started.auth?.cookies[0].value || null, cleared ? null : 'old');
    if (cleared) {
      assert.equal(result.error, undefined);
      assert.equal(ctx.credentials.auth.cookies[0].value, 'new');
    } else {
      assert.match(result.error, /tài khoản Facebook khác/);
      assert.equal(ctx.credentials.auth.cookies[0].value, 'old');
    }
  });
}
