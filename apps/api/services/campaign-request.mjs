import { one } from "../models/database.mjs";
import { error } from "../middleware/security.mjs";
import { enqueue } from "./jobs.service.mjs";
export function requestKey(input) {
  if (!input.requestId) return null;
  if (!/^[a-f0-9-]{36}$/.test(input.requestId))
    throw error(400, "Mã yêu cầu không hợp lệ.");
  return input.requestId;
}
export async function finishCampaign(env, workspaceId, campaignId, input) {
  let job = null;
  if (input.publishMode === "now") {
    const row = await one(
      env,
      "SELECT * FROM campaigns WHERE id=? AND workspace_id=? AND json_extract(data,'$.deletedAt') IS NULL",
      campaignId,
      workspaceId,
    );
    if (!row) throw error(404, "Chiến dịch đã xóa hoặc không tồn tại.");
    job = await enqueue(
      env,
      row,
      `manual:${campaignId}:${requestKey(input) || Math.floor(Date.now() / 60000)}`,
    );
  }
  return { id: campaignId, job };
}
