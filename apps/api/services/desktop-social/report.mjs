import { one, run } from "../../models/database.mjs";
import { json, id } from "../../lib/http.mjs";
import { error } from "../../middleware/security.mjs";
import { activeTask } from "./guards.mjs";
import { release, event } from "../marketing-publisher/locks.mjs";
import social from "../../../../packages/social-contract.cjs";

export async function reportSocial(env, task, input) {
  if (task.status !== "running") return json({ ok: true });
  let state = [
    "published",
    "failed",
    "needs_reauth",
    "unknown",
    "canceled",
  ].includes(input.status)
    ? input.status
    : "failed";
  let message = String(input.error || "").slice(0, 600);
  const now = Date.now(),
    config = JSON.parse(task.config);
  if (task.kind === "connect") {
    await activeTask(env, task);
    if (input.status === "connected") {
      const account = social.identity(task.provider, input.identity);
      await run(
        env,
        `INSERT INTO marketing_channels(id,workspace_id,brand_id,provider,actor_id,name,transport,device_id,scopes,status,created_at)
        VALUES (?,?,?,?,?,?,'desktop',?,'desktop_browser','connected',?)
        ON CONFLICT(workspace_id,brand_id,provider,actor_id) DO UPDATE SET name=excluded.name,transport='desktop',device_id=excluded.device_id,status='connected',credential=NULL,expires_at=NULL`,
        id(),
        task.workspace_id,
        task.brand_id,
        task.provider,
        account.actorId,
        account.name,
        task.device_id,
        now,
      );
      state = "completed";
    }
  } else {
    const p = await one(
      env,
      "SELECT * FROM marketing_publications WHERE id=? AND claim_token=?",
      task.id,
      task.claim_token,
    );
    if (!p || !["publishing", "unknown"].includes(p.status))
      return json({ ok: true });
    const evidence = social.permalink(task.provider, input.permalink);
    if (state === "published" && (!evidence || !p.submit_started_at))
      throw error(
        400,
        "Thiếu bằng chứng link bài hoặc chưa giữ chỗ trước gửi.",
      );
    if (
      state === "published" &&
      task.provider === "threads" &&
      new URL(evidence.permalink).pathname
        .split("/")[1]
        .slice(1)
        .toLowerCase() !== config.actorId
    )
      throw error(400, "Link bài không thuộc tài khoản đã chọn.");
    if (p.submit_started_at && state !== "published") state = "unknown";
    if (!p.submit_started_at && state === "unknown") state = "failed";
    if (!p.submit_started_at && p.cancel_requested) state = "canceled";
    if (task.lease_until < now && !p.submit_started_at) state = "failed";
    await run(
      env,
      "UPDATE marketing_publications SET status=?,remote_id=?,permalink=?,error=?,lease_until=NULL,updated_at=? WHERE id=? AND claim_token=? AND status IN ('publishing','unknown')",
      state,
      evidence?.remoteId || null,
      evidence?.permalink || null,
      message,
      now,
      task.id,
      task.claim_token,
    );
    if (state === "needs_reauth")
      await run(
        env,
        "UPDATE marketing_channels SET status='needs_reauth' WHERE id=? AND device_id=?",
        config.channelId,
        task.device_id,
      );
    await event(
      env,
      { ...p, claim_token: task.claim_token },
      state,
      message ||
        (state === "published"
          ? "Máy tính đã xác nhận link bài trên nền tảng."
          : "Máy tính đã kết thúc lượt. Kiểm tra trạng thái trước khi thử lại."),
    );
    await release(env, task.provider, config.actorId, task.claim_token, 60000);
    await release(env, "workspace", task.workspace_id, task.claim_token);
  }
  await run(
    env,
    "UPDATE desktop_social_tasks SET status=?,error=?,updated_at=? WHERE id=? AND claim_token=? AND status='running'",
    state === "published" ? "completed" : state,
    message,
    now,
    task.id,
    task.claim_token,
  );
  return json({ ok: true });
}
