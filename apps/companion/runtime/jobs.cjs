module.exports = (ctx) => {
  async function startJob(job) {
    ctx.current = {
      job,
      events: [],
      finished: false,
    };
    ctx.saveCurrent();
    ctx.log(`Nhận chiến dịch: ${job.campaign.name}`);
    try {
      const prepared = await ctx.request(
        "/prepare",
        "POST",
        {
          jobId: job.id,
        },
        {
          timeout: 75000,
        },
      );
      const assets = {};
      for (const assetId of new Set(
        prepared.campaign.posts
          .filter((p) => p.selected)
          .map((p) => p.assetId)
          .filter(Boolean),
      )) {
        if (!/^[a-f0-9-]{36}$/.test(assetId))
          throw new Error("ID ảnh không hợp lệ.");
        const bytes = await ctx.request(`/assets/${assetId}`, "GET", null, {
          binary: true,
        });
        if (bytes.byteLength > 5 * 1024 * 1024)
          throw new Error("Ảnh vượt dung lượng cho phép.");
        const buffer = Buffer.from(bytes);
        const extension =
          buffer[0] === 137 ? "png" : buffer[0] === 255 ? "jpg" : "webp";
        const target = ctx.path.join(
          ctx.dataDir(),
          "media",
          assetId + "." + extension,
        );
        ctx.fs.mkdirSync(ctx.path.dirname(target), {
          recursive: true,
        });
        ctx.fs.writeFileSync(target, buffer);
        assets[assetId] = target;
      }
      const result = await ctx.spawnRunner({
        action: "run",
        job,
        ...prepared,
        assets,
        leaseUntil: Date.now() + 45000,
      });
      ctx.current.finished = true;
      ctx.current.error = result.error || "";
      ctx.current.summary = result.summary || null;
      ctx.saveCurrent();
      ctx.log(
        result.error
          ? `Lượt chạy dừng: ${result.error}`
          : "Đã kết thúc lượt chạy; xem kết quả từng bài trên website.",
      );
    } catch (e) {
      ctx.current.finished = true;
      ctx.current.error = e.message;
      ctx.saveCurrent();
      ctx.log(e.message);
    }
    try {
      await ctx.report();
    } catch (e) {
      ctx.error =
        "Đang giữ kết quả trên máy để đồng bộ khi có mạng: " + e.message;
    }
    ctx.notify();
  }
  async function tick() {
    if (ctx.installingUpdate || ctx.polling || !ctx.credentials.connection)
      return;
    ctx.polling = true;
    try {
      const heartbeat = await ctx.request("/heartbeat", "POST", {
        facebookReady: ctx.state().facebookReady,
        discoverySupported: true,
        socialSupported: true,
        jobId: ctx.current?.job?.id,
      });
      ctx.error = "";
      if (ctx.social.busy()) {
        await ctx.social.tick();
        return;
      }
      if (ctx.discovery.busy()) {
        await ctx.discovery.tick();
        return;
      }
      if (ctx.child && ctx.current) {
        if (heartbeat.stop)
          ctx.child.send({
            type: "stop",
          });
        else
          ctx.child.send({
            type: "lease",
            until: Date.now() + 45000,
          });
      }
      // Recover an interrupted job conservatively, with persisted outcomes, before accepting new work.
      if (
        ctx.current &&
        !ctx.child &&
        !ctx.current.starting &&
        !ctx.current.finished
      ) {
        ctx.current.finished = true;
        ctx.current.error =
          "Ứng dụng đã khởi động lại giữa lượt. Bài chưa rõ kết quả được giữ để đối soát.";
        ctx.saveCurrent();
      }
      if (ctx.current) await ctx.report();
      if (
        !ctx.child &&
        !ctx.current &&
        !ctx.discovery.busy() &&
        (await ctx.social.tick())
      )
        return;
      if (
        !ctx.child &&
        !ctx.current &&
        !ctx.stoppedByUser &&
        ctx.state().facebookReady
      ) {
        if (await ctx.discovery.tick()) return;
        const { job, blocked } = await ctx.request("/claim");
        if (job) {
          const promise = ctx.startJob(job);
          ctx.current.starting = true;
          ctx.saveCurrent();
          promise.finally(() => {
            if (ctx.current) {
              ctx.current.starting = false;
              ctx.saveCurrent();
            }
          });
        } else if (blocked)
          ctx.error =
            "Có lượt cần đối soát. Mở Kết quả trên web hoặc dùng đúng máy đã chạy để đồng bộ lại.";
      }
    } catch (e) {
      ctx.error = e.message;
      if (e.status === 401 && ctx.child)
        ctx.child.send({
          type: "stop",
        });
    } finally {
      ctx.polling = false;
      ctx.notify();
    }
  }
  return { startJob, tick };
};
