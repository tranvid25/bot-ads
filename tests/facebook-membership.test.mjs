import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { facebookWorker } from './helpers/facebook-worker.mjs';
let worker, a, b, groups, task;
const accountKey = 'a'.repeat(64);
const call = (path, data, owner = a, method = 'POST') => worker.request(path, {
  method, data, ...(path.startsWith('/device/') ? { token: owner.token } : { cookie: owner.cookie }),
});
before(async () => {
  worker = await facebookWorker(); a = await worker.owner('membership-a'); b = await worker.owner('membership-b');
  for (const name of ['joined', 'pending', 'questions'])
    assert.equal((await call('/facebook/groups', { url: `https://facebook.com/groups/${name}`, name })).status, 200);
  groups = (await call('/facebook', undefined, a, 'GET')).data.groups;
});
after(async () => { await worker?.mf.dispose(); });
test('membership queue requires selection and consent, isolates workspace, deduplicates active work', async () => {
  assert.equal((await call('/facebook/groups/membership', { operation: 'join', ids: [] })).status, 400);
  assert.equal((await call('/facebook/groups/membership', { operation: 'join', ids: [groups[0].id] })).status, 400);
  assert.equal((await call('/facebook/groups/membership', { operation: 'check', ids: [groups[0].id] }, b)).status, 404);
  const created = await call('/facebook/groups/membership', { operation: 'join', ids: groups.map(g => g.id), confirmed: true });
  assert.equal(created.status, 200); task = created.data.id;
  assert.equal((await call('/facebook/groups/membership', { operation: 'check', ids: [groups[0].id] })).status, 409);
  assert.equal((await call('/device/discovery/claim', { accountKey })).data.task, null, 'old desktop cannot claim a joining task');
  assert.equal((await call('/device/discovery/claim', { accountKey, membershipSupported: true }, b)).data.task, null);
  const claimed = (await call('/device/discovery/claim', { accountKey, membershipSupported: true })).data.task;
  assert.equal(claimed.id, task); assert.equal(claimed.kind, 'membership');
  assert.equal(claimed.config.groups.every(g => g.allowJoin), true);
  assert.equal((await call('/device/claim', {})).data.job, null);
});
test('membership intent and results are durable, idempotent, bound to target and do not approve groups', async () => {
  assert.equal((await call('/device/discovery/report', { taskId: task, sequence: 1, membership: { groupId: 'foreign', status: 'joined' } })).status, 400);
  assert.equal((await call('/device/discovery/report', { taskId: task, sequence: 1, membership: { groupId: groups[0].id, status: 'checking' } })).status, 200);
  const report = { taskId: task, sequence: 2, membership: { groupId: groups[0].id, status: 'joined', note: 'Joined on Facebook' } };
  assert.equal((await call('/device/discovery/report', report, b)).status, 404);
  assert.equal((await call('/device/discovery/report', report)).status, 200);
  assert.equal((await call('/device/discovery/report', report)).status, 200);
  assert.equal((await call('/device/discovery/report', { taskId: task, sequence: 3, membership: { groupId: groups[1].id, status: 'requested' } })).status, 200);
  assert.equal((await call('/device/discovery/report', { taskId: task, sequence: 4, membership: { groupId: groups[2].id, status: 'manual_required' }, finished: true })).status, 200);
  const library = (await call('/facebook', undefined, a, 'GET')).data;
  assert.equal(library.tasks[0].groups_seen, 3);
  assert.equal(library.tasks[0].results.length, 3);
  assert.equal(library.groups.find(g => g.id === groups[0].id).membership, 'joined');
  assert.equal(library.groups.find(g => g.id === groups[1].id).membership, 'requested');
  assert.equal(library.groups.every(g => g.eligibility === 'unreviewed'), true);
  assert.equal(library.groups.every(g => g.membership_account_key === accountKey), true);
});
test('existing membership requests are read only; wrong account and outdated clients cannot claim', async () => {
  const created = await call('/facebook/groups/membership', { operation: 'join', ids: groups.map(g => g.id), confirmed: true });
  assert.equal(created.status, 200); task = created.data.id;
  assert.equal((await call('/device/discovery/claim', { accountKey: 'b'.repeat(64), membershipSupported: true })).data.task, null);
  const claimed = (await call('/device/discovery/claim', { accountKey, membershipSupported: true })).data.task;
  assert.equal(claimed.config.groups.every(g => !g.allowJoin), true);
  assert.equal((await call('/device/discovery/report', { taskId: task, sequence: 1, membership: { groupId: groups[0].id, status: 'checking' } })).status, 200);
  assert.equal((await call(`/facebook/tasks/${task}`, {})).status, 200);
  assert.equal((await call('/device/discovery/report', { taskId: task, sequence: 2, membership: { groupId: groups[0].id, status: 'joined' } })).status, 409);
  assert.equal((await call('/facebook/groups/membership', { operation: 'join', ids: [groups[0].id], confirmed: true })).status, 200);
  const afterCancel = (await call('/device/discovery/claim', { accountKey, membershipSupported: true })).data.task;
  assert.equal(afterCancel.config.groups[0].allowJoin, false, 'unfinished intent must be checked before another click');
  await call(`/facebook/tasks/${afterCancel.id}`, {});
});
test('explicit read check releases an uncertain join only after a confirmed not-joined observation', async () => {
  const created = await call('/facebook/groups/membership', { operation: 'check', ids: [groups[0].id] });
  assert.equal(created.status, 200);
  const claimed = (await call('/device/discovery/claim', { accountKey, membershipSupported: true })).data.task;
  assert.equal((await call('/device/discovery/report', { taskId: claimed.id, sequence: 1, membership: { groupId: groups[0].id, status: 'not_joined' }, finished: true })).status, 200);
  const retry = await call('/facebook/groups/membership', { operation: 'join', ids: [groups[0].id], confirmed: true });
  assert.equal(retry.status, 200);
  const next = (await call('/device/discovery/claim', { accountKey, membershipSupported: true })).data.task;
  assert.equal(next.config.groups[0].allowJoin, true);
  await call(`/facebook/tasks/${next.id}`, {});
});
test('expired queued membership tasks stop showing as waiting indefinitely', async () => {
  const created = await call('/facebook/groups/membership', { operation: 'check', ids: [groups[0].id] });
  assert.equal(created.status, 200);
  await worker.db.prepare('UPDATE facebook_discovery_jobs SET deadline=0 WHERE id=?').bind(created.data.id).run();
  const library = (await call('/facebook', undefined, a, 'GET')).data;
  assert.equal(library.tasks.find(t => t.id === created.data.id).status, 'failed');
});
