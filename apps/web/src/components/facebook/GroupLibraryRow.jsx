import React from "react";
import GroupMembershipActions from './GroupMembershipActions';
export default function GroupLibraryRow({
  g,
  busy,
  act,
  selected,
  setSelected,
  approved,
}) {
  const accountKey = g.membership_account_key || (g.account_key === 'import' ? '' : g.account_key);
  return (
    <article key={g.id} className="fb-group-row">
      <label className="mk-check">
        <input
          type="checkbox"
          aria-label={`Chọn nhóm ${g.name}`}
          disabled={busy}
          checked={selected.includes(g.id)}
          onChange={(e) =>
            setSelected((old) =>
              e.target.checked
                ? [...old, g.id]
                : old.filter((id) => id !== g.id),
            )
          }
        />
        <a href={g.url} target="_blank" rel="noreferrer">
          {g.name}
        </a>
      </label>
      <small>
        {g.membership === "joined"
          ? "Đã tham gia"
          : g.membership === "requested"
            ? "Đang chờ tham gia"
            : g.membership === 'manual_required'
              ? 'Cần bạn hoàn tất câu hỏi'
              : g.membership === 'not_joined' ? 'Chưa tham gia' : "Cần kiểm tra quyền tham gia"}{" "}
        ·{" "}
        {g.eligibility === "approved"
          ? "Bạn đã duyệt"
          : g.eligibility === "rejected"
            ? "Đã loại"
            : "Chưa duyệt"}
      </small>
      {!approved(g) && g.eligibility === "approved" && (
        <small className="danger">
          Đã quá 7 ngày: mở nhóm, kiểm tra và duyệt lại trước khi chọn.
        </small>
      )}
      <small>
        Nguồn:{" "}
        {g.source === "import"
          ? "nhập link"
          : g.source === "joined"
            ? "nhóm đã tham gia"
            : "tìm theo từ khóa"}
        .{" "}
        {accountKey
          ? `Tài khoản ${accountKey.slice(0, 8)}`
          : "Quyền tài khoản sẽ được kiểm tra trên máy khi chạy."}
      </small>
      <p>{g.reason}</p>
      {g.membership_note && <p role="status">{g.membership_note}</p>}
      <GroupMembershipActions ids={[g.id]} busy={busy} act={act} compact />
      <div className="mk-actions">
        <button
          className="secondary small"
          disabled={busy}
          onClick={() => {
            if (
              window.confirm(
                "Bạn xác nhận đã mở nhóm, kiểm tra nội quy và có quyền đăng nội dung này?",
              )
            )
              act(`groups/${g.id}`, "PUT", {
                eligibility: "approved",
                confirmed: true,
              });
          }}
        >
          Duyệt nhóm
        </button>
        <button
          className="link danger"
          disabled={busy}
          onClick={() =>
            act(`groups/${g.id}`, "PUT", { eligibility: "rejected" })
          }
        >
          Loại nhóm
        </button>
      </div>
    </article>
  );
}
