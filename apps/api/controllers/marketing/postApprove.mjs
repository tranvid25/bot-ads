import { run } from "../../models/database.mjs";
import { json } from "../../lib/http.mjs";
import { body, error } from "../../middleware/security.mjs";
import { owned } from "./owned.mjs";
export async function postApprove(request, env, context, execution) {
  const { workspaceId } = context;
  const path = new URL(request.url).pathname,
    method = request.method,
    parts = path.split("/");
  if (parts[3] !== "posts") return;
  if (parts.length === 6 && parts[5] === "approve" && method === "POST") {
    const input = await body(request, 2000);
    await owned(env, "marketing_posts", workspaceId, parts[4]);
    const result = await run(
      env,
      "UPDATE marketing_posts SET status='approved',approved_at=?,updated_at=? WHERE id=? AND workspace_id=? AND revision=?",
      Date.now(),
      Date.now(),
      parts[4],
      workspaceId,
      Number(input.revision),
    );
    if (!result.meta.changes)
      throw error(409, "Phiên bản đã thay đổi. Mở lại và duyệt đúng nội dung.");
    return json({
      ok: true,
    });
  }
}
