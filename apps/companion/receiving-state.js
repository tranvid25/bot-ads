(function (root) {
  function receivingState(s) {
    let reason = "";
    if (!s.linked) reason = "Liên kết máy tính với website BotAds trước.";
    else if (s.facebookLogin)
      reason = "Đăng nhập rồi bấm Hoàn tất kết nối Facebook.";
    else if (!s.facebookReady)
      reason = "Kết nối Facebook trước khi bật nhận việc.";
    else if (!s.online)
      reason = "Chưa liên lạc được máy chủ. Kiểm tra mạng và nhật ký kết nối.";
    else if (s.currentJob) reason = "Đang xử lý hoặc đồng bộ lượt hiện tại.";
    else if (s.busy || s.currentSocial)
      reason = "Đang thực hiện công việc khác. Đợi hoàn tất.";
    const enabled = s.receivingEnabled ?? !s.paused;
    return {
      canStart: !reason && !enabled,
      reason,
      label: enabled ? "Đã bật nhận việc Facebook" : "Bật nhận việc Facebook",
      message:
        reason ||
        (enabled
          ? "Đang nhận việc · Chờ chiến dịch đến hạn. Giữ app mở và máy có mạng."
          : "Sẵn sàng. Bấm Bật nhận việc Facebook, rồi chạy chiến dịch trên website."),
    };
  }
  if (typeof module !== "undefined") module.exports = receivingState;
  else root.receivingState = receivingState;
})(globalThis);
