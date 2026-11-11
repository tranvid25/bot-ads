import React, { useState } from "react";

export default function MetaConnectView({
  selectedChannel,
  onBack,
  onConnect,
  busy = false,
}) {
  const [nameInput, setNameInput] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const defaultName = `@${selectedChannel.key}_bot`;
    await onConnect({
      provider: selectedChannel.key,
      name: nameInput.trim() || defaultName,
      apiKey: "",
    });
  };

  return (
    <div className="buffer-connect-inline-form meta-connect-view">
      <button type="button" className="buffer-connect-back-btn" onClick={onBack}>
        ← Quay lại danh sách kênh
      </button>

      <div className="inline-form-target-header">
        <div className="target-icon-wrap" style={{ background: selectedChannel.bg }}>
          {selectedChannel.icon}
        </div>
        <div>
          <h3>Kết nối {selectedChannel.name} (Desktop Bot)</h3>
          <p>Tự động 100% qua phần mềm BotAds Companion cài trên máy tính</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="connect-fields-form" style={{ marginTop: "16px" }}>
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "12px 14px", marginBottom: "16px", fontSize: "13px", color: "#1e40af", lineHeight: "1.5" }}>
          <strong>🖥️ Tự động qua App máy tính:</strong> Dành cho {selectedChannel.name} tự động đăng bài, quản lý Profile hoặc Group bằng IP mạng máy tính của bạn để đảm bảo an toàn tuyệt đối cho tài khoản.
        </div>

        <div style={{ marginBottom: "18px", textAlign: "center", background: "var(--buffer-surface-elevated, #1f2228)", padding: "12px", borderRadius: "8px", border: "1px solid var(--buffer-line, #282b33)" }}>
          <p style={{ margin: "0 0 8px 0", fontSize: "12.5px", color: "var(--buffer-text-secondary, #9ca3af)" }}>
            Nếu chưa cài app, bạn hãy tải về và cài đặt trên máy tính:
          </p>
          <a
            href="https://github.com/tranvid25/bot-ads/releases/download/v1.0.0/BotAds-Setup-1.0.0.exe"
            download
            target="_blank"
            rel="noreferrer"
            className="confirm-btn"
            style={{ display: "inline-block", textDecoration: "none", padding: "8px 18px", fontSize: "13px" }}
          >
            📥 Tải BotAds Companion (.exe)
          </a>
        </div>

        <label>
          <span>Tên hiển thị hoặc link Profile / Group quản lý</span>
          <input
            type="text"
            placeholder={`vd: https://${selectedChannel.key}.com/shopcuatoi hoặc Tên Nick`}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            required
            autoFocus
          />
          <small>Dùng để nhận diện kênh khi lên lịch bài viết.</small>
        </label>

        <div className="inline-form-actions" style={{ marginTop: "18px" }}>
          <button type="button" className="cancel-btn" onClick={onBack}>Hủy</button>
          <button type="submit" className="confirm-btn" disabled={busy}>
            {busy ? "Đang kết nối…" : `🖥️ Kết nối ${selectedChannel.name}`}
          </button>
        </div>
      </form>
    </div>
  );
}
