import { run } from "../../models/database.mjs";
import { json, id } from "../../lib/http.mjs";
import { body, error } from "../../middleware/security.mjs";
import {
  MANUAL_PROVIDERS,
  validatePermalink,
} from "../../../../packages/contracts/marketing.mjs";
import { owned } from "./owned.mjs";
export async function publicationConfirm(request, env, context, execution) {
  const { workspaceId } = context;
  const path = new URL(request.url).pathname,
    method = request.method,
    parts = path.split("/");
  if (
    !(parts[3] === "publications" && parts.length === 6 && method === "POST") ||
    parts[5] !== "confirm"
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
  const permalink = validatePermalink(channel.provider, input.permalink);
  const isManual = publication.transport !== "desktop" && MANUAL_PROVIDERS.includes(channel.provider);
  const eligible = isManual ? ["awaiting_manual"] : ["unknown"];
  if (!eligible.includes(publication.status))
    throw error(409, "Trạng thái hiện tại không hỗ trợ xác nhận thủ công.");
  const result = await run(
    env,
    "UPDATE marketing_publications SET status='user_reported_published',permalink=?,error=NULL,updated_at=? WHERE id=? AND status=?",
    permalink,
    Date.now(),
    publication.id,
    publication.status,
  );
  if (!result.meta.changes) throw error(409, "Trạng thái đã thay đổi.");
  await run(
    env,
    "INSERT INTO marketing_attempts VALUES (?,?,?,?,?,?,?)",
    id(),
    publication.id,
    workspaceId,
    "user",
    "user_reported_published",
    "Người dùng xác nhận đã đăng bằng permalink; chưa được API kiểm chứng.",
    Date.now(),
  );
  return json({
    ok: true,
  });
}
