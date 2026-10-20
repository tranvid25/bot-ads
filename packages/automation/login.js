const { launchBrowser, saveAuth } = require('./browser_helper');
const { sleep, cli } = require('./runtime');
async function main() {
  const session = await launchBrowser({ headless: false });
  try {
    await session.page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded', timeout: 45000 });
    console.log('Đăng nhập trên cửa sổ trình duyệt. Bot chờ tối đa 6 phút.');
    for (let i = 0; i < 180; i++) {
      const cookies = await session.context.cookies(['https://www.facebook.com']);
      const user = cookies.find(cookie => cookie.name === 'c_user' && cookie.value);
      const blockedPath = /login|checkpoint|challenge|two_step_verification/.test(new URL(session.page.url()).pathname);
      if (user && !blockedPath) {
        await saveAuth(session.context);
        console.log('Đã lưu phiên đăng nhập. Chạy npm run doctor để kiểm tra cấu hình.');
        return;
      }
      await sleep(2000);
    }
    throw new Error('Hết thời gian chờ đăng nhập.');
  } finally { await session.context.close().catch(() => {}); await session.browser.close().catch(() => {}); }
}
if (require.main === module) cli(main);
module.exports = { main };
