import { json } from "../lib/http.mjs";
import { one, all } from "../models/database.mjs";
import { error } from "../middleware/security.mjs";
export async function campaignResults(
  request,
  env,
  campaignId,
  { workspaceId },
) {
  const campaign = await one(
    env,
    "SELECT id,name FROM campaigns WHERE id=? AND workspace_id=?",
    campaignId,
    workspaceId,
  );
  if (!campaign) throw error(404, "Không tìm thấy chiến dịch.");
  const params = new URL(request.url).searchParams;
  const status = params.get("status") || "";
  const jobId = params.get("job") || "";
  const search = (params.get("q") || "").trim().slice(0, 120);
  const page = Math.max(
    1,
    Math.min(100000, Number.parseInt(params.get("page"), 10) || 1),
  );
  const scope = "a.workspace_id=? AND j.campaign_id=?";
  const filters =
    " AND (?='' OR a.status=?) AND (?='' OR a.job_id=?) AND (?='' OR instr(lower(a.group_url || ' ' || a.data),lower(?))>0)";
  const args = [
    workspaceId,
    campaignId,
    status,
    status,
    jobId,
    jobId,
    search,
    search,
  ];
  const [counts, total, attempts, jobs] = await Promise.all([
    all(
      env,
      `SELECT a.status,count(*) AS count FROM attempts a JOIN jobs j ON j.id=a.job_id WHERE ${scope} GROUP BY a.status`,
      workspaceId,
      campaignId,
    ),
    one(
      env,
      `SELECT count(*) AS count FROM attempts a JOIN jobs j ON j.id=a.job_id WHERE ${scope}${filters}`,
      ...args,
    ),
    all(
      env,
      `SELECT a.*,r.status AS recheck_status,r.error AS recheck_error FROM attempts a JOIN jobs j ON j.id=a.job_id LEFT JOIN facebook_rechecks r ON r.attempt_id=a.id WHERE ${scope}${filters} ORDER BY a.updated_at DESC,a.id LIMIT 20 OFFSET ?`,
      ...args,
      (page - 1) * 20,
    ),
    all(
      env,
      "SELECT id,status,created_at,updated_at,result FROM jobs WHERE workspace_id=? AND campaign_id=? ORDER BY created_at DESC LIMIT 100",
      workspaceId,
      campaignId,
    ),
  ]);
  return json({
    campaign,
    counts: Object.fromEntries(counts.map((c) => [c.status, c.count])),
    total: total.count,
    page,
    pageSize: 20,
    jobs,
    attempts: attempts.map((a) => ({
      ...JSON.parse(a.data),
      ...a,
      data: undefined,
    })),
  });
}
