import CampaignContent from "./facebook/CampaignContent";
import CampaignAudience from "./facebook/CampaignAudience";
import CampaignSchedule from "./facebook/CampaignSchedule";
import React, { useState } from "react";
import { api } from "../lib/api";
import { Icon } from "./ui";
import useCampaignEditor from "./facebook/useCampaignEditor";
export default function Editor(props) {
  const { assets, meta, onClose, onUpload } = props;
  const {
    form,
    setForm,
    step,
    setStep,
    busy,
    setBusy,
    error,
    setError,
    set,
    postSet,
    save,
    generate,
  } = useCampaignEditor(props);
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
              <CampaignContent
                form={form}
                set={set}
                postSet={postSet}
                assets={assets}
                meta={meta}
                busy={busy}
                setBusy={setBusy}
                setError={setError}
                generate={generate}
                onUpload={onUpload}
              />
            )}
            {step === "audience" && <CampaignAudience form={form} set={set} />}
            {step === "schedule" && (
              <CampaignSchedule form={form} set={set} meta={meta} />
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
