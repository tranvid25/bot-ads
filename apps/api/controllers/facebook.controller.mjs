import { all, one, run } from "../models/database.mjs";
import { body, error, rate } from "../middleware/security.mjs";
import { id, json } from "../lib/http.mjs";
import {
  discoveryConfig,
  discoveredGroup,
} from "../../../packages/contracts/facebook.mjs";

export async function facebookRoute(request, env, { workspaceId }) {
  const url = new URL(request.url),
    parts = url.pathname.split("/"),
    now = Date.now();
  if (request.method === "GET" && parts.length === 3) {
    const groups = await all(
      env,
      "SELECT * FROM facebook_groups WHERE workspace_id=? ORDER BY checked_at DESC LIMIT 500",
      workspaceId,
    );
    const tasks = await all(
      env,
      "SELECT * FROM facebook_discovery_jobs WHERE workspace_id=? ORDER BY created_at DESC LIMIT 20",
      workspaceId,
    );
    return json({
      groups,
      tasks: tasks.map((t) => ({ ...t, config: JSON.parse(t.config) })),
    });
  }
  await rate(env, `facebook:${workspaceId}`, 100, 3600);
  if (
    request.method === "POST" &&
    parts[3] === "discover" &&
    parts.length === 4
  ) {
    const config = discoveryConfig(await body(request, 5000));
    await run(
      env,
      "UPDATE facebook_discovery_jobs SET status='failed',error='Hết thời gian chờ máy hoặc mất kết nối. Có thể tạo lượt tìm mới.',updated_at=? WHERE workspace_id=? AND (status='queued' AND deadline<? OR status='running' AND lease_until<?)",
      now,
      workspaceId,
      now,
      now,
    );
    const taskId = id();
    try {
      await run(
        env,
        "INSERT INTO facebook_discovery_jobs(id,workspace_id,config,created_at,updated_at,deadline) VALUES (?,?,?,?,?,?)",
        taskId,
        workspaceId,
        JSON.stringify(config),
        now,
        now,
        now + 7200000,
      );
    } catch (e) {
      if (String(e).includes("UNIQUE"))
        throw error(409, "Đang có lượt tìm nhóm. Chờ hoàn tất hoặc hủy trước.");
      throw e;
    }
    return json({ id: taskId, status: "queued" });
  }
  const input = await body(request, 10000);
  if (parts[3] === "groups" && parts.length === 5 && request.method === "PUT") {
    if (!["approved", "rejected", "unreviewed"].includes(input.eligibility))
      throw error(400, "Trạng thái duyệt không hợp lệ.");
    if (input.eligibility === "approved" && input.confirmed !== true)
      throw error(
        400,
        "Xác nhận đã kiểm tra nội quy và quyền đăng trước khi duyệt nhóm.",
      );
    const result = await run(
      env,
      "UPDATE facebook_groups SET eligibility=?,reviewed_at=? WHERE id=? AND workspace_id=?",
      input.eligibility,
      now,
      parts[4],
      workspaceId,
    );
    if (!result.meta.changes) throw error(404, "Không tìm thấy nhóm.");
    return json({ ok: true });
  }
  if (
    parts[3] === "groups" &&
    parts.length === 4 &&
    request.method === "POST"
  ) {
    // Imported groups are workspace-scoped until a companion verifies membership.
    const group = discoveredGroup(input);
    await run(
      env,
      "INSERT INTO facebook_groups(id,workspace_id,account_key,url,name,source,reason,checked_at,created_at) VALUES (?,?,'import',?,?,'import',?,?,?) ON CONFLICT(workspace_id,account_key,url) DO NOTHING",
      id(),
      workspaceId,
      group.url,
      group.name,
      group.reason,
      now,
      now,
    );
    return json({ ok: true });
  }
  if (parts[3] === "tasks" && parts.length === 5 && request.method === "POST") {
    const task = await one(
      env,
      "SELECT id FROM facebook_discovery_jobs WHERE id=? AND workspace_id=?",
      parts[4],
      workspaceId,
    );
    if (!task) throw error(404, "Không tìm thấy lượt tìm.");
    await run(
      env,
      "UPDATE facebook_discovery_jobs SET cancel_requested=1,status='canceled',updated_at=? WHERE id=? AND workspace_id=? AND status IN ('queued','running')",
      now,
      parts[4],
      workspaceId,
    );
    return json({ ok: true });
  }
  throw error(404, "Không tìm thấy chức năng Facebook.");
}
