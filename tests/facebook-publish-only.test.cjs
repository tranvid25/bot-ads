const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'botads-publish-only-'));
process.env.BOTADS_DATA_DIR = dir;
const { campaignConfig } = require('../packages/desktop-state.cjs');
const { main } = require('../packages/automation/publish_only.cjs');
after(() => fs.rmSync(dir, { recursive: true, force: true }));
test('new and legacy campaigns cannot inherit search, sync, join or discovered targets', async () => {
  for (const workflowVersion of [undefined, 1, 2]) {
    const group = 'https://www.facebook.com/groups/selected';
    const config = campaignConfig({ workflowVersion, groupUrls: [group], posts: [], keywords: ['website'], dailyLimit: 3, autoDiscover: true, autoJoin: true },
      { daily_limit: 30, timezone: 'Asia/Ho_Chi_Minh' }, { id: 'job', campaignId: 'campaign' }, {}, {},
      { cloudCampaignId: 'campaign', discoveredGroups: ['https://www.facebook.com/groups/not-selected'] });
    assert.deepEqual(config.discoveredGroups, []);
    assert.deepEqual(config.automation, { search: false, sync: false, join: false, generateAI: false });
    let received;
    const result = await main(config, { runPosting: async ({ config }) => { received = config; return { sent: 1 }; } });
    assert.deepEqual(received.groups, [group]); assert.equal(result.sent, 1);
  }
});
test('publish refuses missing targets or any discovery flag, with no fallback', async () => {
  let calls = 0;
  for (const config of [{ groups: [] }, { groups: ['x'], automation: { search: true } }, { groups: ['x'], discoveredGroups: ['y'] }])
    await assert.rejects(main(config, { runPosting: async () => calls++ }));
  assert.equal(calls, 0);
});
test('reconciliation is limited to the selected groups and precedes publishing', async () => {
  const order = [];
  const config = { groups: ['selected'], automation: {} };
  await main(config, { loadState: () => ({ attempts: [{ id: 'yes', groupUrl: 'selected' }, { id: 'no', groupUrl: 'other' }] }),
    reconcile: async input => { assert.deepEqual(input.attemptIds, ['yes']); order.push('reconcile'); },
    runPosting: async input => { assert.equal(input.managedDeadline, true); order.push('publish'); } });
  assert.deepEqual(order, ['reconcile', 'publish']);
});
test('scheduler claims publishing before an independent queued discovery', async () => {
  for (const hasJob of [true, false]) {
    const order = [];
    const ctx = { credentials: { connection: {} }, state: () => ({ facebookReady: true }), notify() {}, saveCurrent() {},
      social: { busy: () => false, tick: async () => false }, discovery: { busy: () => false, tick: async () => { order.push('discover'); return true; } },
      request: async route => { order.push(route); return route === '/claim' && hasJob ? { job: { id: 'j' } } : {}; },
      startJob: async job => { ctx.current = { job }; order.push('publish'); } };
    await require('../apps/companion/runtime/jobs.cjs')(ctx).tick();
    assert.ok(order.indexOf('/claim') >= 0);
    if (hasJob) { assert.ok(order.includes('publish')); assert.equal(order.includes('discover'), false); }
    else assert.ok(order.indexOf('/claim') < order.indexOf('discover'));
  }
});
