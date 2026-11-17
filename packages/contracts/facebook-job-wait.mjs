export function jobWait(job, data, now = Date.now()) {
  if (job.status === "needs_review") return { text: "Lượt trước bị gián đoạn, cần đồng bộ/kiểm tra kết quả trước khi máy được nhận lượt mới.", target: "results" };
  if (job.status === "running") return { text: job.cancel_requested ? "Đang chờ thiết bị xác nhận dừng. Bài Facebook đã nhận vẫn cần đối soát." : "Máy đã nhận lượt. Xem nhật ký để biết nhóm đang xử lý.", target: "results" };
  if (job.status !== "queued") return null;
  if (now - job.created_at >= 7200000) return { text: "Lượt đã chờ quá 2 giờ và sẽ hết hạn, không tự gửi bù. Kiểm tra trạng thái hoặc hủy lượt này.", target: "results" };
  const devices = (data.devices || []).filter(device => !device.revoked_at);
  if (!devices.length) return { text: "Chờ ghép máy: chưa có thiết bị đang liên kết với tài khoản BotAds này.", target: "devices" };
  const online = devices.filter(device => now - device.last_seen < 120000);
  if (!online.length) return { text: "Chờ máy online: máy chủ chưa nhận heartbeat trong 2 phút. Mở app, kiểm tra lỗi kết nối và bấm Nhận việc từ website.", target: "devices" };
  if (!online.some(device => device.facebook_ready)) return { text: "Máy online nhưng chưa báo Facebook sẵn sàng. Đăng nhập và bấm Hoàn tất kết nối Facebook trong app.", target: "devices" };
  const blocked = (data.jobs || []).find(other => other.id !== job.id && ["running", "needs_review"].includes(other.status));
  if (blocked) return { text: `Chờ lượt ${blocked.id.slice(0,8)} ${blocked.status === "needs_review" ? "được kiểm tra kết quả" : "kết thúc"}.`, target: "results" };
  return { text: "Máy online, Facebook đã lưu phiên. Chờ app nhận lượt kế tiếp; nếu vẫn chờ, hoàn tất cửa sổ đăng nhập, kiểm tra tác vụ tìm nhóm và bật Nhận việc trong app.", target: "devices" };
}
