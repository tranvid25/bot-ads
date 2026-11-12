import { json } from "../../lib/http.mjs";
import { one } from "../../models/database.mjs";
export async function claim(request, env, path, { workspaceId, device }) {
  if (path === "/api/device/claim" && request.method === "POST") {
    if (
      await one(
        env,
        "SELECT id FROM facebook_discovery_jobs WHERE workspace_id=? AND status='running' AND lease_until>?",
        workspaceId,
        Date.now(),
      )
    )
      return json({
        job: null,
      });
    if (!device.facebook_ready)
      return json({
        job: null,
      });
    const blocked = await one(
      env,
      "SELECT id FROM jobs WHERE workspace_id=? AND status IN ('running','needs_review')",
      workspaceId,
    );
    if (blocked)
      return json({
        job: null,
        blocked: blocked.id,
      });
    let row;
    try {
      row = await one(
        env,
        "UPDATE jobs SET status='running',device_id=?,lease_until=?,updated_at=? WHERE id=(SELECT id FROM jobs WHERE workspace_id=? AND status='queued' AND cancel_requested=0 AND created_at>? ORDER BY created_at LIMIT 1) AND status='queued' AND NOT EXISTS(SELECT 1 FROM desktop_social_tasks WHERE workspace_id=jobs.workspace_id AND status='running') AND NOT EXISTS(SELECT 1 FROM facebook_discovery_jobs WHERE workspace_id=? AND status='running' AND lease_until>?) RETURNING *",
        device.id,
        Date.now() + 90000,
        Date.now(),
        workspaceId,
        Date.now() - 7200000,
        workspaceId,
        Date.now(),
      );
    } catch (e) {
      if (String(e).includes("UNIQUE"))
        return json({
          job: null,
        });
      throw e;
    }
    if (!row)
      return json({
        job: null,
      });
    return json({
      job: {
        id: row.id,
        campaignId: row.campaign_id,
        campaign: JSON.parse(row.snapshot),
      },
    });
  }
}
