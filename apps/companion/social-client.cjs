module.exports = (ctx) => {
  let active = null,
    running = false,
    loadedFile = "";
  const file = () => ctx.path.join(ctx.dataDir(), "social-report.json");
  const persist = () => ctx.atom(file(), active);
  async function run(task) {
    running = true;
    active = {
      taskId: task.id,
      claimToken: task.claimToken,
      provider: task.provider,
      kind: task.kind,
      finished: false,
    };
    try {
      persist();
      let image;
      const assetId = task.config.variant?.assetId;
      if (assetId) {
        if (!/^[a-f0-9-]{36}$/.test(assetId))
          throw new Error("ID ảnh không hợp lệ.");
        const bytes = Buffer.from(
          await ctx.request(`/assets/${assetId}`, "GET", null, {
            binary: true,
          }),
        );
        if (bytes.length > 5 * 1024 * 1024) throw new Error("Ảnh vượt 5 MB.");
        const mime =
          bytes[0] === 137 ? "image/png" : bytes[0] === 255 ? "image/jpeg" : "";
        if (!mime) throw new Error("Instagram cần ảnh PNG/JPG.");
        const target = ctx.path.join(
          ctx.dataDir(),
          "media",
          assetId + (mime === "image/png" ? ".png" : ".jpg"),
        );
        ctx.fs.mkdirSync(ctx.path.dirname(target), { recursive: true });
        ctx.fs.writeFileSync(target, bytes);
        image = { path: target, mime };
      }
      ctx.log(
        task.kind === "connect"
          ? `Mở trình duyệt: hãy đăng nhập ${task.provider} và hoàn thành xác minh nếu có.`
          : `Nhận bài ${task.provider}; kiểm tra tài khoản trước khi gửi.`,
      );
      const result = await ctx.spawnRunner({
        action: "social",
        task,
        image,
        socialAuth: ctx.credentials.social?.[task.provider] || null,
      });
      Object.assign(active, result);
    } catch (e) {
      active.status = "failed";
      active.error = e.message;
    }
    active.finished = true;
    running = false;
    persist();
  }
  async function tick() {
    if (loadedFile !== file()) {
      loadedFile = file();
      active = ctx.read(file(), null);
      if (active && !active.finished) {
        active.finished = true;
        active.status = "unknown";
        active.error =
          "App khởi động lại giữa lượt. Kiểm tra trên nền tảng trước khi gửi lại.";
        persist();
      }
    }
    if (active) {
      if (active.finished) {
        try {
          await ctx.request("/social/report", "POST", active);
        } catch (e) {
          if (![404, 409].includes(e.status)) throw e;
        }
        active = null;
        persist();
      } else {
        const { stop } = await ctx.request("/social/heartbeat", "POST", active);
        ctx.child?.send(
          stop || ctx.stoppedByUser
            ? { type: "stop" }
            : { type: "lease", until: Date.now() + 45000 },
        );
      }
      return true;
    }
    if (ctx.stoppedByUser || ctx.child || ctx.current) return false;
    const { task } = await ctx.request("/social/claim", "POST", {});
    if (!task) return false;
    void run(task).catch((e) => {
      running = false;
      ctx.error = e.message;
      ctx.child?.send({ type: "stop" });
    });
    return true;
  }
  return {
    tick,
    busy: () => running || !!active,
    info: () =>
      active ? { provider: active.provider, kind: active.kind } : null,
  };
};
