import { body, error } from "../middleware/security.mjs";
import { json } from "../lib/http.mjs";
import { all } from "../models/database.mjs";
export async function bulkReview(request, env, workspaceId) {
  const input = await body(request, 30000);
  if (
    input.confirmed !== true ||
    !Array.isArray(input.ids) ||
    !input.ids.length ||
    input.ids.length > 500 ||
    input.ids.some((id) => typeof id !== "string" || id.length > 100)
  )
    throw error(400, "Chọn tối đa 500 nhóm và xác nhận đã kiểm tra nội quy.");
  const ids = [...new Set(input.ids)];
  const groups = await all(
    env,
    "SELECT id,eligibility,reason FROM facebook_groups WHERE workspace_id=?",
    workspaceId,
  );
  const owned = groups.filter((group) => ids.includes(group.id));
  if (owned.length !== ids.length)
    throw error(404, "Danh sách có nhóm không thuộc tài khoản này.");
  const blocked = (group) =>
    group.eligibility === "rejected" ||
    /cấm quảng cáo|có điều kiện/i.test(group.reason || "");
  const eligible = owned.filter((group) => !blocked(group));
  const now = Date.now();
  for (let start = 0; start < eligible.length; start += 50) {
    await env.DB.batch(
      eligible
        .slice(start, start + 50)
        .map((group) =>
          env.DB.prepare(
            "UPDATE facebook_groups SET eligibility='approved',reviewed_at=? WHERE id=? AND workspace_id=? AND eligibility<>'rejected'",
          ).bind(now, group.id, workspaceId),
        ),
    );
  }
  return json({
    approved: eligible.length,
    skipped: owned.length - eligible.length,
  });
}
