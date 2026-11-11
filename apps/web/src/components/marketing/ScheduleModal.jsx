import React, { useState } from "react";
import Dialog from "./Dialog";
import { providers, manual } from "./constants";

export default function ScheduleModal({ schedule, channels, onClose, onConfirm, busy }) {
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [scheduledAt, setScheduledAt] = useState("");

  if (!schedule) return null;

  return (
    <Dialog title="Lên lịch cho phiên bản đã duyệt" onClose={onClose}>
      <form
        className="mk-form"
        onSubmit={async (e) => {
          e.preventDefault();
          await onConfirm({
            revision: schedule.revision,
            channelIds: selectedChannels,
            scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
          });
        }}
      >
        <h3>
          {schedule.title} · v{schedule.revision}
        </h3>
        <p>Chọn tài khoản thuộc thương hiệu và đã có bản nội dung tương ứng.</p>
        <div className="mk-form">
          {channels
            .filter(
              (c) =>
                c.status === "connected" &&
                schedule.variants.some((v) => v.provider === c.provider),
            )
            .map((c) => (
              <label className="mk-check" key={c.id}>
                <input
                  type="checkbox"
                  checked={selectedChannels.includes(c.id)}
                  onChange={(e) =>
                    setSelectedChannels(
                      e.target.checked
                        ? [...selectedChannels, c.id]
                        : selectedChannels.filter((id) => id !== c.id),
                    )
                  }
                />
                {providers[c.provider]} · {c.name}{" "}
                {manual.includes(c.provider) ? "(cần tự đăng)" : "(API)"}
              </label>
            ))}
        </div>
        {!channels.some(
          (c) =>
            c.status === "connected" &&
            schedule.variants.some((v) => v.provider === c.provider),
        ) && (
          <p className="notice">
            Chưa có tài khoản phù hợp. Đóng hộp thoại và thêm ở Kết nối kênh.
          </p>
        )}
        <label>
          Ngày giờ đăng · {Intl.DateTimeFormat().resolvedOptions().timeZone}
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
          <small>
            Để trống để đưa vào lượt kiểm tra lịch tiếp theo. Lịch được lưu theo
            UTC và hiển thị theo múi giờ trình duyệt.
          </small>
        </label>
        <button className="primary" disabled={busy || !selectedChannels.length}>
          Xác nhận lịch đăng
        </button>
      </form>
    </Dialog>
  );
}

