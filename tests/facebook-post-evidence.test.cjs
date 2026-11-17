const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'botads-post-evidence-'));
process.env.BOTADS_DATA_DIR = dir;
const { chromium } = require('playwright');
const { canonicalPostUrl } = require('../packages/automation/facebook_permalink.cjs');
const { readEvidence, waitForPostResult } = require('../packages/automation/post_verification');
test('permalink canonicalization recognizes tracking variants but rejects non-post/external links', () => {
  assert.equal(canonicalPostUrl('/groups/website/permalink/123/?ref=feed'), canonicalPostUrl('https://m.facebook.com/groups/website/posts/123/?__cft__=tracking'));
  assert.equal(canonicalPostUrl('https://evil.example/groups/a/posts/123'), null);
  assert.equal(canonicalPostUrl('https://www.facebook.com/groups/website/'), null);
  assert.ok(canonicalPostUrl('/story.php?id=42&story_fbid=123&ref=feed').includes('story_fbid=123&id=42'));
});
test('new truncated post can be expanded and verified; changing old tracking parameters cannot prove a new post', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const content = 'Original website service content with enough detail for visitors.';
    await page.setContent('<div id="composer" role="dialog" hidden></div>');
    const before = await readEvidence(page);
    await page.evaluate(content => {
      const article = document.createElement('div'); article.setAttribute('role', 'article');
      article.innerHTML = '<span>Original website...</span><button>See more</button><a href="https://www.facebook.com/groups/website/posts/123/?ref=feed">Time</a>';
      article.querySelector('button').onclick = () => { article.querySelector('span').textContent = content; article.querySelector('button').remove(); };
      document.body.appendChild(article);
    }, content);
    const result = await waitForPostResult(page, page.locator('#composer'), content, before, 1000);
    assert.equal(result.status, 'success');
    const old = await readEvidence(page);
    await page.locator('[role="article"] a').evaluate(a => a.href = 'https://m.facebook.com/groups/website/permalink/123/?ref=changed');
    assert.equal((await waitForPostResult(page, page.locator('#composer'), content, old, 50)).status, 'unknown');
  } finally { await browser.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});
