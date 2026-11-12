import SidebarQuickConnect from "./SidebarQuickConnect";
import React from "react";
import { Icon } from "../ui";
import { ChannelMark } from "../PublishingViews";
import { useApp } from "./AppContext";
export default function SidebarChannels() {
  const {
    setPage,
    setShowConnectChannelModal,
    marketingData,
    marketingNavigation,
    setMarketingNavigation,
  } = useApp();
  return (
    <div className="sidebar-channels buffer-sidebar-channels-tree">
      <div className="sidebar-channel-heading">
        <span className="channel-heading-label">Channels</span>
        <div className="channel-heading-actions">
          <button
            type="button"
            className="channel-gear-btn"
            aria-label="Cài đặt"
            title="Cài đặt"
            onClick={() => setPage("settings")}
          >
            <Icon name="settings" size={15} />
          </button>
          <button
            type="button"
            className="channel-add-action-btn"
            aria-label="Kết nối thêm kênh"
            title="Thêm kênh mới"
            onClick={() => setShowConnectChannelModal(true)}
          >
            <Icon name="plus" size={15} />
          </button>
        </div>
      </div>

      <div className="buffer-channels-tree-list">
        {marketingData?.channels
          .filter((c) => c.status !== "disconnected")
          .map((c) => {
            const isSelected = marketingNavigation?.channelId === c.id;
            return (
              <div key={c.id} className="buffer-channel-node">
                <button
                  type="button"
                  className={`channel-branch-header sidebar-channel ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    setPage("marketing");
                    setMarketingNavigation({
                      tab: "publications",
                      brandId: c.brand_id,
                      channelId: c.id,
                    });
                  }}
                >
                  <div className="channel-avatar-badge-wrap">
                    {c.avatar_url ? (
                      <img
                        src={c.avatar_url}
                        alt={c.name}
                        className="channel-avatar-circle"
                      />
                    ) : (
                      <span className="channel-avatar-circle">
                        {c.name[0].toUpperCase()}
                      </span>
                    )}
                    <ChannelMark provider={c.provider} size="mini" />
                  </div>
                  <span className="channel-row-name">{c.name}</span>
                </button>
                <div className="buffer-channel-subnav">
                  <button
                    type="button"
                    className={`channel-subitem ${isSelected && (!marketingNavigation?.subview || marketingNavigation?.subview === "publish") ? "active" : ""}`}
                    onClick={() => {
                      setPage("marketing");
                      setMarketingNavigation({
                        tab: "publications",
                        brandId: c.brand_id,
                        channelId: c.id,
                        subview: "publish",
                      });
                    }}
                  >
                    <span className="subitem-icon">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="3"
                          y="4"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                        />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </span>
                    <span>Publish</span>
                  </button>
                  <button
                    type="button"
                    className={`channel-subitem ${isSelected && marketingNavigation?.subview === "community" ? "active" : ""}`}
                    onClick={() => {
                      setPage("marketing");
                      setMarketingNavigation({
                        tab: "community",
                        brandId: c.brand_id,
                        channelId: c.id,
                        subview: "community",
                      });
                    }}
                  >
                    <span className="subitem-icon">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </span>
                    <span>Community</span>
                  </button>
                  <button
                    type="button"
                    className={`channel-subitem ${isSelected && marketingNavigation?.subview === "insights" ? "active" : ""}`}
                    onClick={() => {
                      setPage("marketing");
                      setMarketingNavigation({
                        tab: "insights",
                        brandId: c.brand_id,
                        channelId: c.id,
                        subview: "insights",
                      });
                    }}
                  >
                    <span className="subitem-icon">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                    </span>
                    <span>Insights</span>
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      <SidebarQuickConnect />
    </div>
  );
}
