import React from "react";
import Status from "./Status";
import { ChannelMark } from "../PublishingViews";
import { providers, date } from "./constants";

export default function ContentList({
  posts,
  brands,
  channels,
  search,
  channelFilter,
  setEditor,
  onApprove,
  onOpenSchedule,
  busy,
}) {
  if (!posts.length) {
    return (
      <div className="panel mk-empty buffer-ideas-empty">
        <div className="empty-spark-icon">💡</div>
        <h2>Ideas & Content Library</h2>
        <p>Brainstorm your next viral post, draft multi-channel variants, and review ideas with your team.</p>
        <button className="primary buffer-lime-btn" onClick={() => setEditor("new")}>
          + Create First Post / Idea
        </button>
      </div>
    );
  }

  const filtered = posts.filter(
    (post) =>
      (!search ||
        `${post.title} ${post.variants.map((v) => v.content).join(" ")}`
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase())) &&
      (!channelFilter ||
        post.variants.some(
          (v) =>
            v.provider === channels.find((c) => c.id === channelFilter)?.provider,
        )),
  );

  return (
    <section className="mk-content-list buffer-ideas-library">
      <div className="buffer-ideas-header">
        <div>
          <h2>💡 Ideas & Drafts Library</h2>
          <p className="ideas-subtitle">Manage drafts, edit channel-specific text, and approve posts before scheduling.</p>
        </div>
        <button
          type="button"
          className="primary small buffer-new-idea-btn"
          onClick={() => setEditor("new")}
        >
          + New Idea / Draft
        </button>
      </div>

      <div className="buffer-ideas-grid">
        {filtered.map((post) => (
          <article className="panel mk-post buffer-idea-card" key={post.id}>
            <div className="post-channel-heading">
              <div className="post-channel-stack">
                {post.variants.map((v) => (
                  <ChannelMark provider={v.provider} key={v.provider} />
                ))}
              </div>
              <small className="idea-brand-tag">
                {brands.find((b) => b.id === post.brand_id)?.name} · Bản nháp
              </small>
            </div>
            <div className="section-title">
              <div>
                <h3>{post.title}</h3>
                <small className="idea-meta">
                  Phiên bản {post.revision} · {date(post.updated_at)}
                </small>
              </div>
              <Status value={post.status} />
            </div>
            <p className="mk-excerpt idea-excerpt">{post.variants[0]?.content}</p>
            <div className="mk-provider-tags">
              {post.variants.map((v) => (
                <span className="badge" key={v.provider}>
                  {providers[v.provider]}
                </span>
              ))}
            </div>
            {post.source_url && (
              <a
                className="link idea-source-link"
                href={post.source_url}
                target="_blank"
                rel="noreferrer"
              >
                Bài gốc ↗
              </a>
            )}
            <div className="mk-actions buffer-idea-actions">
              <button className="secondary small" onClick={() => setEditor(post)}>
                Mở & chỉnh sửa
              </button>
              {post.status !== "approved" ? (
                <button
                  className="primary small buffer-approve-btn"
                  disabled={busy}
                  onClick={() => onApprove(post)}
                >
                  Duyệt nội dung
                </button>
              ) : (
                <button
                  className="primary small buffer-schedule-btn"
                  onClick={() => onOpenSchedule(post)}
                >
                  Lên lịch đăng
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
