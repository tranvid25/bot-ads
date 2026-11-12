const $ = (id) => document.getElementById(id);
let busy = false;
function show(state) {
  $("pairing").hidden = state.linked;
  $("connected").hidden = !state.linked;
  $("status").textContent = state.paused
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
    ? "Đã lưu phiên đăng nhập trên máy"
    : "Chưa đăng nhập trên trình duyệt BotAds";
  $("login").textContent = state.facebookReady
    ? "Đăng nhập lại"
    : "Kết nối Facebook";
  $("login").disabled = busy || state.busy || !!state.currentJob;
  $("startup").checked = state.startup;
  $("job").textContent = state.currentSocial
    ? `${state.currentSocial.kind === "connect" ? "Đăng nhập" : "Đăng bài"} ${state.currentSocial.provider}`
    : state.currentJob
      ? "Đang xử lý lượt " + state.currentJob.slice(0, 8)
      : "Chưa có lượt chạy";
  $("logs").textContent = state.logs.length
    ? state.logs
        .map(
          (e) => `${new Date(e.time).toLocaleTimeString("vi-VN")}  ${e.text}`,
        )
        .join("\n")
    : "Sẵn sàng kết nối…";
  $("logs").scrollTop = $("logs").scrollHeight;
  $("error").hidden = !state.error;
  $("error").textContent = state.error;
}
async function command(name, payload) {
  busy = true;
  try {
    show(await window.botads.command(name, payload));
  } catch (e) {
    $("error").textContent = e.message.replace(
      /^Error invoking remote method[^:]*: Error: /,
      "",
    );
    $("error").hidden = false;
  } finally {
    busy = false;
    $("login").disabled = false;
  }
}
$("pair-form").addEventListener("submit", (e) => {
  e.preventDefault();
  command("pair", { server: $("server").value, code: $("code").value });
});
for (const name of ["login", "resume", "stop", "website"])
  $(name).addEventListener("click", () => command(name));
$("disconnect").addEventListener("click", () => {
  if (confirm("Xóa liên kết và phiên Facebook đã lưu trên máy này?"))
    command("disconnect");
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
