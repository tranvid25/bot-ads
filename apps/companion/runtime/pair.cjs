module.exports = async (ctx, payload) => {
  const server = ctx.validateServer(payload.server);
  const diagnostics = require("./diagnostics.cjs");
  diagnostics.record(ctx, { event: "pair-start", origin: server });
  let response;
  try {
    response = await fetch(`${server}/api/device/pair`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: String(payload.code || "").slice(0, 100),
        name: ctx.os.hostname(),
      }),
      signal: AbortSignal.timeout(20000),
      redirect: "error",
    });
  } catch {
    diagnostics.record(ctx, { event: "pair-network-error", origin: server });
    throw new Error(
      "Không kết nối được máy chủ BotAds. Kiểm tra mạng và địa chỉ https://bot.salesora.space.",
    );
  }
  diagnostics.record(ctx, {
    event: "pair-response",
    origin: server,
    status: response.status,
  });
  if ([404, 405].includes(response.status))
    throw new Error(
      `Địa chỉ ${server} không có API ghép máy BotAds (HTTP ${response.status}). Nhập https://bot.salesora.space; không nhập website đang quảng bá.`,
    );
  const responseText = await response.text();
  let result = {};
  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(
        `Máy chủ trả phản hồi không hợp lệ (HTTP ${response.status}). Kiểm tra địa chỉ BotAds và mở Nhật ký kết nối.`,
      );
    }
  }
  if (!response.ok)
    throw new Error(
      result.error ||
        `Máy chủ từ chối ghép thiết bị (HTTP ${response.status}). Tạo mã mới rồi thử lại.`,
    );
  if (!responseText)
    throw new Error(
      `Máy chủ trả phản hồi rỗng (HTTP ${response.status}). Kiểm tra địa chỉ BotAds và mở Nhật ký kết nối.`,
    );
  if (!/^[a-f0-9-]{36}$/.test(result.workspaceId) || !result.token)
    throw new Error("Website trả dữ liệu liên kết không hợp lệ.");
  return { server, result };
};
