import { identity, error } from "../middleware/security.mjs";
import { facebookDeviceRoute } from "./facebook-device.controller.mjs";
import { heartbeat } from "./device/heartbeat.mjs";
import { claim } from "./device/claim.mjs";
import { prepare } from "./device/prepare.mjs";
import { reserve } from "./device/reserve.mjs";
import { report } from "./device/report.mjs";
import { asset } from "./device/asset.mjs";
import { social } from "./device/social.mjs";
export async function deviceRoute(request, env, path) {
  const context = await identity(request, env, true);
  if (path.startsWith("/api/device/discovery/"))
    return facebookDeviceRoute(request, env, context, path.split("/").at(-1));
  for (const handler of [social, heartbeat, claim, prepare, reserve, report, asset]) {
    const response = await handler(request, env, path, context);
    if (response) return response;
  }
  throw error(404, "Không tìm thấy API thiết bị.");
}
