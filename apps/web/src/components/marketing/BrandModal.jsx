import React from "react";
import Dialog from "./Dialog";

export default function BrandModal({ brandForm, setBrandForm, onSave, busy }) {
  if (!brandForm) return null;

  return (
    <Dialog title="Thêm thương hiệu / website" onClose={() => setBrandForm(null)}>
      <form
        className="mk-form"
        onSubmit={async (e) => {
          e.preventDefault();
          await onSave(brandForm);
        }}
      >
        <label>
          Tên thương hiệu
          <input
            required
            maxLength={100}
            value={brandForm.name}
            onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
          />
        </label>
        <label>
          Website HTTPS
          <input
            required
            type="url"
            value={brandForm.website}
            onChange={(e) => setBrandForm({ ...brandForm, website: e.target.value })}
            placeholder="https://xaywebsite.com"
          />
        </label>
        <label>
          Khách hàng mục tiêu
          <textarea
            maxLength={2000}
            rows={3}
            value={brandForm.audience}
            onChange={(e) => setBrandForm({ ...brandForm, audience: e.target.value })}
          />
        </label>
        <label>
          Ngôn ngữ nội dung
          <input
            maxLength={30}
            value={brandForm.language}
            onChange={(e) => setBrandForm({ ...brandForm, language: e.target.value })}
          />
        </label>
        <label>
          Link CTA / liên hệ (tùy chọn)
          <input
            type="url"
            value={brandForm.ctaUrl}
            onChange={(e) => setBrandForm({ ...brandForm, ctaUrl: e.target.value })}
          />
        </label>
        <button className="primary" disabled={busy}>
          Lưu thương hiệu
        </button>
      </form>
    </Dialog>
  );
}

