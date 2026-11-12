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
          const server = ctx.validateServer(payload.server);
          const response = await fetch(`${server}/api/device/pair`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              code: String(payload.code || "").slice(0, 100),
              name: ctx.os.hostname(),
            }),
            signal: AbortSignal.timeout(20000),
            redirect: "error",
          });
          const responseText = await response.text();
          let result = {};
          if (responseText) {
            try {
              result = JSON.parse(responseText);
            } catch {
              throw new Error(
                `Máy chủ trả phản hồi không hợp lệ (HTTP ${response.status}). Kiểm tra cửa sổ cloud:dev.`,
              );
            }
          }
          if (!response.ok)
            throw new Error(
              result.error ||
                `Máy chủ từ chối ghép thiết bị (HTTP ${response.status}). Tạo mã mới rồi thử lại.`,
            );
          if (!responseText)
            throw new Error(
              `Máy chủ trả phản hồi rỗng (HTTP ${response.status}). Kiểm tra cửa sổ cloud:dev.`,
            );
          if (!/^[a-f0-9-]{36}$/.test(result.workspaceId) || !result.token)
            throw new Error("Website trả dữ liệu liên kết không hợp lệ.");
          if (
            ctx.credentials.connection?.workspaceId !== result.workspaceId ||
            ctx.credentials.connection?.server !== server
          ) {
            ctx.credentials.auth = null;
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
        if (command === "login") {
          if (ctx.social.busy())
            throw new Error("Đợi kết nối/đăng kênh hiện tại hoàn tất.");
          if (!ctx.credentials.connection)
            throw new Error("Ghép với website trước.");
          if (ctx.current || ctx.discovery.busy())
            throw new Error("Đợi lượt hiện tại kết thúc và đồng bộ.");
          const result = await ctx.spawnRunner({
            action: "login",
          });
          if (result.error) throw new Error(result.error);
          ctx.log("Đã lưu phiên Facebook được mã hóa trên máy này.");
          await ctx.tick();
          return ctx.state();
        }
        if (command === "stop") {
          ctx.stoppedByUser = true;
          if (ctx.child)
            ctx.child.send({
              type: "stop",
            });
          ctx.log("Đã yêu cầu dừng. Ứng dụng tạm ngưng nhận việc mới.");
          return ctx.state();
        }
        if (command === "resume") {
          ctx.stoppedByUser = false;
          await ctx.tick();
          return ctx.state();
        }
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
            await ctx.shell.openExternal(ctx.credentials.connection.server);
          return ctx.state();
        }
        if (command === "disconnect") {
          if (ctx.hasWork())
            throw new Error("Dừng và đồng bộ lượt hiện tại trước khi ngắt.");
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
      ctx.updates.start();
      ctx.timer = setInterval(ctx.tick, 20000);
      ctx.tick();
    });
    ctx.app.on("before-quit", () => {
      ctx.quitting = true;
      clearInterval(ctx.timer);
      ctx.updates.stop();
      if (ctx.child) ctx.child.kill();
    });
    ctx.app.on("window-all-closed", () => {});
  }
};
