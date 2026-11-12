import { one, run } from "../../models/database.mjs";
import { json, id } from "../../lib/http.mjs";
import { body, error } from "../../middleware/security.mjs";
import { validateMarketingPost } from "../../../../packages/contracts/marketing.mjs";
import { owned } from "./owned.mjs";
export async function postSave(request, env, context, execution) {
  const { workspaceId } = context;
  const path = new URL(request.url).pathname,
    method = request.method,
    parts = path.split("/");
  if (parts[3] !== "posts") return;
  if (
    (parts.length === 4 && method === "POST") ||
    (parts.length === 5 && method === "PUT")
  ) {
    const input = await body(request, 900000);
    const post = validateMarketingPost(input);
    await owned(env, "marketing_brands", workspaceId, String(input.brandId));
    for (const v of post.variants)
      if (v.assetId) {
        const asset = await one(
          env,
          "SELECT id FROM assets WHERE id=? AND workspace_id=?",
          v.assetId,
          workspaceId,
        );
        if (!asset) throw error(400, "Ảnh không thuộc không gian của bạn.");
      }
    const postId = parts[4] || id();
    if (method === "PUT") {
      const existing = await owned(env, "marketing_posts", workspaceId, postId);
      if (existing.brand_id !== input.brandId)
        throw error(400, "Không thể đổi thương hiệu của bài đã tạo.");
      const result = await run(
        env,
        "UPDATE marketing_posts SET title=?,source_url=?,variants=?,status='draft',revision=revision+1,approved_at=NULL,updated_at=? WHERE id=? AND workspace_id=? AND revision=?",
        post.title,
        post.sourceUrl,
        JSON.stringify(post.variants),
        Date.now(),
        postId,
        workspaceId,
        Number(input.revision),
      );
      if (!result.meta.changes)
        throw error(409, "Bài đã thay đổi. Tải lại trước khi lưu.");
    } else {
      const count = await one(
        env,
        "SELECT count(*) AS n FROM marketing_posts WHERE workspace_id=?",
        workspaceId,
      );
      if (count.n >= 100)
        throw error(400, "Bản hiện tại hỗ trợ 100 bài mỗi không gian.");
      await run(
        env,
        "INSERT INTO marketing_posts(id,workspace_id,brand_id,title,source_url,variants,updated_at) VALUES (?,?,?,?,?,?,?)",
        postId,
        workspaceId,
        input.brandId,
        post.title,
        post.sourceUrl,
        JSON.stringify(post.variants),
        Date.now(),
      );
    }
    return json({
      id: postId,
    });
  }
}
