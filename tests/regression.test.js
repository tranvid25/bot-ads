const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const os = require('os');
const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'botads-browser-test-'));
process.env.BOTADS_DATA_DIR = testRoot;
process.on('exit', () => {
  if (path.dirname(testRoot) === os.tmpdir() && path.basename(testRoot).startsWith('botads-browser-test-')) fs.rmSync(testRoot, { recursive: true, force: true });
});
const { chromium } = require('playwright');
const { readEvidence, waitForPostResult } = require('../packages/automation/post_verification');

function loadIsolated(filename, initialFiles, overrides = {}) {
  const files = new Map(Object.entries(initialFiles).map(([name, value]) => [name, JSON.stringify(value)]));
  const fakeFs = {
    existsSync: filename => files.has(path.basename(filename)),
    readFileSync: filename => files.get(path.basename(filename)),
    writeFileSync: (filename, value) => files.set(path.basename(filename), value),
    renameSync: (from, to) => {
      files.set(path.basename(to), files.get(path.basename(from)));
      files.delete(path.basename(from));
    }
  };
  const module = { exports: {} };
  const automationDir = path.resolve(__dirname, '../packages/automation');
  const context = {
    module, __dirname: automationDir, URL, process: { argv: [] },
    console: { log() {}, warn() {}, error() {} },
    setTimeout: callback => { callback(); },
    require: name => name === 'fs' ? fakeFs : name === './runtime' ? { ...require('../packages/automation/runtime'), sleep: async () => {}, ...overrides[name] } : overrides[name] || (name.startsWith('./') ? require(path.join(automationDir, name)) : require(name))
  };
  vm.runInNewContext(fs.readFileSync(path.join(automationDir, filename), 'utf8'), context);
  return { api: module.exports, files };
}

