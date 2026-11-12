import { assetResponse } from "../../services/assets.service.mjs";
export async function asset(request, env, path, { workspaceId, device }) {
  if (path.startsWith("/api/device/assets/") && request.method === "GET")
    return assetResponse(env, workspaceId, path.split("/").at(-1));
}
