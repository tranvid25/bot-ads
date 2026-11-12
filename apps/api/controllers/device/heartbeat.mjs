import { json } from "../../lib/http.mjs";
import { one, run } from "../../models/database.mjs";
import { body } from "../../middleware/security.mjs";
export async function heartbeat(request, env, path, { workspaceId, device }) {
  if (path === "/api/device/heartbeat" && request.method === "POST") {
    const input = await body(request, 5000);
    await run(
      env,
      "UPDATE devices SET last_seen=?, facebook_ready=?,discovery_supported=?,social_supported=? WHERE id=?",
      Date.now(),
      input.facebookReady ? 1 : 0,
      input.discoverySupported === true ? 1 : 0,
      input.socialSupported === true ? 1 : 0,
      device.id,
    );
    let job = null;
    if (input.jobId) {
      job = await one(
        env,
        "SELECT status,cancel_requested FROM jobs WHERE id=? AND workspace_id=? AND device_id=?",
        input.jobId,
        workspaceId,
        device.id,
      );
      if (job?.status === "running" && !job.cancel_requested)
        await run(
          env,
          "UPDATE jobs SET lease_until=?,updated_at=? WHERE id=? AND status='running'",
          Date.now() + 90000,
          Date.now(),
          input.jobId,
        );
    }
    return json({
      ok: true,
      stop: Boolean(
        input.jobId &&
        (!job || job.cancel_requested || job.status !== "running"),
      ),
    });
  }
}
