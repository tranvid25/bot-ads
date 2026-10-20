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
import { integer } from "../../../packages/contracts/campaign.mjs";
export async function updateSettings(request, env, path, method, context = {}) {
  const { workspaceId, user } = context;

  const input = await body(request, 2000);
  const limit = integer(
    input.dailyLimit,
    1,
    maxDaily(env),
    "Hạn mức tài khoản",
  );
  // A fixed timezone per account prevents changing the day boundary to reset the quota.
  await run(
    env,
    "UPDATE workspaces SET daily_limit=? WHERE id=?",
    limit,
    workspaceId,
  );
  return json({ ok: true });
}
