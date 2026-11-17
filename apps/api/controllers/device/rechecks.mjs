import { json } from "../../lib/http.mjs";
import { one, run } from "../../models/database.mjs";
import { body, error } from "../../middleware/security.mjs";
export async function rechecks(request, env, path, { workspaceId, device }) {
  if (!path.startsWith("/api/device/rechecks/") || request.method !== "POST")
    return;
  if (path.endsWith("/claim")) {
    const task = await one(
      env,
      `UPDATE facebook_rechecks SET status='running',updated_at=? WHERE attempt_id=(
      SELECT attempt_id FROM facebook_rechecks WHERE workspace_id=? AND device_id=? AND
      (status='queued' OR (status='running' AND updated_at<?)) ORDER BY updated_at LIMIT 1)
      RETURNING attempt_id`,
      Date.now(),
      workspaceId,
      device.id,
      Date.now() - 600000,
    );
    if (!task) return json({ task: null });
    const attempt = await one(
      env,
      "SELECT job_id FROM attempts WHERE id=? AND workspace_id=?",
      task.attempt_id,
      workspaceId,
    );
    return json({ task: { ...task, job_id: attempt.job_id } });
  }
  if (path.endsWith("/complete")) {
    const input = await body(request, 2000);
    const task = await one(env, "SELECT r.status,a.job_id FROM facebook_rechecks r JOIN attempts a ON a.id=r.attempt_id WHERE r.attempt_id=? AND r.workspace_id=? AND r.device_id=?", input.attemptId, workspaceId, device.id);
    if (task?.status === "completed") return json({ ok: true });
    if (!task || task.status !== "running") throw error(409, "Lượt kiểm tra không còn hoạt động.");
    const result = await run(
      env,
      "UPDATE facebook_rechecks SET status='completed',error=?,updated_at=? WHERE attempt_id=? AND workspace_id=? AND device_id=? AND status='running'",
      String(input.error || "").slice(0, 600),
      Date.now(),
      input.attemptId,
      workspaceId,
      device.id,
    );
    if (!result.meta.changes)
      throw error(409, "Lượt kiểm tra không còn hoạt động.");
    await run(env, "INSERT INTO job_events VALUES (?,?,?,?,?)", crypto.randomUUID(), task.job_id, workspaceId,
      `Đối soát bài ${input.attemptId.slice(0,8)}: ${String(input.error || "Đã cập nhật kết quả và đường dẫn bài.").slice(0,600)}`, Date.now());
    return json({ ok: true });
  }
}
