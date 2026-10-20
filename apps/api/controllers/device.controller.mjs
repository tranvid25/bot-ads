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
import { groupUrl, localClock } from "../../../packages/contracts/campaign.mjs";
import { generate } from "../services/gemini.service.mjs";
import { assetResponse } from "../services/assets.service.mjs";
export async function deviceRoute(request, env, path) {
  const { workspaceId, device } = await identity(request, env, true);
  if (path === "/api/device/heartbeat" && request.method === "POST") {
    const input = await body(request, 5000);
    await run(
      env,
      "UPDATE devices SET last_seen=?, facebook_ready=? WHERE id=?",
      Date.now(),
      input.facebookReady ? 1 : 0,
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
  if (path === "/api/device/claim" && request.method === "POST") {
    if (!device.facebook_ready) return json({ job: null });
    const blocked = await one(
      env,
      "SELECT id FROM jobs WHERE workspace_id=? AND status IN ('running','needs_review')",
      workspaceId,
    );
    if (blocked) return json({ job: null, blocked: blocked.id });
    let row;
    try {
      row = await one(
        env,
        "UPDATE jobs SET status='running',device_id=?,lease_until=?,updated_at=? WHERE id=(SELECT id FROM jobs WHERE workspace_id=? AND status='queued' AND cancel_requested=0 AND created_at>? ORDER BY created_at LIMIT 1) AND status='queued' RETURNING *",
        device.id,
        Date.now() + 90000,
        Date.now(),
        workspaceId,
        Date.now() - 7200000,
      );
    } catch (e) {
      if (String(e).includes("UNIQUE")) return json({ job: null });
      throw e;
    }
    if (!row) return json({ job: null });
    return json({
      job: {
        id: row.id,
        campaignId: row.campaign_id,
        campaign: JSON.parse(row.snapshot),
      },
    });
  }
  if (path === "/api/device/prepare" && request.method === "POST") {
    const input = await body(request, 2000);
    const row = await one(
      env,
      "SELECT * FROM jobs WHERE id=? AND workspace_id=? AND device_id=? AND status='running' AND cancel_requested=0 AND lease_until>?",
      input.jobId,
      workspaceId,
      device.id,
      Date.now(),
    );
    if (!row) throw error(409, "Lượt chạy không còn hiệu lực.");
    const campaign = JSON.parse(row.snapshot);
    if (campaign.autoGenerate && !campaign.generatedForJob) {
      const oldAssets = campaign.posts
        .filter((p) => p.selected && p.assetId)
        .map((p) => p.assetId);
      campaign.posts = await generate(env, workspaceId, {
        ...campaign,
        count: Math.min(5, campaign.dailyLimit),
      });
      campaign.posts.forEach((p, i) => {
        p.assetId = oldAssets.length ? oldAssets[i % oldAssets.length] : "";
      });
      campaign.generatedForJob = true;
      await run(
        env,
        "UPDATE jobs SET snapshot=?,lease_until=? WHERE id=?",
        JSON.stringify(campaign),
        Date.now() + 90000,
        row.id,
      );
    }
    const workspace = await one(
      env,
      "SELECT daily_limit,timezone FROM workspaces WHERE id=?",
      workspaceId,
    );
    return json({ campaign, workspace });
  }
  if (path === "/api/device/reserve" && request.method === "POST") {
    const input = await body(request, 4000);
    const now = Date.now();
    if (
      !/^[a-f0-9-]{36}$/.test(input.attemptId || "") ||
      !groupUrl(input.groupUrl)
    )
      throw error(400, "Lượt gửi không hợp lệ.");
    const job = await one(
      env,
      "SELECT * FROM jobs WHERE id=? AND workspace_id=? AND device_id=? AND status='running' AND cancel_requested=0 AND lease_until>?",
      input.jobId,
      workspaceId,
      device.id,
      now,
    );
    if (!job) throw error(409, "Lượt chạy đã dừng hoặc mất kết nối.");
    const previous = await one(
      env,
      "SELECT id FROM attempts WHERE id=?",
      input.attemptId,
    );
    if (previous)
      throw error(
        409,
        "Lượt gửi này đã được giữ chỗ. Cần đối soát trước khi thử lại.",
      );
    const campaign = JSON.parse(job.snapshot);
    const workspace = await one(
      env,
      "SELECT * FROM workspaces WHERE id=?",
      workspaceId,
    );
    const day = localClock(new Date(), workspace.timezone).day;
    const url = groupUrl(input.groupUrl);
    const result = await run(
      env,
      `INSERT INTO attempts(id,workspace_id,job_id,group_url,status,day,data,updated_at)
      SELECT ?,?,?,?,'submitting',?,?,? WHERE
      (SELECT count(*) FROM attempts WHERE workspace_id=? AND day=? AND status IN ('submitting','unknown','success','pending_approval')) < ?
      AND (SELECT count(*) FROM attempts a JOIN jobs j ON j.id=a.job_id WHERE a.workspace_id=? AND a.day=? AND j.campaign_id=? AND a.status IN ('submitting','unknown','success','pending_approval')) < ?
      AND NOT EXISTS (SELECT 1 FROM attempts WHERE workspace_id=? AND group_url=? AND (status IN ('submitting','unknown','pending_approval') OR (status='success' AND updated_at>?)))`,
      input.attemptId,
      workspaceId,
      job.id,
      url,
      day,
      JSON.stringify({
        title: String(input.title || "").slice(0, 120),
        timestamp: new Date(now).toISOString(),
      }),
      now,
      workspaceId,
      day,
      Math.min(workspace.daily_limit, maxDaily(env)),
      workspaceId,
      day,
      job.campaign_id,
      campaign.dailyLimit,
      workspaceId,
      url,
      now - campaign.cooldownDays * 86400000,
    );
    if (!result.meta.changes)
      throw error(
        409,
        "Đã hết hạn mức hoặc nhóm còn bài chờ/đang trong khoảng nghỉ.",
      );
    return json({ id: input.attemptId });
  }
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
        title: String(a.title || "").slice(0, 120),
        postUrl: validPostUrl(a.postUrl),
        error: String(a.error || "").slice(0, 600),
        comment: a.comment
          ? {
              status: String(a.comment.status || ""),
              error: String(a.comment.error || "").slice(0, 500),
            }
          : null,
        timestamp: a.timestamp,
      };
      // An agent may reconcile an earlier job's attempt, but only in its own workspace.
      statements.push(
        env.DB.prepare(
          "UPDATE attempts SET status=?,data=?,updated_at=CASE WHEN status!=? THEN ? ELSE updated_at END WHERE id=? AND workspace_id=? AND (status!='success' OR ?='success')",
        ).bind(
          a.status,
          JSON.stringify(data),
          a.status,
          Date.now(),
          a.id,
          workspaceId,
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
    if (input.finished) {
      const status = job.cancel_requested
        ? "canceled"
        : input.error
          ? "failed"
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
    return json({ ok: true });
  }
  if (path.startsWith("/api/device/assets/") && request.method === "GET")
    return assetResponse(env, workspaceId, path.split("/").at(-1));
  throw error(404, "Không tìm thấy API thiết bị.");
}
