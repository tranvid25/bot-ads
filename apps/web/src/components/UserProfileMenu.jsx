import React, { useState, useEffect, useRef } from "react";

export default function UserProfileMenu({
  user,
  onLogout,
  onNavigate,
  hasQuotaCard = false,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const localAvatar = typeof localStorage !== "undefined"
    ? localStorage.getItem("user_avatar")
    : null;
  const avatarUrl = user?.avatar || localAvatar;
  const initial = (user?.name?.trim()?.charAt(0) || "U").toUpperCase();

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="buffer-profile-container" ref={containerRef}>
      {open && (
        <div
          className={`buffer-profile-popover ${hasQuotaCard ? "has-quota-offset" : ""}`}
          role="dialog"
          aria-label="Menu tài khoản"
        >
          <div className="popover-user-header">
            <div className="popover-avatar-wrap">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user?.name || "Avatar"}
                  className="popover-avatar-img"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="popover-avatar-initial">{initial}</span>
              )}
            </div>
            <div className="popover-user-details">
              <strong className="popover-user-name" title={user?.name}>
                {user?.name || "Người dùng"}
              </strong>
              <small className="popover-user-email" title={user?.email}>
                {user?.email || ""}
              </small>
              <span className="popover-plan-badge">Free Plan · BotAds</span>
            </div>
          </div>

          <div className="popover-divider" />

          <div className="popover-menu-list">
            <button
              type="button"
              className="popover-menu-item"
              onClick={() => {
                setOpen(false);
                onNavigate("settings");
              }}
            >
              <span className="popover-menu-icon">⚙️</span>
              <span>Cài đặt tài khoản</span>
            </button>
            <button
              type="button"
              className="popover-menu-item"
              onClick={() => {
                setOpen(false);
                onNavigate("marketing-channels");
              }}
            >
              <span className="popover-menu-icon">📡</span>
              <span>Kênh kết nối</span>
            </button>
          </div>

          <div className="popover-divider" />

          <button
            type="button"
            className="popover-logout-btn"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <span className="popover-menu-icon">🚪</span>
            <span>Đăng xuất</span>
          </button>
        </div>
      )}

      <button
        type="button"
        className="profile buffer-org-profile"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        title={`${user?.name || "Tài khoản"} (${user?.email || ""}) - Bấm để mở menu`}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={user?.name || "Avatar"}
            className="profile-avatar-img"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="profile-purple-avatar">{initial}</span>
        )}
        <div className="profile-info-text">
          <strong title={user?.name}>{user?.name || "Tài khoản"}</strong>
          <small title={user?.email}>{user?.email || "Free Plan"}</small>
        </div>
        <span className="sidebar-collapse-toggle" title="Menu">
          {open ? "▴" : "▾"}
        </span>
      </button>
    </div>
  );
}
