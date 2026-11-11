import React, { useState, useRef, useEffect } from "react";

export default function ComposerFooter({ busy, onSave }) {
  const [mode, setMode] = useState("next"); // "now" | "next" | "custom"
  const [customDateTime, setCustomDateTime] = useState("");
  const [openDropdown, setOpenDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(false);
      }
    }
    if (openDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openDropdown]);

  const handlePublish = (e) => {
    if (mode === "now") {
      onSave(e, { publishNow: true });
    } else if (mode === "custom" && customDateTime) {
      onSave(e, { publishNow: false, scheduledAt: new Date(customDateTime).toISOString() });
    } else {
      const nextTime = new Date(Date.now() + 3600000).toISOString();
      onSave(e, { publishNow: false, scheduledAt: nextTime });
    }
  };

  const currentLabel = mode === "now"
    ? "⚡ Đăng ngay"
    : mode === "custom" && customDateTime
      ? `⏰ ${new Date(customDateTime).toLocaleDateString("vi-VN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
      : mode === "custom"
        ? "⏰ Chọn ngày & giờ"
        : "📅 Khung giờ tiếp theo";

  const btnLabel = busy
    ? "Đang xử lý…"
    : mode === "now"
      ? "⚡ Đăng ngay"
      : "📅 Lên lịch đăng";

  const canPublish = mode !== "custom" || !!customDateTime;

  return (
    <div className="buffer-composer-footer">
      <div className="composer-footer-left">
        <span className="composer-footer-hint">
          💡 Chọn lịch và xuất bản trực tiếp lên các kênh đã kết nối.
        </span>
      </div>

      <div className="composer-footer-right" ref={dropdownRef}>
        <div className="schedule-dropdown-wrap">
          <button
            type="button"
            className="schedule-dropdown-trigger"
            onClick={() => setOpenDropdown((prev) => !prev)}
            title="Tùy chọn thời gian xuất bản"
          >
            <span>{currentLabel}</span>
            <span className="dropdown-caret">▾</span>
          </button>

          {openDropdown && (
            <div className="schedule-dropdown-menu">
              <button
                type="button"
                className={`dropdown-menu-item ${mode === "now" ? "is-selected" : ""}`}
                onClick={() => {
                  setMode("now");
                  setOpenDropdown(false);
                }}
              >
                <strong>⚡ Đăng ngay</strong>
                <small>Xuất bản ngay lập tức</small>
              </button>

              <button
                type="button"
                className={`dropdown-menu-item ${mode === "next" ? "is-selected" : ""}`}
                onClick={() => {
                  setMode("next");
                  setOpenDropdown(false);
                }}
              >
                <strong>📅 Khung giờ tiếp theo</strong>
                <small>Xếp tự động (1 giờ tới)</small>
              </button>

              <div className={`dropdown-menu-item custom-datetime-item ${mode === "custom" ? "is-selected" : ""}`}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setMode("custom")}
                  style={{ cursor: "pointer", width: "100%" }}
                >
                  <strong>⏰ Chọn ngày & giờ cụ thể</strong>
                </div>
                <input
                  type="datetime-local"
                  value={customDateTime}
                  onChange={(e) => {
                    setCustomDateTime(e.target.value);
                    setMode("custom");
                  }}
                  className="dropdown-datetime-input"
                />
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className="composer-publish-btn"
          disabled={busy || !canPublish}
          onClick={handlePublish}
        >
          {btnLabel}
        </button>
      </div>
    </div>
  );
}
