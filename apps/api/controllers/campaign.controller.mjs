import { json, maxDaily, id, validPostUrl } from "../lib/http.mjs";
import { one, all, run } from "../models/database.mjs";
import {
  body,
  token,
  hash,
  passwordHash,
  equal,
  error,
  rate,
  identity,
  cookieHeader,
} from "../middleware/security.mjs";
import { validateCampaign } from "../../../packages/contracts/campaign.mjs";
import { generate } from "../services/gemini.service.mjs";
import { validateAssets } from "../services/campaign.service.mjs";
import { enqueue } from "../services/jobs.service.mjs";
export async function generateDrafts(request, env, path, method, context = {}) {
  const { workspaceId, user } = context;
  return json({
    posts: await generate(env, workspaceId, await body(request, 12000)),
  });
}

export async function saveCampaign(request, env, path, method, context = {}) {
  const { workspaceId, user } = context;

  const campaign = validateCampaign(await body(request), maxDaily(env));
  campaign.timezone = user.timezone;
  await validateAssets(env, workspaceId, campaign);
  const campaignId = method === "POST" ? id() : path.split("/").at(-1);
  if (method === "POST") {
    const total = await one(
      env,
      "SELECT count(*) AS count FROM campaigns WHERE workspace_id=?",
      workspaceId,
    );
    if (total.count >= 20)
      throw error(400, "Bản đầu hỗ trợ tối đa 20 chiến dịch mỗi tài khoản.");
    await run(
      env,
      "INSERT INTO campaigns VALUES (?,?,?,?,?,?)",
      campaignId,
      workspaceId,
      campaign.name,
      JSON.stringify(campaign),
      campaign.enabled ? 1 : 0,
      Date.now(),
    );
  } else {
    const result = await run(
      env,
      "UPDATE campaigns SET name=?,data=?,enabled=?,updated_at=? WHERE id=? AND workspace_id=?",
      campaign.name,
      JSON.stringify(campaign),
      campaign.enabled ? 1 : 0,
      Date.now(),
      campaignId,
      workspaceId,
    );
    if (!result.meta.changes) throw error(404, "Không tìm thấy chiến dịch.");
  }
  if (!campaign.enabled)
    await run(
      env,
      "UPDATE jobs SET status='canceled',cancel_requested=1 WHERE campaign_id=? AND workspace_id=? AND status='queued' AND slot LIKE 'schedule:%'",
      campaignId,
      workspaceId,
    );
  return json({ id: campaignId });
}

export async function runCampaign(request, env, path, method, context = {}) {
  const { workspaceId, user } = context;

  await rate(env, `run:${workspaceId}`, 20, 3600);
  const row = await one(
    env,
    "SELECT * FROM campaigns WHERE id=? AND workspace_id=?",
    path.split("/")[3],
    workspaceId,
  );
  if (!row) throw error(404, "Không tìm thấy chiến dịch.");
  return json(
    await enqueue(
      env,
      row,
      `manual:${row.id}:${Math.floor(Date.now() / 60000)}`,
    ),
  );
}
