import React, { useState } from "react";
import { Icon } from "./ui";

const marks = {
  linkedin: "in",
  dev: "DEV",
  medium: "M",
  reddit: "r/",
  indiehackers: "IH",
  facebook: "f",
  instagram: "IG",
  threads: "@",
  bluesky: "🦋",
  substack: "📑",
  youtube: "▶",
  tiktok: "🎵",
  mastodon: "M",
};

export function ChannelMark({ provider, size = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`channel-mark channel-${provider} ${size}`}
      title={provider}
    >
      {marks[provider] || "↗"}
    </span>
  );
}

const dayKey = (value) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

export function PublishingCalendar({
  publications,
  channelFor,
  onOpen,
  onCreate,
}) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [mode, setMode] = useState("week");
  const start = new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    mode === "month" ? 1 : anchor.getDate(),
  );
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const days = Array.from({ length: mode === "month" ? 42 : 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    return day;
  });

  const move = (direction) => {
    const next = new Date(anchor);
    if (mode === "month") next.setMonth(next.getMonth() + direction, 1);
    else next.setDate(next.getDate() + direction * 7);
    setAnchor(next);
  };

  const timeSlots = ["8:00", "10:00", "12:00", "14:00", "16:00", "18:00"];

  return (
    <section className="publishing-calendar buffer-calendar-view" aria-label="Lịch xuất bản">
      <div className="calendar-toolbar buffer-calendar-toolbar">
        <div className="calendar-nav-group">
          <div className="calendar-arrows">
            <button
              className="buffer-icon-btn"
              aria-label="Kỳ trước"
              onClick={() => move(-1)}
              title="Kỳ trước"
            >
              ‹
            </button>
            <button
              className="buffer-icon-btn"
              aria-label="Kỳ sau"
              onClick={() => move(1)}
              title="Kỳ sau"
            >
              ›
            </button>
          </div>
          <strong className="calendar-month-title">
            {anchor.toLocaleDateString("vi-VN", {
              month: "long",
              year: "numeric",
            })}
          </strong>
          <button
            className="secondary small buffer-pill-btn"
            onClick={() => setAnchor(new Date())}
          >
            Hôm nay
          </button>
          <div className="calendar-mode-select-wrap">
            <select
              aria-label="Khoảng lịch"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="buffer-select-pill"
            >
              <option value="week">Tuần</option>
              <option value="month">Tháng</option>
            </select>
          </div>
        </div>
        <div className="calendar-tz-group">
          <span className="buffer-tz-pill">
            🌐 {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </span>
        </div>
      </div>

      <div className={`calendar-grid calendar-${mode} buffer-calendar-grid`}>
        {days.map((day) => {
          const isToday = dayKey(day) === dayKey(Date.now());
          const dayPosts = publications.filter(
            (p) => dayKey(p.scheduled_at) === dayKey(day),
          );
          return (
            <section
              key={dayKey(day)}
              className={`calendar-day ${isToday ? "is-today" : ""}`}
              aria-label={day.toLocaleDateString("vi-VN")}
            >
              <header className="calendar-day-header">
                <span className="day-name">
                  {day.toLocaleDateString("vi-VN", { weekday: "short" })}
                </span>
                <strong className={`day-number ${isToday ? "today-badge" : ""}`}>
                  {day.getDate()}
                </strong>
              </header>
              <div className="calendar-day-posts">
                {dayPosts.map((p) => {
                  const channel = channelFor(p);
                  return (
                    <button
                      key={p.id}
                      className={`calendar-post mk-${p.status} buffer-post-card`}
                      onClick={() => onOpen(p)}
                      title={p.snapshot.postTitle}
                    >
                      <div className="post-card-top">
                        <ChannelMark provider={channel?.provider} size="small" />
                        <time className="post-card-time">
                          {new Date(p.scheduled_at).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                      <strong className="post-card-title">{p.snapshot.postTitle}</strong>
                      {p.snapshot.content && (
                        <p className="post-card-snippet">{p.snapshot.content}</p>
                      )}
                      <div className="post-card-footer">
                        <small className="post-card-channel">{channel?.name}</small>
                      </div>
                    </button>
                  );
                })}
                <button
                  className="calendar-add buffer-calendar-add"
                  aria-label={`Soạn bài ngày ${day.toLocaleDateString("vi-VN")}`}
                  onClick={onCreate}
                >
                  <Icon name="plus" size={13} />
                  <span>Soạn bài</span>
                </button>
              </div>
            </section>
          );
        })}
      </div>
      <p className="hint buffer-calendar-hint">
        💡 Chọn bài để xem nội dung và nhật ký. Ngày giờ được xác nhận ở bước lên
        lịch sau khi duyệt nội dung.
      </p>
    </section>
  );
}
