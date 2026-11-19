module.exports = async (ctx, { changeAccount = false, fromCommand = false } = {}) => {
  if (ctx.hasWork() || ctx.facebookLogin || (ctx.polling && !fromCommand))
    throw new Error("Đợi công việc hiện tại kết thúc và đồng bộ trước khi đăng nhập Facebook.");
  if (!ctx.credentials.connection)
    throw new Error("Ghép với website trước.");
  ctx.facebookLogin = true;
  ctx.notify();
  try {
    await ctx.closeFacebookSession?.();
    if (changeAccount) {
      // Pause claims before clearing credentials; old campaigns keep their account checks.
      const previousReceiving = ctx.credentials.facebookReceiving;
      ctx.credentials.facebookReceiving = false;
      const previous = ctx.credentials.auth;
      ctx.credentials.auth = null;
      try { ctx.saveCredentials(); }
      catch (error) { ctx.credentials.auth = previous; ctx.credentials.facebookReceiving = previousReceiving; throw error; }
      ctx.log("Đã xóa phiên Facebook cũ. Đăng nhập tài khoản mới trong cửa sổ tiếp theo. Lịch đăng đang tạm nghỉ; hãy duyệt lại nhóm cho tài khoản mới trước khi nhận việc.");
      ctx.notify();
    }
    await ctx.request("/heartbeat", "POST", {
      facebookReady: ctx.state().facebookReady,
      discoverySupported: true,
      socialSupported: true,
    });
    const result = await ctx.spawnRunner({ action: "login" });
    if (result.error) throw new Error(result.error);
    const pausedByUser = ctx.credentials.facebookPausedByUser === true;
    ctx.credentials.facebookReceiving = !pausedByUser;
    ctx.credentials.facebookPausedByUser = pausedByUser;
    ctx.stoppedByUser = false;
    ctx.saveCredentials();
    ctx.log(pausedByUser ? "Facebook đã kết nối; giữ lựa chọn tạm dừng của bạn. Bấm Tiếp tục và chạy trên website khi cần." : "Facebook đã sẵn sàng. Vào chiến dịch trên website và bấm Chạy.");
  } finally {
    ctx.facebookLogin = false;
    ctx.notify();
  }
  await ctx.tick();
  return ctx.state();
};
