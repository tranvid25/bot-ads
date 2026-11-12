import React from "react";
import { Icon } from "../ui";
export default function CampaignContentMode({
  form,
  set,
  meta,
  busy,
  generate,
}) {
  return (
    <>
      <div className="mode-options">
        <button
          type="button"
          className={form.mode === "manual" ? "mode selected" : "mode"}
          onClick={() => {
            set("mode", "manual");
            set("autoGenerate", false);
          }}
        >
          <Icon name="campaign" />
          <strong>Tôi có bài viết</strong>
          <small>Soạn, chọn bài và ảnh của bạn</small>
        </button>
        <button
          type="button"
          className={form.mode === "gemini" ? "mode selected" : "mode"}
          onClick={() => set("mode", "gemini")}
        >
          <Icon name="spark" />
          <strong>Nhờ Gemini viết</strong>
          <small>Mô tả ý tưởng, nhận bản nháp</small>
        </button>
      </div>
      {form.mode === "gemini" && (
        <div className="ai-box">
          <label>
            Sản phẩm hoặc dịch vụ
            <textarea
              value={form.product}
              onChange={(e) => set("product", e.target.value)}
              placeholder="Mô tả đúng tính năng, lợi ích và đối tượng sử dụng…"
              rows={2}
            />
          </label>
          <label>
            Bạn muốn bài viết như thế nào?
            <textarea
              value={form.prompt}
              onChange={(e) => set("prompt", e.target.value)}
              placeholder="Viết bằng tiếng Việt, giọng gần gũi, khoảng 150 từ. Giới thiệu…"
              rows={3}
            />
          </label>
          <div className="row">
            <button
              type="button"
              className="secondary"
              onClick={generate}
              disabled={busy || !meta.aiAvailable}
            >
              <Icon name="spark" />
              {busy ? "Gemini đang viết…" : "Tạo 3 bản nháp"}
            </button>
            <small>
              {meta.aiAvailable
                ? "Bạn có thể sửa và chọn bài trước khi chạy."
                : "Chủ website chưa bật Gemini. Bạn vẫn tự soạn được."}
            </small>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={form.autoGenerate}
              onChange={(e) => set("autoGenerate", e.target.checked)}
              disabled={!meta.aiAvailable}
            />
            Tự tạo bài mới mỗi lượt chạy theo yêu cầu này
          </label>
        </div>
      )}
    </>
  );
}
