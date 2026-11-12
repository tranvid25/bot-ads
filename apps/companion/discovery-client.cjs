const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

module.exports = function discoveryClient({
  request,
  spawnRunner,
  getChild,
  getAuth,
  dataDir,
  log,
  stopped,
}) {
  let active = null,
    running = false,
    loadedFile = "";
  const file = () => path.join(dataDir(), "discovery-report.json");
  function persist() {
    fs.mkdirSync(path.dirname(file()), { recursive: true });
    fs.writeFileSync(file() + ".tmp", JSON.stringify(active));
    fs.renameSync(file() + ".tmp", file());
  }
  async function run(task) {
    running = true;
    active = { taskId: task.id, sequence: 1, groups: [], finished: false };
    persist();
    try {
      log("Tìm nhóm: chỉ thu thập và đánh giá; chưa đăng bài.");
      const result = await spawnRunner({
        action: "discover",
        task,
        job: { id: task.id },
        leaseUntil: Date.now() + 45000,
      });
      active.groups = result.groups || [];
      active.error = result.error || "";
    } catch (e) {
      active.error = e.message;
    }
    active.finished = true;
    running = false;
    persist();
  }
  async function tick() {
    if (loadedFile !== file()) {
      loadedFile = file();
      active = null;
      if (fs.existsSync(file()))
        active = JSON.parse(fs.readFileSync(file(), "utf8"));
      if (active && !active.finished) {
        active.finished = true;
        active.error =
          "Máy khởi động lại khi đang tìm nhóm. Hãy tạo lượt tìm mới.";
        persist();
      }
    }
    if (active) {
      if (active.finished) {
        try {
          await request("/discovery/report", "POST", active);
        } catch (e) {
          if (![404, 409].includes(e.status)) throw e;
        }
        active = null;
        persist();
      } else {
        const heartbeat = await request("/discovery/heartbeat", "POST", {
          taskId: active.taskId,
        });
        getChild()?.send(
          heartbeat.stop || stopped()
            ? { type: "stop" }
            : { type: "lease", until: Date.now() + 45000 },
        );
      }
      return true;
    }
    if (stopped()) return false;
    const uid = getAuth()?.cookies?.find((c) => c.name === "c_user")?.value;
    if (!uid) return false;
    const accountKey = crypto
      .createHash("sha256")
      .update("facebook:" + uid)
      .digest("hex");
    const { task } = await request("/discovery/claim", "POST", { accountKey });
    if (!task) return false;
    void run(task).catch((e) => {
      running = false;
      log("Không lưu được kết quả tìm nhóm: " + e.message);
      getChild()?.send({ type: "stop" });
    });
    return true;
  }
  return { tick, busy: () => running || !!active };
};
