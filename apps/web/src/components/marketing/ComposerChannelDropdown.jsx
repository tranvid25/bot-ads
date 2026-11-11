import React, { useState } from "react";
import { ChannelMark } from "../PublishingViews";
import { providers } from "./constants";

export default function ComposerChannelDropdown({
  channels = [],
  selectedProviders = [],
  onToggleChannel,
  onSelectAll,
  onDeselectAll,
  onConnectNewChannel,
  onClose,
}) {
  const [search, setSearch] = useState("");

  const connectedChannels = channels.filter((c) => c.status === "connected");
  const filtered = connectedChannels.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = (c.name || "").toLowerCase().includes(q);
    const provMatch = (providers[c.provider] || c.provider).toLowerCase().includes(q);
    return nameMatch || provMatch;
  });

  const allSelected =
    connectedChannels.length > 0 &&
    connectedChannels.every((c) => selectedProviders.includes(c.provider));

  return (
    <div
      className="buffer-channel-popover"
      role="dialog"
      aria-label="Search and select channels"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="channel-popover-search">
        <svg
          className="popover-search-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search channels"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      <div className="channel-popover-header">
        <span className="channels-label">Channels</span>
        {connectedChannels.length > 0 && (
          <button
            type="button"
            className="channel-select-toggle-btn"
            onClick={allSelected ? onDeselectAll : onSelectAll}
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        )}
      </div>

      <div className="channel-popover-list">
        {filtered.length === 0 ? (
          <div className="channel-popover-empty">
            {connectedChannels.length === 0
              ? "Chưa có kênh kết nối nào."
              : "Không tìm thấy kênh phù hợp."}
          </div>
        ) : (
          filtered.map((c) => {
            const isSelected = selectedProviders.includes(c.provider);
            return (
              <div
                key={c.id}
                className={`channel-popover-item ${isSelected ? "is-selected" : ""}`}
                onClick={() => onToggleChannel(c.provider)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onToggleChannel(c.provider);
                  }
                }}
              >
                <div className="channel-popover-avatar-wrap">
                  {c.avatar_url ? (
                    <img
                      src={c.avatar_url}
                      alt={c.name}
                      className="channel-popover-avatar"
                    />
                  ) : (
                    <div className="channel-popover-avatar-fallback">
                      {(c.name || c.provider)[0].toUpperCase()}
                    </div>
                  )}
                  <div className="channel-popover-badge">
                    <ChannelMark provider={c.provider} size="mini" />
                  </div>
                </div>
                <span className="channel-popover-name">{c.name}</span>
                <div
                  className={`channel-popover-check ${isSelected ? "checked" : ""}`}
                  aria-checked={isSelected}
                  role="checkbox"
                >
                  {isSelected && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="channel-popover-footer">
        <button
          type="button"
          className="channel-popover-connect-btn"
          onClick={() => {
            onClose();
            onConnectNewChannel?.();
          }}
        >
          <span className="plus-box">+</span>
          <span>Connect a Channel</span>
        </button>
      </div>
    </div>
  );
}

