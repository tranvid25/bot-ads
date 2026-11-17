import React from "react";
import { date, labels } from "../ui";
const statuses = [
  "success",
  "pending_approval",
  "unknown",
  "submitting",
  "failed",
];
export default function CampaignReportFilters({ report, filters, onFilter }) {
  return (
    <>
      <div className="report-counts" aria-label="Thống kê toàn chiến dịch">
        <p>
          <strong>
            {Object.values(report.counts).reduce((a, b) => a + b, 0)}
          </strong>{" "}
          lượt gửi đã tạo
        </p>
        {statuses.map((s) => (
          <p key={s}>
            <strong>{report.counts[s] || 0}</strong> {labels[s]}
          </p>
        ))}
      </div>
      <form
        className="report-filters"
        onSubmit={(e) => {
          e.preventDefault();
          onFilter({ q: new FormData(e.currentTarget).get("q") });
        }}
      >
        <label>
          Trạng thái
          <select
            aria-label="Trạng thái"
            value={filters.status}
            onChange={(e) => onFilter({ status: e.target.value })}
          >
            <option value="">Tất cả trạng thái</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {labels[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Lượt chạy
          <select
            aria-label="Lượt chạy"
            value={filters.job}
            onChange={(e) => onFilter({ job: e.target.value })}
          >
            <option value="">Toàn bộ lượt chạy</option>
            {report.jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {date(j.created_at)} · {labels[j.status] || j.status} ·{" "}
                {j.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tìm bài hoặc nhóm
          <input name="q" defaultValue={filters.q} />
        </label>
        <button className="secondary" type="submit">Tìm</button>
      </form>
    </>
  );
}
