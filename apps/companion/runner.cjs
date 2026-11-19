const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const root = path.resolve(__dirname, "../../packages/automation");
const { read, write, file } = require(path.join(root, "storage"));
const runtime = require(path.join(root, "runtime"));
const {
  mergeReservations,
  campaignConfig,
} = require("../../packages/desktop-state.cjs");
const { setManagedAuth } = require(path.join(root, "browser_helper"));
let leaseUntil = 0;
let stopped = false;
let finishLogin = false;
const send = (data) => {
  if (process.connected) process.send(data);
};
for (const level of ["log", "warn", "error"]) {
  console[level] = (...args) =>
    send({
      type: "log",
      text: args
        .map((v) => String(v))
        .join(" ")
        .slice(0, 2000),
    });
}
const pending = new Map();
process.on("message", (message) => {
  if (message.type === "lease") leaseUntil = message.until;
  if (message.type === "stop") stopped = true;
  if (message.type === "finish-login") finishLogin = true;
  if (message.type === "reply") {
    const task = pending.get(message.id);
    if (task) {
      pending.delete(message.id);
      message.error
        ? task.reject(new runtime.HaltError(message.error))
        : task.resolve(message.data);
    }
  }
});
function rpc(type, data) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(
        new runtime.HaltError(
          "Mất kết nối ứng dụng. Đã dừng trước thao tác tiếp theo.",
        ),
      );
    }, 30000);
    pending.set(id, {
      resolve: (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      reject: (e) => {
        clearTimeout(timer);
        reject(e);
      },
    });
    send({ type, id, ...data });
  });
}
let processing = false;
process.on("message", async (message) => {
  if (message.type !== "start") return;
  if (processing) return;
  processing = true; stopped = false; finishLogin = false;
  runtime.startDeadline(45);
  let auth = message.auth;
  setManagedAuth({
    load: () => auth,
    save: async (state) => {
      await rpc("auth", { state });
      auth = state;
    },
  });
  runtime.setExecutionGuard(() => {
    if (stopped)
      throw new runtime.HaltError("Đã dừng từ ứng dụng hoặc website.");
    if (message.job && Date.now() > leaseUntil)
      throw new runtime.HaltError(
        "Mất kết nối máy chủ. Tạm dừng để bảo toàn hạn mức.",
      );
  });
  try {
    if (message.action === "login") {
      await runtime.runExclusive(
        () => require(path.join(root, "login")).main({ autoFinish: true, keepOpen: true }),
        { allowStopped: true },
      );
      send({ type: "done", login: true });
    } else if (message.action === "recheck") {
      if (fs.existsSync(file("STOP"))) fs.unlinkSync(file("STOP"));
      const attempt = require(path.join(root, "history")).loadState().attempts.find(a => a.id === message.attemptId);
      if (!attempt?.submittedContent) throw new Error("Máy này không còn bằng chứng gốc của lần gửi. Hãy mở Facebook để kiểm tra thủ công.");
      await runtime.runExclusive(() => require(path.join(root, "reconcile_posts")).main({ attemptIds: [message.attemptId], verifyOnly: true }));
      send({ type: "done" });
    } else if (message.action === 'membership') {
      leaseUntil = message.leaseUntil;
      if (fs.existsSync(file('STOP'))) fs.unlinkSync(file('STOP'));
      const expectedUid = auth?.cookies?.find(c => c.name === 'c_user')?.value;
      if (!expectedUid) throw new Error('Kết nối Facebook trên BotAds trước khi xử lý nhóm.');
      const membership = await runtime.runExclusive(() =>
        require(path.join(root, 'membership_only.cjs')).main({ group: message.group, operation: message.operation, expectedUid }));
      send({ type: 'done', membership });
    } else if (message.action === "discover") {
      leaseUntil = message.leaseUntil;
      if (fs.existsSync(file("STOP"))) fs.unlinkSync(file("STOP"));
      const groups = await runtime.runExclusive(() =>
        require(path.join(root, "discover_only.cjs")).main(message.task),
      );
      send({ type: "done", groups });
    } else {
      leaseUntil = message.leaseUntil;
      const summary = await require("./runner_campaign.cjs")(message, { auth, rpc });
      send({ type: "done", summary });
    }
  } catch (e) {
    send({ type: "done", error: e.message, halted: e instanceof runtime.HaltError, authInvalid: ['FACEBOOK_AUTH_REQUIRED','FACEBOOK_ACCOUNT_CHANGED'].includes(e.code), accountChanged: e.code === 'FACEBOOK_ACCOUNT_CHANGED' });
  } finally {
    processing = false;
  }
});
process.on("disconnect", () => {
  stopped = true;
  require(path.join(root, 'managed_session.cjs')).close().finally(() => process.exit());
  setTimeout(() => process.exit(1), 3000).unref();
});
