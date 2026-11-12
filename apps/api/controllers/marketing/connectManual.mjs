import { json } from "../../lib/http.mjs";
import { body, error } from "../../middleware/security.mjs";
import { MANUAL_PROVIDERS } from "../../../../packages/contracts/marketing.mjs";
import { owned } from "./owned.mjs";
import { saveChannel } from "./channel-store.mjs";
export async function connectManual(request, env, context, execution) {
  const { workspaceId } = context;
  const path = new URL(request.url).pathname,
    method = request.method,
    parts = path.split("/");
  if (path === "/api/marketing/channels/manual" && method === "POST") {
    const input = await body(request, 5000);
    if (["threads", "instagram"].includes(input.provider))
      throw error(
        409,
        "Kết nối kênh qua app máy tính để xác minh tài khoản. Không dùng tên nhập tay làm kết nối.",
      );
    await owned(env, "marketing_brands", workspaceId, String(input.brandId));
    if (
      !MANUAL_PROVIDERS.includes(input.provider) ||
      typeof input.name !== "string" ||
      !input.name.trim() ||
      input.name.length > 100
    )
      throw error(400, "Chọn kênh và nhập tên tài khoản (tối đa 100 ký tự).");
    return json({
      id: await saveChannel(env, workspaceId, input.brandId, input.provider, {
        actorId: input.name.trim(),
        name: input.name.trim(),
        avatarUrl:
          typeof input.avatarUrl === "string" ? input.avatarUrl.trim() : "",
      }),
    });
  }
}
