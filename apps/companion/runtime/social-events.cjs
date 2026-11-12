const social = require("../../../packages/social-contract.cjs");
module.exports = (ctx) => async (event, child, message) => {
  if (!["social-auth", "social-reserve"].includes(event.type)) return false;
  try {
    if (event.type === "social-auth") {
      if (
        message.task.kind !== "connect" ||
        event.provider !== message.task.provider
      )
        throw new Error("Kênh kết nối không khớp.");
      const account = social.identity(event.provider, event.identity);
      const previous = ctx.credentials.social?.[event.provider];
      if (
        previous?.identity?.actorId &&
        previous.identity.actorId !== account.actorId
      )
        throw new Error(
          "App đang lưu tài khoản khác của kênh này. Xóa phiên kênh trong app trước khi đổi tài khoản.",
        );
      ctx.credentials.social ||= {};
      ctx.credentials.social[event.provider] = {
        identity: account,
        auth: event.auth,
      };
      ctx.saveCredentials();
      ctx.log(
        `Đã lưu phiên ${event.provider} ${account.name} được mã hóa trên máy.`,
      );
    } else
      await ctx.request("/social/before-submit", "POST", {
        taskId: message.task.id,
        claimToken: message.task.claimToken,
      });
    if (child.connected)
      child.send({ type: "reply", id: event.id, data: { ok: true } });
  } catch (e) {
    if (child.connected)
      child.send({ type: "reply", id: event.id, error: e.message });
  }
  return true;
};
