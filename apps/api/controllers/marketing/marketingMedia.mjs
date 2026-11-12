import { one } from "../../models/database.mjs";
import { error } from "../../middleware/security.mjs";
export async function marketingMedia(request, env) {
  if (request.method !== "GET" && request.method !== "HEAD")
    throw error(405, "Chỉ hỗ trợ đọc ảnh.");
  const mediaId = new URL(request.url).pathname.split("/").at(-1);
  const row = await one(
    env,
    "SELECT object_key,mime FROM marketing_public_media WHERE id=?",
    mediaId,
  );
  if (!row) throw error(404, "Không tìm thấy ảnh công khai.");
  const object = await env.MEDIA.get(row.object_key);
  if (!object) throw error(404, "Ảnh không còn tồn tại.");
  return new Response(request.method === "HEAD" ? null : object.body, {
    headers: {
      "Content-Type": row.mime,
      "Cache-Control": "public,max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
