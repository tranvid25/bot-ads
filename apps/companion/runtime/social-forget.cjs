module.exports = async (ctx, payload) => {
  if (ctx.child || ctx.current || ctx.social.busy() || ctx.discovery.busy())
    throw new Error("Dừng và đồng bộ lượt đang chạy trước.");
  if (!["threads", "instagram"].includes(payload.provider))
    throw new Error("Kênh không hợp lệ.");
  await ctx.request("/social/forget", "POST", { provider: payload.provider });
  delete ctx.credentials.social?.[payload.provider];
  ctx.saveCredentials();
  return ctx.state();
};
