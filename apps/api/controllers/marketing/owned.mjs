import { one } from "../../models/database.mjs";
import { error } from "../../middleware/security.mjs";
export async function owned(env, table, workspaceId, rowId) {
  const allowed = [
    "marketing_brands",
    "marketing_channels",
    "marketing_posts",
    "marketing_publications",
  ];
  if (!allowed.includes(table)) throw new Error("Invalid repository");
  const row = await one(
    env,
    `SELECT * FROM ${table} WHERE id=? AND workspace_id=?`,
    rowId,
    workspaceId,
  );
  if (!row)
    throw error(404, "Không tìm thấy dữ liệu trong không gian của bạn.");
  return row;
}
