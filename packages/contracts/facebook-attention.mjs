export function facebookAttention(data, now = Date.now()) {
  const items = [];
  const jobs = data?.jobs || [];
  const active = jobs.filter((job) =>
    ["queued", "running"].includes(job.status),
  );
  if (
    active.length &&
    !(data?.devices || []).some(
      (device) => now - device.last_seen < 120000 && !device.revoked_at,
    )
  )
    items.push({
      id: "offline",
      target: "devices",
      text: `${active.length} lượt chờ/đang chạy nhưng chưa có máy online. Mở BotAds desktop và kiểm tra kết nối.`,
    });
  for (const job of jobs) {
    if (["needs_review", "expired", "failed"].includes(job.status))
      items.push({
        id: `job:${job.id}`,
        target: "results",
        text:
          job.status === "needs_review"
            ? "Có lượt bị gián đoạn cần kiểm tra kết quả trước khi chạy lại."
            : job.status === "expired"
              ? "Có lượt quá hạn chờ máy. Kiểm tra lịch và chủ động tạo lượt mới nếu cần."
              : "Có lượt chạy bị lỗi. Mở nhật ký để xem nguyên nhân.",
      });
    if (job.status === "running" && job.cancel_requested)
      items.push({
        id: `cancel:${job.id}`,
        target: "results",
        text: "Đã yêu cầu dừng, đang chờ thiết bị xác nhận. Thao tác Facebook đã nhận có thể vẫn hoàn tất.",
      });
  }
  for (const attempt of data?.attempts || []) {
    if (attempt.status === "unknown")
      items.push({
        id: `attempt:${attempt.id}`,
        target: "results",
        text: "Có bài chưa rõ kết quả. Mở Facebook kiểm tra trước khi gửi lại để tránh trùng.",
      });
  }
  return items;
}
