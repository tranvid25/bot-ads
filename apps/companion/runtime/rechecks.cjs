module.exports = (ctx) => {
  let running = false;
  return async function tickRechecks() {
    const file = ctx.path.join(ctx.dataDir(), "facebook-recheck.json");
    let pending = ctx.read(file, null);
    if (ctx.child || running || ctx.current) return false;
    if (
      (!pending || !pending.finished) &&
      (ctx.stoppedByUser ||
        ctx.credentials.facebookReceiving === false ||
        !ctx.state().facebookReady)
    )
      return false;
    running = true;
    ctx.rechecking = true;
    try {
      if (!pending) {
        const response = await ctx.request("/rechecks/claim");
        if (!response.task) return false;
        pending = { task: response.task, finished: false };
        ctx.atom(file, pending);
      }
      if (!pending.finished) {
        ctx.log("Đang kiểm tra lại bài đã gửi; không tạo bài mới.");
        const result = await ctx.spawnRunner({
          action: "recheck",
          attemptId: pending.task.attempt_id,
        });
        pending.error = result.error || "";
        pending.finished = true;
        ctx.atom(file, pending);
      }
      const attempts = ctx.reportAttempts([pending.task.attempt_id]);
      if (attempts.length)
        await ctx.request("/report", "POST", {
          jobId: pending.task.job_id,
          attempts,
          finished: false,
        });
      const verified = attempts.find((a) => a.status === "success");
      await ctx.request("/rechecks/complete", "POST", {
        attemptId: pending.task.attempt_id,
        error:
          pending.error ||
          (verified
            ? ""
            : "Chưa đủ bằng chứng xác nhận bài đã xuất bản. Hệ thống không gửi lại bài."),
      });
      ctx.fs.unlinkSync(file);
      ctx.log(
        verified
          ? "Đã xác nhận bài xuất bản và đồng bộ đường dẫn lên website."
          : "Đã kiểm tra; xem kết quả chi tiết trên website.",
      );
      return true;
    } catch (error) {
      // New installers may arrive before the backend rollout finishes.
      if (error.status === 404 && !pending) return false;
      ctx.error = "Chưa hoàn tất kiểm tra/đồng bộ: " + error.message;
      return true;
    } finally {
      running = false;
      ctx.rechecking = false;
      ctx.notify();
    }
  };
};
