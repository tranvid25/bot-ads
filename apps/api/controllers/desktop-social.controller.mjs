import { all, one, run } from "../models/database.mjs";
import { body, error, rate } from "../middleware/security.mjs";
import { json, id } from "../lib/http.mjs";
import social from "../../../packages/social-contract.cjs";
import { expireTasks } from "../services/desktop-social/tasks.mjs";

export async function desktopSocialRoute(request, env, { workspaceId }) {
  const path = new URL(request.url).pathname;
  await expireTasks(env);
  const cancel = path.match(
    /^\/api\/marketing\/desktop\/tasks\/([^/]+)\/cancel$/,
  );
  if (request.method === "POST" && cancel) {
    const changed = await run(
      env,
      "UPDATE desktop_social_tasks SET status='canceled',error='Bạn đã hủy kết nối.',updated_at=? WHERE id=? AND workspace_id=? AND kind='connect' AND status IN ('queued','running')",
      Date.now(),
      cancel[1],
      workspaceId,
    );
    if (!changed.meta.changes)
      throw error(409, "Lượt kết nối đã kết thúc hoặc không thuộc tài khoản.");
    return json({ ok: true });
  }
  if (request.method === "GET") {
    const device = await one(
      env,
      "SELECT id,name,last_seen,social_supported FROM devices WHERE workspace_id=? AND revoked_at IS NULL",
      workspaceId,
    );
    const tasks = await all(
      env,
      "SELECT id,provider,kind,status,error,created_at,updated_at FROM desktop_social_tasks WHERE workspace_id=? AND kind='connect' ORDER BY created_at DESC LIMIT 10",
      workspaceId,
    );
    return json({ device, tasks });
  }
  if (request.method !== "POST" || path !== "/api/marketing/desktop/start")
    throw error(404, "Không tìm thấy thao tác kết nối máy tính.");
  await rate(env, `social-connect:${workspaceId}`, 20, 3600);
  const input = await body(request, 2000);
  if (!social.providers.includes(input.provider))
    throw error(400, "Chọn Threads hoặc Instagram.");
  const brand = await one(
    env,
    "SELECT id FROM marketing_brands WHERE id=? AND workspace_id=?",
    input.brandId,
    workspaceId,
  );
  if (!brand) throw error(404, "Không tìm thấy thương hiệu.");
  const device = await one(
    env,
    "SELECT * FROM devices WHERE workspace_id=? AND revoked_at IS NULL",
    workspaceId,
  );
  if (!device?.social_supported)
    throw error(
      409,
      "Cần liên kết và mở bản BotAds máy tính mới hỗ trợ Threads/Instagram. Mở Thiết bị để cài/cập nhật.",
    );
  const now = Date.now(),
    taskId = id();
  try {
    await run(
      env,
      "INSERT INTO desktop_social_tasks(id,workspace_id,device_id,brand_id,provider,kind,deadline,created_at,updated_at) VALUES (?,?,?,?,?,'connect',?,?,?)",
      taskId,
      workspaceId,
      device.id,
      brand.id,
      input.provider,
      now + 1800000,
      now,
      now,
    );
  } catch (e) {
    if (String(e).includes("UNIQUE"))
      throw error(
        409,
        "Đang chờ kết nối kênh này. Mở app máy tính để đăng nhập hoặc chờ lượt hiện tại kết thúc.",
      );
    throw e;
  }
  return json({ id: taskId, status: "queued" });
}
