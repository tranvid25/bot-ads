(() => {
  const byId = (id) => document.getElementById(id);
  let latest;
  function render(state) {
    latest = state.update;
    if (!latest) return;
    byId("app-version").textContent = `BotAds ${latest.version}`;
    const messages = {
      disabled: "Tự cập nhật chưa bật trong bản thử này.",
      idle: "App tự kiểm tra bản mới khi có mạng.",
      checking: "Đang kiểm tra bản mới…",
      current: "Bạn đang dùng phiên bản mới nhất đã phát hành.",
      available: `Có bản ${latest.availableVersion}.`,
      downloading: `Đang tải bản ${latest.availableVersion}: ${Math.round(latest.percent)}%. Bạn vẫn có thể dùng app.`,
      downloaded: `Bản ${latest.availableVersion} đã sẵn sàng. Cài khi công việc đã hoàn tất.`,
      installing: "Đang cài cập nhật và mở lại BotAds…",
      error: latest.message,
    };
    byId("update-status").textContent = messages[latest.phase] || "";
    byId("update-check").disabled =
      !latest.enabled ||
      ["checking", "downloading", "downloaded", "installing"].includes(
        latest.phase,
      );
    byId("update-download").hidden = !(
      latest.phase === "error" && latest.availableVersion
    );
    byId("update-install").hidden = latest.phase !== "downloaded";
    byId("update-install").disabled =
      state.busy || !!state.currentJob || !!state.currentSocial;
  }
  for (const name of ["update-check", "update-download", "update-install"]) {
    byId(name).addEventListener("click", async () => {
      if (
        name === "update-install" &&
        !confirm(
          "Cài cập nhật và mở lại BotAds? Liên kết và phiên đăng nhập được giữ trên máy.",
        )
      )
        return;
      try {
        render(await window.botads.command(name));
      } catch {
        byId("update-status").textContent =
          "Chưa thực hiện được. Đợi công việc đồng bộ xong hoặc kiểm tra mạng rồi thử lại.";
      }
    });
  }
  window.botads.onState(render);
  window.botads
    .command("state")
    .then(render)
    .catch(() => {});
})();
