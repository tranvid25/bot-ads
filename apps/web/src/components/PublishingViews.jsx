import React, { useState } from "react";
import { Icon } from "./ui";

const marks = {
  linkedin: "in",
  dev: "DEV",
  medium: "M",
  reddit: "r",
  indiehackers: "IH",
};
export function ChannelMark({ provider, size = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`channel-mark channel-${provider} ${size}`}
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
  return (
    <section className="publishing-calendar" aria-label="Lịch xuất bản">
      <div className="calendar-toolbar">
        <div className="mk-actions">
          <button
            className="secondary small"
            aria-label="Kỳ trước"
            onClick={() => move(-1)}
          >
            ‹
          </button>
          <button
            className="secondary small"
            aria-label="Kỳ sau"
            onClick={() => move(1)}
          >
            ›
          </button>
          <strong>
            {anchor.toLocaleDateString("vi-VN", {
              month: "long",
              year: "numeric",
            })}
          </strong>
          <button
            className="secondary small"
            onClick={() => setAnchor(new Date())}
          >
            Hôm nay
          </button>
          <select
            aria-label="Khoảng lịch"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="week">Tuần</option>
            <option value="month">Tháng</option>
          </select>
        </div>
        <small>{Intl.DateTimeFormat().resolvedOptions().timeZone}</small>
      </div>
      <div className={`calendar-grid calendar-${mode}`}>
        {days.map((day) => (
          <section
            key={dayKey(day)}
            className={`calendar-day ${dayKey(day) === dayKey(Date.now()) ? "is-today" : ""}`}
            aria-label={day.toLocaleDateString("vi-VN")}
          >
            <header>
              <span>
                {day.toLocaleDateString("vi-VN", { weekday: "short" })}
              </span>
              <strong>{day.getDate()}</strong>
            </header>
            <div className="calendar-day-posts">
              {publications
                .filter((p) => dayKey(p.scheduled_at) === dayKey(day))
                .map((p) => (
                  <button
                    key={p.id}
                    className={`calendar-post mk-${p.status}`}
                    onClick={() => onOpen(p)}
                  >
                    <span>
                      <ChannelMark provider={channelFor(p)?.provider} />
                      <time>
                        {new Date(p.scheduled_at).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </span>
                    <strong>{p.snapshot.postTitle}</strong>
                    <small>{channelFor(p)?.name}</small>
                  </button>
                ))}
              <button
                className="calendar-add"
                aria-label={`Soạn bài ngày ${day.toLocaleDateString("vi-VN")}`}
                onClick={onCreate}
              >
                <Icon name="plus" size={15} />
                <span>Soạn bài</span>
              </button>
            </div>
          </section>
        ))}
      </div>
      <p className="hint">
        Chọn bài để xem nội dung và nhật ký. Ngày giờ được xác nhận ở bước lên
        lịch sau khi duyệt nội dung.
      </p>
    </section>
  );
}
