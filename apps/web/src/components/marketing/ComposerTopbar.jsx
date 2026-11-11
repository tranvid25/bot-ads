import React from "react";

export default function ComposerTopbar({
  value,
  onClose,
  showTags,
  setShowTags,
  tags,
  onTagsChange,
  onSaveDraft,
  busy = false,
}) {
  return (
    <div className="buffer-composer-topbar">
      <div className="composer-topbar-left">
        <h2 className="buffer-composer-title">
          {value ? "Edit Post" : "Create Post"}
        </h2>
        <div
          className="buffer-tag-dropdown-pill"
          title="Gắn thẻ phân loại"
          role="button"
          tabIndex={0}
          onClick={() => setShowTags?.(!showTags)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setShowTags?.(!showTags);
          }}
        >
          <span className="tag-icon">🏷️</span>
          <span>Tags</span>
          <small>▾</small>
        </div>

        {showTags && (
          <div className="buffer-tags-popover">
            <label className="tags-popover-label">
              <span>Tags (cách nhau bởi dấu phẩy):</span>
              <input
                type="text"
                className="tags-popover-input"
                placeholder="tech, marketing, updates"
                value={Array.isArray(tags) ? tags.join(", ") : tags || ""}
                onChange={(e) => onTagsChange?.(e.target.value)}
                autoFocus
              />
            </label>
          </div>
        )}
      </div>

      <div className="composer-topbar-right">
        {onSaveDraft && (
          <button
            type="button"
            className="buffer-topbar-btn buffer-topbar-save-draft"
            disabled={busy}
            onClick={onSaveDraft}
            title="Lưu bản nháp vào kho nội dung"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <span>{busy ? "Saving…" : "Save Draft"}</span>
          </button>
        )}

        <button
          type="button"
          className="buffer-topbar-btn"
          title="Mẫu bài viết"
          onClick={() => {}}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span>Templates</span>
        </button>

        <button
          type="button"
          className="buffer-topbar-btn"
          title="Trợ lý AI viết bài"
          onClick={() => {}}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          </svg>
          <span>AI Assistant</span>
        </button>

        <span
          className="buffer-preview-badge is-active"
          title="Xem trước bài đăng"
          role="button"
          aria-label="Xem trước nội dung"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>Preview</span>
        </span>

        <button
          type="button"
          className="buffer-topbar-icon-btn buffer-topbar-close"
          onClick={onClose}
          title="Đóng (Esc)"
          aria-label="Đóng"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
