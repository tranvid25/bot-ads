import React from "react";
import { providers, manual } from "./constants";

export default function ChannelAccountForm({
  connection,
  setConnection,
  capabilities,
  onSubmit,
  busy,
}) {
  return (
    <section className="panel mk-form" id="mk-channel-form">
      <h2>Kết nối tài khoản</h2>
      <form className="mk-form" onSubmit={onSubmit}>
        <label>
          Nền tảng
          <select
            value={connection.provider}
            onChange={(e) =>
              setConnection({
                provider: e.target.value,
                name: "",
                apiKey: "",
              })
            }
          >
            {Object.entries(providers).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
                {manual.includes(k) ? " · thủ công" : " · API"}
              </option>
            ))}
          </select>
        </label>
        {connection.provider === "dev" && (
          <>
            <label>
              API key DEV
              <input
                type="password"
                required
                autoComplete="off"
                value={connection.apiKey}
                onChange={(e) =>
                  setConnection({ ...connection, apiKey: e.target.value })
                }
              />
            </label>
            <small>
              Tạo key trong{" "}
              <a
                href="https://dev.to/settings/extensions"
                target="_blank"
                rel="noreferrer"
              >
                DEV → Settings → Extensions
              </a>
              . Key được kiểm tra và mã hóa trên server.
            </small>
            {!capabilities.dev && (
              <p className="notice">
                Chủ hệ thống cần cấu hình khóa bảo vệ kết nối và PUBLIC_APP_URL
                trước.
              </p>
            )}
          </>
        )}
        {connection.provider === "linkedin" && (
          <p className="notice">
            {capabilities.linkedin
              ? "Bạn sẽ sang LinkedIn để cấp quyền đăng cho tài khoản cá nhân. Không nhập mật khẩu LinkedIn vào BotAds."
              : "LinkedIn chưa được chủ hệ thống cấu hình. Cần Developer App có Share on LinkedIn và Sign In with LinkedIn using OpenID Connect; xem hướng dẫn triển khai."}
          </p>
        )}
        {manual.includes(connection.provider) && (
          <>
            <label>
              Tên tài khoản để dễ nhận biết
              <input
                required
                maxLength={100}
                value={connection.name}
                onChange={(e) =>
                  setConnection({ ...connection, name: e.target.value })
                }
              />
            </label>
            <p className="notice">
              Đây là tài khoản được ghi nhận để tổ chức công việc. BotAds không
              nhận mật khẩu, không tự đăng hoặc đọc dữ liệu của kênh này.
            </p>
          </>
        )}
        <button
          className="primary"
          disabled={
            busy ||
            (!manual.includes(connection.provider) &&
              !capabilities[connection.provider])
          }
        >
          {connection.provider === "linkedin"
            ? "Kết nối qua LinkedIn"
            : "Thêm tài khoản"}
        </button>
      </form>
    </section>
  );
}

