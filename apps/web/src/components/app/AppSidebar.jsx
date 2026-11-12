import SidebarAccount from "./SidebarAccount";
import React from "react";
import { Icon, BufferLayersIcon } from "../ui";
import { useApp } from "./AppContext";
import SidebarChannels from "./SidebarChannels";
export default function AppSidebar() {
  const {
    page,
    setPage,
    marketingNavigation,
    setMarketingNavigation,
    handleCreateNew,
  } = useApp();
  return (
    <aside className="sidebar buffer-authentic-sidebar">
      <div className="buffer-sidebar-header">
        <div className="buffer-logo-wrap">
          <span className="buffer-brand-icon">
            <BufferLayersIcon size={18} />
          </span>
          <span className="buffer-logo-text">
            botsalesora<span className="brand-dot">.</span>
          </span>
        </div>
      </div>

      <button
        type="button"
        className="primary sidebar-new buffer-sidebar-new-btn"
        onClick={handleCreateNew}
      >
        <Icon name="plus" size={17} />{" "}
        {["facebook", "devices", "campaigns", "results"].includes(page)
          ? "Tạo chiến dịch"
          : "New"}
      </button>

      <nav className="buffer-sidebar-main-nav">
        <button
          type="button"
          className={
            page === "overview" ||
            (page === "marketing" &&
              (!marketingNavigation?.subview ||
                marketingNavigation?.subview === "home") &&
              !marketingNavigation?.compose)
              ? "active"
              : ""
          }
          onClick={() => {
            setPage("marketing");
            setMarketingNavigation({
              tab: "home",
              subview: "home",
            });
          }}
        >
          <span className="sidebar-nav-icon">
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
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </span>
          <span>Home</span>
        </button>
        <button
          type="button"
          className={
            page === "marketing" &&
            marketingNavigation?.tab === "content" &&
            !marketingNavigation?.compose
              ? "active"
              : ""
          }
          onClick={() => {
            setPage("marketing");
            setMarketingNavigation({
              tab: "content",
              subview: "create",
            });
          }}
        >
          <span className="sidebar-nav-icon">
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
              <line x1="9" y1="18" x2="15" y2="18" />
              <line x1="10" y1="22" x2="14" y2="22" />
              <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
            </svg>
          </span>
          <span>Create</span>
        </button>
        <button
          type="button"
          className={page === "facebook" ? "active" : ""}
          onClick={() => setPage("facebook")}
          title="Facebook Groups: hướng dẫn và thư viện nhóm"
        >
          <span className="sidebar-nav-icon">
            <Icon name="device" size={17} />
          </span>
          <span>Facebook Groups</span>
        </button>
        <button
          type="button"
          className={page === "devices" ? "active" : ""}
          onClick={() => setPage("devices")}
        >
          <span className="sidebar-nav-icon">
            <Icon name="device" size={17} />
          </span>
          <span>Thiết bị Facebook</span>
        </button>
        <button
          type="button"
          className={page === "campaigns" ? "active" : ""}
          onClick={() => setPage("campaigns")}
        >
          <span className="sidebar-nav-icon">
            <Icon name="campaign" size={17} />
          </span>
          <span>Chiến dịch Facebook</span>
        </button>
      </nav>

      <SidebarChannels />

      <SidebarAccount />
    </aside>
  );
}
