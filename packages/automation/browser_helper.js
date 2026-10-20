const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const { file } = require('./storage');
const AUTH_PATH = file('auth.json');
let managedAuth = null;
function setManagedAuth(adapter) { managedAuth = adapter; }
async function saveAuth(context) {
  if (managedAuth) return managedAuth.save(await context.storageState());
  return context.storageState({ path: AUTH_PATH });
}

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
    args,
    ...(process.env.BOTADS_BROWSER_CHANNEL ? { channel: process.env.BOTADS_BROWSER_CHANNEL } : {})
  });

  const contextOptions = {};
  if (startMaximized) {
    contextOptions.viewport = null;
  } else {
    contextOptions.viewport = { width: 1280, height: 850 };
  }

  if (managedAuth) {
    const state = managedAuth.load();
    if (state) contextOptions.storageState = state;
  } else if (fs.existsSync(AUTH_PATH)) {
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
  setManagedAuth,
  saveAuth,
  AUTH_PATH
};
