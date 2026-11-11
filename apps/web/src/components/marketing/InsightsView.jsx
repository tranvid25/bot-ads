import React, { useState } from "react";
import { ChannelMark } from "../PublishingViews";
import { providers, date } from "./constants";

export default function InsightsView({
  channels = [],
  channelFilter = "",
  publications = [],
  onMetricsModal,
}) {
  const channel = channels.find((c) => c.id === channelFilter) || channels[0];
  const [timeRange, setTimeRange] = useState("30d");

  const published = publications.filter((p) =>
    ["published", "user_reported_published"].includes(p.status) &&
    (!channelFilter || p.channel_id === channelFilter)
  );

  const totalVisits = published.reduce((acc, p) => acc + (p.visits || 0), 0);
  const totalLeads = published.reduce((acc, p) => acc + (p.leads || 0), 0);
  const conversionRate = totalVisits > 0 ? `${((totalLeads / totalVisits) * 100).toFixed(1)}%` : "0.0%";
  const avgVisits = published.length > 0 ? (totalVisits / published.length).toFixed(1) : "0";

  return (
    <section className="buffer-insights-view panel mk-form">
      <div className="buffer-insights-header">
        <div className="insights-header-left">
          {channel && (
            <div className="insights-channel-tag">
              <ChannelMark provider={channel.provider} size="small" />
              <strong>{channel.name}</strong>
              <small>{providers[channel.provider]}</small>
            </div>
          )}
          <h2>📊 Channel Performance & Insights</h2>
          <p className="insights-subtitle">
            Theo dõi hiệu quả, lưu lượng truy cập và khách hàng tiềm năng thu được từ các bài viết đã xuất bản.
          </p>
        </div>
        <div className="insights-header-actions">
          <select
            className="buffer-select-pill"
            aria-label="Khoảng thời gian phân tích"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="7d">Past 7 days</option>
            <option value="30d">Past 30 days</option>
            <option value="90d">Past 90 days</option>
          </select>
        </div>
      </div>

      <div className="buffer-insights-kpi-grid">
        <div className="insights-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">Posts Published</span>
          </div>
          <strong className="kpi-value">{published.length}</strong>
          <small className="kpi-subtext">Khoảng thời gian: {timeRange}</small>
        </div>

        <div className="insights-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">Website Traffic</span>
          </div>
          <strong className="kpi-value">{totalVisits.toLocaleString()} visits</strong>
          <small className="kpi-subtext">Trung bình {avgVisits} lượt/bài</small>
        </div>

        <div className="insights-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">Conversions (Leads)</span>
          </div>
          <strong className="kpi-value text-lime">{totalLeads.toLocaleString()} leads</strong>
          <small className="kpi-subtext">Ghi nhận từ các bài đăng</small>
        </div>

        <div className="insights-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">Conversion Rate</span>
          </div>
          <strong className="kpi-value text-lime">{conversionRate}</strong>
          <small className="kpi-subtext">Tỷ lệ lead / lượt truy cập</small>
        </div>
      </div>

      <div className="buffer-insights-table-box">
        <div className="table-box-header">
          <h3>Top Performing Publications</h3>
          <small>Theo dõi số liệu thực tế từng bài viết đã xuất bản</small>
        </div>

        {published.length === 0 ? (
          <div className="buffer-insights-empty">
            <p>Chưa có bài viết nào được xuất bản trong khoảng thời gian này.</p>
            <small>Lên lịch và xuất bản bài viết để bắt đầu thu thập số liệu phân tích.</small>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="buffer-insights-table">
              <thead>
                <tr>
                  <th>Nội dung bài viết</th>
                  <th>Thời gian</th>
                  <th>Lượt truy cập (Visits)</th>
                  <th>Lead</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {published.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.snapshot?.title || p.snapshot?.postTitle || "Bài viết"}</strong>
                      <p className="mk-excerpt">{p.snapshot?.content}</p>
                    </td>
                    <td>{date(p.scheduled_at)}</td>
                    <td><strong className="text-lime">{p.visits || 0}</strong> lượt</td>
                    <td><strong>{p.leads || 0}</strong></td>
                    <td>
                      <div className="mk-table-actions">
                        {onMetricsModal && (
                          <button
                            type="button"
                            className="secondary small"
                            onClick={() => onMetricsModal(p)}
                          >
                            Cập nhật số liệu
                          </button>
                        )}
                        {p.permalink && (
                          <a
                            href={p.permalink}
                            target="_blank"
                            rel="noreferrer"
                            className="link small"
                          >
                            Xem bài ↗
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
