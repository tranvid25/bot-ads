const { login } = require("./social/browser.cjs");
const { publish } = require("./social/publish.cjs");
let stopped = false,
  leaseUntil = 0;
const pending = new Map();
const send = (message) => {
  if (process.connected) process.send(message);
};
function rpc(type, data) {
  return new Promise((resolve, reject) => {
    const id = require("crypto").randomUUID();
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(
        new Error("Máy chủ không phản hồi. Đã dừng trước bước tiếp theo."),
      );
    }, 30000);
    pending.set(id, {
      resolve: (data) => {
        clearTimeout(timer);
        resolve(data);
      },
      reject: (error) => {
        clearTimeout(timer);
        reject(error);
      },
    });
    send({ type, id, ...data });
  });
}
function guard() {
  if (stopped || Date.now() > leaseUntil)
    throw new Error("Đã dừng hoặc mất kết nối với website.");
}
process.on("message", (message) => {
  if (message.type === "lease") leaseUntil = message.until;
  if (message.type === "stop") stopped = true;
  if (message.type === "reply") {
    const entry = pending.get(message.id);
    pending.delete(message.id);
    if (entry)
      message.error
        ? entry.reject(new Error(message.error))
        : entry.resolve(message.data);
  }
});
process.once("message", async (message) => {
  if (message.type !== "start") return;
  leaseUntil = message.task.leaseUntil;
  let result;
  try {
    if (message.task.kind === "connect") {
      const connected = await login(
        message.task.provider,
        message.socialAuth?.auth,
        guard,
      );
      await rpc("social-auth", {
        provider: message.task.provider,
        ...connected,
      });
      result = { status: "connected", identity: connected.identity };
    } else {
      if (
        !message.socialAuth?.auth ||
        message.socialAuth.identity?.actorId !== message.task.config.actorId
      )
        throw Object.assign(
          new Error("Phiên tài khoản trên máy không khớp. Kết nối lại kênh."),
          { state: "needs_reauth" },
        );
      result = await publish(
        message.task,
        message.socialAuth.auth,
        message.image,
        () => rpc("social-reserve", {}),
        guard,
      );
    }
  } catch (e) {
    result = { status: e.state || "failed", error: e.message };
  }
  send({ type: "done", ...result });
  setTimeout(() => process.exit(), 100);
});
process.on("disconnect", () => {
  stopped = true;
  setTimeout(() => process.exit(1), 1000);
});
