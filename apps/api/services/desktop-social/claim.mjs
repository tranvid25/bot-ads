import { all, one, run } from "../../models/database.mjs";
import { json, id } from "../../lib/http.mjs";
import { lock, release } from "../marketing-publisher/locks.mjs";
import { expireTasks } from "./tasks.mjs";
import social from "../../../../packages/social-contract.cjs";

export async function claimSocial(env, { workspaceId, device }) {
  await expireTasks(env);
  if (!device.social_supported) return json({ task: null });
  const now = Date.now();
  await run(
    env,
    `INSERT INTO desktop_social_tasks(id,workspace_id,device_id,brand_id,provider,kind,publication_id,config,deadline,created_at,updated_at)
    SELECT p.id,p.workspace_id,c.device_id,c.brand_id,c.provider,'publish',p.id,
    json_object('actorId',c.actor_id,'channelId',c.id,'variant',json(p.snapshot)),p.scheduled_at+7200000,?,?
    FROM marketing_publications p JOIN marketing_channels c ON c.id=p.channel_id
    WHERE p.workspace_id=? AND c.device_id=? AND c.transport='desktop' AND p.transport='desktop' AND c.status='connected'
    AND p.status='scheduled' AND p.cancel_requested=0 AND p.scheduled_at<=? AND p.scheduled_at>?
    ON CONFLICT(id) DO UPDATE SET status='queued',claim_token=NULL,config=excluded.config,deadline=excluded.deadline,updated_at=excluded.updated_at
    WHERE desktop_social_tasks.status IN ('failed','canceled') AND desktop_social_tasks.lease_until IS NOT NULL`,
    now,
    now,
    workspaceId,
    device.id,
    now,
    now - 7200000,
  );
  const candidates = await all(
    env,
    "SELECT * FROM desktop_social_tasks WHERE workspace_id=? AND device_id=? AND status='queued' AND deadline>? ORDER BY CASE kind WHEN 'connect' THEN 0 ELSE 1 END,created_at LIMIT 5",
    workspaceId,
    device.id,
    now,
  );
  for (const task of candidates) {
    const token = id(),
      config = JSON.parse(task.config);
    if (task.kind === "publish") {
      const unresolved = await one(
        env,
        "SELECT p.id FROM marketing_publications p JOIN marketing_channels c ON c.id=p.channel_id WHERE c.provider=? AND c.actor_id=? AND p.status IN ('unknown','publishing')",
        task.provider,
        config.actorId,
      );
      if (unresolved) continue;
      const asset = config.variant.assetId
        ? await one(
            env,
            "SELECT mime FROM assets WHERE id=? AND workspace_id=?",
            config.variant.assetId,
            workspaceId,
          )
        : null;
      try {
        social.variant(task.provider, config.variant, asset);
      } catch (e) {
        await run(
          env,
          "UPDATE marketing_publications SET status='failed',error=?,updated_at=? WHERE id=? AND status='scheduled'",
          e.message,
          now,
          task.id,
        );
        await run(
          env,
          "UPDATE desktop_social_tasks SET status='failed',error=?,updated_at=? WHERE id=?",
          e.message,
          now,
          task.id,
        );
        continue;
      }
      if (!(await lock(env, "workspace", workspaceId, token))) continue;
      if (!(await lock(env, task.provider, config.actorId, token))) {
        await release(env, "workspace", workspaceId, token);
        continue;
      }
    }
    let claimed;
    try {
      claimed = await one(
        env,
        `UPDATE desktop_social_tasks SET status='running',claim_token=?,lease_until=?,updated_at=? WHERE id=? AND status='queued'
        AND NOT EXISTS(SELECT 1 FROM jobs WHERE workspace_id=? AND status IN ('running','needs_review'))
        AND NOT EXISTS(SELECT 1 FROM facebook_discovery_jobs WHERE workspace_id=? AND status='running' AND lease_until>?)
        RETURNING *`,
        token,
        now + 90000,
        now,
        task.id,
        workspaceId,
        workspaceId,
        now,
      );
    } catch (e) {
      if (!String(e).includes("UNIQUE")) throw e;
    }
    if (claimed) {
      if (task.kind === "publish") {
        const updated = await run(
          env,
          "UPDATE marketing_publications SET status='publishing',claim_token=?,lease_until=?,attempt_count=attempt_count+1,updated_at=? WHERE id=? AND status='scheduled' AND cancel_requested=0",
          token,
          now + 90000,
          now,
          task.id,
        );
        if (!updated.meta.changes) {
          await run(
            env,
            "UPDATE desktop_social_tasks SET status='canceled' WHERE id=?",
            task.id,
          );
          claimed = null;
        }
      }
      if (claimed)
        return json({
          task: {
            id: task.id,
            kind: task.kind,
            provider: task.provider,
            config,
            claimToken: token,
            leaseUntil: now + 45000,
          },
        });
    }
    if (task.kind === "publish") {
      await release(env, "workspace", workspaceId, token);
      await release(env, task.provider, config.actorId, token);
    }
  }
  return json({ task: null });
}
