import { json, maxDaily, id, validPostUrl, publicUser } from "../lib/http.mjs";
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
import { localClock } from "../../../packages/contracts/campaign.mjs";
export async function dashboard(request, env, path, method, context = {}) {
  const { workspaceId, user } = context;

  const [campaigns, devices, jobs, assets, attempts] = await Promise.all([
    all(
      env,
      "SELECT * FROM campaigns WHERE workspace_id=? ORDER BY updated_at DESC",
      workspaceId,
    ),
    all(
      env,
      "SELECT id,name,last_seen,facebook_ready,revoked_at FROM devices WHERE workspace_id=? AND revoked_at IS NULL",
      workspaceId,
    ),
    all(
      env,
      "SELECT id,campaign_id,status,created_at,updated_at,cancel_requested,result FROM jobs WHERE workspace_id=? ORDER BY created_at DESC LIMIT 50",
      workspaceId,
    ),
    all(
      env,
      "SELECT id,name,mime,size FROM assets WHERE workspace_id=? ORDER BY created_at DESC LIMIT 100",
      workspaceId,
    ),
    all(
      env,
      "SELECT * FROM attempts WHERE workspace_id=? ORDER BY updated_at DESC LIMIT 100",
      workspaceId,
    ),
  ]);
  const day = localClock(new Date(), user.timezone).day;
  const usage = await one(
    env,
    "SELECT count(*) AS count FROM attempts WHERE workspace_id=? AND day=? AND status IN ('submitting','unknown','success','pending_approval')",
    workspaceId,
    day,
  );
  return json({
    user: publicUser(user),
    settings: { dailyLimit: user.daily_limit, timezone: user.timezone },
    usage: usage.count,
    campaigns: campaigns.map((c) => ({
      id: c.id,
      ...JSON.parse(c.data),
      enabled: !!c.enabled,
    })),
    devices,
    jobs,
    assets,
    attempts: attempts.map((a) => ({
      ...a,
      ...JSON.parse(a.data),
      data: undefined,
    })),
  });
}
