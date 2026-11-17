module.exports = async (ctx, { changeAccount = false } = {}) => {
  if (ctx.hasWork() || ctx.facebookLogin || ctx.polling)
    throw new Error("Đợi công việc hiện tại kết thúc và đồng bộ trước khi đăng nhập Facebook.");
  if (!ctx.credentials.connection)
    throw new Error("Ghép với website trước.");
  ctx.facebookLogin = true;
  ctx.notify();
  try {
    if (changeAccount) {
      // Pause claims before clearing credentials; old campaigns keep their account checks.
      ctx.stoppedByUser = true;
      ctx.credentials.facebookReceiving = false;
      const previous = ctx.credentials.auth;
      ctx.credentials.auth = null;
      try { ctx.saveCredentials(); }
      catch (error) { ctx.credentials.auth = previous; throw error; }
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
    ctx.log("Đã lưu phiên Facebook được mã hóa trên máy này.");
  } finally {
    ctx.facebookLogin = false;
    ctx.notify();
  }
  return ctx.state();
};
