import React, { useState } from "react";
import { prepareFacebookDevice } from "../../lib/facebook-device";

export default function GroupMembershipActions({
  ids,
  busy,
  act,
  compact = false,
}) {
  const [working, setWorking] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function submit(operation) {
    if (
      operation === "join" &&
      !window.confirm(
        `Xin tham gia ${ids.length} nhóm đã chọn? Bạn đã kiểm tra nội quy và muốn dùng tài khoản Facebook đang kết nối BotAds. Nhóm có câu hỏi hoặc cần duyệt sẽ phải chờ bạn/quản trị viên.`,
      )
    )
      return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const device = await prepareFacebookDevice("lượt xử lý nhóm");
      if (device.canceled) return;
      if (
        await act("groups/membership", "POST", {
          ids,
          operation,
          confirmed: operation === "join",
        })
      ) {
        await device.apply?.();
        setNotice(
          device.message ||
            "Đã xếp lượt xử lý. Xem tiến độ và kết quả từng nhóm ở phía trên.",
        );
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
  }
  const disabled = busy || working || !ids.length;
  return (
    <div>
      <div
        className="mk-actions"
        aria-label={
          compact ? "Thao tác tham gia nhóm" : "Tham gia các nhóm đã chọn"
        }
      >
        {!compact && (
          <button
            className="secondary"
            disabled={disabled || ids.length > 20}
            onClick={() => submit("join")}
          >
            Xin tham gia nhóm đã chọn
          </button>
        )}
        <button
          className="secondary small"
          disabled={disabled || ids.length > 50}
          onClick={() => submit("check")}
        >
          Kiểm tra trạng thái
        </button>
        <button
          className="secondary small"
          disabled={disabled || ids.length !== 1}
          onClick={() => submit("open")}
        >
          Mở trên máy BotAds
        </button>
      </div>
      {!compact && (
        <small>
          Xin tham gia tối đa 20 nhóm/lượt (dùng “Chọn trang này”); kiểm tra tối
          đa 50 nhóm. Chọn đúng một nhóm để mở trên máy BotAds.
        </small>
      )}
      {error && (
        <p className="danger" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
