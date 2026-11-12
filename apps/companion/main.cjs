const {
  app,
  BrowserWindow,
  ipcMain,
  safeStorage,
  Tray,
  Menu,
  nativeImage,
  shell,
} = require("electron");
const fs = require("fs");
const path = require("path");
const { fork } = require("child_process");
const crypto = require("crypto");
const os = require("os");
const root = path.resolve(__dirname, "../..");
const { mergeReservations } = require("../../packages/desktop-state.cjs");
const ctx = {
  app,
  BrowserWindow,
  ipcMain,
  safeStorage,
  Tray,
  Menu,
  nativeImage,
  shell,
  fs,
  path,
  fork,
  crypto,
  os,
  root,
  browserMode: app.isPackaged
    ? require(path.join(root, "package.json")).botadsBrowserMode || "bundled"
    : "development",
  mergeReservations,
  window: null,
  tray: null,
  child: null,
  quitting: false,
  polling: false,
  timer: null,
  current: null,
  credentials: {},
  error: "",
  lastSeen: 0,
  logs: [],
  startup: false,
  stoppedByUser: false,
  encryptedPath: null,
  baseDir: __dirname,
};
if (process.env.BOTADS_DESKTOP_DATA_DIR) {
  ctx.fs.mkdirSync(process.env.BOTADS_DESKTOP_DATA_DIR, {
    recursive: true,
  });
  ctx.app.setPath(
    "userData",
    ctx.path.resolve(process.env.BOTADS_DESKTOP_DATA_DIR),
  );
}
Object.assign(ctx, require("./runtime/storage.cjs")(ctx));
Object.assign(ctx, require("./runtime/status.cjs")(ctx));
Object.assign(ctx, require("./runtime/http.cjs")(ctx));
Object.assign(ctx, require("./runtime/reporting.cjs")(ctx));
Object.assign(ctx, require("./runtime/runner.cjs")(ctx));
Object.assign(ctx, require("./runtime/jobs.cjs")(ctx));
Object.assign(ctx, require("./runtime/window.cjs")(ctx));
ctx.social = require("./social-client.cjs")(ctx);
ctx.socialEvent = require("./runtime/social-events.cjs")(ctx);
ctx.discovery = require("./discovery-client.cjs")({
  request: ctx.request,
  spawnRunner: ctx.spawnRunner,
  getChild: () => ctx.child,
  getAuth: () => ctx.credentials.auth,
  dataDir: ctx.dataDir,
  log: ctx.log,
  stopped: () => ctx.stoppedByUser,
});
ctx.hasWork = () =>
  ctx.child || ctx.current || ctx.discovery.busy() || ctx.social.busy();
ctx.updates = require("./runtime/updater.cjs")(ctx);
require("./runtime/lifecycle.cjs")(ctx);
