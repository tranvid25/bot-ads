import React from "react";
import { api } from "../../lib/api";
import { Icon, Empty } from "../ui";
import { useApp } from "./AppContext";
export default function CampaignList() {
  const { data, setEditor, busy, action } = useApp();
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
                  ? `${c.time} · ${c.weekdays.map((d) => (d === 0 ? "CN" : `T${d + 1}`)).join(", ")}`
                  : "Chưa bật lịch tự động"}
              </small>
              {c.blockedReason && (
                <p className="danger" role="status">
                  {c.blockedReason}
                </p>
              )}
            </div>
            <div className="campaign-actions">
              <button className="secondary" onClick={() => setEditor(c.id)}>
                Chỉnh sửa
              </button>
              <button
                className="primary small"
                disabled={busy || !!c.blockedReason}
                onClick={() =>
                  action(
                    () => api(`/campaigns/${c.id}/run`, "POST", {}),
                    "Đã xếp lượt chạy. Ứng dụng sẽ nhận khi kết nối và đã đăng nhập Facebook.",
                  )
                }
              >
                <Icon name="play" size={16} />
                Chạy
              </button>
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
