import React from "react";
export default function ChannelConnectionForm({
  selectedChannel,
  setSelectedChannel,
  accountInput,
  setAccountInput,
  apiKeyInput,
  setApiKeyInput,
  handleConnectSubmit,
  busy,
}) {
  return (
    <div className="buffer-connect-inline-form">
      <button
        type="button"
        className="buffer-connect-back-btn"
        onClick={() => setSelectedChannel(null)}
      >
        ← Quay lại danh sách kênh
      </button>
      <div className="inline-form-target-header">
        <div
          className="target-icon-wrap"
          style={{ background: selectedChannel.bg }}
        >
          {selectedChannel.icon}
        </div>
        <div>
          <h3>Kết nối {selectedChannel.name}</h3>
          <p>{selectedChannel.desc}</p>
        </div>
      </div>

      <form onSubmit={handleConnectSubmit} className="connect-fields-form">
        {selectedChannel.key === "bluesky" ? (
          <>
            <label>
              <span>Handle Bluesky (Tên tài khoản)</span>
              <input
                type="text"
                placeholder="vd: username.bsky.social"
                value={accountInput}
                onChange={(e) => setAccountInput(e.target.value)}
                required
                autoFocus
              />
            </label>
            <label style={{ marginTop: "10px" }}>
              <span>Mật khẩu ứng dụng (App Password)</span>
              <input
                type="password"
                placeholder="xxxx-xxxx-xxxx-xxxx"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                required
              />
            </label>
          </>
        ) : selectedChannel.key === "dev" ? (
          <label>
            <span>DEV.to API Key</span>
            <input
              type="password"
              placeholder="api_key_..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              required
              autoFocus
            />
            <small>Lấy API Key trong Settings → Extensions trên DEV.to.</small>
          </label>
        ) : (
          <label>
            <span>Tên tài khoản hoặc Handle</span>
            <input
              type="text"
              placeholder={`vd: @my_${selectedChannel.key}_account`}
              value={accountInput}
              onChange={(e) => setAccountInput(e.target.value)}
              required
              autoFocus
            />
            <small>Tên nhận diện tài khoản trên BotSalesOra.</small>
          </label>
        )}

        <div className="inline-form-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={() => setSelectedChannel(null)}
          >
            Hủy
          </button>
          <button type="submit" className="confirm-btn" disabled={busy}>
            {busy ? "Đang kết nối…" : `Kết nối ${selectedChannel.name}`}
          </button>
        </div>
      </form>
    </div>
  );
}
