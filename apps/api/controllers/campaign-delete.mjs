import { one } from "../models/database.mjs";
import { error } from "../middleware/security.mjs";
import { json } from "../lib/http.mjs";
export async function deleteCampaign(
  request,
  env,
  path,
  method,
  { workspaceId },
) {
  const campaignId = path.split("/").at(-1);
  const row = await one(
    env,
    "SELECT id FROM campaigns WHERE id=? AND workspace_id=?",
    campaignId,
    workspaceId,
  );
  if (!row) throw error(404, "Không tìm thấy chiến dịch.");
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE campaigns SET enabled=0,data=json_set(data,'$.deletedAt',coalesce(json_extract(data,'$.deletedAt'),?),'$.enabled',json('false')),updated_at=? WHERE id=? AND workspace_id=?",
    ).bind(Date.now(), Date.now(), campaignId, workspaceId),
    env.DB.prepare(
      "UPDATE jobs SET cancel_requested=1,status=CASE WHEN status='queued' THEN 'canceled' ELSE status END,updated_at=? WHERE campaign_id=? AND workspace_id=? AND status IN ('queued','running','needs_review')",
    ).bind(Date.now(), campaignId, workspaceId),
  ]);
  return json({
    deleted: true,
    message:
      "Đã tắt lịch và yêu cầu dừng các lượt còn lại. Bài Facebook đã nhận cần kiểm tra riêng.",
  });
}
