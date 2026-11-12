module.exports = (ctx) => {
  function windowOpen() {
    if (ctx.window && !ctx.window.isDestroyed()) {
      ctx.window.show();
      ctx.window.focus();
      return;
    }
    ctx.window = new ctx.BrowserWindow({
      width: 900,
      height: 730,
      minWidth: 680,
      minHeight: 580,
      show: false,
      backgroundColor: "#f5f7f2",
      webPreferences: {
        preload: ctx.path.join(ctx.baseDir, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    ctx.window.loadFile(ctx.path.join(ctx.baseDir, "index.html"));
    ctx.window.once("ready-to-show", () => {
      if (process.env.BOTADS_TEST_HIDDEN !== "1") ctx.window.show();
    });
    ctx.window.webContents.setWindowOpenHandler(() => ({
      action: "deny",
    }));
    ctx.window.webContents.on("will-navigate", (event) =>
      event.preventDefault(),
    );
    ctx.window.on("close", (event) => {
      if (!ctx.quitting) {
        event.preventDefault();
        ctx.window.hide();
      }
    });
  }
  return { windowOpen };
};
