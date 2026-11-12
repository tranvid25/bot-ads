import { run } from "../../models/database.mjs";
import { json, id } from "../../lib/http.mjs";
import { body, error } from "../../middleware/security.mjs";
import { owned } from "./owned.mjs";
export async function publicationNotPosted(request, env, context, execution) {
  const { workspaceId } = context;
  const path = new URL(request.url).pathname,
    method = request.method,
    parts = path.split("/");
  if (
    !(parts[3] === "publications" && parts.length === 6 && method === "POST") ||
    parts[5] !== "not-posted"
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
    publication.status !== "unknown" ||
    input.checked !== true ||
    typeof input.note !== "string" ||
    input.note.trim().length < 10 ||
    input.note.length > 1000
  )
    throw error(
      400,
      "Cần kiểm tra trực tiếp bài chưa rõ, xác nhận chưa đăng và ghi lý do tối thiểu 10 ký tự.",
    );
  const result = await run(
    env,
    "UPDATE marketing_publications SET status='failed',error='Người dùng đã kiểm tra và xác nhận chưa đăng. Có thể chủ động thử lại.',updated_at=? WHERE id=? AND status='unknown'",
    Date.now(),
    publication.id,
  );
  if (!result.meta.changes) throw error(409, "Trạng thái đã thay đổi.");
  await run(
    env,
    "INSERT INTO marketing_attempts VALUES (?,?,?,?,?,?,?)",
    id(),
    publication.id,
    workspaceId,
    "user",
    "failed",
    `Người dùng xác nhận chưa đăng: ${input.note.trim()}`,
    Date.now(),
  );
  return json({
    ok: true,
  });
}
