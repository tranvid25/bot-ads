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
export async function metadata(request, env, path, method, context = {}) {
  const { workspaceId, user } = context;
  return json({
    name: "BotAds",
    maxDaily: maxDaily(env),
    aiAvailable: Boolean(env.GEMINI_API_KEY),
    downloadAvailable: Boolean(env.DOWNLOAD_URL),
    registrationOpen: env.ALLOW_REGISTRATION === "true",
  });
}

export async function download(request, env, path, method, context = {}) {
  const { workspaceId, user } = context;

  if (!env.DOWNLOAD_URL)
    throw error(503, "Bộ cài chưa được phát hành trên máy chủ này.");
  const target = new URL(env.DOWNLOAD_URL);
  if (target.protocol !== "https:")
    throw error(503, "Đường dẫn bộ cài chưa hợp lệ.");
  return Response.redirect(target.href, 302);
}
