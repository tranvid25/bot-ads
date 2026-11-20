export function jobWait(job, data, now = Date.now()) {
  if (job.status === "needs_review") return { text: "Lượt trước bị gián đoạn, cần đồng bộ/kiểm tra kết quả trước khi máy được nhận lượt mới.", target: "results" };
  if (job.status === "running") return { text: job.cancel_requested ? "Đang chờ thiết bị xác nhận dừng. Bài Facebook đã nhận vẫn cần đối soát." : "Máy đã nhận lượt. Xem nhật ký để biết nhóm đang xử lý.", target: "results" };
  if (job.status !== "queued") return null;
  if (now - job.created_at >= 7200000) return { text: "Lượt đã chờ quá 2 giờ và sẽ hết hạn, không tự gửi bù. Kiểm tra trạng thái hoặc hủy lượt này.", target: "results" };
  const devices = (data.devices || []).filter(device => !device.revoked_at);
  if (!devices.length) return { text: "Chờ ghép máy: chưa có thiết bị đang liên kết với tài khoản BotAds này.", target: "devices" };
  const online = devices.filter(device => now - device.last_seen < 120000);
  if (!online.length) return { text: "Chờ máy online: mở BotAds trên máy đã ghép. App tự nối lại; không cần ngắt hoặc ghép lại kết nối.", target: "devices" };
  if (!online.some(device => device.facebook_ready)) return { text: "Máy online nhưng Facebook cần đăng nhập hoặc xác minh. Bấm kiểm tra lượt chờ ở chiến dịch để mở đăng nhập; BotAds tự hoàn tất.", target: "devices" };
  const blocked = (data.jobs || []).find(other => other.id !== job.id && ["running", "needs_review"].includes(other.status));
  const groupTask = (data.groupTasks || []).find(task => task.status === 'running');
  if (groupTask) return { text: `Máy đang ${groupTask.kind === 'membership' ? 'xử lý tham gia nhóm' : 'tìm nhóm'} (${groupTask.groups_seen}/${groupTask.limit}). Chiến dịch đăng đang chờ lượt này kết thúc; xem hoặc hủy lượt ở Facebook Groups.`, target: 'facebook' };
  if (blocked) return { text: `Chờ lượt ${blocked.id.slice(0,8)} ${blocked.status === "needs_review" ? "được kiểm tra kết quả" : "kết thúc"}.`, target: "results" };
  return { text: "Máy online. BotAds tự nhận lượt kế tiếp; nếu máy đang tạm dừng, bấm Kiểm tra lượt chờ ở chiến dịch để tiếp tục ngay trên website.", target: "results" };
}
