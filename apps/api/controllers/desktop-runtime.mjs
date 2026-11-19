import { one, all, run } from "../models/database.mjs";
import { json } from "../lib/http.mjs";
import { body, error } from "../middleware/security.mjs";
export async function desktopRuntime(request, env, path, { workspaceId }) {
  if (path === "/api/devices/runtime" && request.method === "GET") {
    const devices = await all(
      env,
      `SELECT d.id,d.name,d.last_seen,d.facebook_ready,r.phase,r.error,r.updated_at
      FROM devices d LEFT JOIN desktop_runtime r ON r.device_id=d.id WHERE d.workspace_id=? AND d.revoked_at IS NULL`,
      workspaceId,
    );
    return json({ devices });
  }
  if (path === "/api/devices/commands" && request.method === "POST") {
    const input = await body(request, 2000);
    if (!["connect", "resume"].includes(input.action))
      throw error(400, "Lệnh thiết bị không hợp lệ.");
    if (typeof input.deviceId !== "string")
      throw error(400, "Thiếu thiết bị nhận lệnh.");
    const device = await one(
      env,
      "SELECT id,last_seen FROM devices WHERE id=? AND workspace_id=? AND revoked_at IS NULL",
      input.deviceId,
      workspaceId,
    );
    if (!device) throw error(404, "Không tìm thấy máy đã kết nối.");
    const now = Date.now();
    await run(
      env,
      "UPDATE desktop_commands SET status='expired' WHERE device_id=? AND status='pending' AND expires_at<?",
      device.id,
      now,
    );
    const id = crypto.randomUUID();
    await run(
      env,
      "INSERT OR IGNORE INTO desktop_commands(id,workspace_id,device_id,action,created_at,expires_at) VALUES (?,?,?,?,?,?)",
      id,
      workspaceId,
      device.id,
      input.action,
      now,
      now + 600000,
    );
    const command = await one(
      env,
      "SELECT id,status FROM desktop_commands WHERE device_id=? AND action=? AND status='pending'",
      device.id,
      input.action,
    );
    return json({ command });
  }
}
export async function runtimeHeartbeat(env, workspaceId, device, state) {
  if (
    !state ||
    ![
      "ready",
      "login_required",
      "connecting",
      "paused",
      "working",
      "syncing",
    ].includes(state.phase)
  )
    return null;
  await run(
    env,
    `INSERT INTO desktop_runtime VALUES (?,?,?,?,?) ON CONFLICT(device_id) DO UPDATE SET phase=excluded.phase,error=excluded.error,updated_at=excluded.updated_at`,
    device.id,
    workspaceId,
    state.phase,
    String(state.error || "").slice(0, 600),
    Date.now(),
  );
  await run(
    env,
    "UPDATE desktop_commands SET status='expired' WHERE device_id=? AND status='pending' AND expires_at<?",
    device.id,
    Date.now(),
  );
  return one(
    env,
    "SELECT id,action FROM desktop_commands WHERE device_id=? AND workspace_id=? AND status='pending' AND expires_at>? ORDER BY created_at LIMIT 1",
    device.id,
    workspaceId,
    Date.now(),
  );
}
export async function commandAck(request, env, path, { workspaceId, device }) {
  if (path !== "/api/device/commands/ack" || request.method !== "POST") return;
  const input = await body(request, 2000);
  if (typeof input.id !== "string") throw error(400, "Thiếu mã lệnh.");
  await run(
    env,
    "UPDATE desktop_commands SET status='completed',error=? WHERE id=? AND workspace_id=? AND device_id=? AND status='pending'",
    String(input.error || "").slice(0, 600),
    input.id,
    workspaceId,
    device.id,
  );
  return json({ ok: true });
}
