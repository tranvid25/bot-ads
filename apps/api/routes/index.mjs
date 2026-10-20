import { identity, checkOrigin, error } from "../middleware/security.mjs";
import { authenticate } from "../controllers/auth.controller.mjs";
import { deviceRoute } from "../controllers/device.controller.mjs";
import { metadata } from "../controllers/public.controller.mjs";
import { download } from "../controllers/public.controller.mjs";
import { pairDevice } from "../controllers/pairing.controller.mjs";
import { logout } from "../controllers/auth.controller.mjs";
import { dashboard } from "../controllers/dashboard.controller.mjs";
import { updateSettings } from "../controllers/settings.controller.mjs";
import { createPairing } from "../controllers/pairing.controller.mjs";
import { revokeDevice } from "../controllers/pairing.controller.mjs";
import { generateDrafts } from "../controllers/campaign.controller.mjs";
import { saveCampaign } from "../controllers/campaign.controller.mjs";
import { runCampaign } from "../controllers/campaign.controller.mjs";
import { cancelJob } from "../controllers/jobs.controller.mjs";
import { jobEvents } from "../controllers/jobs.controller.mjs";
import { uploadAsset } from "../controllers/assets.controller.mjs";
import { getAsset } from "../controllers/assets.controller.mjs";

export async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  if (!path.startsWith("/api/")) return env.ASSETS.fetch(request);
  if (path === "/api/meta") return metadata(request, env, path, method);
  if (path === "/api/download") return download(request, env, path, method);
  if (path === "/api/device/pair" && method === "POST")
    return pairDevice(request, env, path, method);
  checkOrigin(request);
  if (path === "/api/auth/register" && method === "POST")
    return authenticate(request, env, "register");
  if (path === "/api/auth/login" && method === "POST")
    return authenticate(request, env, "login");
  if (path.startsWith("/api/device/")) return deviceRoute(request, env, path);
  const context = await identity(request, env);
  if (path === "/api/auth/logout" && method === "POST")
    return logout(request, env, path, method, context);
  if (path === "/api/dashboard" && method === "GET")
    return dashboard(request, env, path, method, context);
  if (path === "/api/settings" && method === "PUT")
    return updateSettings(request, env, path, method, context);
  if (path === "/api/pairings" && method === "POST")
    return createPairing(request, env, path, method, context);
  if (/^\/api\/devices\/[^/]+$/.test(path) && method === "DELETE")
    return revokeDevice(request, env, path, method, context);
  if (path === "/api/generate" && method === "POST")
    return generateDrafts(request, env, path, method, context);
  if (
    (path === "/api/campaigns" && method === "POST") ||
    (/^\/api\/campaigns\/[^/]+$/.test(path) && method === "PUT")
  )
    return saveCampaign(request, env, path, method, context);
  if (/^\/api\/campaigns\/[^/]+\/run$/.test(path) && method === "POST")
    return runCampaign(request, env, path, method, context);
  if (/^\/api\/jobs\/[^/]+\/cancel$/.test(path) && method === "POST")
    return cancelJob(request, env, path, method, context);
  if (/^\/api\/jobs\/[^/]+\/events$/.test(path) && method === "GET")
    return jobEvents(request, env, path, method, context);
  if (path === "/api/assets" && method === "POST")
    return uploadAsset(request, env, path, method, context);
  if (/^\/api\/assets\/[^/]+$/.test(path) && method === "GET")
    return getAsset(request, env, path, method, context);
  throw error(404, "Không tìm thấy chức năng.");
}
