const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'botads-state-test-'));
process.env.BOTADS_DATA_DIR = root;
const { read, write, file, canonicalGroup } = require('./storage');
const { defaults, loadConfig, dateKey } = require('./settings');
const history = require('./history');
const { getNextPostContent, confirmPostUsed } = require('./ai_generator');
const { plan, runPosting, reconcilePool } = require('./post_runner');
const { resolveAttempt } = require('./manage');
const { acquireLock, checkStop, HaltError } = require('./runtime');
const { scheduleSlot, tick } = require('./scheduler');
const A = 'https://www.facebook.com/groups/alpha';
const B = 'https://www.facebook.com/groups/beta';
beforeEach(() => {
  for (const name of fs.readdirSync(root)) {
    const target = path.resolve(root, name);
    assert.equal(path.dirname(target), root);
    fs.unlinkSync(target);
  }
  write('config.json', { ...defaults, groups: [A, B], minDelaySeconds: 1, maxDelaySeconds: 1, attachImage: false });
  write('ai_posts_pool.json', [{ title: 'One', content: 'First story' }, { title: 'Two', content: 'Second story' }]);
});
after(() => {
  assert.equal(path.dirname(root), os.tmpdir());
  assert.ok(path.basename(root).startsWith('botads-state-test-'));
  fs.rmSync(root, { recursive: true });
});
function approve(url = A) { history.updateGroup(url, { advertisingAllowed: true }); }
function record(url, status, timestamp) { history.recordPostResult(url, status, '', { timestamp }); }
test('canonical URLs normalize query, trailing slash and host; external paths are rejected', () => {
  assert.equal(canonicalGroup('https://m.facebook.com/groups/ALPHA/?ref=x'), A);
  assert.equal(canonicalGroup('https://evil.example/facebook.com/groups/alpha'), null);
  assert.equal(canonicalGroup('https://www.facebook.com/groups/feed'), null);
  assert.equal(canonicalGroup(A + '/posts/123'), null);
});
test('seven-day cooldown spans midnight and expires at the boundary', () => {
  approve(); const now = new Date('2026-10-17T00:00:00+07:00');
  record(A, 'success', '2026-10-16T23:59:00+07:00');
  assert.match(history.eligibility(A, loadConfig(), now), /7/);
  assert.equal(history.eligibility(A, loadConfig(), new Date('2026-10-23T23:59:00+07:00')), null);
});
test('pending approval and uncertain attempts block across days', () => {
  approve(); approve(B);
  record(A, 'pending_approval', '2026-09-01T00:00:00Z');
  record(B, 'unknown', '2026-09-01T00:00:00Z');
  assert.match(history.eligibility(A, loadConfig()), /chờ duyệt/);
  assert.match(history.eligibility(B, loadConfig()), /chưa xác nhận/);
});
test('group permissions and blacklist are enforced independently', () => {
  assert.match(history.eligibility(A, loadConfig()), /Chưa xác nhận/);
  approve(); assert.equal(history.eligibility(A, loadConfig()), null);
  history.updateGroup(A, { blocked: true, reason: 'No advertising' });
  assert.match(history.eligibility(A, loadConfig()), /No advertising/);
});
test('daily cap uses Vietnam date and includes unresolved submissions', () => {
  const now = new Date('2026-10-17T00:30:00+07:00');
  record(A, 'success', '2026-10-16T17:00:00Z');
  record(B, 'submitting', '2026-10-16T18:00:00Z');
  record(B, 'failed', '2026-10-16T19:00:00Z');
  record(B, 'success', '2026-10-16T16:00:00Z');
  assert.equal(history.dailyUsage(loadConfig(), now), 2);
  assert.equal(dateKey(now), '2026-10-17');
});
test('plan limits eligible groups without opening a browser', () => {
  approve(); approve(B);
  const config = { ...loadConfig(), maxPostsPerRun: 1 };
  assert.equal(plan(config).items.filter(item => !item.reason).length, 1);
});
test('pool reads retain posts and confirmation survives an intervening replenishment', () => {
  const post = getNextPostContent();
  assert.equal(getNextPostContent().content, post.content);
  const pool = read('ai_posts_pool.json'); pool.push({ title: 'Three', content: 'Third story' }); write('ai_posts_pool.json', pool);
  confirmPostUsed(post); assert.equal(read('ai_posts_pool.json').length, 2);
  assert.equal(confirmPostUsed(post), false);
});
test('confirmed posts are reconciled after a crash between journal and pool writes', () => {
  const post = getNextPostContent(); const id = history.beginAttempt(A, post, post.content);
  history.updateAttempt(id, { status: 'pending_approval' });
  reconcilePool(); reconcilePool();
  assert.equal(read('ai_posts_pool.json').length, 1);
  assert.equal(history.loadState().attempts[0].poolConsumed, true);
});
test('recovery does not consume a second identical pool entry', () => {
  write('ai_posts_pool.json', [{ id: 'one', title: 'Same', content: 'Same content' }, { id: 'two', title: 'Same', content: 'Same content' }]);
  const post = getNextPostContent();
  const id = history.beginAttempt(A, post, post.content);
  history.updateAttempt(id, { status: 'success' });
  confirmPostUsed(post); // Crash before poolConsumed was written.
  reconcilePool();
  assert.deepEqual(read('ai_posts_pool.json').map(item => item.id), ['two']);
});
test('manual resolution is audited and consumes a confirmed AI post once', () => {
  const post = getNextPostContent(); const id = history.beginAttempt(A, post, post.content);
  assert.throws(() => resolveAttempt(id, 'success', '', A + '/posts/1'));
  resolveAttempt(id, 'success', 'Checked on Facebook', A + '/posts/1');
  resolveAttempt(id, 'success', 'Checked again', A + '/posts/1');
  assert.equal(history.loadState().attempts[0].resolutions.length, 2);
  assert.equal(read('ai_posts_pool.json').length, 1);
});
test('late approval starts a fresh cooldown instead of immediately reposting', () => {
  approve(); record(A, 'pending_approval', '2026-01-01T00:00:00Z');
  const attempt = history.loadState().attempts[0];
  resolveAttempt(attempt.id, 'success', 'Approved today', A + '/posts/approved');
  assert.match(history.eligibility(A, loadConfig()), /khoảng nghỉ/);
});
test('legacy daily history migrates without overwriting the original', () => {
  write('history.json', { '2026-10-16': { [A + '/']: { status: 'success', timestamp: '2026-10-16T12:00:00Z' } } });
  const original = fs.readFileSync(file('history.json'), 'utf8');
  history.updateGroup(A, { advertisingAllowed: true });
  assert.equal(history.loadState().attempts[0].groupUrl, A);
  assert.equal(fs.readFileSync(file('history.json'), 'utf8'), original);
});
test('corrupt history and pool fail closed instead of silently resetting', () => {
  fs.writeFileSync(file('history.json'), '{'); assert.throws(() => history.loadState());
  fs.unlinkSync(file('history.json')); fs.writeFileSync(file('ai_posts_pool.json'), '{');
  assert.throws(() => getNextPostContent());
});
test('two processes cannot run concurrently', () => {
  const release = acquireLock();
  try {
    const result = spawnSync(process.execPath, ['-e', "require('./runtime').acquireLock()"], { cwd: __dirname, env: process.env, encoding: 'utf8' });
    assert.notEqual(result.status, 0); assert.match(result.stderr, /PID/);
  } finally { release(); }
  const releaseAgain = acquireLock(); releaseAgain();
});
test('STOP blocks the next action', () => {
  fs.writeFileSync(file('STOP'), 'stop'); assert.throws(checkStop, HaltError);
});
test('scheduler respects timezone, time and weekdays', () => {
  const config = loadConfig();
  assert.equal(scheduleSlot(new Date('2026-10-19T01:59:00Z'), config), null);
  assert.equal(scheduleSlot(new Date('2026-10-19T02:00:00Z'), config), '2026-10-19');
  assert.equal(scheduleSlot(new Date('2026-10-18T03:00:00Z'), config), null);
});
test('scheduler persists a failed slot and does not repeatedly retry it', async () => {
  let calls = 0; const now = new Date('2026-10-19T02:00:00Z');
  await assert.rejects(tick(now, async () => { calls++; throw new Error('Offline'); }));
  assert.equal(await tick(now, async () => { calls++; }), false);
  assert.equal(calls, 1); assert.equal(read('schedule_state.json').status, 'failed');
});
test('runner stops at consecutive failures and always closes the browser', async () => {
  approve(); approve(B);
  let closed = 0, attempted = 0;
  await assert.rejects(runPosting({ config: { ...loadConfig(), maxConsecutiveFailures: 1, haltOnConsecutiveFailures: true }, dependencies: {
    launchBrowser: async () => ({ page: {}, context: { close: async () => { closed++; } }, browser: { close: async () => { closed++; } } }),
    postToGroup: async () => { attempted++; return 'failed'; }
  } }), /lỗi liên tiếp/);
  assert.equal(attempted, 1); assert.equal(closed, 2);
  assert.equal(history.loadState().runs[0].status, 'stopped');
  assert.equal(read('ai_posts_pool.json').length, 2);
});
test('strict mode stops on unknown submissions before launching', async () => {
  approve(); record('https://www.facebook.com/groups/outside', 'unknown', new Date().toISOString());
  let launched = false;
  await assert.rejects(runPosting({ config: { ...loadConfig(), haltOnUnknown: true }, dependencies: { launchBrowser: async () => { launched = true; } } }), /chưa rõ/);
  assert.equal(launched, false);
});
test('three unconfirmed submissions do not stop posting to a fourth group', async () => {
  const urls = [A, B, 'https://www.facebook.com/groups/third', 'https://www.facebook.com/groups/fourth'];
  for (const url of urls) approve(url);
  write('ai_posts_pool.json', urls.map((url, i) => ({ id: String(i), title: 'Post ' + i, content: 'Story for group ' + i })));
  const statuses = ['unknown', 'unknown', 'unknown', 'success'];
  const visited = [];
  const summary = await runPosting({ config: { ...loadConfig(), groups: urls }, dependencies: {
    launchBrowser: async () => ({ page: {}, context: { close: async () => {} }, browser: { close: async () => {} } }),
    sleep: async () => {},
    postToGroup: async (page, url, post) => {
      const status = statuses[visited.length]; visited.push(url);
      const id = history.beginAttempt(url, post, post.content); history.updateAttempt(id, { status });
      if (status === 'success') { confirmPostUsed(post); history.updateAttempt(id, { poolConsumed: true }); }
      return status;
    }
  } });
  assert.deepEqual(visited, urls);
  assert.equal(summary.unconfirmed, 3); assert.equal(summary.failed, 0); assert.equal(summary.sent, 1);
  assert.equal(history.loadState().groups[A].failures || 0, 0);
  assert.equal(read('ai_posts_pool.json').length, 3);
});
test('group failures continue to the next group in default mode', async () => {
  approve(); approve(B); const visited = [];
  const summary = await runPosting({ config: { ...loadConfig(), maxConsecutiveFailures: 1 }, dependencies: {
    launchBrowser: async () => ({ page: {}, context: { close: async () => {} }, browser: { close: async () => {} } }),
    sleep: async () => {}, postToGroup: async (page, url) => { visited.push(url); return 'failed'; }
  } });
  assert.deepEqual(visited, [A, B]); assert.equal(summary.failed, 2); assert.equal(summary.status, 'completed');
});
test('automatic mode skips uncertain groups and reserves their AI posts', async () => {
  approve(); approve(B);
  const post = getNextPostContent(); history.beginAttempt(A, post, post.content);
  assert.equal(getNextPostContent().title, 'Two');
  assert.ok(plan().items.find(item => item.url === A).reason);
  assert.equal(plan().items.find(item => item.url === B).reason, null);
  let visited;
  await runPosting({ dependencies: {
    launchBrowser: async () => ({ page: {}, context: { close: async () => {} }, browser: { close: async () => {} } }),
    postToGroup: async (page, url, content) => { visited = { url, title: content.title }; return 'success'; }
  } });
  assert.deepEqual(visited, { url: B, title: 'Two' });
});
test('automatic selection allows relevant explicit permission and rejects bans or conditions', () => {
  const { classifyGroup } = require('./group_policy'); const config = loadConfig();
  const classify = description => classifyGroup({ name: 'IELTS Speaking learners', description }, config);
  assert.equal(classify('Advertising is allowed.').allowed, true);
  assert.equal(classify('Cho phép đăng bài quảng cáo.').allowed, true);
  assert.equal(classify('Cho phép quảng cáo. Không được đăng quảng cáo.').allowed, false);
  assert.equal(classify("We don't allow advertising.").allowed, false);
  assert.equal(classify('Advertising is allowed only on Mondays.').allowed, false);
  assert.equal(classify('Chia sẻ tài liệu học tập.').allowed, true);
  assert.equal(classifyGroup({ name: 'IELTS', description: 'Chia sẻ tài liệu học tập.' }, { ...config, groupSelection: { ...config.groupSelection, mode: 'explicit-permission' } }).allowed, false);
  assert.equal(classifyGroup({ name: 'Gardening', description: 'Advertising is allowed.' }, config).allowed, false);
});
test('automatic permission expires and cannot override a manual block', () => {
  history.updateGroup(A, { advertisingAllowed: true, approvalSource: 'automatic', selection: { checkedAt: '2026-01-01T00:00:00Z' } });
  assert.match(history.eligibility(A, loadConfig()), /kiểm tra lại/);
  history.updateGroup(A, { selection: { checkedAt: new Date().toISOString(), policyMode: loadConfig().groupSelection.mode } });
  assert.equal(history.eligibility(A, loadConfig()), null);
  history.updateGroup(A, { blocked: true });
  assert.match(history.eligibility(A, loadConfig()), /loại trừ/);
});
test('selection inspects discovered groups and saves evidence without manual allow', async () => {
  const { main } = require('./select_groups');
  const config = loadConfig();
  await main({ config, dependencies: {
    launchBrowser: async () => ({ page: {}, context: { close: async () => {} }, browser: { close: async () => {} } }),
    inspectGroup: async (page, url) => ({ name: 'English community', description: url === A ? 'Promotional posts are allowed.' : 'No advertising.' })
  } });
  const groups = history.loadState().groups;
  assert.equal(groups[A].advertisingAllowed, true);
  assert.equal(groups[B].advertisingAllowed, false);
  assert.ok(groups[A].selection.evidence);
  assert.equal(plan().items.find(item => item.url === A).reason, null);
});
test('reconciliation requires matching content, a new link and the account author', () => {
  const { findPublished } = require('./reconcile_posts');
  const text = 'A detailed original story about English pronunciation practice with sufficient length to identify it.';
  const attempt = { groupUrl: A, submittedContent: text, beforeLinks: ['/groups/alpha/posts/old'] };
  const article = { text, links: ['/groups/alpha/posts/new'], authorLinks: ['https://www.facebook.com/profile.php?id=42'] };
  assert.equal(findPublished(attempt, [article], '42'), article);
  assert.equal(findPublished(attempt, [article], '43'), null);
  assert.equal(findPublished(attempt, [{ ...article, links: attempt.beforeLinks }], '42'), null);
  assert.equal(findPublished({ ...attempt, beforeLinks: undefined }, [article], '42'), null);
  assert.equal(findPublished(attempt, [article, article], '42'), null);
  assert.equal(findPublished(attempt, [], '42'), null);
  assert.deepEqual(findPublished({ groupUrl: A, content: 'Short post', postUrl: A + '/posts/known' }, [
    { text: 'Short post', links: ['/groups/alpha/posts/known'] }
  ]), { text: 'Short post', links: ['/groups/alpha/posts/known'] });
});
test('recent discovery is reused and refreshes after the configured interval', () => {
  const { shouldDiscover } = require('./automation');
  const config = { ...loadConfig(), discoveredGroups: [A] };
  const now = Date.now();
  assert.equal(shouldDiscover(config, { runs: [], lastDiscoveryAt: new Date(now - 3600000).toISOString() }, now), false);
  assert.equal(shouldDiscover(config, { runs: [], lastDiscoveryAt: new Date(now - 25 * 3600000).toISOString() }, now), true);
  assert.equal(shouldDiscover(config, { runs: [{ status: 'completed', stages: ['search'], endedAt: new Date(now).toISOString() }] }, now), false);
  assert.equal(shouldDiscover({ ...config, discoveredGroups: [] }, { runs: [], lastDiscoveryAt: new Date(now).toISOString() }, now), true);
});
test('selection prioritizes joined groups over stale posting targets', async () => {
  const config = { ...loadConfig(), groupSelection: { ...loadConfig().groupSelection, maxGroupsPerRun: 1 } };
  history.updateGroup(B, { membership: 'joined', syncedAt: new Date().toISOString() });
  let inspected;
  await require('./select_groups').main({ config, dependencies: {
    launchBrowser: async () => ({ page: {}, context: { close: async () => {} }, browser: { close: async () => {} } }),
    inspectGroup: async (page, url) => { inspected = url; return { name: 'English learners', description: 'Speaking practice.' }; }
  } });
  assert.equal(inspected, B);
  assert.equal(history.loadState().groups[B].advertisingAllowed, true);
});
test('join skips uncertain and failing groups and still reaches posting in the pipeline', async () => {
  const raw = read('config.json');
  raw.discoveredGroups = [A, B]; raw.automation = { search: false, sync: false, join: true, generateAI: false };
  raw.groupSelection = { ...raw.groupSelection, enabled: false }; write('config.json', raw);
  approve(); approve(B);
  let posted = false, closed = 0; const visited = [];
  await require('./automation').main({ dependencies: {
    runStage: async flag => {
      assert.equal(flag, 'join');
      await require('./join_groups').main({ dependencies: {
        launchBrowser: async () => ({ page: {}, context: { close: async () => { closed++; } }, browser: { close: async () => { closed++; } } }),
        sleep: async () => {},
        joinGroup: async (page, url) => { visited.push(url); if (url === B) throw new Error('Navigation timeout'); return 'unknown'; }
      } });
    },
    runPosting: async () => { posted = true; return { status: 'completed' }; }
  } });
  assert.deepEqual(visited, [A, B]); assert.equal(posted, true); assert.equal(closed, 2);
  assert.equal(history.loadState().groups[A].membership, 'unknown');
  assert.equal(history.loadState().groups[B].membership, 'unknown');
  assert.match(history.loadState().groups[B].joinError, /timeout/);
  let launched = false;
  await require('./join_groups').main({ dependencies: { launchBrowser: async () => { launched = true; } } });
  assert.equal(launched, false);
});
test('account verification during join still halts and closes the browser', async () => {
  approve(); write('config.json', { ...read('config.json'), discoveredGroups: [A] });
  let closed = 0;
  await assert.rejects(require('./join_groups').main({ dependencies: {
    launchBrowser: async () => ({ page: {}, context: { close: async () => { closed++; } }, browser: { close: async () => { closed++; } } }),
    joinGroup: async () => { throw new HaltError('Account checkpoint'); }
  } }), HaltError);
  assert.equal(closed, 2);
});
test('AI generation uses API headers, configured model and skips thought text', async () => {
  const config = read('config.json'); config.geminiApiKey = 'fixture-key'; config.geminiModels = ['test-flash']; write('config.json', config);
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    assert.ok(!url.includes('fixture-key'));
    assert.equal(options.headers['x-goog-api-key'], 'fixture-key');
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [
      { thought: true, text: 'Private reasoning must not become a post.' },
      { text: 'A useful pronunciation practice routine with enough detail for a complete sample post.' }
    ] } }] }) };
  };
  try {
    assert.equal(await require('./ai_generator').replenishAIPool(1), true);
    const pool = read('ai_posts_pool.json');
    assert.equal(pool.length, 3); assert.ok(!pool.at(-1).content.includes('Private reasoning'));
    assert.ok(pool.at(-1).id);
  } finally { global.fetch = originalFetch; }
});
