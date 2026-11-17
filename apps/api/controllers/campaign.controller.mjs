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
import { reviewedCampaign } from "../services/facebook-campaign.mjs";
import { requestKey, finishCampaign } from "../services/campaign-request.mjs";
export async function generateDrafts(request, env, path, method, context = {}) {
  const { workspaceId, user } = context;
  return json({
    posts: await generate(env, workspaceId, await body(request, 12000)),
  });
}

export async function saveCampaign(request, env, path, method, context = {}) {
  const { workspaceId, user } = context;

  const input = await body(request);
  const key = requestKey(input);
  const requestHash = key ? await hash(JSON.stringify(input)) : null;
  if (method === "POST" && key) {
    const previous = await one(env, "SELECT * FROM campaigns WHERE id=?", key);
    if (previous) {
      if (JSON.parse(previous.data).requestHash !== requestHash)
        throw error(
          409,
          "Yêu cầu này đã lưu với nội dung khác. Mở chiến dịch đã lưu để chỉnh sửa.",
        );
      if (
        previous.workspace_id !== workspaceId ||
        JSON.parse(previous.data).deletedAt
      )
        throw error(409, "Mã yêu cầu đã sử dụng.");
      return json(await finishCampaign(env, workspaceId, key, input));
    }
  }
  const campaign = await reviewedCampaign(
    env,
    workspaceId,
    validateCampaign(
      input.publishMode === "now" ? { ...input, enabled: false, scheduleType: "weekly" } : input,
      maxDaily(env),
    ),
  );
  campaign.timezone = user.timezone;
  if (key) campaign.requestHash = requestHash;
  await validateAssets(env, workspaceId, campaign);
  const campaignId = method === "POST" ? key || id() : path.split("/").at(-1);
  if (method === "POST") {
    const total = await one(
      env,
      "SELECT count(*) AS count FROM campaigns WHERE workspace_id=? AND json_extract(data,'$.deletedAt') IS NULL",
      workspaceId,
    );
    if (total.count >= 20)
      throw error(400, "Bản đầu hỗ trợ tối đa 20 chiến dịch mỗi tài khoản.");
    await run(
      env,
      "INSERT OR IGNORE INTO campaigns VALUES (?,?,?,?,?,?)",
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
      "UPDATE campaigns SET name=?,data=?,enabled=?,updated_at=? WHERE id=? AND workspace_id=? AND json_extract(data,'$.deletedAt') IS NULL",
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
  if (method === "POST" && key) {
    const actual = await one(env, "SELECT data,workspace_id FROM campaigns WHERE id=?", campaignId);
    if (!actual || actual.workspace_id !== workspaceId || JSON.parse(actual.data).requestHash !== requestHash)
      throw error(409, "Mã yêu cầu đang được dùng cho nội dung khác.");
  }
  return json(await finishCampaign(env, workspaceId, campaignId, input));
}

export async function runCampaign(request, env, path, method, context = {}) {
  const { workspaceId, user } = context;

  await rate(env, `run:${workspaceId}`, 20, 3600);
  const row = await one(
    env,
    "SELECT * FROM campaigns WHERE id=? AND workspace_id=? AND json_extract(data,'$.deletedAt') IS NULL",
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
