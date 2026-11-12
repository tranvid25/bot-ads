import { all, one } from "../../models/database.mjs";
import { id } from "../../lib/http.mjs";
import { execute } from "./execute.mjs";
export async function dispatchMarketing(env, { workspaceId, limit = 5 } = {}) {
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM marketing_oauth_states WHERE expires_at<?",
    ).bind(now),
    // A crash before HTTP submission can be retried; a crash after submission cannot.
    env.DB.prepare(
      "UPDATE marketing_publications SET status=CASE WHEN submit_started_at IS NULL THEN CASE WHEN cancel_requested=1 THEN 'canceled' ELSE 'scheduled' END ELSE 'unknown' END,error='Lượt chạy bị gián đoạn; bài đã bắt đầu gửi cần kiểm tra thủ công.',lease_until=NULL,updated_at=? WHERE status='publishing' AND lease_until<?",
    ).bind(now, now),
  ]);
  const due = await all(
    env,
    `SELECT id FROM marketing_publications WHERE transport='api' AND status IN ('scheduled','retry_wait') AND scheduled_at<=? AND cancel_requested=0${workspaceId ? " AND workspace_id=?" : ""} ORDER BY scheduled_at,id LIMIT ?`,
    now,
    ...(workspaceId ? [workspaceId] : []),
    Math.min(limit, 20),
  );
  let processed = 0;
  for (const candidate of due) {
    const claim = id();
    let publication;
    try {
      publication = await one(
        env,
        "UPDATE marketing_publications SET status='publishing',claim_token=?,lease_until=?,submit_started_at=NULL,attempt_count=attempt_count+1,updated_at=? WHERE id=? AND status IN ('scheduled','retry_wait') AND cancel_requested=0 RETURNING *",
        claim,
        Date.now() + 180000,
        Date.now(),
        candidate.id,
      );
    } catch (e) {
      if (/UNIQUE constraint/.test(String(e))) continue;
      throw e;
    }
    if (publication) {
      await execute(env, publication);
      processed++;
    }
  }
  return {
    processed,
  };
}
