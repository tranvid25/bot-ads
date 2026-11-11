import React from "react";
import { ChannelMark } from "../PublishingViews";
import { manual } from "./constants";

export default function ComposerEditorBox({
  active,
  selected = { content: "", tags: [] },
  post,
  patchVariant,
  maxLen,
  assets,
  onUpload,
  busy,
  setBusy,
  setError,
}) {
  const sel = selected || { content: "", tags: [] };
  return (
    <div className="buffer-editor-box">
      <div className="buffer-editor-header">
        <div className="editor-channel-badge">
          {active ? (
            <ChannelMark provider={active} />
          ) : (
            <span className="editor-empty-platform-icon">🌐</span>
          )}
          <span className="editor-prompt-text">
            Start writing or get inspired with <strong>📑 Templates</strong>
          </span>
        </div>
      </div>

      <div className="buffer-editor-content-area">
        <textarea
          required
          rows={6}
          aria-label="Nội dung bài viết"
          placeholder="Start writing or get inspired with 📑 Templates…"
          maxLength={maxLen}
          value={sel.content || ""}
          onChange={(e) => patchVariant({ content: e.target.value })}
          className="buffer-content-textarea"
        />

        <div className="buffer-media-section">
          {!sel.assetId ? (
            <div className="buffer-media-dropzone">
              <div className="dropzone-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <div className="dropzone-text">
                <span>Drag & drop or </span>
                <label className="dropzone-link" style={{ cursor: "pointer" }}>
                  select a file
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy}
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setBusy(true);
                      try {
                        const result = await onUpload(file);
                        patchVariant({ assetId: result.id, publicImageConsent: true });
                      } catch (err) {
                        setError(err.message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="buffer-selected-media-preview">
              <img className="mk-image" alt="Ảnh đính kèm" src={`/api/assets/${selected.assetId}`} />
              <button
                type="button"
                className="buffer-remove-media-btn"
                onClick={() => patchVariant({ assetId: "", publicImageConsent: false })}
                title="Xóa ảnh này"
                aria-label="Xóa ảnh"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="buffer-editor-toolbar-strip">
        <div className="strip-left-tools">
          <button type="button" className="strip-tool-btn" title="Chèn thêm">+ ▾</button>
          <button type="button" className="strip-tool-btn" title="Biểu tượng cảm xúc">😊</button>
          <button type="button" className="strip-tool-btn" title="Chèn hashtag">#</button>
          <button type="button" className="strip-tool-btn" title="Trợ lý AI viết bài">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
          </button>
        </div>
        <div className="strip-right-tools">
          <span className="strip-counter-badge">
            {maxLen - (sel.content?.length || 0)}
          </span>
        </div>
      </div>

      <div className="buffer-first-comment-row">
        <span className="first-comment-label">First Comment</span>
        <div className="first-comment-input-wrap">
          <input
            placeholder="Your comment"
            className="first-comment-input"
            value={sel.firstComment || ""}
            onChange={(e) => patchVariant({ firstComment: e.target.value })}
          />
          <button
            type="button"
            className="first-comment-bolt-btn"
            title="Tự động đăng bình luận đầu tiên"
            aria-label="Tự động bình luận đầu tiên"
          >
            ⚡
          </button>
        </div>
      </div>
    </div>
  );
}
