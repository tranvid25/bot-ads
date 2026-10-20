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
import { assetResponse } from "../services/assets.service.mjs";
export async function uploadAsset(request, env, path, method, context = {}) {
  const { workspaceId, user } = context;

  await rate(env, `uploads:${workspaceId}`, 100, 86400);
  const limit = (Number(env.MAX_ASSET_MB) || 5) * 1024 * 1024;
  const length = Number(request.headers.get("content-length"));
  if (!length || length > limit) throw error(413, "Ảnh tối đa 5 MB.");
  const mime = request.headers.get("content-type");
  if (!["image/jpeg", "image/png", "image/webp"].includes(mime))
    throw error(415, "Chỉ nhận ảnh JPG, PNG hoặc WebP.");
  const total = await one(
    env,
    "SELECT count(*) AS count FROM assets WHERE workspace_id=?",
    workspaceId,
  );
  if (total.count >= 100) throw error(400, "Kho ảnh đã đủ 100 ảnh.");
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > limit) throw error(413, "Ảnh quá lớn.");
  const b = new Uint8Array(bytes);
  const signature =
    mime === "image/png"
      ? b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71
      : mime === "image/jpeg"
        ? b[0] === 255 && b[1] === 216 && b[2] === 255
        : new TextDecoder().decode(b.slice(0, 4)) === "RIFF" &&
          new TextDecoder().decode(b.slice(8, 12)) === "WEBP";
  if (!signature) throw error(415, "Dữ liệu không phải ảnh hợp lệ.");
  const assetId = id();
  const key = `${workspaceId}/${assetId}`;
  await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: mime } });
  const name = decodeURIComponent(
    request.headers.get("x-file-name") || "Ảnh",
  ).slice(0, 120);
  try {
    await run(
      env,
      "INSERT INTO assets VALUES (?,?,?,?,?,?,?)",
      assetId,
      workspaceId,
      key,
      name,
      mime,
      bytes.byteLength,
      Date.now(),
    );
  } catch (e) {
    await env.MEDIA.delete(key);
    throw e;
  }
  return json({ id: assetId, name });
}

export async function getAsset(request, env, path, method, context = {}) {
  const { workspaceId, user } = context;
  return assetResponse(env, workspaceId, path.split("/").at(-1));
}
