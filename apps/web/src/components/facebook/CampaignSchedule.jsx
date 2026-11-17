import React from "react";
import { Icon } from "../ui";
export default function CampaignSchedule({ form, set, meta }) {
  return (
    <>
      <label>
        Thời điểm đăng
        <select
          value={form.publishMode || "schedule"}
          onChange={(e) => {
            set("publishMode", e.target.value);
            if (e.target.value === "now") set("enabled", false);
          }}
        >
          <option value="now">Đăng ngay sau khi lưu</option>
          <option value="schedule">Đặt giờ / lưu nháp</option>
        </select>
      </label>
      <div className="notice">
        <strong>
          Xác nhận phạm vi gửi: {form.groupIds.length} nhóm ·{" "}
          {form.posts.filter((p) => p.selected && p.content).length} bài.
        </strong>
        <p>
          Kiểm tra nội dung và nhóm ở hai bước trước rồi lưu. Lưu nháp chưa gửi
          bài; bật lịch bên dưới cho phép máy thực hiện vào giờ bạn chọn.
        </p>
      </div>
      <div className="field-grid">
        <label>
          Tối đa lượt gửi/ngày
          <input
            type="number"
            min="1"
            max={meta.maxDaily}
            value={form.dailyLimit}
            onChange={(e) => set("dailyLimit", Number(e.target.value))}
          />
          <small>Tùy chọn 30, 50 hoặc số khác, tối đa {meta.maxDaily}.</small>
        </label>
        <label>
          Nghỉ trước khi đăng lại nhóm (ngày)
          <input
            type="number"
            min="1"
            max="365"
            value={form.cooldownDays}
            onChange={(e) => set("cooldownDays", Number(e.target.value))}
          />
        </label>
      </div>
      <label>
        Loại lịch
        <select
          value={form.scheduleType || "weekly"}
          onChange={(e) => set("scheduleType", e.target.value)}
        >
          <option value="once">Một lần vào ngày giờ cụ thể</option>
          <option value="weekly">Lặp theo tuần</option>
        </select>
      </label>
      {form.scheduleType === "once" && form.publishMode !== "now" && (
        <label>
          Ngày giờ theo máy của bạn (
          {Intl.DateTimeFormat().resolvedOptions().timeZone})
          <input
            type="datetime-local"
            required
            value={
              form.scheduledAt
                ? new Date(
                    Date.parse(form.scheduledAt) -
                      new Date(form.scheduledAt).getTimezoneOffset() * 60000,
                  )
                    .toISOString()
                    .slice(0, 16)
                : ""
            }
            onChange={(e) =>
              set(
                "scheduledAt",
                e.target.value ? new Date(e.target.value).toISOString() : "",
              )
            }
          />
        </label>
      )}
      {form.scheduleType !== "once" && (
        <>
          <label>
            Giờ chạy — {form.timezone || "Asia/Ho_Chi_Minh"}
            <input
              type="time"
              value={form.time}
              onChange={(e) => set("time", e.target.value)}
            />
          </label>
          <div className="weekdays">
            {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day, i) => (
              <button
                type="button"
                key={day}
                className={form.weekdays.includes(i) ? "selected" : ""}
                onClick={() =>
                  set(
                    "weekdays",
                    form.weekdays.includes(i)
                      ? form.weekdays.filter((d) => d !== i)
                      : [...form.weekdays, i],
                  )
                }
              >
                {day}
              </button>
            ))}
          </div>
        </>
      )}
      <label className="check">
        <input
          type="checkbox"
          disabled={!form.groupIds.length || form.publishMode === "now"}
          checked={form.enabled}
          onChange={(e) => set("enabled", e.target.checked)}
        />
        Bật lịch tự động sau khi lưu
      </label>
      <div className="notice">
        <strong>Giới hạn là số lượt gửi tối đa.</strong>
        <p>
          Bài chờ duyệt và chưa xác nhận vẫn được tính vào hạn mức. Tổng các
          chiến dịch còn chịu giới hạn chung của tài khoản. Máy tính cần bật và
          ứng dụng cần kết nối.
        </p>
      </div>
    </>
  );
}
