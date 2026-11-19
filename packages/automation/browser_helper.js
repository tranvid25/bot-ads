const { launchBrowser: launchEngine } = require('../browser-launcher.cjs');
const path = require('path');
const fs = require('fs');

const { file } = require('./storage');
const AUTH_PATH = file('auth.json');
let managedAuth = null;
let lastInteractiveState = null;
function setManagedAuth(adapter) { managedAuth = adapter; lastInteractiveState = null; }
async function saveAuth(context, { interactive = false } = {}) {
  if (interactive) {
    const state = await require('./interactive_auth.cjs').interactiveState(context);
    const serialized = JSON.stringify(state);
    if (serialized === lastInteractiveState) return;
    if (managedAuth) await managedAuth.save(state);
    else fs.writeFileSync(AUTH_PATH, serialized);
    lastInteractiveState = serialized;
    return;
  }
  if (managedAuth) return managedAuth.save(await context.storageState());
  return context.storageState({ path: AUTH_PATH });
}

/**
 * Khởi động Chromium an toàn bằng storageState (auth.json).
 * Không sử dụng launchPersistentContext(user_data) để tránh tuyệt đối lỗi:
 * "Failed to create a ProcessSingleton: Lock file can not be created (0x20)"
 */
async function launchBrowser({ headless = false, startMaximized = true } = {}) {
  const expectedUid = managedAuth?.load()?.cookies?.find(c => c.name === 'c_user')?.value;
  const leased = await require('./managed_session.cjs').lease(expectedUid);
  if (leased) return leased;
  lastInteractiveState = null;
  const args = [
    '--disable-blink-features=AutomationControlled',
    '--no-sandbox'
  ];
  if (startMaximized) {
    args.push('--start-maximized');
  }

  const browser = await launchEngine({
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
