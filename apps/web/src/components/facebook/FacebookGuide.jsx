import React from "react";

export default function FacebookGuide({
  device,
  groupCount = 0,
  campaignCount = 0,
  onDevices,
  onGroups,
  onCompose,
  onResults,
}) {
  const ready =
    device?.facebook_ready && Date.now() - device.last_seen < 120000;
  const steps = [
    [
      "Kết nối máy và Facebook",
      ready
        ? "Máy đã online và có phiên Facebook."
        : "Cài app → tạo mã liên kết → đăng nhập Facebook trong app → bật nhận việc.",
      ready,
      onDevices,
    ],
    [
      "Tìm và duyệt nhóm",
      `${groupCount} nhóm đã duyệt. Tìm theo từ khóa dịch vụ hoặc nhập link nhóm bạn được phép đăng.`,
      groupCount > 0,
      onGroups,
    ],
    [
      "Soạn bài và chọn lịch",
      `${campaignCount} chiến dịch. Viết dịch vụ, link website của bạn, chọn nhóm được duyệt rồi lưu nháp hoặc bật lịch.`,
      campaignCount > 0,
      onCompose,
    ],
    [
      "Theo dõi từng lượt đăng",
      "Xem bài đã xuất bản, chờ quản trị viên duyệt, bị lỗi hoặc cần bạn kiểm tra.",
      false,
      onResults,
    ],
  ];
  return (
    <section
      className="panel facebook-guide"
      aria-label="Hướng dẫn bắt đầu Facebook"
    >
      <h2>Bắt đầu quảng bá dịch vụ trên Facebook</h2>
      <p>
        BotAds là nơi điều khiển. Website bạn quảng bá, ví dụ xaywebsite.com,
        nằm trong nội dung bài.
      </p>
      <ol>
        {steps.map(([title, text, done, action], index) => (
          <li key={title}>
            <span className="fb-step-number">{done ? "✓" : index + 1}</span>
            <div>
              <strong>{title}</strong>
              <p>{text}</p>
              <button type="button" className="link" onClick={action}>
                {done ? "Xem lại bước này" : "Bắt đầu bước này"} →
              </button>
            </div>
          </li>
        ))}
      </ol>
      <small>
        Máy phải bật và có mạng. Nhóm cần duyệt thành viên/bài sẽ phải chờ; việc
        tìm thấy nhóm không tự cấp quyền đăng quảng cáo.
      </small>
    </section>
  );
}
