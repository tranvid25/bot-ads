const { test } = require('node:test');
const assert = require('node:assert/strict');
const { interactiveState } = require('../packages/automation/interactive_auth.cjs');
const { saveAuth, setManagedAuth } = require('../packages/automation/browser_helper');

function fixture() {
  const cookies = [{ name: 'c_user', value: 'account', domain: '.facebook.com', path: '/' }];
  const localStorage = [{ name: 'setting', value: 'saved' }];
  const frame = {
    url: () => 'https://www.facebook.com/',
    evaluate: async () => localStorage,
  };
  const context = {
    cookies: async () => cookies,
    pages: () => [{ isClosed: () => false, frames: () => [frame, {
      url: () => 'https://www.fbsbx.com/',
      evaluate: async () => assert.fail('must not read unrelated origins'),
    }] }],
    storageState: async () => assert.fail('full storageState opens temporary tabs'),
    newPage: async () => assert.fail('saving must not open tabs'),
  };
  return { context, frame, cookies, localStorage };
}

test('interactive saves Facebook cookies and existing storage without visiting third party origins or opening tabs', async () => {
  const { context, cookies, localStorage } = fixture();
  assert.deepEqual(await interactiveState(context), {
    cookies,
    origins: [{ origin: 'https://www.facebook.com', localStorage }],
  });
});

test('repeated login polling does not persist unchanged snapshots and does persist refreshed cookies', async () => {
  const { context, cookies } = fixture();
  const saved = [];
  setManagedAuth({ save: async state => saved.push(structuredClone(state)) });
  try {
    for (let i = 0; i < 5; i++) await saveAuth(context, { interactive: true });
    assert.equal(saved.length, 1);
    cookies.push({ name: 'xs', value: 'refreshed' });
    await saveAuth(context, { interactive: true });
    assert.equal(saved.length, 2);
    assert.equal(saved[1].cookies.at(-1).value, 'refreshed');
  } finally { setManagedAuth(null); }
});

test('navigation during storage capture does not close login and a later pass captures storage', async () => {
  const { context, frame, localStorage } = fixture();
  frame.evaluate = async () => { throw new Error('Execution context was destroyed'); };
  assert.deepEqual((await interactiveState(context)).origins, []);
  frame.evaluate = async () => localStorage;
  assert.equal((await interactiveState(context)).origins.length, 1);
});

test('failed persistence is retried instead of being marked saved', async () => {
  const { context } = fixture();
  let attempts = 0;
  setManagedAuth({ save: async () => { if (++attempts === 1) throw new Error('disk failed'); } });
  try {
    await assert.rejects(saveAuth(context, { interactive: true }), /disk failed/);
    await saveAuth(context, { interactive: true });
    assert.equal(attempts, 2);
  } finally { setManagedAuth(null); }
});

test('regular automation keeps full storageState snapshots', async () => {
  let snapshots = 0;
  const state = { cookies: [], origins: [] };
  setManagedAuth({ save: async value => assert.equal(value, state) });
  try {
    await saveAuth({ storageState: async () => { snapshots++; return state; } });
    assert.equal(snapshots, 1);
  } finally { setManagedAuth(null); }
});
