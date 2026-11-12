const { updateFeed } = require("../../../packages/desktop-update.cjs");
module.exports = (ctx, dependencies = {}) => {
  const metadata =
    dependencies.metadata || require(ctx.path.join(ctx.root, "package.json"));
  const platform = dependencies.platform || process.platform;
  const arch = dependencies.arch || process.arch;
  const expected = ["win32", "darwin"].includes(platform)
    ? updateFeed(platform, arch, ctx.browserMode === "system")
    : null;
  const feed = metadata.botadsUpdate;
  const enabled = !!(
    ctx.app.isPackaged &&
    feed &&
    expected &&
    ["url", "channel", "provider"].every((key) => feed[key] === expected[key])
  );
  let status = {
    enabled,
    version: ctx.app.getVersion(),
    phase: enabled ? "idle" : "disabled",
    percent: 0,
  };
  let updater, operation, timeout, interval;
  const emit = (changes) => {
    status = { ...status, ...changes };
    ctx.notify();
  };
  const fail = () => {
    if (ctx.installingUpdate) {
      ctx.installingUpdate = false;
      ctx.quitting = false;
    }
    emit({
      phase: "error",
      message:
        "Chưa cập nhật được. Kiểm tra mạng hoặc thử lại sau; bản đang dùng vẫn hoạt động.",
    });
  };
  async function download() {
    if (
      !enabled ||
      operation ||
      !status.availableVersion ||
      status.phase === "downloaded"
    )
      return;
    operation = "download";
    emit({ phase: "downloading", percent: 0, message: "" });
    try {
      await updater.downloadUpdate();
    } catch {
      fail();
    } finally {
      operation = null;
    }
  }
  async function check() {
    if (
      !enabled ||
      operation ||
      ["downloaded", "installing"].includes(status.phase)
    )
      return;
    operation = "check";
    emit({ phase: "checking", message: "" });
    try {
      await updater.checkForUpdates();
    } catch {
      fail();
    } finally {
      operation = null;
    }
    if (status.phase === "available") await download();
  }
  function install() {
    if (!enabled || status.phase !== "downloaded")
      throw new Error("Chưa có bản cập nhật sẵn sàng.");
    if (ctx.hasWork() || ctx.polling)
      throw new Error(
        "Đợi lượt hiện tại và đồng bộ kết quả hoàn tất rồi cài cập nhật.",
      );
    ctx.installingUpdate = true;
    emit({ phase: "installing", message: "" });
    ctx.quitting = true;
    try {
      updater.quitAndInstall(false, true);
    } catch {
      fail();
    }
  }
  function start() {
    if (!enabled || updater) return;
    updater = dependencies.updater || require("electron-updater").autoUpdater;
    updater.logger = null;
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = false;
    updater.allowPrerelease = false;
    updater.allowDowngrade = false;
    updater.disableWebInstaller = true;
    updater.setFeedURL(expected);
    updater.on("checking-for-update", () => emit({ phase: "checking" }));
    updater.on("update-available", (info) =>
      emit({ phase: "available", availableVersion: info.version }),
    );
    updater.on("update-not-available", () =>
      emit({ phase: "current", availableVersion: null }),
    );
    updater.on("download-progress", (progress) =>
      emit({
        phase: "downloading",
        percent: Math.max(0, Math.min(100, Number(progress.percent) || 0)),
      }),
    );
    updater.on("update-downloaded", (info) =>
      emit({
        phase: "downloaded",
        availableVersion: info.version,
        percent: 100,
      }),
    );
    updater.on("error", fail);
    if (dependencies.schedule !== false) {
      timeout = setTimeout(check, 15000);
      interval = setInterval(check, 6 * 60 * 60 * 1000);
      timeout.unref?.();
      interval.unref?.();
    }
  }
  return {
    start,
    check,
    download,
    install,
    state: () => ({ ...status }),
    stop: () => {
      clearTimeout(timeout);
      clearInterval(interval);
    },
    command: async (name) => {
      if (!enabled)
        throw new Error(
          "Bản này chưa bật tự cập nhật. Cài bộ cài chính thức mới nhất.",
        );
      if (name === "update-check") await check();
      else if (name === "update-download") await download();
      else if (name === "update-install") install();
      else throw new Error("Lệnh cập nhật không hợp lệ.");
      return ctx.state();
    },
  };
};
