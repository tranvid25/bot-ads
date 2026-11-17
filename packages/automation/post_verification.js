const { assertAccountReady } = require('./runtime');
const { canonicalPostUrl } = require('./facebook_permalink.cjs');
const normalize = text => text.replace(/\s+/g, ' ').trim();

async function expandPostText(page) {
  const buttons = page.locator('[role="article"]').getByRole('button', { name: /^(See more|Xem thêm)$/i });
  for (let i = 0, count = Math.min(await buttons.count(), 10); i < count; i++) {
    const button = buttons.nth(i);
    if (await button.isVisible().catch(() => false)) await button.click({ timeout: 1000 }).catch(() => {});
  }
}

// Capture evidence before submitting so an older post or notice cannot confirm this attempt.
async function readEvidence(page) {
  return page.evaluate(() => {
    const visible = el => el.getClientRects().length > 0;
    return {
      articles: [...document.querySelectorAll('[role="article"]')].filter(visible).map(el => ({
        text: el.innerText.replace(/\s+/g, ' ').trim(),
        authorLinks: [...el.querySelectorAll('h2 a[href], h3 a[href], strong a[href]')].map(a => a.getAttribute('href')),
        links: [...el.querySelectorAll('a[href]')].filter(a => {
          const url = new URL(a.getAttribute('href'), 'https://www.facebook.com');
          return ['facebook.com', 'www.facebook.com', 'm.facebook.com'].includes(url.hostname) &&
            (/^\/groups\/[^/]+\/(posts|permalink)\/[^/]+/.test(url.pathname) || ['/permalink.php', '/story.php'].includes(url.pathname) && url.searchParams.has('story_fbid'));
        }).map(a => a.getAttribute('href'))
      })),
      notices: [...document.querySelectorAll('[role="alert"], [role="status"], [role="dialog"]')]
        .filter(el => visible(el) && !el.closest('[role="article"]')).map(el => {
          const copy = el.cloneNode(true);
          copy.querySelectorAll('[role="textbox"], [contenteditable], input, textarea').forEach(editor => editor.remove());
          return copy.textContent.replace(/\s+/g, ' ').trim();
        })
    };
  });
}

async function waitForPostResult(page, dialog, content, before, timeout = 30000) {
  const target = normalize(content);
  const oldLinks = new Set(before.articles.flatMap(article => article.links).map(link => canonicalPostUrl(link)));
  const deadline = Date.now() + timeout;
  let nextExpand = 0;
  do {
    await assertAccountReady(page);
    if (Date.now() >= nextExpand && !(await dialog.isVisible())) {
      await expandPostText(page); nextExpand = Date.now() + 2000;
    }
    const evidence = await readEvidence(page);
    const approval = evidence.notices.some(text => !before.notices.includes(text) &&
      /(?:your post (?:is pending|was submitted|has been submitted)|bài viết của bạn (?:đang chờ|đã được gửi)|đã gửi bài viết).*?(?:approval|review|duyệt)|(?:post submitted for approval|bài viết đang chờ phê duyệt)/i.test(text));
    if (approval) return { status: 'pending_approval' };

    if (target && !(await dialog.isVisible())) {
      const matches = evidence.articles.filter(article => article.text.includes(target) &&
        !before.articles.some(old => old.text === article.text) && article.links.some(link => canonicalPostUrl(link) && !oldLinks.has(canonicalPostUrl(link))));
      if (matches.length === 1) {
        const href = matches[0].links.find(link => canonicalPostUrl(link) && !oldLinks.has(canonicalPostUrl(link)));
        const article = page.locator('[role="article"]').filter({
          has: page.locator(`a[href=${JSON.stringify(href)}]`)
        });
        if (await article.count() === 1) return { status: 'success', article, href };
      }
    }
    await page.waitForTimeout(500);
  } while (Date.now() < deadline);
  return { status: 'unknown', error: 'Chưa xác nhận được kết quả gửi bài. Kiểm tra Facebook trước khi thử lại.' };
}

module.exports = { readEvidence, waitForPostResult, expandPostText };
