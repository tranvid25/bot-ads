import React from "react";
import Status from "./Status";
import { ChannelMark } from "../PublishingViews";
import { providers, date } from "./constants";

export default function PublicationTable({
  publications,
  channelFor,
  onShowDetails,
  onConfirmModal,
  onNotPostedModal,
  onMetricsModal,
  onRetry,
  onCancel,
  onDispatch,
  setNotice,
  setError,
  busy,
}) {
  if (!publications.length) {
    return (
      <p>Chưa có lịch đăng. Duyệt một bài trong kho nội dung để bắt đầu.</p>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nội dung / kênh</th>
            <th>Thời gian</th>
            <th>Kết quả</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {publications.map((p) => {
            const channel = channelFor(p);
            return (
              <tr key={p.id}>
                <td>
                  <div className="post-channel-heading">
                    <ChannelMark provider={channel?.provider} />
                    <strong>{channel?.name}</strong>
                    <small>{providers[channel?.provider]}</small>
                  </div>
                  <strong>{p.snapshot.postTitle}</strong>
                  <p className="mk-excerpt publication-excerpt">
                    {p.snapshot.content}
                  </p>
                  <small className="block">
                    {providers[channel?.provider]} · {channel?.name} · v{p.revision}
                  </small>
                </td>
                <td>{date(p.scheduled_at)}</td>
                <td>
                  <Status value={p.status} provider={channel?.provider} />
                  {p.error && (
                    <small className="block danger">{p.error}</small>
                  )}
                  {p.permalink && (
                    <a
                      className="block link"
                      href={p.permalink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Mở bài ↗
                    </a>
                  )}
                  {p.metric_updated_at && (
                    <small className="block">
                      Số liệu bạn nhập: {p.visits} lượt về web · {p.leads} lead
                    </small>
                  )}
                </td>
                <td>
                  <div className="mk-table-actions">
                    <button
                      className="link"
                      onClick={() => onShowDetails(p)}
                    >
                      Nội dung & nhật ký
                    </button>
                    {["awaiting_manual", "unknown"].includes(p.status) &&
                      !["facebook", "instagram", "threads"].includes(
                        channel?.provider,
                      ) && (
                        <button
                          className="link"
                          onClick={() => onConfirmModal(p)}
                        >
                          Tôi đã đăng · nhập link
                        </button>
                      )}
                    {p.status === "unknown" && (
                      <button
                        className="link danger"
                        onClick={() => onNotPostedModal(p)}
                      >
                        Đã kiểm tra: chưa đăng
                      </button>
                    )}
                    {["failed", "needs_reauth"].includes(p.status) && (
                      <button
                        className="link"
                        disabled={busy || channel?.status !== "connected"}
                        onClick={() => onRetry(p)}
                      >
                        Thử lại
                      </button>
                    )}
                    {["published", "user_reported_published"].includes(
                      p.status,
                    ) && (
                      <button
                        className="link"
                        onClick={() => onMetricsModal(p)}
                      >
                        Nhập số liệu
                      </button>
                    )}
                    {[
                      "scheduled",
                      "retry_wait",
                      "awaiting_manual",
                      "publishing",
                      "needs_reauth",
                    ].includes(p.status) && (
                      <>
                        {["scheduled", "retry_wait", "publishing"].includes(p.status) && onDispatch && (
                          <button className="link" disabled={busy} onClick={onDispatch} title="Kiểm tra kết quả đăng ngay">
                            Kiểm tra kết quả ↻
                          </button>
                        )}
                        <button
                          className="link danger"
                          disabled={busy || p.cancel_requested}
                          onClick={() => onCancel(p)}
                        >
                          {p.cancel_requested ? "Đang yêu cầu hủy" : "Hủy lượt"}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

