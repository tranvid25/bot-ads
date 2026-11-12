import { run } from "../../models/database.mjs";
import { json } from "../../lib/http.mjs";
import { body } from "../../middleware/security.mjs";
import { owned } from "./owned.mjs";
export async function publicationCancel(request, env, context, execution) {
  const { workspaceId } = context;
  const path = new URL(request.url).pathname,
    method = request.method,
    parts = path.split("/");
  if (
    !(parts[3] === "publications" && parts.length === 6 && method === "POST") ||
    parts[5] !== "cancel"
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
  await run(
    env,
    "UPDATE marketing_publications SET cancel_requested=1,status=CASE WHEN status='publishing' THEN status ELSE 'canceled' END,updated_at=? WHERE id=? AND status IN ('scheduled','retry_wait','awaiting_manual','needs_reauth','publishing')",
    Date.now(),
    publication.id,
  );
  return json({
    ok: true,
  });
}
