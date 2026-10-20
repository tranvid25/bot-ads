const {
  app,
  BrowserWindow,
  ipcMain,
  safeStorage,
  Tray,
  Menu,
  nativeImage,
  shell,
} = require("electron");
const fs = require("fs");
const path = require("path");
const { fork } = require("child_process");
const crypto = require("crypto");
const os = require("os");
const root = path.resolve(__dirname, "../..");
if (process.env.BOTADS_DESKTOP_DATA_DIR) {
  fs.mkdirSync(process.env.BOTADS_DESKTOP_DATA_DIR, { recursive: true });
  app.setPath("userData", path.resolve(process.env.BOTADS_DESKTOP_DATA_DIR));
}
const { mergeReservations } = require("../../packages/desktop-state.cjs");
let window,
  tray,
  child,
  quitting = false,
  polling = false,
  timer,
  current = null,
  credentials = {},
  error = "",
  lastSeen = 0;
const logs = [];
let startup = false;
let stoppedByUser = false;
let encryptedPath;
const atom = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(value));
  fs.renameSync(temp, file);
};
const read = (file, fallback) => {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
};
function saveCredentials() {
  if (!safeStorage.isEncryptionAvailable())
    throw new Error("Hệ điều hành chưa cung cấp kho mã hóa an toàn.");
  fs.writeFileSync(
    encryptedPath,
    safeStorage.encryptString(JSON.stringify(credentials)),
  );
}
function dataDir() {
  if (!credentials.connection) throw new Error("Chưa liên kết website.");
  return path.join(
    app.getPath("userData"),
    "accounts",
    credentials.connection.workspaceId,
  );
}
const activeFile = () => path.join(dataDir(), "active-job.json");
function log(text) {
  logs.push({ text: String(text).slice(0, 2000), time: Date.now() });
  if (logs.length > 150) logs.shift();
  if (current) {
    current.events.push({
      id: crypto.randomUUID(),
      text: String(text).slice(0, 2000),
    });
    current.events = current.events.slice(-100);
    saveCurrent();
  }
  notify();
}
function saveCurrent() {
  if (current) atom(activeFile(), current);
}
function state() {
  return {
    server: credentials.connection?.server || "",
    linked: !!credentials.connection,
    facebookReady: !!credentials.auth?.cookies?.some(
      (c) => c.name === "c_user",
    ),
    busy: !!child,
    currentJob: current?.job?.id || null,
    online: Date.now() - lastSeen < 120000,
    error,
    logs,
    startup,
    paused: stoppedByUser,
  };
}
function notify() {
  if (window && !window.isDestroyed())
    window.webContents.send("state", state());
}
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
  const connection = credentials.connection;
  if (!connection) throw new Error("Chưa liên kết thiết bị.");
  const response = await fetch(`${connection.server}/api/device${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${connection.token}`,
      ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
    body: method === "POST" ? JSON.stringify(payload) : undefined,
    signal: AbortSignal.timeout(options.timeout || 25000),
    redirect: "error",
  });
  if (!response.ok) {
    let message;
    try {
      message = (await response.json()).error;
    } catch {}
    throw Object.assign(
      new Error(message || `Máy chủ trả lỗi ${response.status}`),
      { status: response.status },
    );
  }
  lastSeen = Date.now();
  return options.binary ? response.arrayBuffer() : response.json();
}
function reportAttempts() {
  const state = read(path.join(dataDir(), "automation_state.json"), {
    attempts: [],
  });
  const reservations = read(path.join(dataDir(), "reservations.json"), []);
  const known = new Set(state.attempts.map((a) => a.id));
  const extra = reservations
    .filter((a) => !known.has(a.id))
    .map((a) => ({
      ...a,
      status: a.status === "failed" ? "failed" : "unknown",
    }));
  // Merge reservations before another job: a lost reply must not cause a second submit.
  if (extra.length && !child && !current?.starting) {
    state.attempts.push(...extra);
    state.groups ||= {};
    state.runs ||= [];
    state.version ||= 2;
    atom(path.join(dataDir(), "automation_state.json"), state);
  }
  return mergeReservations(state, reservations)
    .attempts.filter((a) => a.cloudJobId)
    .slice(-200)
    .map((a) => ({
      id: a.id,
      status: a.status,
      title: a.title,
      timestamp: a.timestamp,
      postUrl: a.postUrl,
      error: a.error,
      comment: a.comment
        ? { status: a.comment.status, error: a.comment.error }
        : null,
    }));
}
async function report() {
  if (!current) return;
  const outgoing = current.events.slice(-50);
  await request("/report", "POST", {
    jobId: current.job.id,
    attempts: reportAttempts(),
    events: outgoing,
    finished: !!current.finished,
    error: current.error,
    summary: current.summary,
  });
  const sent = new Set(outgoing.map((e) => e.id));
  current.events = current.events.filter((e) => !sent.has(e.id));
  if (current.finished) {
    fs.unlinkSync(activeFile());
    current = null;
  } else saveCurrent();
}
function spawnRunner(message) {
  return new Promise((resolve, reject) => {
    if (child)
      return reject(new Error("Ứng dụng đang thực hiện một công việc khác."));
    fs.mkdirSync(dataDir(), { recursive: true });
    const env = {
      ...process.env,
      BOTADS_DATA_DIR: dataDir(),
      ELECTRON_RUN_AS_NODE: "1",
    };
    // Ship a complete browser alongside the installer. Development uses Playwright's local cache.
    if (app.isPackaged)
      env.PLAYWRIGHT_BROWSERS_PATH = path.join(
        process.resourcesPath,
        "browsers",
      );
    const processChild = fork(path.join(__dirname, "runner.cjs"), [], {
      execPath: process.execPath,
      env,
      stdio: ["ignore", "pipe", "pipe", "ipc"],
      windowsHide: true,
    });
    child = processChild;
    let done = false;
    processChild.stdout.on("data", (chunk) => log(chunk.toString()));
    processChild.stderr.on("data", (chunk) => log(chunk.toString()));
    processChild.on("message", async (event) => {
      if (event.type === "log") log(event.text);
      if (event.type === "auth") {
        try {
          const previous = credentials.auth?.cookies?.find(
            (c) => c.name === "c_user",
          )?.value;
          const next = event.state?.cookies?.find(
            (c) => c.name === "c_user",
          )?.value;
          if (!next) throw new Error("Chưa có phiên Facebook hợp lệ.");
          if (previous && previous !== next)
            throw new Error(
              "Workspace này đã gắn với một tài khoản Facebook khác. Đăng nhập lại đúng tài khoản.",
            );
          credentials.auth = event.state;
          saveCredentials();
          processChild.send({
            type: "reply",
            id: event.id,
            data: { ok: true },
          });
          notify();
        } catch (e) {
          processChild.send({ type: "reply", id: event.id, error: e.message });
        }
      }
      if (event.type === "reserve") {
        try {
          const response = await request("/reserve", "POST", {
            jobId: current.job.id,
            attemptId: event.attemptId,
            groupUrl: event.groupUrl,
            title: event.title,
          });
          processChild.send({ type: "reply", id: event.id, data: response });
        } catch (e) {
          if (e.status && e.status < 500) {
            const file = path.join(dataDir(), "reservations.json");
            const reservations = read(file, []);
            const record = reservations.find((a) => a.id === event.attemptId);
            if (record) {
              record.status = "failed";
              atom(file, reservations);
            }
          }
          if (processChild.connected)
            processChild.send({
              type: "reply",
              id: event.id,
              error: e.message,
            });
        }
      }
      if (event.type === "done") {
        done = true;
        resolve(event);
      }
    });
    processChild.on("error", reject);
    processChild.on("exit", (code) => {
      child = null;
      if (!done)
        resolve({
          error: `Tiến trình kết thúc giữa lượt (${code}). Cần kiểm tra kết quả trước khi gửi lại.`,
        });
      notify();
    });
    processChild.send({
      type: "start",
      ...message,
      auth: credentials.auth || null,
    });
    notify();
  });
}
async function startJob(job) {
  current = { job, events: [], finished: false };
  saveCurrent();
  log(`Nhận chiến dịch: ${job.campaign.name}`);
  try {
    const prepared = await request(
      "/prepare",
      "POST",
      { jobId: job.id },
      { timeout: 75000 },
    );
    const assets = {};
    for (const assetId of new Set(
      prepared.campaign.posts
        .filter((p) => p.selected)
        .map((p) => p.assetId)
        .filter(Boolean),
    )) {
      if (!/^[a-f0-9-]{36}$/.test(assetId))
        throw new Error("ID ảnh không hợp lệ.");
      const bytes = await request(`/assets/${assetId}`, "GET", null, {
        binary: true,
      });
      if (bytes.byteLength > 5 * 1024 * 1024)
        throw new Error("Ảnh vượt dung lượng cho phép.");
      const buffer = Buffer.from(bytes);
      const extension =
        buffer[0] === 137 ? "png" : buffer[0] === 255 ? "jpg" : "webp";
      const target = path.join(dataDir(), "media", assetId + "." + extension);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, buffer);
      assets[assetId] = target;
    }
    const result = await spawnRunner({
      action: "run",
      job,
      ...prepared,
      assets,
      leaseUntil: Date.now() + 45000,
    });
    current.finished = true;
    current.error = result.error || "";
    current.summary = result.summary || null;
    saveCurrent();
    log(
      result.error
        ? `Lượt chạy dừng: ${result.error}`
        : "Đã kết thúc lượt chạy; xem kết quả từng bài trên website.",
    );
  } catch (e) {
    current.finished = true;
    current.error = e.message;
    saveCurrent();
    log(e.message);
  }
  try {
    await report();
  } catch (e) {
    error = "Đang giữ kết quả trên máy để đồng bộ khi có mạng: " + e.message;
  }
  notify();
}
async function tick() {
  if (polling || !credentials.connection) return;
  polling = true;
  try {
    const heartbeat = await request("/heartbeat", "POST", {
      facebookReady: state().facebookReady,
      jobId: current?.job?.id,
    });
    error = "";
    if (child && current) {
      if (heartbeat.stop) child.send({ type: "stop" });
      else child.send({ type: "lease", until: Date.now() + 45000 });
    }
    // Recover an interrupted job conservatively, with persisted outcomes, before accepting new work.
    if (current && !child && !current.starting && !current.finished) {
      current.finished = true;
      current.error =
        "Ứng dụng đã khởi động lại giữa lượt. Bài chưa rõ kết quả được giữ để đối soát.";
      saveCurrent();
    }
    if (current) await report();
    if (!child && !current && !stoppedByUser && state().facebookReady) {
      const { job, blocked } = await request("/claim");
      if (job) {
        const promise = startJob(job);
        current.starting = true;
        saveCurrent();
        promise.finally(() => {
          if (current) {
            current.starting = false;
            saveCurrent();
          }
        });
      } else if (blocked)
        error =
          "Có lượt cần đối soát. Mở Kết quả trên web hoặc dùng đúng máy đã chạy để đồng bộ lại.";
    }
  } catch (e) {
    error = e.message;
    if (e.status === 401 && child) child.send({ type: "stop" });
  } finally {
    polling = false;
    notify();
  }
}
function windowOpen() {
  if (window && !window.isDestroyed()) {
    window.show();
    window.focus();
    return;
  }
  window = new BrowserWindow({
    width: 900,
    height: 730,
    minWidth: 680,
    minHeight: 580,
    show: false,
    backgroundColor: "#f5f7f2",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.loadFile(path.join(__dirname, "index.html"));
  window.once("ready-to-show", () => {
    if (process.env.BOTADS_TEST_HIDDEN !== "1") window.show();
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.on("close", (event) => {
    if (!quitting) {
      event.preventDefault();
      window.hide();
    }
  });
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", windowOpen);
  app.whenReady().then(() => {
    encryptedPath = path.join(app.getPath("userData"), "credentials.bin");
    try {
      if (fs.existsSync(encryptedPath))
        credentials = JSON.parse(
          safeStorage.decryptString(fs.readFileSync(encryptedPath)),
        );
    } catch (e) {
      error = "Không đọc được liên kết đã lưu. Vui lòng ghép lại: " + e.message;
    }
    if (credentials.connection) {
      current = read(activeFile(), null);
      if (current) current.starting = false;
    }
    startup = app.getLoginItemSettings().openAtLogin;
    const icon = nativeImage.createFromDataURL(
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAIElEQVQ4T2Nk+M/wn4ECwESJ5lEDRg0YNWAwGQAA5kcCHfZQYlUAAAAASUVORK5CYII=",
    );
    tray = new Tray(icon);
    tray.setToolTip("BotAds — ứng dụng đang chạy");
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: "Mở BotAds", click: windowOpen },
        {
          label: "Dừng lượt hiện tại",
          click: () => {
            stoppedByUser = true;
            if (child) child.send({ type: "stop" });
            notify();
          },
        },
        { type: "separator" },
        {
          label: "Thoát BotAds",
          click: () => {
            quitting = true;
            if (child) child.kill();
            app.quit();
          },
        },
      ]),
    );
    tray.on("double-click", windowOpen);
    ipcMain.handle("command", async (event, command, payload = {}) => {
      if (!window || event.sender !== window.webContents)
        throw new Error("Không có quyền.");
      if (command === "state") return state();
      if (command === "pair") {
        if (child || current)
          throw new Error(
            "Dừng và đồng bộ lượt hiện tại trước khi đổi liên kết.",
          );
        const server = validateServer(payload.server);
        const response = await fetch(`${server}/api/device/pair`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: String(payload.code || "").slice(0, 100),
            name: os.hostname(),
          }),
          signal: AbortSignal.timeout(20000),
          redirect: "error",
        });
        const responseText = await response.text();
        let result = {};
        if (responseText) {
          try {
            result = JSON.parse(responseText);
          } catch {
            throw new Error(
              `Máy chủ trả phản hồi không hợp lệ (HTTP ${response.status}). Kiểm tra cửa sổ cloud:dev.`,
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
            `Máy chủ trả phản hồi rỗng (HTTP ${response.status}). Kiểm tra cửa sổ cloud:dev.`,
          );
        if (!/^[a-f0-9-]{36}$/.test(result.workspaceId) || !result.token)
          throw new Error("Website trả dữ liệu liên kết không hợp lệ.");
        if (
          credentials.connection?.workspaceId !== result.workspaceId ||
          credentials.connection?.server !== server
        )
          credentials.auth = null;
        credentials.connection = { ...result, server };
        saveCredentials();
        log("Đã ghép với website. Tiếp theo, kết nối Facebook.");
        await tick();
        return state();
      }
      if (command === "login") {
        if (!credentials.connection) throw new Error("Ghép với website trước.");
        if (current) throw new Error("Đợi lượt hiện tại kết thúc.");
        const result = await spawnRunner({ action: "login" });
        if (result.error) throw new Error(result.error);
        log("Đã lưu phiên Facebook được mã hóa trên máy này.");
        await tick();
        return state();
      }
      if (command === "stop") {
        stoppedByUser = true;
        if (child) child.send({ type: "stop" });
        log("Đã yêu cầu dừng. Ứng dụng tạm ngưng nhận việc mới.");
        return state();
      }
      if (command === "resume") {
        stoppedByUser = false;
        await tick();
        return state();
      }
      if (command === "startup") {
        startup = Boolean(payload.enabled);
        app.setLoginItemSettings({
          openAtLogin: startup,
          path: process.execPath,
        });
        return state();
      }
      if (command === "website") {
        if (credentials.connection)
          await shell.openExternal(credentials.connection.server);
        return state();
      }
      if (command === "disconnect") {
        if (child || current)
          throw new Error("Dừng và đồng bộ lượt hiện tại trước khi ngắt.");
        credentials = {};
        saveCredentials();
        lastSeen = 0;
        log(
          "Đã xóa liên kết và phiên Facebook trên máy. Thu hồi thiết bị trên website để ghép lại.",
        );
        return state();
      }
      throw new Error("Lệnh không hợp lệ.");
    });
    windowOpen();
    timer = setInterval(tick, 20000);
    tick();
  });
  app.on("before-quit", () => {
    quitting = true;
    clearInterval(timer);
    if (child) child.kill();
  });
  app.on("window-all-closed", () => {});
}
