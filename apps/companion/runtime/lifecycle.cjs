module.exports = (ctx) => {
  if (!ctx.app.requestSingleInstanceLock()) ctx.app.quit();
  else {
    ctx.app.on("second-instance", ctx.windowOpen);
    ctx.app.whenReady().then(() => {
      ctx.encryptedPath = ctx.path.join(
        ctx.app.getPath("userData"),
        "credentials.bin",
      );
      try {
        if (ctx.fs.existsSync(ctx.encryptedPath))
          ctx.credentials = JSON.parse(
            ctx.safeStorage.decryptString(
              ctx.fs.readFileSync(ctx.encryptedPath),
            ),
          );
      } catch (e) {
        ctx.error =
          "Không đọc được liên kết đã lưu. Vui lòng ghép lại: " + e.message;
      }
      if (ctx.credentials.connection) {
        ctx.current = ctx.read(ctx.activeFile(), null);
        if (ctx.current) ctx.current.starting = false;
      }
      ctx.startup = ctx.app.getLoginItemSettings().openAtLogin;
      require("./tray.cjs")(ctx);
      ctx.ipcMain.handle("command", async (event, command, payload = {}) => {
        if (!ctx.window || event.sender !== ctx.window.webContents)
          throw new Error("Không có quyền.");
        if (command === "state") return ctx.state();
        if (command === "open-diagnostics") {
          const diagnostics = require("./diagnostics.cjs");
          diagnostics.record(ctx, { event: "opened" });
          await ctx.shell.openPath(diagnostics.file(ctx));
          return ctx.state();
        }
        if (command.startsWith("update-")) return ctx.updates.command(command);
        if (ctx.installingUpdate)
          throw new Error("Đang cài cập nhật, vui lòng đợi app mở lại.");
        if (command === "social-forget")
          return require("./social-forget.cjs")(ctx, payload);
        if (command === "pair") {
          if (ctx.hasWork())
            throw new Error(
              "Dừng và đồng bộ lượt hiện tại trước khi đổi liên kết.",
            );
          const { server, result } = await require("./pair.cjs")(ctx, payload);
          if (
            ctx.credentials.connection?.workspaceId !== result.workspaceId ||
            ctx.credentials.connection?.server !== server
          ) {
            await ctx.closeFacebookSession?.();
            ctx.credentials.auth = null;
            ctx.credentials.facebookReceiving = false;
            ctx.credentials.social = {};
          }
          ctx.credentials.connection = {
            ...result,
            server,
          };
          ctx.saveCredentials();
          ctx.log("Đã ghép với website. Tiếp theo, kết nối Facebook.");
          await ctx.tick();
          return ctx.state();
        }
        if (command === "finish-login") {
          if (
            !ctx.facebookLogin ||
            !ctx.child?.connected ||
            !ctx.state().facebookReady
          )
            throw new Error("Chưa có phiên đăng nhập đang chờ hoàn tất.");
          ctx.child.send({ type: "finish-login" });
          return ctx.state();
        }
        if (command === "login" || command === "facebook-change")
          return require("./facebook-login.cjs")(ctx, {
            changeAccount: command === "facebook-change",
          });
        if (command === "stop" || command === "resume")
          return require("./receiving.cjs")(ctx, command === "resume");
        if (command === "startup") {
          ctx.startup = Boolean(payload.enabled);
          ctx.app.setLoginItemSettings({
            openAtLogin: ctx.startup,
            path: process.execPath,
          });
          return ctx.state();
        }
        if (command === "website") {
          if (ctx.credentials.connection)
            await ctx.shell.openExternal(ctx.credentials.connection.server + '/?page=campaigns');
          return ctx.state();
        }
        if (command === "disconnect") {
          if (ctx.hasWork())
            throw new Error("Dừng và đồng bộ lượt hiện tại trước khi ngắt.");
          await ctx.closeFacebookSession?.();
          ctx.credentials = {};
          ctx.saveCredentials();
          ctx.lastSeen = 0;
          ctx.log(
            "Đã xóa liên kết và phiên Facebook trên máy. Thu hồi thiết bị trên website để ghép lại.",
          );
          return ctx.state();
        }
        throw new Error("Lệnh không hợp lệ.");
      });
      ctx.windowOpen();
      ctx.log(`BotAds ${ctx.app.getVersion()} · Đã nạp bộ điều khiển Facebook của bản cài này.`);
      ctx.updates.start();
      ctx.timer = setInterval(ctx.tick, 20000);
      ctx.tick();
    });
    ctx.app.on("before-quit", () => {
      ctx.quitting = true;
      clearInterval(ctx.timer);
      ctx.updates.stop();
      if (ctx.child && ctx.child !== ctx.facebookWorker) ctx.child.kill();
      if (ctx.facebookWorker?.connected) ctx.facebookWorker.disconnect();
    });
    ctx.app.on("window-all-closed", () => {});
  }
};
