import CampaignReportFilters from "./CampaignReportFilters";
import "../../styles/facebook-report.css";
import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Badge, date } from "../ui";
import { useApp } from "../app/AppContext";
import JobWaitNotice from "./JobWaitNotice";
import useCampaignReport from "./useCampaignReport";
import CampaignAttempt from "./CampaignAttempt";
export default function CampaignReport({ selection, onClose }) {
  const { data, setPage } = useApp();
  const { report, error, loading, filters, setFilters, reload } =
    useCampaignReport(selection.campaignId, selection.jobId);
  const [events, setEvents] = useState(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    document.getElementById("campaign-report-title")?.focus();
  }, []);
  async function command(fn) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function recheck(a) {
    await command(async () => {
      const result = await api(`/attempts/${a.id}/recheck`, "POST", {});
      setMessage(result.message);
      reload();
    });
  }
  const filter = (changes) => {
    setEvents(null);
    setFilters((f) => ({ ...f, ...changes, page: 1 }));
  };
  return (
    <section className="panel fb-report" aria-label="Nhật ký chi tiết chiến dịch">
      <div className="section-title">
        <h2 id="campaign-report-title" tabIndex={-1}>
          Nhật ký chiến dịch: {report?.campaign.name || "Đang tải…"}
        </h2>
        <button className="secondary" onClick={onClose}>
          Quay lại danh sách
        </button>
      </div>
      <p>
        Một nội dung gửi vào 3 nhóm được tính là 3 lượt gửi. Chờ duyệt chưa được
        tính là đã xuất bản.
      </p>
      {error && (
        <p role="alert" className="danger">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <button className="secondary" disabled={loading} onClick={reload}>
        Cập nhật kết quả
      </button>
      {report && (
        <>
          <CampaignReportFilters
            report={report}
            filters={filters}
            onFilter={filter}
          />
          {report.jobs
            .filter((j) => !filters.job || j.id === filters.job)
            .slice(0, 10)
            .map((j) => (
              <div key={j.id}>
                <p>
                  Lượt {j.id.slice(0, 8)} · <Badge status={j.status} /> ·{" "}
                  {date(j.created_at)}{" "}
                  <button
                    className="link"
                    disabled={busy}
                    onClick={() =>
                      command(async () => {
                        setEvents({
                          id: j.id,
                          rows: (await api(`/jobs/${j.id}/events`)).events,
                        });
                      })
                    }
                  >
                    Xem log lượt chạy
                  </button>
                </p>
                <JobWaitNotice job={j} data={data} onNavigate={setPage} />
              </div>
            ))}
          {events && (
            <details open>
              <summary>Log lượt {events.id.slice(0, 8)}</summary>
              <pre className="logs">
                {events.rows.length
                  ? events.rows
                      .map((e) => `${date(e.created_at)}  ${e.text}`)
                      .join("\n")
                  : "Chưa có log từ máy tính."}
              </pre>
            </details>
          )}
          <p role="status">
            {loading
              ? "Đang cập nhật…"
              : `Có ${report.total} kết quả theo bộ lọc. Cập nhật lúc ${new Date().toLocaleTimeString("vi-VN")}.`}
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Bài viết / nhóm / thời gian</th>
                  <th>Kết quả</th>
                  <th>Link và thao tác</th>
                </tr>
              </thead>
              <tbody>
                {report.attempts.map((a) => (
                  <CampaignAttempt
                    key={a.id}
                    attempt={a}
                    onRecheck={recheck}
                    busy={busy}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {!report.attempts.length && (
            <p>
              Chưa có lượt gửi theo bộ lọc này. Mở log lượt chạy để xem tiến độ
              chuẩn bị hoặc lý do bỏ qua nhóm.
            </p>
          )}
          <div className="mk-actions">
            <button
              className="secondary"
              disabled={loading || filters.page === 1}
              onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            >
              Trang trước
            </button>
            <span>Trang {filters.page}</span>
            <button
              className="secondary"
              disabled={
                loading || filters.page * report.pageSize >= report.total
              }
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            >
              Trang sau
            </button>
          </div>
        </>
      )}
    </section>
  );
}
