import { one, run } from "../../models/database.mjs";
import { json } from "../../lib/http.mjs";
import { body, error } from "../../middleware/security.mjs";
import { owned } from "./owned.mjs";
export async function publicationRetry(request, env, context, execution) {
  const { workspaceId } = context;
  const path = new URL(request.url).pathname,
    method = request.method,
    parts = path.split("/");
  if (
    !(parts[3] === "publications" && parts.length === 6 && method === "POST") ||
    parts[5] !== "retry"
  )
    return;
  const publication = await owned(
    env,
    "marketing_publications",
    workspaceId,
    parts[4],
  );
  const input = await body(request, 10000);
  const channel = await owned(
    env,
    "marketing_channels",
    workspaceId,
    publication.channel_id,
  );
  if (
    !["failed", "needs_reauth"].includes(publication.status) ||
    channel.status !== "connected" ||
    publication.cancel_requested
  )
    throw error(
      409,
      "Chỉ thử lại lỗi đã rõ kết quả với tài khoản đang kết nối. Bài chưa rõ cần kiểm tra thủ công.",
    );
  const other = await one(
    env,
    "SELECT id FROM marketing_publications WHERE post_id=? AND revision=? AND channel_id=? AND id<>? AND status IN ('scheduled','retry_wait','publishing','unknown','needs_reauth','awaiting_manual')",
    publication.post_id,
    publication.revision,
    publication.channel_id,
    publication.id,
  );
  if (other)
    throw error(
      409,
      "Đã có lượt khác cho nội dung này. Xử lý hoặc hủy lượt đó trước.",
    );
  let result;
  try {
    result = await run(
      env,
      "UPDATE marketing_publications SET status='scheduled',error=NULL,scheduled_at=?,attempt_count=0,submit_started_at=NULL,updated_at=? WHERE id=? AND status=? AND cancel_requested=0",
      Date.now(),
      Date.now(),
      publication.id,
      publication.status,
    );
  } catch (e) {
    if (/UNIQUE constraint/.test(String(e)))
      throw error(409, "Có lượt cùng nội dung đang chờ. Tải lại danh sách.");
    throw e;
  }
  if (!result.meta.changes) throw error(409, "Trạng thái đã thay đổi.");
  return json({
    ok: true,
  });
}
