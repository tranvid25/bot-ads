// Keep the interactive browser open after authentication. Persist before it closes.
async function waitForLogin(session, { save, sleep, now = Date.now, log = console.log }) {
  let closed = false, saved = false, valid = false;
  const deadline = now() + 6 * 60000;
  const onClose = () => { closed = true; };
  session.browser.on('disconnected', onClose);
  session.context.on('close', onClose);
  try {
    log('Đăng nhập trong cửa sổ Facebook. Sau khi thấy thông báo đã lưu phiên, bạn tự đóng cửa sổ khi hoàn tất.');
    while (!closed) {
      try {
        const pages = session.context.pages().filter(page => !page.isClosed());
        const page = pages.find(page => {
          try { return /(^|\.)facebook\.com$/.test(new URL(page.url()).hostname); }
          catch { return false; }
        });
        const cookies = await session.context.cookies(['https://www.facebook.com']);
        const blocked = !page || /login|checkpoint|challenge|two_step_verification/.test(new URL(page.url()).pathname);
        valid = !!cookies.find(cookie => cookie.name === 'c_user' && cookie.value) && !blocked;
        if (valid) {
          await save(session.context);
          if (!saved) log('Đã lưu phiên Facebook. Cửa sổ vẫn mở để bạn kiểm tra; hãy tự đóng khi hoàn tất.');
          saved = true;
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
