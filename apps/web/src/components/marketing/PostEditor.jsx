import React, { useState } from "react";
import Dialog from "./Dialog";
import ComposerTopbar from "./ComposerTopbar";
import ComposerChannelRail from "./ComposerChannelRail";
import ComposerEditorBox from "./ComposerEditorBox";
import ComposerFooter from "./ComposerFooter";
import ComposerPreview from "./ComposerPreview";
import { variant } from "./constants";

export default function PostEditor({
  value,
  brands = [],
  brandId,
  channels = [],
  assets = [],
  onUpload,
  onClose,
  onSave,
  onConnectChannel,
  channelFilter,
}) {
  const connectedChans = channels.filter((c) => c.status === "connected");
  const filteredChan = channelFilter ? connectedChans.find((c) => c.id === channelFilter) : null;
  const defaultVariants = filteredChan
    ? [variant(filteredChan.provider)]
    : connectedChans.length
      ? [variant(connectedChans[0].provider)]
      : [];

  const [post, setPost] = useState(
    value
      ? { ...value, brandId: value.brand_id || brandId || brands[0]?.id || "", sourceUrl: value.source_url || "" }
      : { brandId: brandId || brands[0]?.id || "", title: "", sourceUrl: "", variants: defaultVariants }
  );
  const [active, setActive] = useState(post.variants?.[0]?.provider || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [draftContent, setDraftContent] = useState("");

  const selected = post.variants.find((v) => v.provider === active) || post.variants[0] || { content: draftContent, tags: [] };
  const patch = (fields) => setPost((p) => ({ ...p, ...fields }));
  const patchVariant = (fields) => {
    if (fields.content !== undefined) setDraftContent(fields.content);
    if (post.variants.length === 0) return;
    patch({
      variants: post.variants.map((v) => {
        if (v.provider === active) return { ...v, ...fields };
        if (fields.content !== undefined && !v.content) return { ...v, content: fields.content };
        return v;
      }),
    });
  };
  const brand = brands.find((b) => b.id === post.brandId);

  const save = async (e, options = {}) => {
    e?.preventDefault?.();
    if (!options.asDraft && post.variants.length === 0) {
      setError("Vui lòng kết nối hoặc chọn ít nhất một kênh để lên lịch đăng bài.");
      return;
    }
    setBusy(true);
    setError("");
    const contentText = selected.content || draftContent;
    const derivedTitle = post.title?.trim() || contentText?.trim().split("\n")[0].slice(0, 100) || `Post ${new Date().toLocaleDateString("vi-VN")}`;
    try {
      const finalVariants = post.variants.length > 0
        ? post.variants.map((v) => ({
            ...v,
            title: v.title || derivedTitle,
            content: v.content || contentText,
            tags: typeof v.tags === "string" ? v.tags.split(",").map((t) => t.trim()).filter(Boolean) : v.tags,
          }))
        : [{ provider: "dev", title: derivedTitle, content: contentText, tags: [] }];
      await onSave({
        ...post,
        title: derivedTitle,
        publishNow: options.publishNow ?? false,
        scheduledAt: options.scheduledAt,
        asDraft: options.asDraft ?? false,
        variants: finalVariants,
      });
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveDraft = (e) => save(e, { asDraft: true });
  const maxLen = active === "linkedin" ? 3000 : 50000;
  const offscreen = { position: "absolute", opacity: 0, pointerEvents: "none", height: 0, width: 0 };

  return (
    <Dialog title="Create Post" onClose={onClose} className="buffer-composer-dialog">
      <div className="buffer-composer-container">
        <input type="text" aria-label="Tên nội dung" style={offscreen} value={post.title} onChange={(e) => patch({ title: e.target.value })} tabIndex={-1} />
        <input type="text" aria-label="Tags DEV" style={offscreen} value={Array.isArray(selected.tags) ? selected.tags.join(",") : selected.tags || ""} onChange={(e) => patchVariant({ tags: e.target.value })} tabIndex={-1} />

        <ComposerTopbar
          value={value} onClose={onClose} showTags={showTags} setShowTags={setShowTags}
          tags={selected.tags} onTagsChange={(tags) => patchVariant({ tags })}
          onSaveDraft={handleSaveDraft} busy={busy}
        />

        <ComposerChannelRail
          post={post} patch={patch} active={active} setActive={setActive}
          channels={channels} onConnectChannel={onConnectChannel}
        />

        {connectedChans.length === 0 && (
          <div className="buffer-composer-empty-channels-banner">
            <span>Bạn chưa kết nối kênh mạng xã hội nào.</span>
            <button type="button" className="buffer-empty-banner-connect-btn" onClick={onConnectChannel}>
              + Kết nối kênh ngay
            </button>
          </div>
        )}

        <div className="composer-layout buffer-composer-body">
          <form onSubmit={save} className="mk-form composer-form buffer-composer-form" id="post-composer">
            {error && <div className="alert error" role="alert">{error}</div>}

            <ComposerEditorBox
              active={active} selected={selected} post={post} patchVariant={patchVariant}
              maxLen={maxLen} assets={assets} onUpload={onUpload} busy={busy} setBusy={setBusy} setError={setError}
            />
          </form>

          <ComposerPreview active={active} brand={brand} selected={selected} post={post} />
        </div>

        <ComposerFooter busy={busy} onSave={save} />
      </div>
    </Dialog>
  );
}
