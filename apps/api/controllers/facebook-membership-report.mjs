import { error } from "../middleware/security.mjs";
import { json } from "../lib/http.mjs";

const states = [
  "checking",
  "joined",
  "requested",
  "not_joined",
  "manual_required",
  "unknown",
];
export async function membershipReport(env, task, input, now) {
  const config = JSON.parse(task.config),
    result = input.membership;
  const statements = [];
  const guard =
    "EXISTS(SELECT 1 FROM facebook_discovery_jobs WHERE id=? AND status='running' AND cancel_requested=0 AND lease_until>=? AND report_seq<?)";
  if (result) {
    const group = config.groups.find((g) => g.id === result.groupId);
    if (!group || !states.includes(result.status))
      throw error(400, "Kết quả nhóm không thuộc lượt này hoặc không hợp lệ.");
    const note = String(result.note || "").slice(0, 1000);
    statements.push(
      env.DB.prepare(
        `INSERT INTO facebook_membership_results(task_id,group_id,status,note,updated_at) SELECT ?,?,?,?,? WHERE ${guard} ON CONFLICT(task_id,group_id) DO UPDATE SET status=excluded.status,note=excluded.note,updated_at=excluded.updated_at WHERE ${guard}`,
      ).bind(
        task.id,
        group.id,
        result.status,
        note,
        now,
        task.id,
        now,
        input.sequence,
        task.id,
        now,
        input.sequence,
      ),
    );
    if (result.status !== "checking")
      statements.push(
        env.DB.prepare(
          `UPDATE facebook_groups SET membership=?,membership_note=?,membership_account_key=? WHERE id=? AND workspace_id=? AND (account_key='import' OR account_key=?) AND ${guard}`,
        ).bind(
          result.status,
          note,
          task.account_key,
          group.id,
          task.workspace_id,
          task.account_key,
          task.id,
          now,
          input.sequence,
        ),
      );
  }
  statements.push(
    env.DB.prepare(
      "UPDATE facebook_discovery_jobs SET report_seq=?,groups_seen=(SELECT COUNT(*) FROM facebook_membership_results WHERE task_id=? AND status!='checking'),status=?,error=?,updated_at=? WHERE id=? AND status='running' AND cancel_requested=0 AND report_seq<? AND lease_until>=?",
    ).bind(
      input.sequence,
      task.id,
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
