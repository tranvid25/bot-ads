const encoder = new TextEncoder();
export const hex = (bytes) =>
  [...new Uint8Array(bytes)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
export const token = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export const hash = async (value) =>
  hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
export async function passwordHash(password, salt, secret) {
  if (!secret || secret.length < 32)
    throw Object.assign(new Error("Chưa cấu hình AUTH_SECRET cho máy chủ."), {
      status: 503,
    });
  const pepper = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const input = await crypto.subtle.sign(
    "HMAC",
    pepper,
    encoder.encode(password),
  );
  const key = await crypto.subtle.importKey("raw", input, "PBKDF2", false, [
    "deriveBits",
  ]);
  return hex(
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: encoder.encode(salt),
        iterations: 100000,
        hash: "SHA-256",
      },
      key,
      256,
    ),
  );
}
export function equal(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length)
    return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
export const error = (status, message) =>
  Object.assign(new Error(message), { status });
export async function body(request, max = 900000) {
  if (!(request.headers.get("content-type") || "").includes("application/json"))
    throw error(415, "Cần dữ liệu JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw error(400, "Thiếu dữ liệu.");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw error(413, "Dữ liệu quá lớn.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw error(400, "JSON không hợp lệ.");
  }
}
export async function rate(env, key, limit, seconds) {
  const bucket = `${key}:${Math.floor(Date.now() / (seconds * 1000))}`;
  const row = await env.DB.prepare(
    "INSERT INTO rate_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
  )
    .bind(bucket, Date.now() + seconds * 1000)
    .first();
  if (row.count > limit)
    throw error(429, "Đã đạt hạn mức. Vui lòng thử lại sau.");
}
export async function identity(request, env, deviceOnly = false) {
  const bearer = request.headers.get("authorization");
  if (deviceOnly) {
    if (!bearer?.startsWith("Bearer "))
      throw error(401, "Thiết bị chưa liên kết.");
    const device = await env.DB.prepare(
      "SELECT * FROM devices WHERE token_hash=? AND revoked_at IS NULL",
    )
      .bind(await hash(bearer.slice(7)))
      .first();
    if (!device) throw error(401, "Liên kết thiết bị đã hết hiệu lực.");
    return { workspaceId: device.workspace_id, device };
  }
  const cookie = (request.headers.get("cookie") || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("botads_session="))
    ?.slice(15);
  if (!cookie) throw error(401, "Vui lòng đăng nhập.");
  const row = await env.DB.prepare(
    "SELECT u.id, u.name, u.email, w.id AS workspace_id, w.daily_limit, w.timezone FROM sessions s JOIN users u ON u.id=s.user_id JOIN workspaces w ON w.owner_id=u.id WHERE s.token_hash=? AND s.expires_at>?",
  )
    .bind(await hash(cookie), Date.now())
    .first();
  if (!row) throw error(401, "Phiên đăng nhập hết hạn.");
  return { workspaceId: row.workspace_id, user: row };
}
export function checkOrigin(request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  // Desktop uses bearer auth and has no browser Origin. Cookie requests require same origin.
  if (request.headers.has("authorization") && !origin) return;
  if (origin !== new URL(request.url).origin)
    throw error(403, "Nguồn yêu cầu không hợp lệ.");
}
export const cookieHeader = (request, value, maxAge = 604800) =>
  `botads_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
