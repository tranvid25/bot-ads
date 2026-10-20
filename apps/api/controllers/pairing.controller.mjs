import { json, maxDaily, id, validPostUrl } from "../lib/http.mjs";
import { one, all, run } from "../models/database.mjs";
import {
  body,
  token,
  hash,
  passwordHash,
  equal,
  error,
  rate,
  identity,
  cookieHeader,
} from "../middleware/security.mjs";
export async function pairDevice(request, env, path, method, context = {}) {
  const { workspaceId, user } = context;

  if (request.headers.has("cookie"))
    throw error(403, "Ghép thiết bị từ ứng dụng BotAds.");
  await rate(
    env,
    `pair:${request.headers.get("CF-Connecting-IP") || "local"}`,
    10,
    600,
  );
  const input = await body(request, 2000);
  const code = String(input.code || "")
    .replace(/[-\s]/g, "")
    .toLowerCase();
  const pairing = await one(
    env,
    "SELECT * FROM pairings WHERE code_hash=? AND used_at IS NULL AND expires_at>?",
    await hash(code),
    Date.now(),
  );
  if (!pairing) throw error(400, "Mã ghép không đúng hoặc đã hết hạn.");
  const secret = token();
  const deviceId = id();
  const now = Date.now();
  try {
    const result = await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO devices(id,workspace_id,name,token_hash,last_seen) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM pairings WHERE code_hash=? AND used_at IS NULL AND expires_at>?)",
      ).bind(
        deviceId,
        pairing.workspace_id,
        String(input.name || "Windows").slice(0, 80),
        await hash(secret),
        now,
        pairing.code_hash,
        now,
      ),
      env.DB.prepare(
        "UPDATE pairings SET used_at=? WHERE code_hash=? AND EXISTS(SELECT 1 FROM devices WHERE id=?)",
      ).bind(now, pairing.code_hash, deviceId),
    ]);
    if (!result[0].meta.changes) throw error(409, "Mã đã được sử dụng.");
  } catch (e) {
    if (String(e).includes("UNIQUE"))
      throw error(
        409,
        "Tài khoản đã ghép một máy. Thu hồi máy cũ trên web trước.",
      );
    throw e;
  }
  return json({ token: secret, deviceId, workspaceId: pairing.workspace_id });
}

export async function createPairing(request, env, path, method, context = {}) {
  const { workspaceId, user } = context;

  await rate(env, `pair-new:${workspaceId}`, 10, 600);
  if (
    await one(
      env,
      "SELECT id FROM devices WHERE workspace_id=? AND revoked_at IS NULL",
      workspaceId,
    )
  )
    throw error(
      409,
      "Đã có máy liên kết. Thu hồi máy cũ trước khi ghép máy khác.",
    );
  const code = token().slice(0, 16);
  await run(
    env,
    "INSERT INTO pairings VALUES (?,?,?,NULL)",
    await hash(code),
    workspaceId,
    Date.now() + 600000,
  );
  return json({ code: code.match(/.{4}/g).join("-"), expiresIn: 600 });
}

export async function revokeDevice(request, env, path, method, context = {}) {
  const { workspaceId, user } = context;

  await env.DB.batch([
    env.DB.prepare(
      "UPDATE devices SET revoked_at=? WHERE id=? AND workspace_id=?",
    ).bind(Date.now(), path.split("/").at(-1), workspaceId),
    env.DB.prepare(
      "UPDATE jobs SET cancel_requested=1 WHERE workspace_id=? AND status IN ('queued','running','needs_review')",
    ).bind(workspaceId),
    env.DB.prepare(
      "UPDATE jobs SET status='canceled' WHERE workspace_id=? AND status='queued'",
    ).bind(workspaceId),
  ]);
  return json({ ok: true });
}
