const { test } = require('node:test');
const assert = require('node:assert/strict');
const run = require('../apps/companion/membership-client.cjs');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const task = { id: 'task', config: { operation: 'join', groups: [{ id: 'group', name: 'Group' }] } };
test('persists membership intent before browser side effect and each confirmed result before upload', async () => {
  const stored = [], sent = [];
  await run(task, {
    stopped: () => false, log() {},
    persist: value => stored.push(structuredClone(value)),
    request: async (path, method, input) => { sent.push(structuredClone(input)); assert.deepEqual(stored.at(-1), input); },
    spawnRunner: async message => {
      assert.equal(sent.at(-1).membership.status, 'checking');
      assert.equal(message.action, 'membership');
      return { membership: { groupId: 'group', status: 'requested', note: 'Pending' } };
    },
  });
  assert.deepEqual(sent.map(v => v.sequence), [1, 2]);
  assert.equal(stored.at(-1).finished, true);
  assert.equal(stored.at(-1).sequence, 3);
  assert.equal(stored.at(-1).membership.status, 'requested');
});
test('failed intent upload never clicks Join; paused runs do not launch browser', async () => {
  for (const paused of [false, true]) {
    let launched = 0, last;
    await run(task, { stopped: () => paused, log() {}, persist: v => last = v,
      request: async () => { throw new Error('Offline'); }, spawnRunner: async () => launched++ });
    assert.equal(launched, 0); assert.equal(last.finished, true); assert.ok(last.error);
  }
});
test('desktop restart reports uncertain intent without rerunning the Join operation', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'botads-member-recovery-'));
  try {
    fs.writeFileSync(path.join(dir, 'discovery-report.json'), JSON.stringify({
      kind: 'membership', taskId: 'task', sequence: 1, finished: false,
      membership: { groupId: 'group', status: 'checking' },
    }));
    const reports = [];
    const client = require('../apps/companion/discovery-client.cjs')({
      dataDir: () => dir, stopped: () => false, log() {}, getAuth: () => null, getChild: () => null,
      spawnRunner: async () => { throw new Error('Must never rerun'); },
      request: async (url, method, value) => { reports.push(value); return {}; },
    });
    await client.tick();
    assert.equal(reports.length, 1); assert.equal(reports[0].sequence, 2);
    assert.equal(reports[0].membership.status, 'unknown'); assert.equal(reports[0].finished, true);
    assert.equal(client.busy(), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('one group error does not block the next group; a global/auth halt does', async () => {
  for (const halted of [false, true]) {
    let launches = 0, last;
    const task = { id: 'task', config: { operation: 'check', groups: [{ id: 'first', name: 'First' }, { id: 'second', name: 'Second' }] } };
    await run(task, { stopped: () => false, log() {}, persist: v => last = structuredClone(v), request: async () => ({}),
      spawnRunner: async () => ++launches === 1 ? { error: 'First group unavailable', halted } : { membership: { groupId: 'second', status: 'joined' } } });
    assert.equal(launches, halted ? 1 : 2);
    assert.equal(last.finished, true);
    assert.equal(!!last.error, halted);
  }
});
