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
process.once("message", async (message) => {
  if (message.type !== "start") return;
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
        () => require(path.join(root, "login")).main(),
        { allowStopped: true },
      );
      send({ type: "done", login: true });
    } else {
      leaseUntil = message.leaseUntil;
      const { job, campaign, workspace, assets } = message;
      const { defaults } = require(path.join(root, "settings"));
      const previous = read("config.json", {});
      const state = mergeReservations(
        require(path.join(root, "history")).loadState(),
        read("reservations.json", []),
      );
      // Group relevance is campaign-specific even though the account history is shared.
      if (previous.cloudCampaignId !== job.campaignId)
        for (const group of Object.values(state.groups)) {
          if (group.approvalSource === "automatic") {
            group.advertisingAllowed = false;
            group.selection = null;
          }
        }
      write("automation_state.json", state);
      const config = campaignConfig(
        campaign,
        workspace,
        job,
        assets,
        defaults,
        previous,
      );
      write("config.json", config);
      if (fs.existsSync(file("STOP"))) fs.unlinkSync(file("STOP"));
      runtime.setSubmissionGuard(async ({ groupUrl, postData }) => {
        const attemptId = crypto.randomUUID();
        // Persist before requesting a cloud reservation; interrupted requests must be reconciled.
        const reservation = {
          id: attemptId,
          groupUrl,
          status: "submitting",
          timestamp: new Date().toISOString(),
          title: postData.title,
          cloudJobId: job.id,
        };
        const local = read("reservations.json", []);
        local.push(reservation);
        write("reservations.json", local);
        const result = await rpc("reserve", {
          attemptId,
          groupUrl,
          title: postData.title,
        });
        return result;
      });
      const summary = await runtime.runExclusive(() =>
        require(path.join(root, "automation")).main(),
      );
      send({ type: "done", summary });
    }
  } catch (e) {
    send({ type: "done", error: e.message });
  } finally {
    setTimeout(() => process.exit(), 100);
  }
});
process.on("disconnect", () => {
  stopped = true;
  setTimeout(() => process.exit(1), 1000);
});
