import React, { useState } from "react";
import { CHANNEL_CATALOG } from "./channelCatalog";
import MetaConnectView from "./MetaConnectView";

export default function ConnectChannelModal({
  isOpen,
  onClose,
  channels = [],
  onConnectChannel,
  busy = false,
  error = "",
}) {
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [accountInput, setAccountInput] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [redirectingKey, setRedirectingKey] = useState(null);

  if (!isOpen) return null;

  const connectedMap = new Map();
  channels.forEach((c) => {
    if (c.status === "connected") connectedMap.set(c.provider, c);
  });

  const handleClose = () => {
    setSelectedChannel(null);
    setRedirectingKey(null);
    onClose();
  };

  async function handleCardClick(ch) {
    if (connectedMap.has(ch.key) || busy || redirectingKey) return;
    if (
      ch.authType === "oauth" ||
      ch.key === "linkedin" ||
      ch.key === "bluesky"
    ) {
      setRedirectingKey(ch.key);
      try {
        await onConnectChannel({ provider: ch.key });
      } finally {
        setRedirectingKey(null);
      }
      return;
    }
    setSelectedChannel(ch);
  }

  async function handleConnectSubmit(e) {
    e.preventDefault();
    if (!selectedChannel) return;
    const nameVal = accountInput.trim() || `@${selectedChannel.key}_creator`;
    await onConnectChannel({
      provider: selectedChannel.key,
      name: nameVal,
      apiKey: apiKeyInput.trim(),
    });
    setSelectedChannel(null);
    setAccountInput("");
    setApiKeyInput("");
  }

  return (
    <div className="buffer-connect-modal-backdrop" onClick={handleClose}>
      <div
        className="buffer-connect-modal-content"
        role="dialog"
        aria-modal="true"
        aria-label="Connect a New Channel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="buffer-connect-modal-header">
          <h2>Connect a New Channel</h2>
          <button
            type="button"
            className="buffer-connect-close-btn"
            onClick={handleClose}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {error && <div className="alert error" role="alert">{error}</div>}
        {selectedChannel ? (
          selectedChannel.isMeta ? (
            <MetaConnectView
              selectedChannel={selectedChannel}
              onBack={() => setSelectedChannel(null)}
              onConnect={async (d) => {
                await onConnectChannel(d);
                setSelectedChannel(null);
              }}
              busy={busy}
            />
          ) : (
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

              <form
                onSubmit={handleConnectSubmit}
                className="connect-fields-form"
              >
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
                    <small>
                      Lấy API Key trong Settings → Extensions trên DEV.to.
                    </small>
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
          )
        ) : (
          <div className="buffer-channel-grid">
            {CHANNEL_CATALOG.map((ch) => {
              const connected = connectedMap.get(ch.key);
              const isRedirecting = redirectingKey === ch.key;
              return (
                <div
                  key={ch.key}
                  className={`channel-grid-card ${connected ? "is-connected" : ""} ${isRedirecting ? "is-redirecting" : ""}`}
                  onClick={() => handleCardClick(ch)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCardClick(ch);
                  }}
                  title={
                    connected
                      ? `Đã kết nối (${connected.name})`
                      : isRedirecting
                        ? `Đang chuyển hướng sang ${ch.name}…`
                        : `Bấm để kết nối ${ch.name}`
                  }
                >
                  {ch.info && (
                    <span className="channel-card-info-icon" title="Thông tin">
                      ⓘ
                    </span>
                  )}
                  {connected && (
                    <span className="channel-card-tick-badge">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Đã kết nối</span>
                    </span>
                  )}
                  {isRedirecting && (
                    <span
                      className="channel-card-tick-badge"
                      style={{
                        background: "var(--buffer-lime)",
                        color: "#123818",
                      }}
                    >
                      <span>Đang chuyển hướng…</span>
                    </span>
                  )}

                  <div
                    className="channel-card-icon-box"
                    style={{ background: ch.bg }}
                  >
                    {ch.icon}
                  </div>
                  <strong className="channel-card-title">{ch.name}</strong>
                  <span className="channel-card-desc">
                    {connected
                      ? `✓ ${connected.name}`
                      : isRedirecting
                        ? `Đang mở trang cấp quyền ${ch.name}…`
                        : ch.desc}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
