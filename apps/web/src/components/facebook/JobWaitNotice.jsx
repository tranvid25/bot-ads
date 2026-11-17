import React from "react";
import { jobWait } from "../../../../../packages/contracts/facebook-job-wait.mjs";
export default function JobWaitNotice({ job, data, onNavigate }) {
  const reason = jobWait(job, data);
  if (!reason) return null;
  return <div className="hint"><p>{reason.text}</p>
    <small>Mã lượt: {job.id.slice(0,8)} · Tạo lúc {new Date(job.created_at).toLocaleString("vi-VN")}</small>
    <button className="link" onClick={() => onNavigate(reason.target)}>{reason.target === "devices" ? "Kiểm tra thiết bị" : "Xem kết quả & nhật ký"}</button>
  </div>;
}
