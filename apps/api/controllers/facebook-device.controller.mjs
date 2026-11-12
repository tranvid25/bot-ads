import { all, one, run } from "../models/database.mjs";
import { body, error } from "../middleware/security.mjs";
import { id, json } from "../lib/http.mjs";
import { discoveredGroup } from "../../../packages/contracts/facebook.mjs";

export async function facebookDeviceRoute(
  request,
  env,
  { workspaceId, device },
  action,
) {
  if (request.method !== "POST")
    throw error(405, "Dùng POST cho API thiết bị.");
  const input = await body(request, 200000),
    now = Date.now();
  if (action === "claim") {
    if (
      !device.facebook_ready ||
      !/^[a-f0-9]{64}$/.test(input.accountKey || "")
    )
      return json({ task: null });
    await run(
      env,
      "UPDATE facebook_discovery_jobs SET status='failed',error='Mất kết nối máy. Hãy tạo lượt tìm mới.',updated_at=? WHERE workspace_id=? AND status='running' AND lease_until<?",
      now,
      workspaceId,
      now,
    );
    const task = await one(
      env,
      "UPDATE facebook_discovery_jobs SET status='running',device_id=?,account_key=?,lease_until=?,updated_at=? WHERE id=(SELECT id FROM facebook_discovery_jobs WHERE workspace_id=? AND status='queued' AND cancel_requested=0 AND deadline>? ORDER BY created_at LIMIT 1) AND status='queued' AND NOT EXISTS(SELECT 1 FROM desktop_social_tasks WHERE workspace_id=facebook_discovery_jobs.workspace_id AND status='running') AND NOT EXISTS(SELECT 1 FROM jobs WHERE workspace_id=? AND status IN ('running','needs_review')) RETURNING *",
      device.id,
      input.accountKey,
      now + 90000,
      now,
      workspaceId,
      now,
      workspaceId,
    );
    return json({
      task: task ? { ...task, config: JSON.parse(task.config) } : null,
    });
  }
  const task = await one(
    env,
    "SELECT * FROM facebook_discovery_jobs WHERE id=? AND workspace_id=? AND device_id=?",
    input.taskId,
    workspaceId,
    device.id,
  );
  if (!task) throw error(404, "Không tìm thấy job trên thiết bị này.");
  if (action === "heartbeat") {
    const stop =
      task.status !== "running" ||
      task.cancel_requested ||
      task.lease_until < now;
    if (!stop)
      await run(
        env,
        "UPDATE facebook_discovery_jobs SET lease_until=? WHERE id=? AND status='running'",
        now + 90000,
        task.id,
      );
    return json({ stop });
  }
  if (action === "report") {
    if (task.status === "completed") return json({ ok: true });
    if (
      task.status !== "running" ||
      task.cancel_requested ||
      task.lease_until < now
    )
      throw error(409, "Lượt tìm đã dừng hoặc hết hạn.");
    if (
      !Number.isInteger(input.sequence) ||
      input.sequence <= 0 ||
      input.sequence > 1000
    )
      throw error(400, "Sequence không hợp lệ.");
    if (input.sequence <= task.report_seq) return json({ ok: true });
    if (!Array.isArray(input.groups) || input.groups.length > 50)
      throw error(400, "Mỗi batch tối đa 50 nhóm.");
    if (task.groups_seen + input.groups.length > JSON.parse(task.config).limit)
      throw error(400, "Vượt giới hạn số nhóm của lượt tìm.");
    const groups = input.groups.map(discoveredGroup),
      statements = [];
    for (const group of groups)
      statements.push(
        env.DB.prepare(
          "INSERT INTO facebook_groups(id,workspace_id,account_key,url,name,source,membership,reason,checked_at,created_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM facebook_discovery_jobs WHERE id=? AND status='running' AND lease_until>=? AND report_seq<?) ON CONFLICT(workspace_id,account_key,url) DO UPDATE SET eligibility=CASE WHEN facebook_groups.membership!=excluded.membership OR facebook_groups.reason!=excluded.reason THEN 'unreviewed' ELSE facebook_groups.eligibility END,reviewed_at=CASE WHEN facebook_groups.membership!=excluded.membership OR facebook_groups.reason!=excluded.reason THEN NULL ELSE facebook_groups.reviewed_at END,name=excluded.name,membership=excluded.membership,reason=excluded.reason,checked_at=excluded.checked_at WHERE facebook_groups.checked_at<=excluded.checked_at",
        ).bind(
          id(),
          workspaceId,
          task.account_key,
          group.url,
          group.name,
          group.source,
          group.membership,
          group.reason,
          now,
          now,
          task.id,
          now,
          input.sequence,
        ),
      );
    statements.push(
      env.DB.prepare(
        "UPDATE facebook_discovery_jobs SET report_seq=?,groups_seen=groups_seen+?,status=?,error=?,updated_at=? WHERE id=? AND status='running' AND report_seq<? AND lease_until>=?",
      ).bind(
        input.sequence,
        groups.length,
        input.finished ? (input.error ? "failed" : "completed") : "running",
        String(input.error || "").slice(0, 500),
        now,
        task.id,
        input.sequence,
        now,
      ),
    );
    await env.DB.batch(statements);
    return json({ ok: true });
  }
  throw error(404, "Không tìm thấy thao tác discovery.");
}
