import React from "react";
import { useApp } from "./AppContext";
export default function SidebarQuickConnect() {
  const { setShowConnectChannelModal } = useApp();
  return (
    <div className="buffer-connect-more-box">
      <span className="connect-more-title">Connect more channels</span>
      <div className="connect-more-icons">
        <button
          type="button"
          className="connect-badge-btn instagram"
          title="Instagram"
          onClick={() => setShowConnectChannelModal(true)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
        </button>
        <button
          type="button"
          className="connect-badge-btn threads"
          title="Threads"
          onClick={() => setShowConnectChannelModal(true)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
          </svg>
        </button>
        <button
          type="button"
          className="connect-badge-btn bluesky"
          title="Bluesky"
          onClick={() => setShowConnectChannelModal(true)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 10.8c-1.08-2.08-3.08-5.3-5.5-6.8C3.8 2.2 2 3.1 2 5.5c0 1.2.6 6.3 1 7.4 1.4 3.7 4.5 4.6 7 4.1-3.6 1.8-6.9 4.3-3.6 8 3.8 4.3 5.6-2.5 5.6-2.5s1.8 6.8 5.6 2.5c3.3-3.7 0-6.2-3.6-8 2.5.5 5.6-.4 7-4.1.4-1.1 1-6.2 1-7.4 0-2.4-1.8-3.3-4.5-1.5-2.42 1.5-4.42 4.72-5.5 6.8z" />
          </svg>
        </button>
        <button
          type="button"
          className="connect-badge-btn add"
          title="Kết nối kênh mới"
          onClick={() => setShowConnectChannelModal(true)}
        >
          +
        </button>
      </div>
    </div>
  );
}
