const $ = (id) => document.getElementById(id);
let busy = false;
let latestState;
let commandError = "";
function show(state) {
  $("login-finish-panel").hidden = true;
  $("finish-login").disabled = !state.facebookLogin || !state.facebookReady;
  latestState = state;
  const loginHome = state.facebookReady && !state.facebookLogin ? 'advanced-login' : 'facebook-connect-actions';
  if ($('login').parentElement.id !== loginHome) $(loginHome).append($('login'));
  const receiving = window.receivingState(state);
  $("resume").disabled = busy || !receiving.canStart;
  $("resume").textContent = receiving.label;
  $("receiving-status").textContent = receiving.message;
  if (state.phase === 'ready' && state.online) $("receiving-status").textContent = 'Sẵn sàng. Vào chiến dịch trên website và bấm Chạy. Không cần đóng cửa sổ Facebook.';
  if (state.facebookLogin) $("receiving-status").textContent = 'Đăng nhập/xác minh trong cửa sổ Facebook. BotAds sẽ tự chuyển sang sẵn sàng.';
  if (state.phase === 'paused') $("receiving-status").textContent = 'Facebook đang tạm dừng. Trên website, bấm Chạy và chọn Tiếp tục; không cần ghép lại kết nối.';
  $("stop").disabled = busy || (!state.receivingEnabled && !state.currentJob);
  for (const [id, done] of [["step-pair", state.linked], ["step-login", state.facebookReady && !state.facebookLogin], ["step-receive", state.receivingEnabled && state.online]])
    $(id).textContent = done ? "Đã hoàn tất" : "Chưa hoàn tất";
  $("pairing").hidden = state.linked;
  $("connected").hidden = !state.linked;
  $("status").textContent = state.facebookLogin
    ? "Đang kết nối Facebook"
    : state.paused
      ? "Đang tạm nghỉ"
      : state.busy
        ? "Đang làm việc"
        : state.online
          ? "Đã kết nối"
          : state.linked
            ? "Đang nối lại"
            : "Chưa liên kết";
  $("status").className = "pill" + (state.online ? " online" : "");
  $("server-name").textContent = state.server;
  $("browser-note").textContent =
    state.browserMode === "system"
      ? "Bản Lite dùng Edge hoặc Chrome đã cài trên máy và mở phiên BotAds riêng. Không cần cài thêm trình duyệt nếu máy đã có bản phù hợp."
      : "Bản đầy đủ đã đóng kèm trình duyệt dùng cho BotAds.";
  for (const provider of ["threads", "instagram"]) {
    const account = state.socialAccounts?.[provider];
    $(`${provider}-status`).textContent = account?.ready
      ? `Đã lưu phiên ${account.name}. Giữ app mở để nhận lịch.`
      : `Bấm kết nối ${provider} trên website để app mở đăng nhập.`;
    $(`forget-${provider}`).disabled =
      busy || state.busy || !!state.currentJob || !account;
  }
  $("facebook-status").textContent = state.facebookReady
    ? state.facebookLogin ? "Đang xác minh và lưu phiên…" : "Facebook đã kết nối"
    : "Chưa đăng nhập hoặc phiên đã hết hạn. Kết nối Facebook để tiếp tục.";
  $("login").textContent = state.facebookLogin ? 'Đang kết nối…' : state.facebookReady
    ? "Đăng nhập lại"
    : "Kết nối Facebook";
  $("login").disabled = busy || state.busy || !!state.currentJob;
  $("facebook-change").disabled = busy || state.busy || !!state.currentJob;
  $("startup").checked = state.startup;
  $("job").textContent = state.facebookLogin
    ? "Đang kết nối · Tự hoàn tất sau khi đăng nhập hợp lệ"
    : state.currentSocial
      ? `${state.currentSocial.kind === "connect" ? "Đăng nhập" : "Đăng bài"} ${state.currentSocial.provider}`
      : state.currentJob
        ? `${state.syncingResults ? "Đang đồng bộ" : "Đang xử lý"}: ${state.currentCampaign || state.currentJob.slice(0, 8)}`
        : "Chưa có lượt chạy";
  $("logs").textContent = state.logs.length
    ? state.logs
        .map(
          (e) => `${new Date(e.time).toLocaleTimeString("vi-VN")}  ${e.text}`,
        )
        .join("\n")
    : "Sẵn sàng kết nối…";
  $("logs").scrollTop = $("logs").scrollHeight;
  $("error").hidden = !(state.error || commandError);
  $("error").textContent = state.error || commandError;
}
async function command(name, payload) {
  commandError = "";
  busy = true;
  $("login").disabled = true;
  $("facebook-change").disabled = true;
  try {
    show(await window.botads.command(name, payload));
  } catch (e) {
    commandError = e.message.replace(
      /^Error invoking remote method[^:]*: Error: /,
      "",
    );
    $("error").textContent = commandError;
    $("error").hidden = false;
  } finally {
    busy = false;
    if (latestState) show(latestState);
    for (const id of ["login", "facebook-change"])
      $(id).disabled = !!latestState?.busy || !!latestState?.currentJob;
  }
}
$("pair-form").addEventListener("submit", (e) => {
  e.preventDefault();
  command("pair", { server: $("server").value, code: $("code").value });
});
for (const name of [
  "login",
  "resume",
  "stop",
  "website",
  "open-diagnostics",
  "finish-login",
])
  $(name).addEventListener("click", () => command(name));
$("disconnect").addEventListener("click", () => {
  if (confirm("Xóa liên kết và phiên Facebook đã lưu trên máy này?"))
    command("disconnect");
});
$("facebook-change").addEventListener("click", () => {
  if (
    confirm(
      "Xóa phiên Facebook cũ để đăng nhập tài khoản khác? Lịch đăng sẽ tạm nghỉ. Bạn cần duyệt lại nhóm cho tài khoản mới.",
    )
  )
    command("facebook-change");
});
for (const provider of ["threads", "instagram"])
  $(`forget-${provider}`).addEventListener("click", () => {
    if (
      confirm(
        `Xóa phiên ${provider} trên máy? Kênh trên web sẽ cần kết nối lại.`,
      )
    )
      command("social-forget", { provider });
  });
$("startup").addEventListener("change", () =>
  command("startup", { enabled: $("startup").checked }),
);
window.botads.onState(show);
command("state");
