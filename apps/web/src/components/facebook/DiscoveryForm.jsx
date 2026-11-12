import React, { useState } from "react";

export default function DiscoveryForm({ device, busy, onSubmit, onDevices }) {
  const [keywords, setKeywords] = useState(""),
    [limit, setLimit] = useState(20);
  return (
    <section className="panel mk-form">
      <h2>Tìm nhóm theo dịch vụ</h2>
      {!device?.discovery_supported && (
        <p className="notice">
          Cần bản app máy tính có tính năng tìm nhóm. Cập nhật app, liên kết và
          đăng nhập Facebook trước. App cũ vẫn chạy chiến dịch cũ nhưng không
          nhận job tìm nhóm mới.{" "}
          <button className="link" onClick={onDevices}>
            Mở thiết bị
          </button>
        </p>
      )}
      <form
        className="mk-form"
        onSubmit={async (e) => {
          e.preventDefault();
          await onSubmit({
            keywords: keywords
              .split("\n")
              .map((v) => v.trim())
              .filter(Boolean),
            limit,
          });
        }}
      >
        <label>
          Từ khóa tìm nhóm, mỗi dòng một từ khóa
          <textarea
            required
            rows={3}
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder={"thiết kế website\ncần làm website\nkinh doanh online"}
          />
        </label>
        <label>
          Số nhóm tối đa
          <input
            type="number"
            min="1"
            max="50"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          />
        </label>
        <p className="hint">
          Lượt này chỉ tìm và đánh giá nhóm, không tham gia nhóm và không gửi
          bài. Kết quả cần được bạn kiểm tra trước khi chọn.
        </p>
        <button
          className="primary"
          disabled={busy || !device?.discovery_supported}
        >
          Tìm nhóm, chưa đăng bài
        </button>
      </form>
    </section>
  );
}
