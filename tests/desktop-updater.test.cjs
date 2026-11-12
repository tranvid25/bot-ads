const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { updateFeed } = require("../packages/desktop-update.cjs");
const configure = require("../apps/companion/runtime/updater.cjs");
function setup(options = {}) {
  const updater = new EventEmitter();
  const calls = [];
  updater.setFeedURL = (feed) => calls.push(["feed", feed]);
  updater.checkForUpdates = async () => {
    calls.push(["check"]);
    updater.emit("update-available", { version: "1.2.0" });
  };
  updater.downloadUpdate = async () => {
    calls.push(["download"]);
    updater.emit("download-progress", { percent: 54 });
    updater.emit("update-downloaded", { version: "1.2.0" });
  };
  updater.quitAndInstall = (...args) => calls.push(["install", ...args]);
  let work = false;
  const ctx = {
    app: { isPackaged: true, getVersion: () => "1.1.1" },
    browserMode: "system",
    notify() {},
    hasWork: () => work,
    polling: false,
  };
  const updates = configure(ctx, {
    updater,
    platform: "win32",
    arch: "x64",
    schedule: false,
    metadata: { botadsUpdate: updateFeed("win32", "x64", true) },
    ...options,
  });
  ctx.state = () => ({ update: updates.state() });
  updates.start();
  return {
    ctx,
    updates,
    updater,
    calls,
    setWork: (value) => {
      work = value;
    },
  };
}
test("automatically downloads the correct feed but never installs without an explicit action", async () => {
  const { updates, updater, calls } = setup();
  await updates.check();
  assert.equal(updates.state().phase, "downloaded");
  assert.equal(updater.autoInstallOnAppQuit, false);
  assert.equal(updater.allowDowngrade, false);
  assert.equal(updater.allowPrerelease, false);
  assert.equal(updater.disableWebInstaller, true);
  assert.equal(calls.filter((c) => c[0] === "install").length, 0);
});
test("active work, unsynced results and an in-flight claim block installation", async () => {
  const { updates, ctx, calls, setWork } = setup();
  await updates.check();
  setWork(true);
  assert.throws(() => updates.install(), /đồng bộ/);
  setWork(false);
  ctx.polling = true;
  assert.throws(() => updates.install(), /đồng bộ/);
  assert.equal(calls.filter((c) => c[0] === "install").length, 0);
  ctx.polling = false;
  updates.install();
  assert.equal(ctx.installingUpdate, true);
  assert.equal(ctx.quitting, true);
  assert.deepEqual(calls.at(-1), ["install", false, true]);
});
test("installation failures release the job lock and allow retry", async () => {
  const { updates, updater, ctx } = setup();
  await updates.check();
  updater.quitAndInstall = () => {
    throw new Error("installer failure");
  };
  updates.install();
  assert.equal(ctx.installingUpdate, false);
  assert.equal(ctx.quitting, false);
  assert.equal(updates.state().phase, "error");
  await updates.download();
  assert.equal(updates.state().phase, "downloaded");
});
test("offline checks remain retryable without exposing provider errors", async () => {
  const { updates, updater } = setup();
  updater.checkForUpdates = async () => {
    throw new Error("private diagnostic");
  };
  await updates.check();
  assert.equal(updates.state().phase, "error");
  assert.ok(!JSON.stringify(updates.state()).includes("private diagnostic"));
  updater.checkForUpdates = async () => updater.emit("update-not-available");
  await updates.check();
  assert.equal(updates.state().phase, "current");
});
test("concurrent checks and downloads run only once", async () => {
  const { updates, updater, calls } = setup();
  let release;
  updater.checkForUpdates = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  const first = updates.check();
  await updates.check();
  updater.emit("update-available", { version: "1.2.0" });
  release();
  await first;
  assert.equal(calls.filter((c) => c[0] === "download").length, 1);
});
test("feeds cannot switch a customer between CPU, OS, Lite/Full or arbitrary server", () => {
  const channels = new Set();
  for (const platform of ["win32", "darwin"])
    for (const arch of ["x64", "arm64"])
      for (const lite of [false, true])
        channels.add(updateFeed(platform, arch, lite).channel);
  assert.equal(channels.size, 8);
  const { updates, calls } = setup({
    metadata: { botadsUpdate: updateFeed("win32", "x64", false) },
  });
  assert.equal(updates.state().enabled, false);
  assert.deepEqual(calls, []);
});
test("development and unsigned Mac packages have no automatic update feed", () => {
  const { updates, calls } = setup({ metadata: { botadsUpdate: null } });
  assert.equal(updates.state().enabled, false);
  assert.deepEqual(calls, []);
});
test("job polling refuses to claim during an update installation", async () => {
  const ctx = {
    installingUpdate: true,
    credentials: { connection: {} },
    request() {
      assert.fail("must not contact job claim endpoints");
    },
  };
  await require("../apps/companion/runtime/jobs.cjs")(ctx).tick();
});
