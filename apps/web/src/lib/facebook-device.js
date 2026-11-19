import { api } from "./api";
export async function prepareFacebookDevice(subject = 'chiến dịch') {
  let snapshot;
  try {
    snapshot = await api("/devices/runtime");
  } catch (e) {
    if (e.status === 404) return { message: "" };
    throw e;
  }
  const device = snapshot.devices?.[0];
  if (!device)
    return { message: "Chưa ghép máy. Mở mục Thiết bị để liên kết một lần." };
  if (Date.now() - device.last_seen > 120000)
    return {
      message:
        "Mở BotAds trên máy đã kết nối; lượt chờ sẽ tự được nhận khi máy online.",
    };
  if (device.phase === "paused") {
    if (
      !window.confirm(
        `Máy đang tạm dừng Facebook. Tiếp tục nhận việc cho ${subject} này?`,
      )
    )
      return { canceled: true };
    return {
      apply: () => api('/devices/commands', 'POST', { deviceId: device.id, action: 'resume' }),
      message:
        "Đã gửi yêu cầu tiếp tục tới máy. Không cần ngắt hoặc ghép lại kết nối.",
    };
  }
  if (device.phase === "login_required") {
    return {
      apply: () => api('/devices/commands', 'POST', { deviceId: device.id, action: 'connect' }),
      message:
        "Đăng nhập trong cửa sổ Facebook trên máy. BotAds tự hoàn tất và nhận chiến dịch còn hiệu lực.",
    };
  }
  return {
    message:
      device.phase === "connecting"
        ? "Đang chờ bạn đăng nhập Facebook; xong bước này bot tự nhận chiến dịch."
        : "",
  };
}
