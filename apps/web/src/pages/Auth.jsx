import React, { useState } from "react";
import { api } from "../lib/api";
import { Brand, Icon } from "../components/ui";
import LegalLinks from "../components/LegalLinks";
export default function Auth({ onLogin, meta }) {
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(
        `/auth/${register ? "register" : "login"}`,
        "POST",
        Object.fromEntries(new FormData(e.target)),
      );
      await onLogin();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-shell">
      <section className="auth-story">
        <Brand />
        <div>
          <span className="eyebrow">ÍT THAO TÁC HƠN. NHIỀU CHỦ ĐỘNG HƠN.</span>
          <h1>
            Nội dung của bạn.
            <br />
            Lịch trình của bạn.
          </h1>
          <p>
            Một nơi để chuẩn bị bài tự soạn, kết nối tài khoản kênh và theo dõi
            từng lượt đăng marketing.
          </p>
          <div className="story-flow">
            <span>01 · Chọn nội dung</span>
            <span>02 · Kết nối kênh</span>
            <span>03 · Bật lịch chạy</span>
          </div>
        </div>
        <small>
          LinkedIn/DEV chạy qua API. Facebook dùng ứng dụng trên máy tính.
        </small>
      </section>
      <section className="auth-form">
        <div className="auth-box">
          <span className="eyebrow">KHÔNG GIAN LÀM VIỆC BOTADS</span>
          <h2>{register ? "Bắt đầu cùng BotAds" : "Chào bạn trở lại"}</h2>
          <p>
            {register
              ? "Tạo tài khoản để chuẩn bị chiến dịch đầu tiên."
              : "Đăng nhập để tiếp tục các chiến dịch của bạn."}
          </p>
          <form onSubmit={submit}>
            {register && (
              <label>
                Tên của bạn
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={80}
                />
              </label>
            )}
            <label>
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Mật khẩu
              <input
                name="password"
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete={register ? "new-password" : "current-password"}
                placeholder="Ít nhất 12 ký tự"
                required
              />
            </label>
            {error && (
              <div className="alert error" role="alert">
                {error}
              </div>
            )}
            <button className="primary wide" disabled={busy}>
              {busy ? "Đang xử lý…" : register ? "Tạo tài khoản" : "Đăng nhập"}
              <Icon name="arrow" />
            </button>
          </form>
          <p className="auth-switch">
            {register ? "Bạn đã có tài khoản?" : "Bạn mới sử dụng?"}{" "}
            <button
              className="link"
              onClick={() => {
                setRegister(!register);
                setError("");
              }}
              disabled={!register && !meta.registrationOpen}
            >
              {register ? "Đăng nhập" : "Đăng ký"}
            </button>
          </p>
          <small>
            Khi đăng ký, bạn đồng ý với <a href="/terms">Điều khoản sử dụng</a>.
            Xem <a href="/privacy">Chính sách quyền riêng tư</a> để hiểu cách dữ
            liệu được xử lý.
          </small>
          <LegalLinks />
        </div>
      </section>
    </div>
  );
}
