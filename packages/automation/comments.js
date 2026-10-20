const { sleep, assertAccountReady, HaltError } = require('./runtime');
const normalize = text => text.replace(/\s+/g, ' ').trim();
function commentText(config) {
  const url = config.commentWebsiteUrl || 'https://pronunreview.com';
  let text = (config.commentContent || 'Bạn xem và trải nghiệm PronunReview tại đây nhé:').trim();
  text = text.replace(/https?:\/\/(?:app\.|www\.)?pronunreview\.com\/?/gi, url);
  if (!text.includes(url)) text += ' ' + url;
  return text;
}
async function hasComment(article, text) {
  return article.evaluate((root, expected) => {
    const normalize = value => value.replace(/\s+/g, ' ').trim();
    const selectors = '[data-ad-rendering-role="comment_message"], [role="article"][aria-label], [aria-label^="Comment by"], [aria-label^="Bình luận của"]';
    return [...root.querySelectorAll(selectors)].some(el => {
      if (!el.getClientRects().length || el.matches('[contenteditable], [role="textbox"]')) return false;
      const copy = el.cloneNode(true);
      copy.querySelectorAll('[contenteditable], [role="textbox"], input, textarea').forEach(editor => editor.remove());
      return normalize(copy.textContent).includes(expected);
    });
  }, normalize(text));
}
async function dropCommentLink(page, article, text, { beforeSubmit = async () => {}, verifyOnly = false, timeout = 10000 } = {}) {
  let sending = false;
  try {
    await assertAccountReady(page);
    if (await article.count() !== 1) return { status: 'not_available', error: 'Không xác định duy nhất bài cần bình luận.' };
    if (await hasComment(article, text)) return { status: 'confirmed', text, checkedAt: new Date().toISOString() };
    if (verifyOnly) return { status: 'unknown', text, error: 'Chưa thấy bình luận đã gửi. Không tự gửi lại để tránh trùng.' };
    await article.scrollIntoViewIfNeeded();
    let editor;
    const findEditor = async () => {
      const inputs = article.locator('[role="textbox"][contenteditable="true"], textarea[placeholder*="comment"], textarea[placeholder*="bình luận"]');
      for (let i = 0; i < await inputs.count(); i++) {
        const input = inputs.nth(i);
        const isReply = await input.evaluate(el => Boolean(el.closest('[aria-label^="Comment by"], [aria-label^="Bình luận của"]')));
        if (!isReply && await input.isVisible()) return input;
      }
      return null;
    };
    editor = await findEditor();
    if (!editor) {
      const button = article.getByRole('button', { name: /^(Comment|Bình luận)(?:\s+\d+)?$/i }).first();
      if (await button.isVisible()) { await button.click(); await sleep(800); }
      editor = await findEditor();
    }
    if (!editor) return { status: 'not_available', text, error: 'Chưa có ô bình luận trên đúng bài. Sẽ kiểm tra lại ở lượt sau.' };
    await editor.fill(text);
    await assertAccountReady(page);
    const form = editor.locator('xpath=ancestor::form[1]');
    const submit = await form.count() ? form.getByRole('button', { name: /^(Comment|Bình luận|Post|Đăng|Send|Gửi|Post a comment|Đăng bình luận)$/i }).first() :
      article.getByRole('button', { name: /^(Post a comment|Đăng bình luận|Gửi bình luận|Send comment|Submit comment)$/i }).first();
    const useButton = await submit.isVisible() && await submit.isEnabled();
    await beforeSubmit(); // Persist before Enter: a crash must never trigger a blind retry.
    sending = true;
    if (useButton) await submit.click();
    else await editor.press('Enter');
    const until = Date.now() + timeout;
    do {
      await assertAccountReady(page);
      if (await hasComment(article, text)) {
        console.log('✅ Đã xác nhận bình luận kèm link:', text);
        return { status: 'confirmed', text, checkedAt: new Date().toISOString() };
      }
      if (Date.now() >= until) break;
      await sleep(500);
    } while (true);
    console.warn('⚠️ Đã gửi thao tác bình luận nhưng chưa thấy bình luận xuất hiện.');
    return { status: 'unknown', text, error: 'Chưa xác nhận Facebook đã hiển thị bình luận.' };
  } catch (error) {
    if (error instanceof HaltError) throw error;
    return { status: sending ? 'unknown' : 'failed', text, error: error.message };
  }
}
async function commentOnAttempt(page, article, attempt, config, options = {}) {
  if (!config.commentLinkUnderPost) return;
  const { updateAttempt } = require('./history');
  const text = attempt.comment?.text || commentText(config);
  const verifyOnly = ['unknown', 'submitting', 'submitted'].includes(attempt.comment?.status);
  if (attempt.comment?.status === 'confirmed') return attempt.comment;
  const previous = attempt.comment || {};
  const result = await dropCommentLink(page, article, text, {
    ...options, verifyOnly,
    beforeSubmit: async () => updateAttempt(attempt.id, { comment: { status: 'submitting', text, attemptedAt: new Date().toISOString() } })
  });
  updateAttempt(attempt.id, { comment: { ...previous, ...result, checkedAt: new Date().toISOString() } });
  return result;
}
module.exports = { commentText, hasComment, dropCommentLink, commentOnAttempt };
