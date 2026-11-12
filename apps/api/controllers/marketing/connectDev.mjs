import { json } from "../../lib/http.mjs";
import { body, error, rate } from "../../middleware/security.mjs";
import { devIdentity } from "../../services/marketing-providers.mjs";
import { marketingCapabilities } from "./config.mjs";
import { owned } from "./owned.mjs";
import { saveChannel } from "./channel-store.mjs";
export async function connectDev(request, env, context, execution) {
  const { workspaceId } = context;
  const path = new URL(request.url).pathname,
    method = request.method,
    parts = path.split("/");
  if (path === "/api/marketing/channels/dev" && method === "POST") {
    if (!marketingCapabilities(env).dev)
      throw error(
        503,
        "Chưa cấu hình khóa bảo vệ kết nối hoặc địa chỉ website.",
      );
    await rate(env, `dev-connect:${workspaceId}`, 10, 3600);
    const input = await body(request, 5000);
    await owned(env, "marketing_brands", workspaceId, String(input.brandId));
    if (
      typeof input.apiKey !== "string" ||
      input.apiKey.length < 8 ||
      input.apiKey.length > 1000 ||
      /\s/.test(input.apiKey)
    )
      throw error(400, "Nhập API key DEV hợp lệ.");
    const identity = await devIdentity(env, input.apiKey);
    return json({
      id: await saveChannel(env, workspaceId, input.brandId, "dev", {
        ...identity,
        credential: {
          apiKey: input.apiKey,
        },
      }),
    });
  }
}
