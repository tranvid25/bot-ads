import React, { useState } from "react";
import { facebookAttention } from "../../../../../packages/contracts/facebook-attention.mjs";
export default function AttentionPanel({ data, onNavigate, onRefresh }) {
  const [dismissed, setDismissed] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const items = facebookAttention(data).filter(
    (item) => !dismissed.includes(item.id),
  );
  if (!items.length) return null;
  return (
    <section className="panel" aria-label="Thông báo Facebook cần xử lý">
      <h2>Cần chú ý · {items.length}</h2>
      <button className="secondary small" onClick={onRefresh}>
        Cập nhật trạng thái
      </button>
      {(expanded ? items : items.slice(0, 3)).map((item) => (
        <div className="fb-attention-row" key={item.id}>
          <p>{item.text}</p>
          <div className="mk-actions">
            <button
              className="secondary small"
              onClick={() => onNavigate(item.target)}
            >
              {item.target === "devices"
                ? "Kiểm tra thiết bị"
                : "Xem kết quả & nhật ký"}
            </button>
            <button
              className="link"
              aria-label={`Ẩn thông báo ${item.id}`}
              onClick={() => setDismissed((old) => [...old, item.id])}
            >
              Ẩn trong lần xem này
            </button>
          </div>
        </div>
      ))}
      {items.length > 3 && (
        <button className="link" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Thu gọn" : "Xem tất cả thông báo"}
        </button>
      )}
      <small>
        Dựa trên dữ liệu đã tải gần nhất. Ẩn thông báo không hủy công việc hoặc
        xác nhận bài đã đăng.
      </small>
    </section>
  );
}
