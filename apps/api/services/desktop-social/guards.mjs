import { one, run } from "../../models/database.mjs";
import { json } from "../../lib/http.mjs";
import { error } from "../../middleware/security.mjs";
import { localClock } from "../../../../packages/contracts/campaign.mjs";

export async function activeTask(env, task) {
  if (
    task.status !== "running" ||
    task.lease_until < Date.now() ||
    task.deadline < Date.now()
  )
    throw error(409, "Tác vụ đã dừng hoặc hết hạn.");
  if (task.kind === "publish") {
    const row = await one(
      env,
      "SELECT p.*,c.actor_id,c.status AS channel_status,c.device_id FROM marketing_publications p JOIN marketing_channels c ON c.id=p.channel_id WHERE p.id=? AND p.claim_token=?",
      task.publication_id,
      task.claim_token,
    );
    if (
      !row ||
      row.status !== "publishing" ||
      row.cancel_requested ||
      row.channel_status !== "connected" ||
      row.device_id !== task.device_id ||
      row.actor_id !== JSON.parse(task.config).actorId
    )
      throw error(409, "Lịch hoặc kết nối đã thay đổi. Dừng trước khi gửi.");
    return row;
  }
}
export async function socialHeartbeat(env, task) {
  try {
    await activeTask(env, task);
  } catch {
    return json({ stop: true });
  }
  const until = Date.now() + 90000;
  await run(
    env,
    "UPDATE desktop_social_tasks SET lease_until=?,updated_at=? WHERE id=? AND status='running' AND claim_token=?",
    until,
    Date.now(),
    task.id,
    task.claim_token,
  );
  if (task.kind === "publish")
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE marketing_publications SET lease_until=? WHERE id=? AND status='publishing' AND claim_token=?",
      ).bind(until, task.id, task.claim_token),
      env.DB.prepare(
        "UPDATE marketing_account_slots SET until_at=? WHERE owner_token=?",
      ).bind(until + 60000, task.claim_token),
    ]);
  return json({ stop: false });
}
export async function beforeSocialSubmit(env, task) {
  const publication = await activeTask(env, task);
  if (!publication || publication.submit_started_at)
    throw error(
      409,
      "Lượt đã giữ chỗ hoặc không phải lượt đăng. Không gửi lại.",
    );
  const workspace = await one(
    env,
    "SELECT * FROM workspaces WHERE id=?",
    task.workspace_id,
  );
  const day = localClock(new Date(), workspace.timezone).day,
    now = Date.now();
  const result = await run(
    env,
    `UPDATE marketing_publications SET submit_started_at=?,quota_day=?,updated_at=?
    WHERE id=? AND claim_token=? AND status='publishing' AND submit_started_at IS NULL AND cancel_requested=0 AND lease_until>?
    AND EXISTS(SELECT 1 FROM marketing_channels WHERE id=marketing_publications.channel_id AND status='connected' AND device_id=? AND actor_id=?)
    AND (SELECT count(*) FROM marketing_publications WHERE workspace_id=? AND quota_day=? AND submit_started_at IS NOT NULL AND status IN ('publishing','published','unknown','user_reported_published'))<?
    AND (SELECT count(*) FROM marketing_publications p JOIN marketing_channels c ON c.id=p.channel_id WHERE c.provider=? AND c.actor_id=? AND p.submit_started_at>? AND p.status IN ('publishing','published','unknown','user_reported_published'))<?`,
    now,
    day,
    now,
    task.id,
    task.claim_token,
    now,
    task.device_id,
    publication.actor_id,
    task.workspace_id,
    day,
    workspace.daily_limit,
    task.provider,
    publication.actor_id,
    now - 86400000,
    Math.max(1, Number(env.MARKETING_ACCOUNT_DAILY_LIMIT) || 100),
  );
  if (!result.meta.changes)
    throw error(409, "Đã dừng, kết nối thay đổi hoặc hết hạn mức đăng.");
  return json({ ok: true });
}
