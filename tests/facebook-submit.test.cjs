const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
process.env.BOTADS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'botads-submit-'));
const { chromium } = require('playwright');
const { waitForSubmitReady } = require('../packages/automation/post_submit.cjs');

test('submit waits for disabled controls and overlays without clicking before authorization', async t => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const content = 'Owner website service content';
  const html = `<div role="dialog"><div role="textbox" contenteditable="true">${content}</div><div role="button" aria-label="Post" tabindex="0" onclick="window.submits=(window.submits||0)+1">Post</div></div>`;
  const dialog = page.getByRole('dialog');
  try {
    await t.test('waits until aria-disabled is removed and never submits during a trial', async () => {
      await page.setContent(html);
      await page.getByRole('button', { name: 'Post' }).evaluate(el => {
        el.setAttribute('aria-disabled', 'true'); setTimeout(() => el.removeAttribute('aria-disabled'), 300);
      });
      const button = await waitForSubmitReady(page, dialog, content, { timeout: 2500 });
      assert.equal(await page.evaluate(() => window.submits || 0), 0);
      await button.click();
      assert.equal(await page.evaluate(() => window.submits), 1);
    });
    await t.test('waits for a transient overlay instead of forcing a click', async () => {
      await page.setContent(html + '<div id="overlay" style="position:fixed;inset:0;z-index:99"></div>');
      await page.evaluate(() => { window.submits = 0; setTimeout(() => document.querySelector('#overlay').remove(), 350); });
      await waitForSubmitReady(page, dialog, content, { timeout: 2500 });
      assert.equal(await page.evaluate(() => window.submits), 0);
    });
    await t.test('native disabled buttons produce an actionable error without sending', async () => {
      await page.setContent(`<div role="dialog"><div role="textbox">${content}</div><button disabled>Post</button></div>`);
      await assert.rejects(waitForSubmitReady(page, dialog, content, { timeout: 300 }), /chưa bật nút Đăng/);
    });
    await t.test('post-count suggestion closes on focus change without selecting it or submitting', async () => {
      await page.setContent(html + '<span id="suggestion" style="position:fixed;inset:0;z-index:99">10K posts</span>');
      await page.evaluate(() => {
        window.submits = 0;
        const editor = document.querySelector('[role="textbox"]');
        editor.focus();
        editor.onblur = () => document.querySelector('#suggestion')?.remove();
      });
      const button = await waitForSubmitReady(page, dialog, content, { timeout: 3000 });
      assert.equal(await page.locator('#suggestion').count(), 0);
      assert.equal(await dialog.getByRole('textbox').innerText(), content);
      assert.equal(await page.evaluate(() => window.submits), 0);
      await button.click();
      assert.equal(await page.evaluate(() => window.submits), 1);
    });
    await t.test('missing content fails before clicking', async () => {
      await page.setContent(html);
      await assert.rejects(waitForSubmitReady(page, dialog, 'Missing content', { timeout: 300 }), /chưa được nhập đầy đủ/);
    });
    await t.test('screenshot layout: clicking Create post dismisses hashtag dropdown without Tab or changing content', async () => {
      await page.setContent(`<div role="dialog" style="position:relative;width:500px;height:400px">
        <h2>Create post</h2><div role="textbox" contenteditable="true">${content} #BusinessGrowth</div>
        <div role="button" aria-label="Post" style="position:absolute;top:300px;width:400px;height:40px" onclick="window.submits++">Post</div>
        <div id="suggestion" style="position:absolute;top:200px;width:400px;height:200px;z-index:2"><span style="display:block;height:200px">10K posts</span></div>
      </div>`);
      await page.evaluate(() => {
        window.submits = 0;
        const editor = document.querySelector('[role="textbox"]');
        editor.focus();
        editor.onblur = () => document.querySelector('#suggestion')?.remove();
        editor.onkeydown = e => { if (e.key === 'Tab') editor.textContent += 'UNWANTED AUTOCOMPLETE'; };
      });
      const body = content + ' #BusinessGrowth';
      const button = await waitForSubmitReady(page, dialog, body, { timeout: 3000 });
      assert.equal(await dialog.getByRole('textbox').innerText(), body);
      assert.equal(await page.locator('#suggestion').count(), 0);
      assert.equal(await page.evaluate(() => window.submits), 0);
      await button.click();
      assert.equal(await page.evaluate(() => window.submits), 1);
    });
    await t.test('permanent overlays are reported as blocked, not as a successful submission', async () => {
      await page.setContent(html + '<div style="position:fixed;inset:0;z-index:99"></div>');
      await assert.rejects(waitForSubmitReady(page, dialog, content, { timeout: 500 }), /bị một lớp giao diện che/);
    });
  } finally {
    await browser.close();
    fs.rmSync(process.env.BOTADS_DATA_DIR, { recursive: true, force: true });
  }
});
