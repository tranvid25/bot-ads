import { json } from "../../lib/http.mjs";
import { body, error, rate } from "../../middleware/security.mjs";
import { blueskyIdentity } from "../../services/marketing-providers.mjs";
import { owned } from "./owned.mjs";
import { saveChannel } from "./channel-store.mjs";
export async function connectBluesky(request, env, context, execution) {
  const { workspaceId } = context;
  const path = new URL(request.url).pathname,
    method = request.method,
    parts = path.split("/");
  if (path === "/api/marketing/channels/bluesky" && method === "POST") {
    await rate(env, `bluesky-connect:${workspaceId}`, 10, 3600);
    const input = await body(request, 5000);
    await owned(env, "marketing_brands", workspaceId, String(input.brandId));
    if (
      typeof input.handle !== "string" ||
      !input.handle.trim() ||
      typeof input.appPassword !== "string" ||
      !input.appPassword.trim()
    )
      throw error(400, "Nhập đầy đủ Handle và App Password Bluesky.");
    const identity = await blueskyIdentity(
      env,
      input.handle,
      input.appPassword,
    );
    return json({
      id: await saveChannel(
        env,
        workspaceId,
        input.brandId,
        "bluesky",
        identity,
      ),
    });
  }
}
