module.exports = (ctx) => {
  if (
    ctx.facebookLogin ||
    ctx.hasWork() ||
    ctx.credentials.facebookPausedByUser
  )
    return;
  require("./facebook-login.cjs")(ctx, { fromCommand: true }).catch((e) => {
    ctx.error = e.message;
    ctx.notify();
  });
};
