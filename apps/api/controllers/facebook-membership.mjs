import { all, run } from "../models/database.mjs";
import { body, error } from "../middleware/security.mjs";
import { id, json } from "../lib/http.mjs";

export async function queueMembership(request, env, workspaceId) {
  const input = await body(request, 10000);
  const operation = input.operation;
  if (!["join", "check", "open"].includes(operation))
    throw error(400, "Chọn xin tham gia, kiểm tra hoặc mở nhóm trên BotAds.");
  if (
    !Array.isArray(input.ids) ||
    !input.ids.length ||
    input.ids.some((v) => typeof v !== "string")
  )
    throw error(400, "Chọn nhóm trong thư viện trước.");
  const ids = [...new Set(input.ids)];
  const limit = operation === "open" ? 1 : operation === "join" ? 20 : 50;
  if (ids.length > limit) throw error(400, `Mỗi lượt tối đa ${limit} nhóm.`);
  if (operation === "join" && input.confirmed !== true)
    throw error(
      400,
      "Xác nhận đã kiểm tra nội quy của các nhóm muốn tham gia.",
    );
  const library = await all(
    env,
    "SELECT * FROM facebook_groups WHERE workspace_id=?",
    workspaceId,
  );
  const groups = ids.map((key) => library.find((g) => g.id === key));
  if (groups.some((g) => !g))
    throw error(404, "Không tìm thấy nhóm trong tài khoản của bạn.");
  if (operation === "join" && groups.some((g) => g.eligibility === "rejected"))
    throw error(409, "Bỏ chọn nhóm đã loại trước khi xin tham gia.");
  const keys = [
    ...new Set(
      groups
        .map((g) => g.membership_account_key || g.account_key)
        .filter((k) => k !== "import"),
    ),
  ];
  if (keys.length > 1)
    throw error(409, "Chọn nhóm của cùng một tài khoản Facebook.");
  const previous = await all(
    env,
    `SELECT r.* FROM facebook_membership_results r JOIN facebook_discovery_jobs t ON t.id=r.task_id WHERE t.workspace_id=? AND r.group_id IN (${ids.map(() => "?").join(",")}) ORDER BY r.updated_at DESC,t.created_at DESC`,
    workspaceId,
    ...ids,
  );
  const config = {
    operation,
    accountKey: keys[0] || "",
    limit: groups.length,
    groups: groups.map((g) => {
      const last = previous.find((r) => r.group_id === g.id);
      return {
        id: g.id,
        url: g.url,
        name: g.name,
        allowJoin:
          !["joined", "requested", "manual_required"].includes(g.membership) &&
          !["checking", "unknown"].includes(last?.status),
      };
    }),
  };
  const now = Date.now(),
    taskId = id();
  await run(
    env,
    "UPDATE facebook_discovery_jobs SET status='failed',error='Lượt đã hết hạn. Kiểm tra lại trạng thái trước khi gửi yêu cầu mới.',updated_at=? WHERE workspace_id=? AND ((status='queued' AND deadline<?) OR (status='running' AND lease_until<?))",
    now,
    workspaceId,
    now,
    now,
  );
  try {
    await run(
      env,
      "INSERT INTO facebook_discovery_jobs(id,workspace_id,kind,config,created_at,updated_at,deadline) VALUES (?,?,'membership',?,?,?,?)",
      taskId,
      workspaceId,
      JSON.stringify(config),
      now,
      now,
      now + 7200000,
    );
  } catch (e) {
    if (String(e).includes("UNIQUE"))
      throw error(
        409,
        "Đang có lượt tìm hoặc xử lý nhóm. Chờ hoàn tất hoặc hủy lượt trước.",
      );
    throw e;
  }
  return json({ id: taskId, status: "queued", count: groups.length });
}
