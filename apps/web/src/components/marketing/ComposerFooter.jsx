import React, { useState, useRef, useEffect } from "react";

export default function ComposerFooter({ busy, onSave }) {
  const [mode, setMode] = useState("now");
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
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openDropdown]);

  const handlePublish = (e) => {
    if (mode === "now") {
      onSave(e, { publishNow: true });
    } else if (
      mode === "custom" &&
      customDateTime &&
      new Date(customDateTime).getTime() > Date.now()
    ) {
      onSave(e, {
        publishNow: false,
        scheduledAt: new Date(customDateTime).toISOString(),
      });
    }
  };

  const currentLabel =
    mode === "now"
      ? "Now"
      : mode === "custom" && customDateTime
        ? `${new Date(customDateTime).toLocaleDateString("vi-VN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
        : mode === "custom"
          ? "Đặt giờ"
          : "Now";

  const btnLabel = busy ? "Đang xử lý…" : "Đăng";

  const canPublish =
    mode !== "custom" || new Date(customDateTime).getTime() > Date.now();

  return (
    <div className="buffer-composer-footer">
      <div className="composer-footer-left">
        <span className="composer-footer-hint">
          Chọn thời gian và đăng lên các kênh đã kết nối.
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
                <strong>Now</strong>
                <small>Xuất bản ngay lập tức</small>
              </button>

              <div
                className={`dropdown-menu-item custom-datetime-item ${mode === "custom" ? "is-selected" : ""}`}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setMode("custom")}
                  onKeyDown={(event) => {
                    if (["Enter", " "].includes(event.key)) {
                      event.preventDefault();
                      setMode("custom");
                    }
                  }}
                  style={{ cursor: "pointer", width: "100%" }}
                >
                  <strong>Đặt giờ</strong>
                </div>
                <input
                  type="datetime-local"
                  aria-label="Ngày và giờ đăng"
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
