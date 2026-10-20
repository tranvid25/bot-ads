import React, { useState } from "react";
import { api } from "../lib/api";
import { Icon } from "./ui";
const newCampaign = () => ({
  name: "",
  mode: "manual",
  product: "",
  prompt: "",
  posts: [
    {
      id: crypto.randomUUID(),
      title: "Bài đầu tiên",
      content: "",
      assetId: "",
      selected: true,
    },
  ],
  autoGenerate: false,
  keywords: [],
  excludedKeywords: [],
  groupUrls: [],
  autoDiscover: true,
  autoJoin: true,
  policyMode: "exclude-prohibited",
  dailyLimit: 30,
  cooldownDays: 7,
  time: "09:00",
  weekdays: [1, 2, 3, 4, 5],
  timezone: "Asia/Ho_Chi_Minh",
  commentEnabled: false,
  commentUrl: "",
  commentText: "Bạn có thể xem thêm tại đây:",
  enabled: false,
});
export default function Editor({
  value,
  assets,
  meta,
  onClose,
  onSaved,
  onUpload,
}) {
  const [form, setForm] = useState(() =>
    structuredClone(value || newCampaign()),
  );
  const [step, setStep] = useState("content"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));
  const postSet = (index, key, val) =>
    setForm((prev) => ({
      ...prev,
      posts: prev.posts.map((p, i) => (i === index ? { ...p, [key]: val } : p)),
    }));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(
        form.id ? `/campaigns/${form.id}` : "/campaigns",
        form.id ? "PUT" : "POST",
        form,
      );
      await onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    setBusy(true);
    setError("");
    try {
      const result = await api("/generate", "POST", { ...form, count: 3 });
      set("posts", [
        ...form.posts.filter((p) => p.content.trim()),
        ...result.posts,
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        className="editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        <header className="editor-head">
          <div>
            <span className="eyebrow">THIẾT LẬP CHIẾN DỊCH</span>
            <h2 id="editor-title">
              {form.id ? "Chỉnh sửa chiến dịch" : "Một chiến dịch mới"}
            </h2>
          </div>
          <button className="icon-button" aria-label="Đóng" onClick={onClose}>
            ×
          </button>
        </header>
        <nav className="tabs">
          {[
            ["content", "01", "Nội dung"],
            ["audience", "02", "Nhóm mục tiêu"],
            ["schedule", "03", "Lịch & giới hạn"],
          ].map(([key, num, label]) => (
            <button
              key={key}
              className={step === key ? "active" : ""}
              onClick={() => setStep(key)}
            >
              <span>{num}</span>
              {label}
            </button>
          ))}
        </nav>
        <form onSubmit={save}>
          <div className="editor-body">
            <label>
              Tên chiến dịch
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ví dụ: Giới thiệu khóa giao tiếp tháng này"
                required
                maxLength={100}
              />
            </label>
            {step === "content" && (
              <>
                <div className="mode-options">
                  <button
                    type="button"
                    className={
                      form.mode === "manual" ? "mode selected" : "mode"
                    }
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
                    className={
                      form.mode === "gemini" ? "mode selected" : "mode"
                    }
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
                <div className="section-title">
                  <h3>
                    Bài viết của chiến dịch{" "}
                    <span>
                      {form.posts.filter((p) => p.selected && p.content).length}{" "}
                      đã chọn
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
                  Các bài được chọn sẽ luân phiên giữa các nhóm. Nội dung tự
                  soạn được giữ nguyên.
                </p>
                {form.posts.map((post, index) => (
                  <div className="post-editor" key={post.id}>
                    <div className="row between">
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={post.selected}
                          onChange={(e) =>
                            postSet(index, "selected", e.target.checked)
                          }
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
                      onChange={(e) =>
                        postSet(index, "content", e.target.value)
                      }
                      placeholder="Nội dung sẽ xuất hiện trên Facebook…"
                      rows={5}
                      maxLength={12000}
                    />
                    <div className="row">
                      <select
                        aria-label={`Ảnh bài ${index + 1}`}
                        value={post.assetId}
                        onChange={(e) =>
                          postSet(index, "assetId", e.target.value)
                        }
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
                <div className="soft-panel">
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={form.commentEnabled}
                      onChange={(e) => set("commentEnabled", e.target.checked)}
                    />
                    Bình luận kèm link dưới bài đã xác nhận
                  </label>
                  {form.commentEnabled && (
                    <>
                      <label>
                        Website
                        <input
                          type="url"
                          value={form.commentUrl}
                          onChange={(e) => set("commentUrl", e.target.value)}
                          placeholder="https://website-cua-ban.com"
                        />
                      </label>
                      <label>
                        Nội dung bình luận
                        <input
                          value={form.commentText}
                          onChange={(e) => set("commentText", e.target.value)}
                        />
                      </label>
                    </>
                  )}
                </div>
              </>
            )}
            {step === "audience" && (
              <>
                <label>
                  Từ khóa chủ đề, mỗi dòng một từ khóa
                  <textarea
                    rows={4}
                    value={form.keywords.join("\n")}
                    onChange={(e) =>
                      set("keywords", e.target.value.split("\n"))
                    }
                    placeholder={"học tiếng Anh\nluyện phát âm"}
                  />
                </label>
                <label>
                  Từ khóa loại trừ
                  <textarea
                    rows={2}
                    value={form.excludedKeywords.join("\n")}
                    onChange={(e) =>
                      set("excludedKeywords", e.target.value.split("\n"))
                    }
                    placeholder={"tuyển dụng\nbất động sản"}
                  />
                </label>
                <label>
                  Nhóm có sẵn, mỗi dòng một link{" "}
                  <small>Không bắt buộc khi bật tìm nhóm tự động.</small>
                  <textarea
                    rows={4}
                    value={form.groupUrls.join("\n")}
                    onChange={(e) =>
                      set("groupUrls", e.target.value.split("\n"))
                    }
                    placeholder="https://www.facebook.com/groups/…"
                  />
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={form.autoDiscover}
                    onChange={(e) => set("autoDiscover", e.target.checked)}
                  />
                  Tự tìm thêm nhóm theo từ khóa
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={form.autoJoin}
                    onChange={(e) => set("autoJoin", e.target.checked)}
                  />
                  Tự xin tham gia nhóm phù hợp
                </label>
                <label>
                  Cách kiểm tra nội quy
                  <select
                    value={form.policyMode}
                    onChange={(e) => set("policyMode", e.target.value)}
                  >
                    <option value="exclude-prohibited">
                      Loại nhóm có dấu hiệu cấm hoặc quảng cáo có điều kiện
                    </option>
                    <option value="explicit-permission">
                      Chỉ chọn nhóm có nội dung cho phép quảng cáo rõ ràng
                    </option>
                  </select>
                </label>
                <p className="hint">
                  Không phát hiện lệnh cấm không có nghĩa quản trị viên đã cấp
                  quyền. Nhóm chờ tham gia hoặc chờ duyệt có thể chưa đăng được.
                </p>
              </>
            )}
            {step === "schedule" && (
              <>
                <div className="field-grid">
                  <label>
                    Tối đa lượt gửi/ngày
                    <input
                      type="number"
                      min="1"
                      max={meta.maxDaily}
                      value={form.dailyLimit}
                      onChange={(e) =>
                        set("dailyLimit", Number(e.target.value))
                      }
                    />
                    <small>
                      Tùy chọn 30, 50 hoặc số khác, tối đa {meta.maxDaily}.
                    </small>
                  </label>
                  <label>
                    Nghỉ trước khi đăng lại nhóm (ngày)
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={form.cooldownDays}
                      onChange={(e) =>
                        set("cooldownDays", Number(e.target.value))
                      }
                    />
                  </label>
                </div>
                <label>
                  Giờ chạy — Việt Nam
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => set("time", e.target.value)}
                  />
                </label>
                <div className="weekdays">
                  {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day, i) => (
                    <button
                      type="button"
                      key={day}
                      className={form.weekdays.includes(i) ? "selected" : ""}
                      onClick={() =>
                        set(
                          "weekdays",
                          form.weekdays.includes(i)
                            ? form.weekdays.filter((d) => d !== i)
                            : [...form.weekdays, i],
                        )
                      }
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => set("enabled", e.target.checked)}
                  />
                  Bật lịch tự động sau khi lưu
                </label>
                <div className="notice">
                  <strong>Giới hạn là số lượt gửi tối đa.</strong>
                  <p>
                    Bài chờ duyệt và chưa xác nhận vẫn được tính vào hạn mức.
                    Tổng các chiến dịch còn chịu giới hạn chung của tài khoản.
                    Máy tính cần bật và ứng dụng cần kết nối.
                  </p>
                </div>
              </>
            )}
            {error && (
              <div className="alert error" role="alert">
                {error}
              </div>
            )}
          </div>
          <footer className="editor-footer">
            <span>
              {form.posts.filter((p) => p.selected && p.content).length} bài đã
              chọn · {form.dailyLimit} lượt/ngày
            </span>
            <button type="button" className="secondary" onClick={onClose}>
              Để sau
            </button>
            <button className="primary" disabled={busy}>
              {busy ? "Đang xử lý…" : "Lưu chiến dịch"}
              <Icon name="check" />
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
