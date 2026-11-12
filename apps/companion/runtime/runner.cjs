module.exports = (ctx) => {
  function spawnRunner(message) {
    return new Promise((resolve, reject) => {
      if (ctx.child)
        return reject(new Error("Ứng dụng đang thực hiện một công việc khác."));
      ctx.fs.mkdirSync(ctx.dataDir(), {
        recursive: true,
      });
      const env = {
        ...process.env,
        BOTADS_DATA_DIR: ctx.dataDir(),
        ELECTRON_RUN_AS_NODE: "1",
      };
      // Ship a complete browser alongside the installer. Development uses Playwright's local cache.
      if (ctx.app.isPackaged) {
        env.PLAYWRIGHT_BROWSERS_PATH = ctx.path.join(
          process.resourcesPath,
          "browsers",
        );
        env.BOTADS_BROWSER_MODE = ctx.browserMode || "bundled";
      }
      const processChild = ctx.fork(
        ctx.path.join(
          ctx.baseDir,
          message.action === "social" ? "social-runner.cjs" : "runner.cjs",
        ),
        [],
        {
          execPath: process.execPath,
          env,
          stdio: ["ignore", "pipe", "pipe", "ipc"],
          windowsHide: true,
        },
      );
      ctx.child = processChild;
      let done = false;
      processChild.stdout.on("data", (chunk) => ctx.log(chunk.toString()));
      processChild.stderr.on("data", (chunk) => ctx.log(chunk.toString()));
      processChild.on("message", async (event) => {
        if (await ctx.socialEvent(event, processChild, message)) return;
        if (event.type === "log") ctx.log(event.text);
        if (event.type === "auth") {
          try {
            const previous = ctx.credentials.auth?.cookies?.find(
              (c) => c.name === "c_user",
            )?.value;
            const next = event.state?.cookies?.find(
              (c) => c.name === "c_user",
            )?.value;
            if (!next) throw new Error("Chưa có phiên Facebook hợp lệ.");
            if (previous && previous !== next)
              throw new Error(
                "Workspace này đã gắn với một tài khoản Facebook khác. Đăng nhập lại đúng tài khoản.",
              );
            ctx.credentials.auth = event.state;
            ctx.saveCredentials();
            processChild.send({
              type: "reply",
              id: event.id,
              data: {
                ok: true,
              },
            });
            ctx.notify();
          } catch (e) {
            processChild.send({
              type: "reply",
              id: event.id,
              error: e.message,
            });
          }
        }
        if (event.type === "reserve") {
          try {
            const response = await ctx.request("/reserve", "POST", {
              jobId: ctx.current.job.id,
              attemptId: event.attemptId,
              groupUrl: event.groupUrl,
              title: event.title,
            });
            processChild.send({
              type: "reply",
              id: event.id,
              data: response,
            });
          } catch (e) {
            if (e.status && e.status < 500) {
              const file = ctx.path.join(ctx.dataDir(), "reservations.json");
              const reservations = ctx.read(file, []);
              const record = reservations.find((a) => a.id === event.attemptId);
              if (record) {
                record.status = "failed";
                ctx.atom(file, reservations);
              }
            }
            if (processChild.connected)
              processChild.send({
                type: "reply",
                id: event.id,
                error: e.message,
              });
          }
        }
        if (event.type === "done") {
          done = true;
          resolve(event);
        }
      });
      processChild.on("error", reject);
      processChild.on("exit", (code) => {
        ctx.child = null;
        if (!done)
          resolve({
            error: `Tiến trình kết thúc giữa lượt (${code}). Cần kiểm tra kết quả trước khi gửi lại.`,
          });
        ctx.notify();
      });
      processChild.send({
        type: "start",
        ...message,
        auth: ctx.credentials.auth || null,
      });
      ctx.notify();
    });
  }
  return { spawnRunner };
};
