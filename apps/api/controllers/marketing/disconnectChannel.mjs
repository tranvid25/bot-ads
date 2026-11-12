import { json } from "../../lib/http.mjs";
import { owned } from "./owned.mjs";
export async function disconnectChannel(request, env, context, execution) {
  const { workspaceId } = context;
  const path = new URL(request.url).pathname,
    method = request.method,
    parts = path.split("/");
  if (parts[3] === "channels" && parts.length === 5 && method === "DELETE") {
    await owned(env, "marketing_channels", workspaceId, parts[4]);
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE marketing_channels SET status='disconnected',credential=NULL WHERE id=? AND workspace_id=?",
      ).bind(parts[4], workspaceId),
      env.DB.prepare(
        "UPDATE marketing_publications SET cancel_requested=1,status=CASE WHEN status='publishing' THEN status ELSE 'canceled' END,updated_at=? WHERE channel_id=? AND workspace_id=? AND status IN ('scheduled','retry_wait','needs_reauth','awaiting_manual','publishing')",
      ).bind(Date.now(), parts[4], workspaceId),
    ]);
    return json({
      ok: true,
    });
  }
}
