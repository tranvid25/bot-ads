import React from "react";
import Dialog from "./Dialog";

export default function NotPostedModal({ notPosted, setNotPosted, onSave, busy, error }) {
  if (!notPosted) return null;

  return (
    <Dialog
      title="Xác nhận bài chưa được đăng"
      error={error}
      onClose={() => setNotPosted(null)}
    >
      <form
        className="mk-form"
        onSubmit={async (e) => {
          e.preventDefault();
          await onSave(notPosted);
        }}
      >
        <p>
          Chỉ dùng sau khi bạn kiểm tra trực tiếp đúng tài khoản trên nền tảng.
          Nếu bài đã được nhận hoặc chưa chắc chắn, giữ trạng thái chưa rõ để
          tránh gửi trùng.
        </p>
        <label>
          Bạn đã kiểm tra những gì?
          <textarea
            required
            minLength={10}
            maxLength={1000}
            rows={3}
            value={notPosted.note}
            onChange={(e) =>
              setNotPosted({ ...notPosted, note: e.target.value })
            }
          />
        </label>
        <label className="mk-check">
          <input
            required
            type="checkbox"
            checked={notPosted.checked}
            onChange={(e) =>
              setNotPosted({ ...notPosted, checked: e.target.checked })
            }
          />
          Tôi đã kiểm tra trực tiếp và xác nhận bài chưa được đăng.
        </label>
        <button className="primary" disabled={busy || !notPosted.checked}>
          Lưu xác nhận, chưa gửi lại
        </button>
      </form>
    </Dialog>
  );
}

