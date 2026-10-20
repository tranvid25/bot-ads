import React from "react";
export const labels = {
  queued: "Chờ thiết bị",
  running: "Đang chạy",
  needs_review: "Cần đối soát",
  completed: "Đã kết thúc",
  failed: "Có lỗi",
  canceled: "Đã dừng",
  expired: "Đã lỡ lịch",
  success: "Đã xuất bản",
  pending_approval: "Chờ duyệt",
  unknown: "Chưa xác nhận",
  submitting: "Đang gửi",
  confirmed: "Đã xác nhận",
  not_available: "Chưa có ô bình luận",
};
export const date = (value) =>
  new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
export function Icon({ name, size = 20 }) {
  const paths = {
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    campaign: "M3 10v4h4l11 5V5L7 10H3 M7 14l2 7h3l-2-6",
    device: "M3 4h18v13H3z M8 21h8 M12 17v4",
    history: "M3 12a9 9 0 1 0 3-6 M3 3v5h5 M12 7v5l3 2",
    settings:
      "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2",
    arrow: "M7 17 17 7 M7 7h10v10",
    plus: "M12 5v14 M5 12h14",
    check: "m5 12 4 4L19 6",
    download: "M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4",
    spark: "m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7Z",
    play: "m8 5 11 7-11 7z",
    logout: "M9 4H4v16h5 M9 12h12 M16 7l5 5-5 5",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.grid} />
    </svg>
  );
}
export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Icon name="spark" />
      </span>
      botads<span className="brand-dot">.</span>
    </div>
  );
}
export function Badge({ status }) {
  return <span className={`badge ${status}`}>{labels[status] || status}</span>;
}
export function Empty({ title, text, action }) {
  return (
    <div className="empty">
      <span className="empty-symbol">
        <Icon name="campaign" size={28} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
