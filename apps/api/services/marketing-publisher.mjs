import { all, one, run } from "../models/database.mjs";
import { id } from "../lib/http.mjs";
import { localClock } from "../../../packages/contracts/campaign.mjs";
import { unseal, credentialContext } from "./marketing-vault.mjs";
import { publishToProvider, PublishError } from "./marketing-providers.mjs";

async function lock(env, provider, actor, publicationId) {
  return one(
    env,
    "INSERT INTO marketing_account_slots(provider,actor_id,owner_token,until_at) VALUES (?,?,?,?) ON CONFLICT(provider,actor_id) DO UPDATE SET owner_token=excluded.owner_token,until_at=excluded.until_at WHERE marketing_account_slots.until_at<=? RETURNING owner_token",
    provider,
    actor,
    publicationId,
    Date.now() + 180000,
    Date.now(),
  );
}
async function release(env, provider, actor, publicationId, delay = 0) {
  await run(
    env,
    "UPDATE marketing_account_slots SET until_at=? WHERE provider=? AND actor_id=? AND owner_token=?",
    Date.now() + delay,
    provider,
    actor,
    publicationId,
  );
}
async function event(env, p, state, message) {
  await run(
    env,
    "INSERT INTO marketing_attempts VALUES (?,?,?,?,?,?,?)",
    id(),
    p.id,
    p.workspace_id,
    p.claim_token,
    state,
    message,
    Date.now(),
  );
}
async function prepareImage(env, p, variant) {
  if (!variant.assetId) return null;
  const source = await one(
    env,
    "SELECT * FROM assets WHERE id=? AND workspace_id=?",
    variant.assetId,
    p.workspace_id,
  );
  if (
    !source ||
    !["image/jpeg", "image/png", "image/webp"].includes(source.mime)
  )
    throw new PublishError(
      "Ảnh không còn tồn tại hoặc định dạng chưa được hỗ trợ.",
    );
  const original = await env.MEDIA.get(source.object_key);
  if (!original) throw new PublishError("Không tìm thấy dữ liệu ảnh.");
  const bytes = await original.arrayBuffer();
  // Copy an immutable public image only for an approved publication, never expose private asset URLs.
  let media = await one(
    env,
    "SELECT * FROM marketing_public_media WHERE publication_id=?",
    p.id,
  );
  if (!media) {
    const mediaId = id();
    const objectKey = `marketing-public/${p.workspace_id}/${mediaId}`;
    await env.MEDIA.put(objectKey, bytes, {
      httpMetadata: { contentType: source.mime },
    });
    await run(
      env,
      "INSERT INTO marketing_public_media VALUES (?,?,?,?,?,?)",
      mediaId,
      p.id,
      p.workspace_id,
      objectKey,
      source.mime,
      Date.now(),
    );
    media = { id: mediaId };
  }
  const origin = new URL(env.PUBLIC_APP_URL).origin;
  return {
    bytes,
    mime: source.mime,
    url: `${origin}/api/marketing/media/${media.id}`,
  };
}
async function execute(env, p) {
  let workspaceLock = false,
    accountLock = false,
    account;
  try {
    account = await one(
      env,
      "SELECT * FROM marketing_channels WHERE id=? AND workspace_id=?",
      p.channel_id,
      p.workspace_id,
    );
    if (!account || account.status !== "connected")
      throw new PublishError("Tài khoản đã ngắt kết nối.", "needs_reauth");
    if (account.expires_at && account.expires_at <= Date.now() + 60000)
      throw new PublishError(
        "Kết nối đã hoặc sắp hết hạn. Vui lòng kết nối lại.",
        "needs_reauth",
      );
    workspaceLock = Boolean(
      await lock(env, "workspace", p.workspace_id, p.claim_token),
    );
    if (!workspaceLock)
      throw new PublishError(
        "Đang xử lý một bài khác của bạn.",
        "retry_wait",
        60000,
      );
    accountLock = Boolean(
      await lock(env, account.provider, account.actor_id, p.claim_token),
    );
    if (!accountLock)
      throw new PublishError(
        "Tài khoản đang có bài gửi khác hoặc trong khoảng nghỉ.",
        "retry_wait",
        60000,
      );
    const credential = await unseal(
      env,
      credentialContext(account),
      account.credential,
    );
    const variant = JSON.parse(p.snapshot);
    const image = await prepareImage(env, p, variant);
    const result = await publishToProvider(env, account, credential, variant, {
      image,
      beforeSubmit: async () => {
        const workspace = await one(
          env,
          "SELECT daily_limit,timezone FROM workspaces WHERE id=?",
          p.workspace_id,
        );
        const day = localClock(new Date(), workspace.timezone).day;
        const usage = await one(
          env,
          "SELECT count(*) AS n FROM marketing_publications WHERE workspace_id=? AND quota_day=? AND submit_started_at IS NOT NULL AND status IN ('publishing','published','unknown','user_reported_published')",
          p.workspace_id,
          day,
        );
        if (usage.n >= workspace.daily_limit)
          throw new PublishError(
            "Đã đạt giới hạn marketing/ngày của tài khoản. Chọn lịch ngày khác hoặc điều chỉnh giới hạn.",
          );
        const globalUsage = await one(
          env,
          "SELECT count(*) AS n FROM marketing_publications p JOIN marketing_channels c ON c.id=p.channel_id WHERE c.provider=? AND c.actor_id=? AND p.submit_started_at>=? AND p.status IN ('publishing','published','unknown','user_reported_published')",
          account.provider,
          account.actor_id,
          Date.now() - 86400000,
        );
        const max = Math.max(
          1,
          Number(env.MARKETING_ACCOUNT_DAILY_LIMIT) || 100,
        );
        if (globalUsage.n >= max)
          throw new PublishError(
            "Tài khoản nền tảng đã đạt giới hạn 24 giờ của hệ thống.",
          );
        const updated = await run(
          env,
          "UPDATE marketing_publications SET submit_started_at=?,quota_day=?,updated_at=? WHERE id=? AND claim_token=? AND status='publishing' AND cancel_requested=0 AND lease_until>? AND EXISTS(SELECT 1 FROM marketing_channels WHERE id=? AND status='connected' AND credential=?)",
          Date.now(),
          day,
          Date.now(),
          p.id,
          p.claim_token,
          Date.now(),
          p.channel_id,
          account.credential,
        );
        if (!updated.meta.changes)
          throw new PublishError("Đã dừng trước khi gửi bài.", "canceled");
      },
    });
    const saved = await run(
      env,
      "UPDATE marketing_publications SET status='published',remote_id=?,permalink=?,error=NULL,lease_until=NULL,updated_at=? WHERE id=? AND claim_token=? AND status='publishing'",
      result.remoteId,
      result.permalink,
      Date.now(),
      p.id,
      p.claim_token,
    );
    if (saved.meta.changes)
      await event(
        env,
        p,
        "published",
        "API trả thành công và ID bài. Trạng thái index/tương tác được đo riêng.",
      );
  } catch (e) {
    const latest = await one(
      env,
      "SELECT status,submit_started_at,cancel_requested FROM marketing_publications WHERE id=?",
      p.id,
    );
    if (latest?.status !== "publishing") return;
    let state =
      e instanceof PublishError
        ? e.state
        : latest?.submit_started_at
          ? "unknown"
          : "failed";
    let message =
      e instanceof PublishError
        ? e.message
        : e.status === 503
          ? e.message
          : "Không hoàn tất được tác vụ. Kiểm tra kết nối và nhật ký.";
    if (latest?.cancel_requested && !latest.submit_started_at) {
      state = "canceled";
      message = "Đã dừng trước khi gửi bài.";
    }
    // Busy slots are scheduling delays, not provider failures; don't exhaust attempts for those.
    const busy = state === "retry_wait" && (!workspaceLock || !accountLock);
    if (state === "retry_wait" && p.attempt_count >= 5 && !busy) {
      state = "failed";
      message =
        "Đã đạt số lần thử lại giới hạn. Kiểm tra tài khoản trước khi thử tiếp.";
    }
    if (state === "needs_reauth" && account)
      await run(
        env,
        "UPDATE marketing_channels SET status='needs_reauth' WHERE id=? AND status='connected' AND credential=?",
        account.id,
        account.credential,
      );
    await run(
      env,
      "UPDATE marketing_publications SET status=?,error=?,scheduled_at=CASE WHEN ?='retry_wait' THEN ? ELSE scheduled_at END,attempt_count=attempt_count-?,lease_until=NULL,updated_at=? WHERE id=? AND claim_token=? AND status='publishing'",
      state,
      message,
      state,
      Date.now() + (e.retryAfter || 300000),
      busy ? 1 : 0,
      Date.now(),
      p.id,
      p.claim_token,
    );
    await event(env, p, state, message);
  } finally {
    if (accountLock)
      await release(
        env,
        account.provider,
        account.actor_id,
        p.claim_token,
        60000,
      );
    if (workspaceLock)
      await release(env, "workspace", p.workspace_id, p.claim_token);
  }
}
export async function dispatchMarketing(env, { workspaceId, limit = 5 } = {}) {
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM marketing_oauth_states WHERE expires_at<?",
    ).bind(now),
    // A crash before HTTP submission can be retried; a crash after submission cannot.
    env.DB.prepare(
      "UPDATE marketing_publications SET status=CASE WHEN submit_started_at IS NULL THEN CASE WHEN cancel_requested=1 THEN 'canceled' ELSE 'scheduled' END ELSE 'unknown' END,error='Lượt chạy bị gián đoạn; bài đã bắt đầu gửi cần kiểm tra thủ công.',lease_until=NULL,updated_at=? WHERE status='publishing' AND lease_until<?",
    ).bind(now, now),
  ]);
  const due = await all(
    env,
    `SELECT id FROM marketing_publications WHERE status IN ('scheduled','retry_wait') AND scheduled_at<=? AND cancel_requested=0${workspaceId ? " AND workspace_id=?" : ""} ORDER BY scheduled_at,id LIMIT ?`,
    now,
    ...(workspaceId ? [workspaceId] : []),
    Math.min(limit, 20),
  );
  let processed = 0;
  for (const candidate of due) {
    const claim = id();
    let publication;
    try {
      publication = await one(
        env,
        "UPDATE marketing_publications SET status='publishing',claim_token=?,lease_until=?,submit_started_at=NULL,attempt_count=attempt_count+1,updated_at=? WHERE id=? AND status IN ('scheduled','retry_wait') AND cancel_requested=0 RETURNING *",
        claim,
        Date.now() + 180000,
        Date.now(),
        candidate.id,
      );
    } catch (e) {
      if (/UNIQUE constraint/.test(String(e))) continue;
      throw e;
    }
    if (publication) {
      await execute(env, publication);
      processed++;
    }
  }
  return { processed };
}
