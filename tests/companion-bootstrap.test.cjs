const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { createRequire } = require("node:module");
const vm = require("node:vm");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

test("refactored companion bootstraps its window, IPC, storage and job coordinator", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "botads-bootstrap-"));
  const file = path.resolve("apps/companion/main.cjs");
  const localRequire = createRequire(file),
    handlers = new Map();
  const app = Object.assign(new EventEmitter(), {
    requestSingleInstanceLock: () => true,
    whenReady: async () => {},
    getPath: () => dir,
    getVersion: () => require("../package.json").version,
    setPath: () => {},
    getLoginItemSettings: () => ({ openAtLogin: false }),
    setLoginItemSettings: () => {},
    quit: () => {},
  });
  class Window extends EventEmitter {
    constructor(options) {
      super();
      this.options = options;
      this.webContents = Object.assign(new EventEmitter(), {
        send: () => {},
        setWindowOpenHandler: () => {},
      });
    }
    loadFile(file) {
      this.file = file;
    }
    isDestroyed() {
      return false;
    }
  }
  class Tray extends EventEmitter {
    setToolTip() {}
    setContextMenu() {}
  }
  const electron = {
    app,
    BrowserWindow: Window,
    Tray,
    Menu: { buildFromTemplate: (value) => value },
    nativeImage: { createFromDataURL: () => ({}) },
    ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
    safeStorage: {
      isEncryptionAvailable: () => true,
      encryptString: (value) => Buffer.from(value),
      decryptString: (value) => value.toString(),
    },
    shell: { openExternal: async () => {} },
  };
  const module = { exports: {} };
  let ctx;
  try {
    const source = fs.readFileSync(file, "utf8") + "\nmodule.exports = ctx;";
    vm.runInNewContext(source, {
      module,
      require: (name) => (name === "electron" ? electron : localRequire(name)),
      __dirname: path.dirname(file),
      process,
      console,
    });
    ctx = module.exports;
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(ctx.window.options.webPreferences.contextIsolation, true);
    assert.equal(ctx.window.options.webPreferences.nodeIntegration, false);
    assert.equal(ctx.window.file, path.resolve("apps/companion/index.html"));
    assert.equal(ctx.discovery.busy(), false);
    const command = handlers.get("command"),
      event = { sender: ctx.window.webContents };
    assert.equal((await command(event, "state")).linked, false);
    assert.equal((await command(event, "state")).update.enabled, false);
    assert.equal((await command(event, "stop")).paused, true);
    assert.equal((await command(event, "resume")).paused, false);
    await assert.rejects(command({ sender: {} }, "state"), /quyền/);
    assert.equal(
      ctx.validateServer("https://bot.salesora.space"),
      "https://bot.salesora.space",
    );
    assert.throws(
      () => ctx.validateServer("https://bot.salesora.space/other"),
      /địa chỉ gốc/,
    );
  } finally {
    if (ctx?.timer) clearInterval(ctx.timer);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
