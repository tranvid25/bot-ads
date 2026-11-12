import { json, maxDaily } from "../../lib/http.mjs";
import { one, run } from "../../models/database.mjs";
import { body, error } from "../../middleware/security.mjs";
import { reviewedCampaign } from "../../services/facebook-campaign.mjs";
import {
  groupUrl,
  localClock,
} from "../../../../packages/contracts/campaign.mjs";
export async function reserve(request, env, path, { workspaceId, device }) {
  if (path === "/api/device/reserve" && request.method === "POST") {
    const input = await body(request, 4000);
    const now = Date.now();
    if (
      !/^[a-f0-9-]{36}$/.test(input.attemptId || "") ||
      !groupUrl(input.groupUrl)
    )
      throw error(400, "Lượt gửi không hợp lệ.");
    const job = await one(
      env,
      "SELECT * FROM jobs WHERE id=? AND workspace_id=? AND device_id=? AND status='running' AND cancel_requested=0 AND lease_until>?",
      input.jobId,
      workspaceId,
      device.id,
      now,
    );
    if (!job) throw error(409, "Lượt chạy đã dừng hoặc mất kết nối.");
    const previous = await one(
      env,
      "SELECT id FROM attempts WHERE id=?",
      input.attemptId,
    );
    if (previous)
      throw error(
        409,
        "Lượt gửi này đã được giữ chỗ. Cần đối soát trước khi thử lại.",
      );
    const campaign = await reviewedCampaign(
      env,
      workspaceId,
      JSON.parse(job.snapshot),
      true,
      true,
    );
    if (
      campaign.workflowVersion === 2 &&
      !campaign.groupUrls.includes(groupUrl(input.groupUrl))
    )
      throw error(409, "Nhóm chưa được chọn và duyệt cho lượt chạy này.");
    const workspace = await one(
      env,
      "SELECT * FROM workspaces WHERE id=?",
      workspaceId,
    );
    const day = localClock(new Date(), workspace.timezone).day;
    const url = groupUrl(input.groupUrl);
    const result = await run(
      env,
      `INSERT INTO attempts(id,workspace_id,job_id,group_url,status,day,data,updated_at)
      SELECT ?,?,?,?,'submitting',?,?,? WHERE
      (SELECT count(*) FROM attempts WHERE workspace_id=? AND day=? AND status IN ('submitting','unknown','success','pending_approval')) < ?
      AND (SELECT count(*) FROM attempts a JOIN jobs j ON j.id=a.job_id WHERE a.workspace_id=? AND a.day=? AND j.campaign_id=? AND a.status IN ('submitting','unknown','success','pending_approval')) < ?
      AND NOT EXISTS (SELECT 1 FROM attempts WHERE workspace_id=? AND group_url=? AND (status IN ('submitting','unknown','pending_approval') OR (status='success' AND updated_at>?)))`,
      input.attemptId,
      workspaceId,
      job.id,
      url,
      day,
      JSON.stringify({
        title: String(input.title || "").slice(0, 120),
        timestamp: new Date(now).toISOString(),
      }),
      now,
      workspaceId,
      day,
      Math.min(workspace.daily_limit, maxDaily(env)),
      workspaceId,
      day,
      job.campaign_id,
      campaign.dailyLimit,
      workspaceId,
      url,
      now - campaign.cooldownDays * 86400000,
    );
    if (!result.meta.changes)
      throw error(
        409,
        "Đã hết hạn mức hoặc nhóm còn bài chờ/đang trong khoảng nghỉ.",
      );
    return json({
      id: input.attemptId,
    });
  }
}
