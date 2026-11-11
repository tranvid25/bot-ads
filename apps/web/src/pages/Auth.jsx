import React, { useEffect, useState } from "react";
import { googleAuthErrors } from "../../../../packages/contracts/google-auth.mjs";
import { api } from "../lib/api";
import { Brand, Icon } from "../components/ui";
import LegalLinks from "../components/LegalLinks";
export default function Auth({ onLogin, meta }) {
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const url = new URL(window.location.href);
    const result = url.searchParams.get("google_auth");
    const avatar = url.searchParams.get("avatar");
    if (avatar) {
      try {
        localStorage.setItem("user_avatar", avatar);
      } catch {}
      url.searchParams.delete("avatar");
    }
    if (result) {
      if (!["success", "linked"].includes(result))
        setError(
          Object.hasOwn(googleAuthErrors, result)
            ? googleAuthErrors[result]
            : googleAuthErrors.failed,
        );
      url.searchParams.delete("google_auth");
      window.history.replaceState(
        null,
        "",
        url.pathname + url.search + url.hash,
      );
    }
  }, []);
  async function google() {
    setBusy(true);
    setError("");
    try {
      const result = await api("/auth/google/start", "POST", {
        mode: "signin",
      });
      window.location.assign(result.url);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
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
          <button
            type="button"
            className="google-signin"
            onClick={google}
            disabled={busy || !meta.googleAvailable}
          >
            <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"
              />
              <path
                fill="#34A853"
                d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22Z"
              />
              <path
                fill="#FBBC05"
                d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.06a10 10 0 0 0 0 9.02Z"
              />
              <path
                fill="#EA4335"
                d="M12 5.96c1.47 0 2.79.51 3.82 1.52l2.87-2.87A9.58 9.58 0 0 0 12 2a10 10 0 0 0-8.94 5.49l3.35 2.59A5.99 5.99 0 0 1 12 5.96Z"
              />
            </svg>
            Tiếp tục với Google
          </button>
          {!meta.googleAvailable && (
            <small className="google-setup-note">
              Đăng nhập Google chưa được cấu hình trên máy chủ này.
            </small>
          )}
          <div className="auth-divider">
            <span>hoặc dùng email</span>
          </div>
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
