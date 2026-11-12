import { run } from "../../models/database.mjs";
import { json } from "../../lib/http.mjs";
import { body, error } from "../../middleware/security.mjs";
import { owned } from "./owned.mjs";
export async function publicationMetrics(request, env, context, execution) {
  const { workspaceId } = context;
  const path = new URL(request.url).pathname,
    method = request.method,
    parts = path.split("/");
  if (
    !(parts[3] === "publications" && parts.length === 6 && method === "POST") ||
    parts[5] !== "metrics"
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
  if (!["published", "user_reported_published"].includes(publication.status))
    throw error(409, "Chỉ nhập số liệu cho bài đã đăng.");
  if (
    ![input.visits, input.leads].every(
      (v) => Number.isInteger(v) && v >= 0 && v <= 100000000,
    ) ||
    typeof input.note !== "string" ||
    input.note.length > 2000
  )
    throw error(400, "Nhập số nguyên không âm và ghi chú tối đa 2000 ký tự.");
  await run(
    env,
    "INSERT INTO marketing_metrics VALUES (?,?,?,?,?,?) ON CONFLICT(publication_id) DO UPDATE SET visits=excluded.visits,leads=excluded.leads,note=excluded.note,updated_at=excluded.updated_at",
    publication.id,
    workspaceId,
    input.visits,
    input.leads,
    input.note,
    Date.now(),
  );
  return json({
    ok: true,
  });
}
