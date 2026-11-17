import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function ApprovedGroupSelector({ form, set, onOpenGroups }) {
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(0);
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
  const filtered = approved.filter((g) =>
    `${g.name} ${g.url}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section className="mk-form">
      <h3>Chọn nhóm đã kiểm tra và duyệt</h3>
      <input
        aria-label="L?c nh?m ?? duy?t"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(0);
        }}
      />
      <div className="mk-actions">
        <button
          type="button"
          className="secondary"
          disabled={!filtered.length}
          onClick={() => {
            set(
              "groupIds",
              filtered.map((g) => g.id),
            );
            set("groupUrls", [...new Set(filtered.map((g) => g.url))]);
          }}
        >
          Chọn tất cả {filtered.length} nhóm đủ điều kiện
        </button>
        <button
          type="button"
          className="link"
          onClick={() => {
            set("groupIds", []);
            set("groupUrls", []);
          }}
        >
          Bỏ chọn
        </button>
        <span role="status">
          Đã chọn {form.groupIds.length}/{filtered.length} nhóm
        </span>
      </div>
      {error && <p className="danger">{error}</p>}
      {!approved.length && (
        <p className="notice">
          Chưa có nhóm được duyệt trong 7 ngày gần đây. Bạn có thể lưu nháp nội
          dung, sau đó mở thư viện để tìm/nhập và duyệt nhóm. Chưa thể chạy hoặc
          bật lịch nếu không có nhóm.
        </p>
      )}
      <div className="approved-group-scroll">
        {filtered.slice(page * 20, page * 20 + 20).map((g) => (
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
      </div>
      <div className="mk-actions">
        <button
          type="button"
          disabled={!page}
          onClick={() => setPage((p) => p - 1)}
        >
          Tr??c
        </button>
        <span>Trang {page + 1}</span>
        <button
          type="button"
          disabled={(page + 1) * 20 >= filtered.length}
          onClick={() => setPage((p) => p + 1)}
        >
          Sau
        </button>
      </div>
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
