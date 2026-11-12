import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function ApprovedGroupSelector({ form, set, onOpenGroups }) {
  const [groups, setGroups] = useState([]),
    [error, setError] = useState("");
  const load = () =>
    api("/facebook")
      .then((d) => {
        setGroups(d.groups);
        setError("");
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  const approved = groups.filter(
    (g) =>
      g.eligibility === "approved" && g.reviewed_at > Date.now() - 7 * 86400000,
  );
  return (
    <section className="mk-form">
      <h3>Chọn nhóm đã kiểm tra và duyệt</h3>
      {error && <p className="danger">{error}</p>}
      {!approved.length && (
        <p className="notice">
          Chưa có nhóm được duyệt trong 7 ngày gần đây. Bạn có thể lưu nháp nội
          dung, sau đó mở thư viện để tìm/nhập và duyệt nhóm. Chưa thể chạy hoặc
          bật lịch nếu không có nhóm.
        </p>
      )}
      {approved.map((g) => (
        <label className="check" key={g.id}>
          <input
            type="checkbox"
            checked={form.groupIds.includes(g.id)}
            onChange={(e) => {
              const ids = e.target.checked
                ? [...form.groupIds, g.id]
                : form.groupIds.filter((id) => id !== g.id);
              set("groupIds", ids);
              set(
                "groupUrls",
                groups.filter((v) => ids.includes(v.id)).map((v) => v.url),
              );
            }}
          />
          {g.name}
        </label>
      ))}
      <button
        type="button"
        className="secondary"
        onClick={
          onOpenGroups ||
          (() =>
            window.open("/?page=facebook", "_blank", "noopener,noreferrer"))
        }
      >
        Mở thư viện và hướng dẫn tìm nhóm
      </button>
      <button type="button" className="link" onClick={load}>
        Tải lại danh sách nhóm đã duyệt
      </button>
      <small>
        Thư viện mở ở tab riêng để giữ nội dung bạn đang soạn. Duyệt nhóm xong,
        quay lại và tải lại danh sách.
      </small>
      <small>
        Danh sách này được chụp lại khi tạo lượt chạy. Nhóm cần duyệt thành viên
        hoặc bài vẫn phải chờ quản trị viên.
      </small>
    </section>
  );
}
