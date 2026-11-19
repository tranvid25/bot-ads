// Keep the interactive browser open after authentication. Persist before it closes.
async function waitForLogin(session, { save, sleep, now = Date.now, log = console.log, finish = () => false, autoFinish = false }) {
  let closed = false, saved = false, valid = false, stable = 0;
  const deadline = now() + 6 * 60000;
  const onClose = () => { closed = true; };
  session.browser.on('disconnected', onClose);
  session.context.on('close', onClose);
  try {
    log(autoFinish ? 'Đăng nhập trong cửa sổ Facebook. BotAds tự hoàn tất kết nối, không cần đóng cửa sổ.' : 'Đăng nhập trong cửa sổ Facebook. Sau khi thấy thông báo đã lưu phiên, bạn tự đóng cửa sổ khi hoàn tất.');
    while (!closed) {
      try {
        const pages = session.context.pages().filter(page => !page.isClosed());
        // Closing the last Chrome window can leave Playwright's browser/context
        // alive. It closes pages without emitting context close/disconnected.
        if (!pages.length || session.browser.isConnected?.() === false) {
          closed = true;
          break;
        }
        const page = pages.find(page => {
          try { return /(^|\.)facebook\.com$/.test(new URL(page.url()).hostname); }
          catch { return false; }
        });
        const cookies = await session.context.cookies(['https://www.facebook.com']);
        const blocked = !page || /login|checkpoint|challenge|two_step_verification/.test(new URL(page.url()).pathname);
        const loginForm = page?.locator ? await page.locator('input[name="email"], input[name="pass"]').first().isVisible().catch(() => false) : false;
        valid = !!cookies.find(cookie => cookie.name === 'c_user' && cookie.value) && !blocked && !loginForm;
        stable = valid ? stable + 1 : 0;
        if (valid) {
          await save(session.context);
          if (!saved) log(autoFinish ? 'Đã lưu phiên Facebook, đang xác minh kết nối…' : 'Đã lưu phiên Facebook. Cửa sổ vẫn mở để bạn kiểm tra; hãy tự đóng khi hoàn tất.');
          saved = true;
          if (autoFinish && stable >= 2) { log('Kết nối Facebook thành công. Bạn có thể chạy chiến dịch trên website, không cần đóng cửa sổ này.'); return; }
        }
        if (finish()) {
          if (!saved || !valid) throw new Error('Chưa xác minh được phiên Facebook hiện tại. Hãy đăng nhập và hoàn tất xác minh trước.');
          log('Đã xác nhận hoàn tất kết nối Facebook. Đóng cửa sổ kết nối để nhận công việc.');
          return;
        }
      } catch (error) {
        if (!closed) throw error;
      }
      if (closed) break;
      // Only the initial login has a deadline. Authenticated browsing stays open.
      if (!saved && now() >= deadline) throw new Error('Hết thời gian chờ đăng nhập Facebook (6 phút).');
      await sleep(1000);
    }
    if (!saved || !valid) throw new Error('Cửa sổ đã đóng trước khi có phiên Facebook hợp lệ. Vui lòng kết nối lại.');
    log('Bạn đã đóng cửa sổ Facebook. Phiên đã lưu trên máy.');
  } finally {
    session.browser.removeListener('disconnected', onClose);
    session.context.removeListener('close', onClose);
  }
}
module.exports = { waitForLogin };
