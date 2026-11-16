module.exports = (ctx) => {
  function validateServer(value) {
    const url = new URL(String(value));
    if (
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      throw new Error("Chỉ nhập địa chỉ gốc của website.");
    if (
      url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )
    )
      throw new Error("Website cần HTTPS; localhost được dùng HTTP.");
    return url.origin;
  }
  async function request(route, method = "POST", payload = {}, options = {}) {
    const connection = ctx.credentials.connection;
    if (!connection) throw new Error("Chưa liên kết thiết bị.");
    if (connection.invalid)
      throw Object.assign(new Error(connection.invalid), { status: 401 });
    const response = await fetch(`${connection.server}/api/device${route}`, {
      method,
      headers: {
        Authorization: `Bearer ${connection.token}`,
        ...(method === "POST"
          ? {
              "Content-Type": "application/json",
            }
          : {}),
      },
      body: method === "POST" ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(options.timeout || 25000),
      redirect: "error",
    });
    if (!response.ok) {
      // A response from the previous pairing must not invalidate its replacement.
      if (ctx.credentials.connection !== connection)
        throw Object.assign(new Error("Liên kết thiết bị đã thay đổi. Vui lòng thử lại."), { status: 409 });
      let message;
      try {
        message = (await response.json()).error;
      } catch {}
      if (response.status === 401) {
        message = "Liên kết thiết bị không còn hợp lệ. Mở website BotAds, tạo mã ghép mới (thu hồi máy cũ nếu cần), rồi ghép lại trong ứng dụng.";
        connection.invalid = message;
        ctx.lastSeen = 0;
        ctx.error = message;
        ctx.log(message);
      }
      throw Object.assign(
        new Error(message || `Máy chủ trả lỗi ${response.status}`),
        {
          status: response.status,
        },
      );
    }
    ctx.lastSeen = Date.now();
    return options.binary ? response.arrayBuffer() : response.json();
  }
  return { validateServer, request };
};
