import React from "react";
import { Icon } from "../ui";
export default function CampaignPosts({
  form,
  set,
  postSet,
  assets,
  setBusy,
  setError,
  onUpload,
}) {
  return (
    <>
      <div className="section-title">
        <h3>
          Bài viết của chiến dịch{" "}
          <span>
            {form.posts.filter((p) => p.selected && p.content).length} đã chọn
          </span>
        </h3>
        <button
          type="button"
          className="link"
          onClick={() =>
            set("posts", [
              ...form.posts,
              {
                id: crypto.randomUUID(),
                title: `Bài ${form.posts.length + 1}`,
                content: "",
                assetId: "",
                selected: true,
              },
            ])
          }
        >
          + Thêm bài
        </button>
      </div>
      <p className="hint">
        Các bài được chọn sẽ luân phiên giữa các nhóm. Nội dung tự soạn được giữ
        nguyên.
      </p>
      {form.posts.map((post, index) => (
        <div className="post-editor" key={post.id}>
          <div className="row between">
            <label className="check">
              <input
                type="checkbox"
                checked={post.selected}
                onChange={(e) => postSet(index, "selected", e.target.checked)}
              />
              Dùng bài này
            </label>
            <button
              type="button"
              className="link danger"
              onClick={() =>
                set(
                  "posts",
                  form.posts.filter((_, i) => i !== index),
                )
              }
            >
              Xóa bài
            </button>
          </div>
          <input
            aria-label={`Tiêu đề bài ${index + 1}`}
            value={post.title}
            onChange={(e) => postSet(index, "title", e.target.value)}
            placeholder="Tên bài để dễ quản lý"
          />
          <textarea
            aria-label={`Nội dung bài ${index + 1}`}
            value={post.content}
            onChange={(e) => postSet(index, "content", e.target.value)}
            placeholder="Nội dung sẽ xuất hiện trên Facebook…"
            rows={5}
            maxLength={12000}
          />
          <div className="row">
            <select
              aria-label={`Ảnh bài ${index + 1}`}
              value={post.assetId}
              onChange={(e) => postSet(index, "assetId", e.target.value)}
            >
              <option value="">Không đính kèm ảnh</option>
              {assets.map((a) => (
                <option value={a.id} key={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <label className="upload-button">
              + Tải ảnh
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setBusy(true);
                    try {
                      const asset = await onUpload(file);
                      postSet(index, "assetId", asset.id);
                    } catch (e) {
                      setError(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }
                }}
              />
            </label>
          </div>
          {post.assetId && (
            <img
              className="post-image"
              src={`/api/assets/${post.assetId}`}
              alt="Ảnh đính kèm"
            />
          )}
        </div>
      ))}
    </>
  );
}
