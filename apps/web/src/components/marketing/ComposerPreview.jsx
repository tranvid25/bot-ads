import React from "react";
import { ChannelMark } from "../PublishingViews";
import { providers } from "./constants";

export default function ComposerPreview({ active, brand, selected, post }) {
  const sel = selected || {};
  const hasContent = !!sel.content || !!sel.assetId;
  const channelName = (active && providers[active]) || "Social";

  return (
    <aside className="composer-live buffer-live-preview" aria-label="Xem trước bài đăng">
      <div className="composer-preview-title buffer-preview-header">
        <strong>{channelName} Preview</strong>
        <span className="buffer-preview-info-icon" title="Xem trước giao diện">ⓘ</span>
      </div>

      {!hasContent ? (
        <div className="buffer-preview-mockup-placeholder">
          <div className="preview-sparkle sparkle-top">✨</div>
          <div className="preview-mockup-card">
            <div className="mockup-header">
              <div className="mockup-avatar" />
              <div className="mockup-lines">
                <div className="mockup-line line-short" />
                <div className="mockup-line line-shorter" />
              </div>
            </div>
            <div className="mockup-body-lines">
              <div className="mockup-line line-full" />
              <div className="mockup-line line-half" />
            </div>
            <div className="mockup-media-box" />
          </div>
          <div className="preview-sparkle sparkle-bottom">✨</div>
          <p className="preview-placeholder-text">See your post's preview here</p>
        </div>
      ) : (
        <article className="social-preview buffer-feed-card">
          <header className="buffer-feed-header">
            <div className="feed-avatar-wrap">
              <ChannelMark provider={active} />
            </div>
            <div className="feed-author-meta">
              <strong>{brand?.name || "Thương hiệu"}</strong>
              <small>{channelName} · Vừa xong · 🌐</small>
            </div>
            <span className="feed-more-dots">•••</span>
          </header>
          {sel.title && <h3 className="buffer-feed-title">{sel.title}</h3>}
          <p className="buffer-feed-content">{sel.content}</p>
          {sel.assetId && (
            <div className="buffer-feed-media">
              <img alt="Ảnh xem trước" src={`/api/assets/${sel.assetId}`} />
            </div>
          )}
          <footer className="buffer-feed-actions">
            <span>♡ Thích</span>
            <span>💬 Bình luận</span>
            <span>↗ Chia sẻ</span>
          </footer>
        </article>
      )}

      {sel.firstComment && (
        <div className="buffer-preview-first-comment">
          <strong>Bình luận đầu tiên:</strong>
          <p>{sel.firstComment}</p>
        </div>
      )}
    </aside>
  );
}
