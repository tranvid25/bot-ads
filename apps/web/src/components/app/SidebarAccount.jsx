import React from "react";
import { api } from "../../lib/api";
import UserProfileMenu from "../UserProfileMenu";
import { useApp } from "./AppContext";
export default function SidebarAccount() {
  const {
    data,
    setData,
    setPage,
    showQuotaCard,
    setShowQuotaCard,
    marketingData,
    setMarketingNavigation,
    action,
  } = useApp();
  return (
    <div className="sidebar-bottom buffer-sidebar-bottom">
      {showQuotaCard &&
        (() => {
          const connectedChannelsCount =
            marketingData?.channels?.filter((c) => c.status === "connected")
              .length || 0;
          return (
            <div className="buffer-channel-quota-card">
              <div className="quota-card-header">
                <span>
                  {Math.min(3, connectedChannelsCount)}/3 channels connected
                </span>
                <button
                  type="button"
                  className="quota-close-btn"
                  aria-label="Đóng"
                  onClick={() => setShowQuotaCard(false)}
                >
                  ✕
                </button>
              </div>
              <div className="quota-progress-bar">
                <div
                  className={`progress-seg ${connectedChannelsCount >= 1 ? "is-filled" : ""}`}
                />
                <div
                  className={`progress-seg ${connectedChannelsCount >= 2 ? "is-filled" : ""}`}
                />
                <div
                  className={`progress-seg ${connectedChannelsCount >= 3 ? "is-filled" : ""}`}
                />
              </div>
            </div>
          );
        })()}

      <UserProfileMenu
        user={data.user}
        hasQuotaCard={showQuotaCard}
        onLogout={() =>
          action(async () => {
            await api("/auth/logout", "POST", {});
            try {
              localStorage.removeItem("user_avatar");
            } catch {}
            setData(null);
          })
        }
        onNavigate={(target) => {
          if (target === "settings") {
            setPage("settings");
          } else if (target === "marketing-channels") {
            setPage("marketing");
            setMarketingNavigation({
              tab: "channels",
            });
          }
        }}
      />
    </div>
  );
}
