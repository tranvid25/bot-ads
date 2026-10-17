const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const { file } = require('./storage');
const AUTH_PATH = file('auth.json');

/**
 * Khởi động Chromium an toàn bằng storageState (auth.json).
 * Không sử dụng launchPersistentContext(user_data) để tránh tuyệt đối lỗi:
 * "Failed to create a ProcessSingleton: Lock file can not be created (0x20)"
 */
async function launchBrowser({ headless = false, startMaximized = true } = {}) {
  const args = [
    '--disable-blink-features=AutomationControlled',
    '--no-sandbox'
  ];
  if (startMaximized) {
    args.push('--start-maximized');
  }

  const browser = await chromium.launch({
    headless,
    args
  });

  const contextOptions = {};
  if (startMaximized) {
    contextOptions.viewport = null;
  } else {
    contextOptions.viewport = { width: 1280, height: 850 };
  }

  if (fs.existsSync(AUTH_PATH)) {
    contextOptions.storageState = AUTH_PATH;
  }

  try {
    const context = await browser.newContext(contextOptions);
    context.setDefaultTimeout(15000);
    const page = await context.newPage();
    return { browser, context, page };
  } catch (error) { await browser.close(); throw error; }
}

module.exports = {
  launchBrowser,
  AUTH_PATH
};
