const { launchBrowser, saveAuth } = require('./browser_helper');
const { sleep, cli } = require('./runtime');
const { waitForLogin } = require('./login_session.cjs');
async function main() {
  const session = await launchBrowser({ headless: false });
  try {
    await session.page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await waitForLogin(session, { save: saveAuth, sleep });
  } finally { await session.context.close().catch(() => {}); await session.browser.close().catch(() => {}); }
}
if (require.main === module) cli(main);
module.exports = { main };
