const { launchBrowser, saveAuth } = require('./browser_helper');
const { sleep, cli } = require('./runtime');
const { waitForLogin } = require('./login_session.cjs');
async function main(options = {}) {
  const session = await launchBrowser({ headless: false });
  let kept = false;
  try {
    await session.page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await waitForLogin(session, {
      save: context => saveAuth(context, { interactive: true }),
      sleep: ms => sleep(ms, { allowStopped: true }),
      finish: options.finish,
      autoFinish: options.autoFinish,
    });
    if (options.keepOpen) { require('./managed_session.cjs').keep(session); kept = true; }
  } catch (error) {
    console.error('Cửa sổ đăng nhập Facebook đóng do lỗi: ' + error.message);
    throw error;
  } finally { if (!kept) { await session.context.close().catch(() => {}); await session.browser.close().catch(() => {}); } }
}
if (require.main === module) cli(main);
module.exports = { main };
