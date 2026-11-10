import { body, error, hash, identity, rate } from "../middleware/security.mjs";
import { all, run } from "../models/database.mjs";
import { json, id } from "../lib/http.mjs";
export const POLICY_VERSION = "2026-11-10";

export async function supportRequest(request, env) {
  // Creation is public; do not map an anonymous email to an existing customer.
  await rate(
    env,
    `support:${await hash(request.headers.get("CF-Connecting-IP") || "local")}`,
    8,
    3600,
  );
  const input = await body(request, 20000);
  if (
    typeof input.name !== "string" ||
    !input.name.trim() ||
    input.name.length > 100 ||
    typeof input.email !== "string" ||
    input.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) ||
    !["support", "privacy", "deletion"].includes(input.category) ||
    typeof input.message !== "string" ||
    input.message.trim().length < 20 ||
    input.message.length > 5000 ||
    input.acknowledged !== true
  )
    throw error(
      400,
      "Nhập tên, email hợp lệ, nội dung 20–5000 ký tự và xác nhận đã đọc chính sách.",
    );
  let context;
  if (request.headers.has("cookie")) {
    try {
      context = await identity(request, env);
    } catch (e) {
      if (e.status !== 401) throw e;
    }
  }
  const requestId = id();
  await run(
    env,
    "INSERT INTO support_requests(id,workspace_id,requester_name,reply_email,category,message,policy_version,created_at) VALUES (?,?,?,?,?,?,?,?)",
    requestId,
    context?.workspaceId || null,
    input.name.trim(),
    input.email.trim().toLowerCase(),
    input.category,
    input.message.trim(),
    POLICY_VERSION,
    Date.now(),
  );
  // A ticket is a request only. Deletion requires operator verification; this endpoint never erases data.
  return json(
    {
      id: requestId,
      status: "open",
      message:
        "Đã tiếp nhận yêu cầu. Giữ lại mã yêu cầu để đối chiếu; đây chưa phải xác nhận đã xóa dữ liệu.",
    },
    201,
  );
}
export async function ownSupportRequests(request, env, context) {
  return json({
    requests: await all(
      env,
      "SELECT id,category,message,status,created_at,closed_at FROM support_requests WHERE workspace_id=? ORDER BY created_at DESC LIMIT 50",
      context.workspaceId,
    ),
  });
}
export async function cleanupSupport(env) {
  // Closed support tickets are retained for up to six months; open privacy requests remain in the queue.
  await run(
    env,
    "DELETE FROM support_requests WHERE status IN ('completed','rejected') AND closed_at IS NOT NULL AND closed_at<?",
    Date.now() - 180 * 86400000,
  );
}
