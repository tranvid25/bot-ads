import React from "react";
import Status from "./Status";
import { ChannelMark } from "../PublishingViews";
import { providers, date } from "./constants";

export default function IdeaBoardColumn({
  columnKey,
  title,
  ideas = [],
  posts = [],
  brands = [],
  onNewIdea,
  onEditor,
  onApprove,
  onOpenSchedule,
  onMoveIdea,
  busy,
}) {
  const count = ideas.length + posts.length;

  return (
    <div className="buffer-kanban-column" data-column={columnKey}>
      <div className="kanban-col-header">
        <div className="col-header-left">
          <strong className="col-title">{title}</strong>
          <span className="col-count-badge">{count}</span>
        </div>
        <div className="col-header-actions">
          <button
            type="button"
            className="col-add-btn"
            title="Thêm ý tưởng mới"
            onClick={() => onNewIdea(columnKey)}
          >
            +
          </button>
          {columnKey !== "unassigned" && (
            <button type="button" className="col-more-btn" title="Tùy chọn cột">
              ⋯
            </button>
          )}
        </div>
      </div>

      <div className="kanban-cards-stack">
        {ideas.map((idea) => (
          <article key={idea.id} className="buffer-idea-kanban-card">
            {idea.banner && (
              <div className="idea-card-banner">
                <div className="banner-visual-box">
                  <span className="banner-hand-click">click ⤹</span>
                  <div className="banner-mini-actions">
                    <span className="mini-btn-preview">Create Post</span>
                    <span className="mini-btn-primary">Save to Ideas 🗂️</span>
                  </div>
                </div>
              </div>
            )}
            <h4 className="idea-card-title">{idea.title}</h4>
            <p className="idea-card-desc">{idea.desc}</p>
            {idea.tag && <span className="idea-card-tag">#{idea.tag}</span>}

            <div className="idea-card-footer">
              <button
                type="button"
                className="idea-convert-btn"
                onClick={() => onEditor({ title: idea.title, initialContent: idea.desc })}
              >
                Create Post ↗
              </button>
              <select
                className="idea-move-select"
                value={columnKey}
                aria-label="Chuyển cột"
                onChange={(e) => onMoveIdea(idea.id, e.target.value)}
              >
                <option value="unassigned">Unassigned</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </article>
        ))}

        {posts.map((post) => (
          <article className="panel mk-post buffer-kanban-post-card" key={post.id}>
            <div className="post-channel-heading">
              <div className="post-channel-stack">
                {post.variants?.map((v) => (
                  <ChannelMark provider={v.provider} key={v.provider} />
                ))}
              </div>
              <small className="idea-brand-tag">
                {brands.find((b) => b.id === post.brand_id)?.name} · Bản thảo
              </small>
            </div>
            <div className="section-title">
              <div>
                <h3>{post.title}</h3>
                <small className="idea-meta">
                  v{post.revision} · {date(post.updated_at)}
                </small>
              </div>
              <Status value={post.status} />
            </div>
            <p className="mk-excerpt idea-excerpt">{post.variants?.[0]?.content}</p>

            <div className="mk-actions buffer-idea-actions">
              <button className="secondary small" onClick={() => onEditor(post)}>
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

        <button
          type="button"
          className="kanban-col-quick-add"
          onClick={() => onNewIdea(columnKey)}
        >
          + New Idea
        </button>
      </div>
    </div>
  );
}