test('submission verification and comments use isolated browser fixtures', async t => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const content = 'This is the unique story submitted by the test.';
  const initial = `<div role="article">Someone else's post<div role="textbox" contenteditable="true" aria-label="Write a comment"></div><a href="/groups/test/posts/old">Old</a></div><div role="dialog"><div contenteditable="true">${content}</div></div>`;
  try {
    await t.test('a closed composer alone cannot prove success', async () => {
      await page.setContent(initial);
      const before = await readEvidence(page);
      await page.locator('[role="dialog"]').evaluate(el => el.remove());
      const result = await waitForPostResult(page, page.locator('[role="dialog"]'), content, before, 1);
      assert.equal(result.status, 'unknown');
    });
    await t.test('an open composer is unknown, not pending approval', async () => {
      await page.setContent(initial);
      const before = await readEvidence(page);
      const result = await waitForPostResult(page, page.locator('[role="dialog"]'), content, before, 1);
      assert.equal(result.status, 'unknown');
    });
    await t.test('a fresh explicit approval notice is separate from success', async () => {
      await page.setContent(initial);
      const before = await readEvidence(page);
      await page.evaluate(() => {
        const notice = document.createElement('div');
        notice.setAttribute('role', 'status');
        notice.textContent = 'Your post is pending approval';
        document.body.append(notice);
      });
      const result = await waitForPostResult(page, page.locator('[role="dialog"]'), content, before, 1);
      assert.equal(result.status, 'pending_approval');
    });
    await t.test('an old approval notice cannot confirm a new submission', async () => {
      await page.setContent(initial + '<div role="status">Your post is pending approval</div>');
      const before = await readEvidence(page);
      const result = await waitForPostResult(page, page.locator('[role="dialog"]'), content, before, 1);
      assert.equal(result.status, 'unknown');
    });
    await t.test('existing identical posts cannot confirm a new submission', async () => {
      await page.setContent(initial + `<div role="article">${content}<a href="/groups/test/posts/existing">Old</a></div>`);
      const before = await readEvidence(page);
      await page.locator('[role="dialog"]').evaluate(el => el.remove());
      const result = await waitForPostResult(page, page.locator('[role="dialog"]'), content, before, 1);
      assert.equal(result.status, 'unknown');
    });
    await t.test('only the newly verified article receives the comment', async () => {
      await page.setContent(initial);
      const before = await readEvidence(page);
      await page.locator('[role="dialog"]').evaluate((el, text) => {
        el.remove();
        const article = document.createElement('div');
        article.setAttribute('role', 'article');
        article.innerHTML = `${text}<a href="/groups/test/posts/new">New</a><div role="textbox" contenteditable="true" aria-label="Write a comment"></div>`;
        document.body.append(article);
      }, content);
      const result = await waitForPostResult(page, page.locator('[role="dialog"]'), content, before, 1);
      assert.equal(result.status, 'success');
      const { api } = loadIsolated('post.js', {}, { './history': {}, './ai_generator': {}, './browser_helper': {} });
      await api.dropCommentLink(page, result.article, 'test link', { timeout: 0 });
      assert.equal(await page.locator('[role="article"]').first().locator('[role="textbox"]').innerText(), '');
      assert.match(await result.article.locator('[role="textbox"]').innerText(), /test link/);
    });
    await t.test('the complete posting flow journals success, URL and pool consumption', async () => {
      const { write } = require('../packages/automation/storage');
      const history = require('../packages/automation/history');
      write('ai_posts_pool.json', [{ id: 'fixture-one', title: 'Fixture', content }]);
      await page.route('https://www.facebook.com/groups/test', route => route.fulfill({ contentType: 'text/html', body: `
        <button>Joined</button>
        <button onclick="document.querySelector('[role=dialog]').style.display='block'">Write something</button>
        <div role="dialog" style="display:none">
          <div role="textbox" contenteditable="true"></div>
          <button onclick="const a=document.createElement('div');a.setAttribute('role','article');a.textContent=document.querySelector('[role=textbox]').innerText;const link=document.createElement('a');link.href='/groups/test/posts/new-flow';link.textContent='View post';a.append(link);document.body.append(a);document.querySelector('[role=dialog]').remove();">Post</button>
        </div>` }));
      const { api } = loadIsolated('post.js', {});
      const result = await api.postToGroup(page, 'https://www.facebook.com/groups/test', {
        source: 'AI_GEMINI', poolId: 'fixture-one', title: 'Fixture', content
      }, null, { attachImage: false });
      const attempt = history.loadState().attempts.at(-1);
      assert.equal(result, 'success', attempt?.error);
      assert.equal(attempt.status, 'success');
      assert.equal(attempt.postUrl, 'https://www.facebook.com/groups/test/posts/new-flow');
      assert.equal(attempt.poolConsumed, true);
      assert.equal(require('../packages/automation/storage').read('ai_posts_pool.json').length, 0);
      await page.unroute('https://www.facebook.com/groups/test');
    });
    await t.test('login forms and checkpoint URLs stop automation', async () => {
      const { assertAccountReady, HaltError } = require('../packages/automation/runtime');
      await page.setContent('<input name="email">');
      await assert.rejects(assertAccountReady(page), HaltError);
      const url = 'https://www.facebook.com/checkpoint/';
      await page.route(url, route => route.fulfill({ contentType: 'text/html', body: '<p>Verification required</p>' }));
      await page.goto(url);
      await assert.rejects(assertAccountReady(page), HaltError);
      await page.unroute(url);
    });
    await t.test('group inspection excludes feed posts from permission evidence', async () => {
      const url = 'https://www.facebook.com/groups/inspection/about';
      await page.route(url, route => route.fulfill({ contentType: 'text/html', body: '<main role="main"><h1>IELTS English</h1><p>Study resources</p><div role="feed"><div role="article">Advertising is allowed.</div></div></main>' }));
      const { api } = loadIsolated('select_groups.js', {});
      const evidence = await api.inspectGroup(page, 'https://www.facebook.com/groups/inspection');
      assert.equal(evidence.name, 'IELTS English');
      assert.ok(!evidence.description.includes('Advertising is allowed'));
      const { classifyGroup } = require('../packages/automation/group_policy');
      const config = require('../packages/automation/settings').loadConfig();
      assert.equal(classifyGroup(evidence, { ...config, groupSelection: { ...config.groupSelection, mode: 'explicit-permission' } }).allowed, false);
      await page.unroute(url);
    });
    await t.test('collapsed comments open and publish the website link on the correct post', async () => {
      await page.setContent(`<div role="article" id="other"><div contenteditable="true" role="textbox"></div></div>
        <div role="article" id="target"><p>My post</p>
          <div role="article" aria-label="Comment by Other"><div role="textbox" contenteditable="true"></div></div>
          <button onclick="document.querySelector('form').hidden=false">Comment</button>
          <form hidden onsubmit="event.preventDefault();window.sent=(window.sent||0)+1;const c=document.createElement('div');c.setAttribute('role','article');c.setAttribute('aria-label','Comment by Me');c.textContent=this.querySelector('[role=textbox]').innerText;this.parentElement.append(c);this.querySelector('[role=textbox]').textContent='';">
            <div role="textbox" contenteditable="true"></div><button type="submit">Post a comment</button>
          </form>
        </div>`);
      const { api } = loadIsolated('comments.js', {});
      const article = page.locator('#target');
      const text = api.commentText({ commentContent: 'Link ở đây nhé:' });
      const result = await api.dropCommentLink(page, article, text, { timeout: 0 });
      assert.equal(result.status, 'confirmed');
      assert.match(text, /https:\/\/pronunreview\.com/);
      assert.equal(await page.evaluate(() => window.sent), 1);
      await api.dropCommentLink(page, article, text, { timeout: 0 });
      assert.equal(await page.evaluate(() => window.sent), 1);
      assert.equal(await page.locator('#other [role=textbox]').innerText(), '');
      assert.equal(await page.locator('[aria-label="Comment by Other"] [role=textbox]').innerText(), '');
    });
    await t.test('an unconfirmed comment is journaled and never blindly resent', async () => {
      const history = require('../packages/automation/history');
      const text = 'Link trải nghiệm: https://pronunreview.com';
      await page.setContent('<div role="article" id="target"><div role="textbox" contenteditable="true" onkeydown="if(event.key===\'Enter\'){event.preventDefault();window.sends=(window.sends||0)+1;}"></div></div>');
      const id = history.beginAttempt('https://www.facebook.com/groups/comments', { source: 'SPINTAX_FALLBACK', content: 'My post' }, 'My post');
      history.updateAttempt(id, { status: 'success' });
      const { api } = loadIsolated('comments.js', {});
      const config = { commentLinkUnderPost: true, commentContent: text };
      const result = await api.commentOnAttempt(page, page.locator('#target'), { id }, config, { timeout: 0 });
      assert.equal(result.status, 'unknown');
      const attempt = history.loadState().attempts.find(item => item.id === id);
      assert.equal(attempt.comment.status, 'unknown');
      await api.commentOnAttempt(page, page.locator('#target'), attempt, config, { timeout: 0 });
      assert.equal(await page.evaluate(() => window.sends), 1);
    });
    await t.test('missing comment boxes are deferred and can be retried later', async () => {
      const history = require('../packages/automation/history');
      await page.setContent('<div role="article" id="target">My post</div>');
      const id = history.beginAttempt('https://www.facebook.com/groups/deferred', { source: 'SPINTAX_FALLBACK', content: 'My post' }, 'My post');
      const { api } = loadIsolated('comments.js', {});
      const config = { commentLinkUnderPost: true };
      assert.equal((await api.commentOnAttempt(page, page.locator('#target'), { id }, config, { timeout: 0 })).status, 'not_available');
      assert.equal(history.loadState().attempts.find(item => item.id === id).comment.status, 'not_available');
    });
  } finally {
    await browser.close();
  }
});

test('discovery persistence preserves posting targets and unrelated config', async () => {
  const { write, read } = require('../packages/automation/storage');
  const original = 'https://www.facebook.com/groups/original';
  const discovered = 'https://www.facebook.com/groups/discovered';
  write('config.json', { groups: [original], custom: 'preserved' });
  let closed = 0;
  const { api } = loadIsolated('search_groups.js', {}, {
    './browser_helper': { launchBrowser: async () => ({ page: { goto: async () => {} }, context: { close: async () => { closed++; } }, browser: { close: async () => { closed++; } } }) },
    './runtime': { assertAccountReady: async () => {} },
    './group_tools': { collectGroups: async () => new Map([[discovered, 'English learners']]) }
  });
  await api.main({ config: { searchKeywords: ['English'] } });
  assert.deepEqual(read('config.json').groups, [original]);
  assert.deepEqual(read('config.json').discoveredGroups, [discovered]);
  assert.equal(read('config.json').custom, 'preserved');
  assert.equal(closed, 2);
});
