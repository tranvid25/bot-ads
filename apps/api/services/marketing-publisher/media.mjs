import { one, run } from "../../models/database.mjs";
import { id } from "../../lib/http.mjs";
import { PublishError } from "../marketing-providers.mjs";
export async function prepareImage(env, p, variant) {
  if (!variant.assetId) return null;
  const source = await one(
    env,
    "SELECT * FROM assets WHERE id=? AND workspace_id=?",
    variant.assetId,
    p.workspace_id,
  );
  if (
    !source ||
    !["image/jpeg", "image/png", "image/webp"].includes(source.mime)
  )
    throw new PublishError(
      "Ảnh không còn tồn tại hoặc định dạng chưa được hỗ trợ.",
    );
  const original = await env.MEDIA.get(source.object_key);
  if (!original) throw new PublishError("Không tìm thấy dữ liệu ảnh.");
  const bytes = await original.arrayBuffer();
  // Copy an immutable public image only for an approved publication, never expose private asset URLs.
  let media = await one(
    env,
    "SELECT * FROM marketing_public_media WHERE publication_id=?",
    p.id,
  );
  if (!media) {
    const mediaId = id();
    const objectKey = `marketing-public/${p.workspace_id}/${mediaId}`;
    await env.MEDIA.put(objectKey, bytes, {
      httpMetadata: {
        contentType: source.mime,
      },
    });
    await run(
      env,
      "INSERT INTO marketing_public_media VALUES (?,?,?,?,?,?)",
      mediaId,
      p.id,
      p.workspace_id,
      objectKey,
      source.mime,
      Date.now(),
    );
    media = {
      id: mediaId,
    };
  }
  const origin = new URL(env.PUBLIC_APP_URL).origin;
  return {
    bytes,
    mime: source.mime,
    url: `${origin}/api/marketing/media/${media.id}`,
  };
}
