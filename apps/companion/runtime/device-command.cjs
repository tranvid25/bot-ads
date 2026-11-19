module.exports = async (ctx, command) => {
  if (!command) return;
  const seen = ctx.credentials.deviceCommand;
  if (seen?.id === command.id)
    return ctx.request("/commands/ack", "POST", seen);
  if (command.action === "connect" && !ctx.facebookLogin && ctx.hasWork())
    return;
  let error = "";
  try {
    if (command.action === "resume") {
      ctx.credentials.facebookReceiving = true;
      ctx.credentials.facebookPausedByUser = false;
      ctx.stoppedByUser = false;
      ctx.saveCredentials();
      ctx.log("Đã tiếp tục nhận chiến dịch theo yêu cầu trên website.");
      if (!ctx.state().facebookReady) require("./automatic-login.cjs")(ctx);
    } else if (
      command.action === "connect" &&
      !ctx.facebookLogin &&
      ctx.state().phase !== "ready"
    ) {
      require("./facebook-login.cjs")(ctx, { fromCommand: true }).catch((e) => {
        ctx.error = e.message;
        ctx.notify();
      });
    }
  } catch (e) {
    error = e.message;
  }
  const ack = { id: command.id, error };
  ctx.credentials.deviceCommand = ack;
  ctx.saveCredentials();
  await ctx.request("/commands/ack", "POST", ack);
};
