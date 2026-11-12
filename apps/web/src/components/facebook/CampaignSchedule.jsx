import React from "react";
import { Icon } from "../ui";
export default function CampaignSchedule({ form, set, meta }) {
  return (
    <>
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
        Giờ chạy — Việt Nam
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
      <label className="check">
        <input
          type="checkbox"
          disabled={!form.groupIds.length}
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
