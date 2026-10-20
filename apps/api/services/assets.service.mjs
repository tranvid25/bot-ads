import { one } from "../models/database.mjs";
import { error } from "../middleware/security.mjs";
export async function assetResponse(env, workspaceId, assetId) {
  const row = await one(
    env,
    "SELECT * FROM assets WHERE id=? AND workspace_id=?",
    assetId,
    workspaceId,
  );
  if (!row) throw error(404, "Không tìm thấy ảnh.");
  const object = await env.MEDIA.get(row.object_key);
  if (!object) throw error(404, "Ảnh không còn tồn tại.");
  return new Response(object.body, {
    headers: {
      "Content-Type": row.mime,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
