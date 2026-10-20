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
export async function cancelJob(request, env, path, method, context = {}) {
  const { workspaceId, user } = context;

  await run(
    env,
    "UPDATE jobs SET cancel_requested=1,status=CASE WHEN status='queued' THEN 'canceled' ELSE status END WHERE id=? AND workspace_id=?",
    path.split("/")[3],
    workspaceId,
  );
  return json({ ok: true });
}

export async function jobEvents(request, env, path, method, context = {}) {
  const { workspaceId, user } = context;
  return json({
    events: await all(
      env,
      "SELECT text,created_at FROM job_events WHERE job_id=? AND workspace_id=? ORDER BY created_at DESC LIMIT 100",
      path.split("/")[3],
      workspaceId,
    ),
  });
}
