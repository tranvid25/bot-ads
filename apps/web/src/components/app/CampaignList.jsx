import RunFacebookButton from "../facebook/RunFacebookButton";
import React from "react";
import "../../styles/campaign-list.css";
import JobWaitNotice from "../facebook/JobWaitNotice";
import { api } from "../../lib/api";
import { Icon, Empty } from "../ui";
import { useApp } from "./AppContext";
export default function CampaignList() {
  const { data, setEditor, busy, action, setPage, setReportSelection } = useApp();
  return (
    <div className="campaign-list">
      {data.campaigns.length ? (
        data.campaigns.map((c) => (
          <article className="campaign-card" key={c.id}>
            <div className="campaign-emblem">
              <Icon name={c.mode === "gemini" ? "spark" : "campaign"} />
            </div>
            <div className="campaign-main">
              <div className="row">
                <h3>{c.name}</h3>
                <span className={`badge ${c.enabled ? "success" : ""}`}>
                  {c.enabled ? "Đã bật lịch" : "Chạy thủ công"}
                </span>
              </div>
              <p>
                {c.mode === "gemini" ? "Gemini" : "Bài tự soạn"} <span>·</span>{" "}
                {c.posts.filter((p) => p.selected).length} bài được chọn{" "}
                <span>·</span> {c.dailyLimit} lượt/ngày
              </p>
              <small>
                {c.enabled
                  ? c.scheduleType === "once" ? new Date(c.scheduledAt).toLocaleString("vi-VN") : `${c.time} · ${c.weekdays.map((d) => (d === 0 ? "CN" : `T${d + 1}`)).join(", ")}`
                  : "Chưa bật lịch tự động"}
              </small>
              {c.blockedReason && (
                <p className="danger" role="status">
                  {c.blockedReason}
                </p>
              )}
              {data.jobs.filter(j => j.campaign_id === c.id && ["queued", "running", "needs_review"].includes(j.status)).slice(0,1).map(job => <JobWaitNotice key={job.id} job={job} data={data} onNavigate={setPage} />)}
            </div>
            <div className="campaign-actions">
              <button className="secondary" onClick={() => { setReportSelection({ campaignId: c.id }); setPage("results"); }}>Nhật ký chiến dịch</button>
              <button
                className="secondary danger"
                disabled={busy}
                onClick={() => {
                  if (
                    confirm(
                      `Xóa chiến dịch “${c.name}” và dừng các lượt chưa gửi? Bài đã gửi lên Facebook không bị xóa.`,
                    )
                  )
                    action(
                      () => api(`/campaigns/${c.id}`, "DELETE"),
                      "Đã xóa chiến dịch, tắt lịch và yêu cầu dừng lượt đang chạy.",
                    );
                }}
              >
                Xóa
              </button>
              <button className="secondary" onClick={() => setEditor(c.id)}>
                Chỉnh sửa
              </button>
              <RunFacebookButton campaign={c} />
            </div>
          </article>
        ))
      ) : (
        <Empty
          title="Chiến dịch đầu tiên bắt đầu từ bạn"
          text="Chọn bài có sẵn hoặc nhờ Gemini viết, rồi thiết lập nhóm và lịch chạy."
          action={
            <button className="primary" onClick={() => setEditor("new")}>
              <Icon name="plus" />
              Tạo chiến dịch đầu tiên
            </button>
          }
        />
      )}
    </div>
  );
}
