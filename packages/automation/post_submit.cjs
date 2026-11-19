const { assertAccountReady, checkStop, sleep } = require('./runtime');
const { dismissPostSuggestions } = require('./post_suggestions.cjs');
const postName = /^(Post|Đăng|Submit|Gửi)$/i;
const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();

async function buttonDiagnostics(button) {
  return button.evaluate(el => {
    const rect = el.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return {
      disabled: el.matches(':disabled') || !!el.closest('[aria-disabled="true"], [inert]'),
      busy: !!el.closest('[aria-busy="true"]'),
      suggestion: !!hit && !el.contains(hit) && /^\d[\d.,]*\s*[KMB]?\s*(posts?|bài viết)$/i.test(hit.textContent.trim()),
    };
  }, undefined, { timeout: 1000 }).catch(() => null);
}

async function waitForSubmitReady(page, dialog, content, { timeout = 45000 } = {}) {
  const deadline = Date.now() + timeout;
  let lastError = '', diagnostic = null;
  let blurredSuggestion = false;
  const button = dialog.getByRole('button', { name: postName }).filter({ visible: true }).first();
  do {
    checkStop();
    await assertAccountReady(page);
    const editor = dialog.locator('[role="textbox"], [contenteditable="true"]').filter({ visible: true }).first();
    const actual = await editor.innerText({ timeout: Math.min(1000, timeout) }).catch(() => '');
    if (!normalize(content) || normalize(actual) !== normalize(content))
      throw new Error('Nội dung chưa được nhập đầy đủ vào hộp soạn Facebook. Chưa bấm Đăng; mở nhật ký và kiểm tra hộp soạn.');
    try {
      diagnostic = await buttonDiagnostics(button);
      if (diagnostic?.suggestion && !blurredSuggestion) {
        console.log('Đóng bảng gợi ý hashtag đang che nút Đăng; giữ nguyên nội dung bài viết.');
        await dismissPostSuggestions(dialog, editor);
        blurredSuggestion = true;
        continue;
      }
      // Trial performs scroll/actionability checks without submitting or bypassing overlays.
      await button.click({ trial: true, timeout: Math.max(1, Math.min(2000, deadline - Date.now())) });
      return button;
    } catch (error) {
      lastError = String(error.message || '');
      diagnostic = await buttonDiagnostics(button);
      if (diagnostic?.suggestion && !blurredSuggestion) {
        await dismissPostSuggestions(dialog, editor);
        blurredSuggestion = true;
      }
      checkStop();
    }
    if (Date.now() < deadline) await sleep(Math.min(250, deadline - Date.now()));
  } while (Date.now() < deadline);
  const reason = diagnostic?.disabled ? 'Facebook chưa bật nút Đăng (có thể đang xử lý nội dung/ảnh hoặc thiếu yêu cầu của nhóm).'
    : diagnostic?.busy ? 'Facebook vẫn đang xử lý hộp soạn bài.'
    : /intercepts pointer events/i.test(lastError) ? 'Nút Đăng đang bị một lớp giao diện che, chưa nhận được thao tác bấm.'
    : /not stable|outside of the viewport/i.test(lastError) ? 'Hộp soạn đang thay đổi vị trí hoặc nút Đăng chưa nằm trong vùng bấm.'
    : 'Nút Đăng chưa sẵn sàng hoặc hộp soạn đã thay đổi.';
  throw new Error(`${reason} Đã chờ ${Math.round(timeout / 1000)} giây; chưa bấm Đăng. Kiểm tra cửa sổ Facebook, yêu cầu của nhóm và ảnh tải lên rồi thử lại.`);
}
module.exports = { waitForSubmitReady };
