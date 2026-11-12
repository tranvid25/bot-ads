import { json } from "../../lib/http.mjs";
import { dispatchMarketing } from "../../services/marketing-publisher.mjs";
export async function dispatch(request, env, context, execution) {
  const { workspaceId } = context;
  const path = new URL(request.url).pathname,
    method = request.method,
    parts = path.split("/");
  if (path === "/api/marketing/dispatch" && method === "POST") {
    if (execution?.waitUntil) {
      execution.waitUntil(
        dispatchMarketing(env, {
          workspaceId,
        }),
      );
      return json({
        queued: true,
      });
    }
    return json(
      await dispatchMarketing(env, {
        workspaceId,
      }),
    );
  }
}
