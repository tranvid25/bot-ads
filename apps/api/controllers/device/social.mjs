import { body, error } from "../../middleware/security.mjs";
import { one, run } from "../../models/database.mjs";
import { json } from "../../lib/http.mjs";
import { claimSocial } from "../../services/desktop-social/claim.mjs";
import {
  socialHeartbeat,
  beforeSocialSubmit,
} from "../../services/desktop-social/guards.mjs";
import { reportSocial } from "../../services/desktop-social/report.mjs";

export async function social(request, env, path, context) {
  if (!path.startsWith("/api/device/social/")) return;
  if (request.method !== "POST")
    throw error(405, "Dùng POST cho tác vụ máy tính.");
  const input = await body(request, 15000),
    action = path.split("/").at(-1);
  if (action === "forget") {
    if (!["threads", "instagram"].includes(input.provider))
      throw error(400, "Kênh không hợp lệ.");
    await run(
      env,
      "UPDATE marketing_channels SET status='needs_reauth' WHERE workspace_id=? AND device_id=? AND provider=? AND transport='desktop'",
      context.workspaceId,
      context.device.id,
      input.provider,
    );
    return json({ ok: true });
  }
  if (action === "claim") return claimSocial(env, context);
  const task = await one(
    env,
    "SELECT * FROM desktop_social_tasks WHERE id=? AND workspace_id=? AND device_id=? AND claim_token=?",
    input.taskId,
    context.workspaceId,
    context.device.id,
    input.claimToken,
  );
  if (!task) throw error(404, "Không tìm thấy tác vụ trên thiết bị này.");
  if (action === "heartbeat") return socialHeartbeat(env, task);
  if (action === "before-submit") return beforeSocialSubmit(env, task);
  if (action === "report") return reportSocial(env, task, input);
  throw error(404, "Không tìm thấy thao tác máy tính.");
}
