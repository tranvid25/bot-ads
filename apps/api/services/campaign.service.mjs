import { one } from "../models/database.mjs";
import { error } from "../middleware/security.mjs";
export async function validateAssets(env, workspaceId, campaign) {
  for (const assetId of new Set(
    campaign.posts.map((p) => p.assetId).filter(Boolean),
  )) {
    if (
      !(await one(
        env,
        "SELECT id FROM assets WHERE id=? AND workspace_id=?",
        assetId,
        workspaceId,
      ))
    )
      throw error(400, "Ảnh không thuộc tài khoản hoặc đã bị xóa.");
  }
}
