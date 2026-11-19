import GroupLibraryRow from "./GroupLibraryRow";
import GroupImport from "./GroupImport";
import GroupFilters from "./GroupFilters";
import GroupMembershipActions from './GroupMembershipActions';
import React, { useState } from "react";

export default function GroupLibrary({ groups, busy, act, onCompose }) {
  const [url, setUrl] = useState(""),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState([]),
    [page, setPage] = useState(0),
    [filters, setFilters] = useState({});
  const approved = (g) =>
    g.eligibility === "approved" && g.reviewed_at >= Date.now() - 7 * 86400000;
  const filtered = groups.filter(
    (g) =>
      `${g.name} ${g.url}`.toLowerCase().includes(search.toLowerCase()) &&
      Object.entries(filters).every(
        ([key, value]) => !value || g[key] === value,
      ),
  );
  const chosen = groups.filter((g) => selected.includes(g.id) && approved(g));
  return (
    <section className="panel mk-form">
      <div className="section-title">
        <h2>Thư viện nhóm Facebook</h2>
        <button
          className="primary"
          disabled={!chosen.length}
          onClick={() => onCompose(chosen)}
        >
          Soạn bài cho {chosen.length} nhóm đã chọn
        </button>
      </div>
      <form
        className="mk-actions"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await act("groups", "POST", { url })) setUrl("");
        }}
      >
        <label className="fb-import">
          Link nhóm bạn đã biết
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.facebook.com/groups/…"
          />
        </label>
        <button className="secondary" disabled={busy}>
          Thêm nhóm, chưa duyệt
        </button>
      </form>
      <input
        aria-label="Tìm trong thư viện nhóm"
        placeholder="Tìm tên hoặc URL nhóm…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(0);
        }}
      />
      <GroupImport act={act} busy={busy} />
      <GroupFilters
        value={filters}
        onChange={(value) => {
          setFilters(value);
          setPage(0);
        }}
      />
      <div className="mk-actions">
        <button className="secondary" disabled={busy || !filtered.length} onClick={() => setSelected(filtered.slice(page * 20, page * 20 + 20).map(g => g.id))}>Chọn trang này</button>
        <button
          className="secondary"
          disabled={busy || !filtered.length}
          onClick={() => setSelected(filtered.map((g) => g.id))}
        >
          Chọn tất cả {filtered.length} nhóm đang lọc
        </button>
        <button
          className="secondary"
          disabled={busy || !selected.length}
          onClick={() => {
            if (
              confirm(
                `Bạn đã kiểm tra nội quy và quyền đăng của ${selected.length} nhóm? Nhóm bị loại/có cảnh báo cấm cần xử lý riêng.`,
              )
            )
              act("groups/review", "POST", { ids: selected, confirmed: true });
          }}
        >
          Duyệt nhóm đã chọn
        </button>
        <button className="link" onClick={() => setSelected([])}>
          Bỏ chọn
        </button>
        <span>
          Đã chọn {selected.length} nhóm · {chosen.length} đủ điều kiện đăng
        </span>
      </div>
      <GroupMembershipActions ids={selected.filter(id => groups.some(g => g.id === id))} busy={busy} act={act} />
      <p>Chọn nhóm → xin tham gia nếu cần → kiểm tra trạng thái → duyệt nhóm → soạn chiến dịch. Nhóm cho đăng khi chưa tham gia vẫn dùng được; tham gia nhóm không tự duyệt quyền quảng cáo.</p>
      {!groups.length && (
        <p>
          Chưa có nhóm. Tìm nhóm ở bước trên hoặc nhập link. Tạo nháp nội dung
          vẫn được; chưa thể chạy khi chưa có nhóm được duyệt.
        </p>
      )}
      <div className="fb-group-list">
        {filtered.slice(page * 20, page * 20 + 20).map((g) => (
          <GroupLibraryRow
            key={g.id}
            {...{ g, busy, act, selected, setSelected, approved }}
          />
        ))}
      </div>
      <div className="mk-actions">
        <button
          className="secondary small"
          disabled={!page}
          onClick={() => setPage((p) => p - 1)}
        >
          Trước
        </button>
        <small>
          Trang {page + 1} · {filtered.length} nhóm trong tối đa 500 nhóm gần
          nhất
        </small>
        <button
          className="secondary small"
          disabled={(page + 1) * 20 >= filtered.length}
          onClick={() => setPage((p) => p + 1)}
        >
          Sau
        </button>
      </div>
    </section>
  );
}
