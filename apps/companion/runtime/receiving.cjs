const receivingState = require("../receiving-state.js");
module.exports = async (ctx, enabled) => {
  if (enabled) {
    const state = { ...ctx.state(), receivingEnabled: false };
    const readiness = receivingState(state);
    if (!readiness.canStart) throw new Error(readiness.reason);
  }
  const previous = ctx.credentials.facebookReceiving;
  const previousPaused = ctx.credentials.facebookPausedByUser;
  ctx.credentials.facebookReceiving = enabled;
  ctx.credentials.facebookPausedByUser = !enabled;
  try {
    ctx.saveCredentials();
  } catch (error) {
    ctx.credentials.facebookReceiving = previous;
    ctx.credentials.facebookPausedByUser = previousPaused;
    throw error;
  }
  // Facebook controls must not pause connected Threads/Instagram jobs.
  if (enabled) ctx.stoppedByUser = false;
  if (!enabled && ctx.child?.connected && !ctx.social?.busy())
    ctx.child.send({ type: "stop" });
  ctx.log(
    enabled
      ? "Đã bật nhận việc Facebook. Máy sẽ tự nhận chiến dịch đến hạn khi app mở và có mạng."
      : "Đã tạm dừng nhận việc. Đang yêu cầu dừng lượt hiện tại nếu có.",
  );
  ctx.notify();
  if (enabled) await ctx.tick();
  return ctx.state();
};
