const { loadConfig } = require('./settings');
const { loadState, updateAttempt } = require('./history');
const { launchBrowser } = require('./browser_helper');
const { readEvidence } = require('./post_verification');
const { sleep, checkStop, assertAccountReady, HaltError, cli } = require('./runtime');
const normalize = value => value.replace(/\s+/g, ' ').trim();
function findPublished(attempt, articles, userId) {
  const content = normalize(attempt.submittedContent || attempt.content || '');
  if (!content || !attempt.postUrl && content.length < 80) return null;
  const matches = articles.filter(article => article.text.includes(attempt.postUrl ? content.slice(0, 80) : content) && article.links.some(href => {
    const absolute = new URL(href, attempt.groupUrl).href;
    if (attempt.postUrl) return absolute === attempt.postUrl;
    // Without a pre-submit snapshot we cannot rule out an older identical post.
    if (!attempt.beforeLinks || attempt.beforeLinks.includes(href) || !userId) return false;
    return (article.authorLinks || []).some(link => {
      const url = new URL(link, 'https://www.facebook.com');
      return ['facebook.com', 'www.facebook.com', 'm.facebook.com'].includes(url.hostname) &&
        (url.pathname.replace(/\/+$/, '') === '/' + userId || url.pathname === '/profile.php' && url.searchParams.get('id') === userId);
    });
  }));
  return matches.length === 1 ? matches[0] : null;
}
async function main({ config = loadConfig(), dependencies = {} } = {}) {
  const attempts = loadState().attempts.filter(a => a.submittedContent && (
    ['pending_approval', 'unknown', 'submitting'].includes(a.status) ||
    a.status === 'success' && a.postUrl && (a.commentConfig || config).commentLinkUnderPost && a.comment?.status !== 'confirmed'))
    .sort((a, b) => (a.reconcileCheckedAt || '').localeCompare(b.reconcileCheckedAt || '')).slice(0, config.maxPostsPerRun);
  if (!attempts.length) return;
  const session = await (dependencies.launchBrowser || launchBrowser)({ headless: config.headless ?? false });
  try {
    const userId = (await session.context.cookies(['https://www.facebook.com'])).find(cookie => cookie.name === 'c_user')?.value;
    for (const attempt of attempts) {
      checkStop();
      try {
        await session.page.goto(attempt.postUrl || attempt.groupUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(3000); await assertAccountReady(session.page);
        updateAttempt(attempt.id, { reconcileCheckedAt: new Date().toISOString() });
        const evidence = await readEvidence(session.page);
        const article = findPublished(attempt, evidence.articles, userId);
        if (!article) continue; // Absence never proves failure/rejection; never resubmit automatically.
        const href = article.links.find(link => attempt.postUrl ? new URL(link, attempt.groupUrl).href === attempt.postUrl : !attempt.beforeLinks?.includes(link));
        const postUrl = attempt.postUrl || new URL(href, attempt.groupUrl).href;
        updateAttempt(attempt.id, { status: 'success', postUrl, reconciledAt: new Date().toISOString(), error: null });
        require('./post_runner').reconcilePool();
        console.log('Đã tự xác nhận bài xuất hiện:', postUrl);
        const commentConfig = attempt.commentConfig || config;
        if (commentConfig.commentLinkUnderPost && attempt.comment?.status !== 'confirmed') {
          const locator = session.page.locator('[role="article"]').filter({ has: session.page.locator(`a[href=${JSON.stringify(href)}]`) });
          if (await locator.count() === 1) {
            await require('./comments').commentOnAttempt(session.page, locator, attempt, commentConfig);
          }
        }
      } catch (error) {
        if (error instanceof HaltError) throw error;
        updateAttempt(attempt.id, { reconcileError: error.message });
      }
    }
  } finally { await session.context.close().catch(() => {}); await session.browser.close().catch(() => {}); }
}
if (require.main === module) cli(() => main());
module.exports = { main, findPublished };
