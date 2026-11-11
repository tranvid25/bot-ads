import React, { useState } from "react";
import Dialog from "./Dialog";

export default function ConfirmModal({ confirm, onClose, onConfirm, busy }) {
  const [permalink, setPermalink] = useState("");

  if (!confirm) return null;

  return (
    <Dialog title="Xác nhận bằng link bài đã đăng" onClose={onClose}>
      <form
        className="mk-form"
        onSubmit={async (e) => {
          e.preventDefault();
          await onConfirm(permalink);
        }}
      >
        <p>
          Kiểm tra đúng tài khoản và nội dung trên nền tảng trước khi xác nhận.
          Hệ thống không tự gửi lại bài chưa rõ kết quả.
        </p>
        <label>
          Permalink bài viết
          <input
            required
            type="url"
            value={permalink}
            onChange={(e) => setPermalink(e.target.value)}
          />
        </label>
        <button className="primary" disabled={busy}>
          Ghi nhận tôi đã đăng
        </button>
      </form>
    </Dialog>
  );
}

