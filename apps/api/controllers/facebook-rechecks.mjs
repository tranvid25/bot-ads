import { json } from "../lib/http.mjs";
import { one, run } from "../models/database.mjs";
import { error } from "../middleware/security.mjs";
export async function requestRecheck(request, env, attemptId, { workspaceId }) {
  const attempt = await one(
    env,
    "SELECT a.status,j.device_id FROM attempts a JOIN jobs j ON j.id=a.job_id WHERE a.id=? AND a.workspace_id=?",
    attemptId,
    workspaceId,
  );
  if (!attempt) throw error(404, "Không tìm thấy lượt gửi.");
  if (!["unknown", "pending_approval", "submitting"].includes(attempt.status))
    throw error(409, "Lượt này không cần đối soát.");
  if (!attempt.device_id)
    throw error(409, "Không tìm thấy máy đã thực hiện lượt gửi.");
  const result = await run(
    env,
    `INSERT INTO facebook_rechecks VALUES (?,?,?,'queued',?,NULL)
    ON CONFLICT(attempt_id) DO UPDATE SET status='queued',updated_at=excluded.updated_at,error=NULL
    WHERE facebook_rechecks.status='completed' AND facebook_rechecks.updated_at<?`,
    attemptId,
    workspaceId,
    attempt.device_id,
    Date.now(),
    Date.now() - 30000,
  );
  if (!result.meta.changes) {
    const existing = await one(env, "SELECT status FROM facebook_rechecks WHERE attempt_id=? AND workspace_id=?", attemptId, workspaceId);
    if (existing?.status === "completed") throw error(429, "Vừa kiểm tra xong. Đợi 30 giây trước khi yêu cầu lại.");
  }
  return json({
    ok: true,
    message:
      "Đã yêu cầu kiểm tra. Mở đúng máy đã đăng và bật nhận việc Facebook; hệ thống chỉ kiểm tra, không đăng lại.",
  });
}
