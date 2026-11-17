import { json, validPostUrl } from "../../lib/http.mjs";
import { one, run } from "../../models/database.mjs";
import { body, error } from "../../middleware/security.mjs";
export async function report(request, env, path, { workspaceId, device }) {
  if (path === "/api/device/report" && request.method === "POST") {
    const input = await body(request, 900000);
    const job = await one(
      env,
      "SELECT * FROM jobs WHERE id=? AND workspace_id=? AND device_id=?",
      input.jobId,
      workspaceId,
      device.id,
    );
    if (!job) throw error(404, "Không tìm thấy lượt chạy.");
    const statements = [];
    for (const a of (Array.isArray(input.attempts) ? input.attempts : []).slice(
      -200,
    )) {
      if (
        ![
          "submitting",
          "unknown",
          "success",
          "pending_approval",
          "failed",
        ].includes(a.status)
      )
        continue;
      const data = {
        title: a.title === undefined ? undefined : String(a.title || "").slice(0, 120),
        postUrl: validPostUrl(a.postUrl) || undefined,
        error: String(a.error || "").slice(0, 600),
        comment: a.comment
          ? {
              status: String(a.comment.status || ""),
              error: String(a.comment.error || "").slice(0, 500),
            }
          : null,
        timestamp: a.timestamp,
        submittedContent: a.submittedContent === undefined ? undefined : String(a.submittedContent || "").slice(0, 20000),
        reconciledAt: a.reconciledAt ? String(a.reconciledAt).slice(0, 50) : undefined,
        reconcileCheckedAt: a.reconcileCheckedAt ? String(a.reconcileCheckedAt).slice(0, 50) : undefined,
      };
      // An agent may reconcile an earlier job's attempt, but only in its own workspace.
      statements.push(
        env.DB.prepare(
          "UPDATE attempts SET status=?,data=json_patch(data,?),updated_at=? WHERE id=? AND workspace_id=? AND job_id IN (SELECT id FROM jobs WHERE device_id=?) AND (status!='success' OR ?='success')",
        ).bind(
          a.status,
          JSON.stringify(data),
          Date.now(),
          a.id,
          workspaceId,
          device.id,
          a.status,
        ),
      );
    }
    for (const event of (Array.isArray(input.events) ? input.events : []).slice(
      -50,
    )) {
      if (typeof event.id !== "string" || event.id.length > 80) continue;
      statements.push(
        env.DB.prepare(
          "INSERT OR IGNORE INTO job_events VALUES (?,?,?,?,?)",
        ).bind(
          event.id,
          job.id,
          workspaceId,
          String(event.text || "").slice(0, 2000),
          Date.now(),
        ),
      );
    }
    if (statements.length) await env.DB.batch(statements);
    await run(env, `UPDATE jobs SET status='completed',updated_at=?,lease_until=NULL
      WHERE workspace_id=? AND device_id=? AND status='needs_review'
      AND EXISTS(SELECT 1 FROM attempts a WHERE a.job_id=jobs.id)
      AND NOT EXISTS(SELECT 1 FROM attempts a WHERE a.job_id=jobs.id AND a.status IN ('submitting','unknown'))`, Date.now(), workspaceId, device.id);
    if (input.finished) {
      const status = job.cancel_requested
        ? "canceled"
        : input.error
          ? "failed"
          : JSON.parse(job.snapshot).workflowVersion === 2 &&
              input.summary?.status === "no_targets"
            ? "no_targets"
            : "completed";
      await run(
        env,
        "UPDATE jobs SET status=?,result=?,updated_at=?,lease_until=NULL WHERE id=? AND status IN ('running','needs_review')",
        status,
        JSON.stringify({
          error: String(input.error || "").slice(0, 1000),
          summary: input.summary || null,
        }),
        Date.now(),
        job.id,
      );
    }
    return json({
      ok: true,
    });
  }
}
