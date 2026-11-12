import { all, run } from "../../models/database.mjs";
import { release } from "../marketing-publisher/locks.mjs";

export async function expireTasks(env) {
  const now = Date.now();
  const expired = await all(
    env,
    "SELECT * FROM desktop_social_tasks WHERE (status='running' AND lease_until<?) OR (status='queued' AND deadline<?)",
    now,
    now,
  );
  for (const task of expired) {
    const message =
      "Máy mất kết nối hoặc lượt đã quá hạn. Kiểm tra kết quả trước khi tạo lượt mới.";
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE marketing_publications SET status=CASE WHEN submit_started_at IS NULL THEN 'failed' ELSE 'unknown' END,error=?,lease_until=NULL,updated_at=? WHERE id=? AND claim_token=? AND status='publishing'",
      ).bind(message, now, task.publication_id, task.claim_token),
      env.DB.prepare(
        "UPDATE desktop_social_tasks SET status='failed',error=?,updated_at=? WHERE id=? AND status IN ('queued','running') AND (lease_until<? OR deadline<?)",
      ).bind(message, now, task.id, now, now),
    ]);
    if (task.claim_token)
      await release(env, "workspace", task.workspace_id, task.claim_token);
  }
  await run(
    env,
    "UPDATE marketing_publications SET status='expired',error='Máy chưa nhận việc trong 2 giờ. Hãy đặt lịch mới.',updated_at=? WHERE transport='desktop' AND status='scheduled' AND scheduled_at<?",
    now,
    now - 7200000,
  );
}
