import { all, one, run } from "../models/database.mjs";
import { body, error, rate } from "../middleware/security.mjs";
import { id, json } from "../lib/http.mjs";
import { validateAssets } from "../services/campaign.service.mjs";
export async function templateRoute(request, env, { workspaceId }) {
  const parts = new URL(request.url).pathname.split("/");
  const templateId = parts[4];
  if (request.method === "GET" && !templateId)
    return json({
      templates: await all(
        env,
        "SELECT id,title,content,asset_id,updated_at FROM facebook_content_templates WHERE workspace_id=? ORDER BY updated_at DESC LIMIT 100",
        workspaceId,
      ),
    });
  await rate(env, `facebook-templates:${workspaceId}`, 100, 3600);
  if (request.method === "DELETE" && templateId && parts.length === 5) {
    const result = await run(
      env,
      "DELETE FROM facebook_content_templates WHERE id=? AND workspace_id=?",
      templateId,
      workspaceId,
    );
    if (!result.meta.changes)
      throw error(404, "Không tìm thấy bài trong thư viện.");
    return json({ deleted: true });
  }
  if (request.method !== "POST" || templateId)
    throw error(405, "Thao tác không được hỗ trợ.");
  const input = await body(request, 18000);
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const content = typeof input.content === "string" ? input.content.trim() : "";
  if (
    !title ||
    title.length > 120 ||
    !content ||
    content.length > 12000 ||
    typeof input.sourceId !== "string" ||
    !input.sourceId ||
    input.sourceId.length > 100
  )
    throw error(
      400,
      "Nhập tiêu đề tối đa 120 ký tự và nội dung tối đa 12.000 ký tự.",
    );
  const assetId = typeof input.assetId === "string" ? input.assetId : "";
  await validateAssets(env, workspaceId, { posts: [{ assetId }] });
  const previous = await one(
    env,
    "SELECT id FROM facebook_content_templates WHERE workspace_id=? AND source_id=?",
    workspaceId,
    input.sourceId,
  );
  const now = Date.now(),
    template = previous?.id || id();
  const result = await run(
    env,
    `INSERT INTO facebook_content_templates(id,workspace_id,source_id,title,content,asset_id,created_at,updated_at)
    SELECT ?,?,?,?,?,?,?,? WHERE (SELECT count(*) FROM facebook_content_templates WHERE workspace_id=?)<100 OR EXISTS(SELECT 1 FROM facebook_content_templates WHERE workspace_id=? AND source_id=?)
    ON CONFLICT(workspace_id,source_id) DO UPDATE SET title=excluded.title,content=excluded.content,asset_id=excluded.asset_id,updated_at=excluded.updated_at`,
    template,
    workspaceId,
    input.sourceId,
    title,
    content,
    assetId,
    now,
    now,
    workspaceId,
    workspaceId,
    input.sourceId,
  );
  if (!result.meta.changes)
    throw error(409, "Thư viện đã có 100 bài. Xóa bài cũ trước khi thêm.");
  const saved = await one(env, "SELECT id FROM facebook_content_templates WHERE workspace_id=? AND source_id=?", workspaceId, input.sourceId);
  return json({ id: saved.id });
}
