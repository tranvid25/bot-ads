import { json } from "../../lib/http.mjs";
import { one, run } from "../../models/database.mjs";
import { body, error } from "../../middleware/security.mjs";
import { generate } from "../../services/gemini.service.mjs";
import { reviewedCampaign } from "../../services/facebook-campaign.mjs";
export async function prepare(request, env, path, { workspaceId, device }) {
  if (path === "/api/device/prepare" && request.method === "POST") {
    const input = await body(request, 2000);
    const row = await one(
      env,
      "SELECT * FROM jobs WHERE id=? AND workspace_id=? AND device_id=? AND status='running' AND cancel_requested=0 AND lease_until>?",
      input.jobId,
      workspaceId,
      device.id,
      Date.now(),
    );
    if (!row) throw error(409, "Lượt chạy không còn hiệu lực.");
    const campaign = await reviewedCampaign(
      env,
      workspaceId,
      JSON.parse(row.snapshot),
      true,
      true,
    );
    if (campaign.autoGenerate && !campaign.generatedForJob) {
      const oldAssets = campaign.posts
        .filter((p) => p.selected && p.assetId)
        .map((p) => p.assetId);
      campaign.posts = await generate(env, workspaceId, {
        ...campaign,
        count: Math.min(5, campaign.dailyLimit),
      });
      campaign.posts.forEach((p, i) => {
        p.assetId = oldAssets.length ? oldAssets[i % oldAssets.length] : "";
      });
      campaign.generatedForJob = true;
      await run(
        env,
        "UPDATE jobs SET snapshot=?,lease_until=? WHERE id=?",
        JSON.stringify(campaign),
        Date.now() + 90000,
        row.id,
      );
    }
    const workspace = await one(
      env,
      "SELECT daily_limit,timezone FROM workspaces WHERE id=?",
      workspaceId,
    );
    return json({
      campaign,
      workspace,
    });
  }
}
