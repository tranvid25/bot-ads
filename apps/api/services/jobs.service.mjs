import { one, all, run } from "../models/database.mjs";
import { id } from "../lib/http.mjs";
import { error } from "../middleware/security.mjs";
import { isDue } from "../../../packages/contracts/campaign.mjs";
import { reviewedCampaign } from "./facebook-campaign.mjs";
import { expireTasks } from "./desktop-social/tasks.mjs";
export async function enqueue(env, row, slot) {
  const existing = await one(
    env,
    "SELECT id,status FROM jobs WHERE slot=?",
    slot,
  );
  if (existing) return existing;
  const pending = await one(
    env,
    "SELECT id FROM jobs WHERE workspace_id=? AND status='queued' LIMIT 1",
    row.workspace_id,
  );
  if (pending && slot.startsWith("manual:"))
    throw error(409, "Đã có lượt đang chờ. Xem ở mục Kết quả.");
  if (pending) return pending;
  const snapshot = await reviewedCampaign(
    env,
    row.workspace_id,
    JSON.parse(row.data),
    true,
  );
  const now = Date.now();
  const jobId = id();
  // Insert before network generation: repeated cron cannot create another side effect.
  await run(
    env,
    "INSERT OR IGNORE INTO jobs(id,workspace_id,campaign_id,slot,snapshot,status,created_at,updated_at) VALUES (?,?,?,?,?,'queued',?,?)",
    jobId,
    row.workspace_id,
    row.id,
    slot,
    JSON.stringify(snapshot),
    now,
    now,
  );
  return await one(env, "SELECT id,status FROM jobs WHERE slot=?", slot);
}
export async function scheduled(env, now = new Date()) {
  await expireTasks(env);
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE facebook_discovery_jobs SET status='failed',error='Hết thời gian chờ máy hoặc mất kết nối. Tạo lượt tìm mới khi máy sẵn sàng.',updated_at=? WHERE (status='queued' AND deadline<?) OR (status='running' AND lease_until<?)",
    ).bind(Date.now(), Date.now(), Date.now()),
    env.DB.prepare("DELETE FROM sessions WHERE expires_at<?").bind(Date.now()),
    env.DB.prepare("DELETE FROM pairings WHERE expires_at<?").bind(Date.now()),
    env.DB.prepare("DELETE FROM rate_limits WHERE expires_at<?").bind(
      Date.now(),
    ),
    env.DB.prepare(
      "UPDATE jobs SET status='needs_review',updated_at=? WHERE status='running' AND lease_until<?",
    ).bind(Date.now(), Date.now()),
    env.DB.prepare(
      "UPDATE jobs SET status='expired',updated_at=? WHERE status='queued' AND created_at<?",
    ).bind(Date.now(), Date.now() - 7200000),
  ]);
  const campaigns = await all(
    env,
    "SELECT * FROM campaigns WHERE enabled=1 LIMIT 500",
  );
  for (const row of campaigns) {
    const day = isDue(JSON.parse(row.data), now);
    if (day) {
      try {
        await enqueue(env, row, `schedule:${row.id}:${day}`);
      } catch (e) {
        if (![400, 409].includes(e.status)) throw e;
      }
    }
  }
}
