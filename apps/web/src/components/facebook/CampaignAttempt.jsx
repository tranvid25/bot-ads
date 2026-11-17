import React from "react";
import { Badge, date } from "../ui";
export default function CampaignAttempt({ attempt: a, onRecheck, busy }) {
  return (
    <tr>
      <td data-label="Bài viết / nhóm">
        <strong>{a.title || "Bài viết"}</strong>
        <a
          className="block"
          href={a.group_url}
          target="_blank"
          rel="noreferrer"
        >
          {a.group_url}
        </a>
        <small className="block">
          Lượt {a.job_id.slice(0, 8)} · {a.timestamp || a.updated_at ? date(a.timestamp || a.updated_at) : "Chưa có thời điểm gửi"}
        </small>
        <details>
          <summary>Chi tiết lần gửi</summary>
          <p className="attempt-content">
            {a.submittedContent ||
              "Nội dung chi tiết chưa được lưu ở phiên bản desktop cũ."}
          </p>
          {a.error && <p className="danger">{a.error}</p>}
          <p>
            Nguồn xác nhận:{" "}
            {a.status === "success"
              ? "Hệ thống đối chiếu bài trên Facebook"
              : "Chưa xác nhận bài đã xuất bản"}
          </p>
          {a.reconciledAt && <p>Đối soát thành công: {date(a.reconciledAt)}</p>}
          {a.reconcileCheckedAt && (
            <p>Kiểm tra gần nhất: {date(a.reconcileCheckedAt)}</p>
          )}
          {a.recheck_error && <p className="danger">{a.recheck_error}</p>}
          {a.comment && (
            <p>
              Bình luận: <Badge status={a.comment.status} />
            </p>
          )}
        </details>
      </td>
      <td data-label="Trạng thái">
        <Badge status={a.status} />
        {a.recheck_status === "queued" && (
          <small className="block">Chờ máy đã đăng nhận kiểm tra</small>
        )}
        {a.recheck_status === "running" && (
          <small className="block">Đang kiểm tra lại</small>
        )}
      </td>
      <td data-label="Link và thao tác">
        {a.postUrl ? (
          <a href={a.postUrl} target="_blank" rel="noreferrer">
            Mở bài viết ↗
          </a>
        ) : (
          "Chưa lấy được link bài"
        )}
        {["unknown", "pending_approval", "submitting"].includes(a.status) && (
          <button
            className="link block"
            disabled={busy || ["queued", "running"].includes(a.recheck_status)}
            onClick={() => onRecheck(a)}
          >
            Kiểm tra lại kết quả
          </button>
        )}
      </td>
    </tr>
  );
}
