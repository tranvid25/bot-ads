import React, { useState } from "react";
import { ChannelMark } from "../PublishingViews";
import { providers, date } from "./constants";

export default function CommunityView({
  channels = [],
  channelFilter = "",
  publications = [],
  onDispatch,
  onMetricsModal,
  onEditor,
  busy = false,
}) {
  const channel = channels.find((c) => c.id === channelFilter) || channels[0];
  const [filter, setFilter] = useState("all");

  const published = publications.filter((p) =>
    ["published", "user_reported_published"].includes(p.status) &&
    (!channelFilter || p.channel_id === channelFilter)
  );

  const totalVisits = published.reduce((acc, p) => acc + (p.visits || 0), 0);
  const totalLeads = published.reduce((acc, p) => acc + (p.leads || 0), 0);
  const withNotes = published.filter((p) => Boolean(p.metric_note?.trim()));

  const filtered = published.filter((p) => {
    if (filter === "noted") return Boolean(p.metric_note?.trim());
    if (filter === "unnoted") return !p.metric_note?.trim();
    return true;
  });

  return (
    <section className="buffer-community-view panel mk-form">
      <div className="buffer-community-header">
        <div className="community-header-left">
          {channel && (
            <div className="community-channel-tag">
              <ChannelMark provider={channel.provider} size="small" />
              <strong>{channel.name}</strong>
              <small>{providers[channel.provider]}</small>
            </div>
          )}
          <h2>💬 Community Conversations</h2>
          <p className="community-subtitle">
            Theo dõi phản hồi, ghi chú tương tác và quản lý hội thoại theo từng bài đã xuất bản.
          </p>
        </div>
        <div className="community-header-actions">
          {onDispatch && (
            <button
              type="button"
              className="secondary buffer-sync-btn"
              disabled={busy}
              onClick={onDispatch}
            >
              Xử lý bài đến hạn
            </button>
          )}
        </div>
      </div>

      <div className="buffer-community-stats-bar">
        <div className="comm-stat-card">
          <span className="stat-label">Đã xuất bản</span>
          <strong className="stat-num">{published.length}</strong>
        </div>
        <div className="comm-stat-card">
          <span className="stat-label">Tổng lượt về web</span>
          <strong className="stat-num text-lime">{totalVisits}</strong>
        </div>
        <div className="comm-stat-card">
          <span className="stat-label">Ghi chú tương tác</span>
          <strong className="stat-num">{withNotes.length}</strong>
        </div>
      </div>

      <div className="buffer-community-filters">
        <button
          type="button"
          className={`buffer-pill-tab ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          Tất cả ({published.length})
        </button>
        <button
          type="button"
          className={`buffer-pill-tab ${filter === "noted" ? "active" : ""}`}
          onClick={() => setFilter("noted")}
        >
          Đã ghi nhận ({withNotes.length})
        </button>
        <button
          type="button"
          className={`buffer-pill-tab ${filter === "unnoted" ? "active" : ""}`}
          onClick={() => setFilter("unnoted")}
        >
          Chưa ghi nhận ({published.length - withNotes.length})
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="buffer-insights-empty" style={{ padding: "40px 20px", textAlign: "center" }}>
          <p style={{ fontSize: "15px", color: "var(--text-muted, #8b949e)", marginBottom: "12px" }}>
            {published.length === 0
              ? "Chưa có bài viết nào đã xuất bản trên kênh này."
              : "Không có bài viết nào phù hợp bộ lọc."}
          </p>
          {onEditor && published.length === 0 && (
            <button type="button" className="primary small" onClick={() => onEditor("new")}>
              ✏️ Tạo bài viết mới
            </button>
          )}
        </div>
      ) : (
        <div className="buffer-comments-feed">
          {filtered.map((p) => {
            const chan = channels.find((c) => c.id === p.channel_id);
            const title = p.snapshot?.title || p.snapshot?.postTitle || "Bài viết đã xuất bản";
            return (
              <article key={p.id} className="buffer-comment-card">
                <div className="comment-card-top">
                  <div className="comment-author-box">
                    <span className="comment-author-avatar">
                      {chan?.provider ? <ChannelMark provider={chan.provider} size="small" /> : "📢"}
                    </span>
                    <div className="comment-author-meta">
                      <strong>{title}</strong>
                      <small className="comment-time">
                        {date(p.scheduled_at)} · {chan?.name || "Kênh"}
                      </small>
                    </div>
                  </div>
                  <span className="sentiment-badge positive">
                    {p.status === "user_reported_published" ? "✓ Bạn xác nhận" : "✓ Đã xuất bản"}
                  </span>
                </div>

                {p.snapshot?.content && (
                  <p className="comment-body" style={{ opacity: 0.85, fontSize: "13px" }}>
                    {p.snapshot.content.slice(0, 180)}
                    {p.snapshot.content.length > 180 ? "…" : ""}
                  </p>
                )}

                <div className="comment-replied-box" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                  <div>
                    <small style={{ color: "var(--text-muted, #8b949e)" }}>
                      {p.visits || 0} visits · {p.leads || 0} leads
                      {p.metric_note ? ` · Ghi chú: "${p.metric_note}"` : " · Chưa có ghi chú tương tác"}
                    </small>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {p.permalink && (
                      <a href={p.permalink} target="_blank" rel="noreferrer" className="link" style={{ fontSize: "12px" }}>
                        Mở bài đăng ↗
                      </a>
                    )}
                    {onMetricsModal && (
                      <button
                        type="button"
                        className="secondary small"
                        style={{ padding: "4px 8px", fontSize: "12px" }}
                        onClick={() => onMetricsModal(p)}
                      >
                        Ghi nhận tương tác
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
