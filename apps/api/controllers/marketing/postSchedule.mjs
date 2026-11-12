import { all, one } from "../../models/database.mjs";
import { json, id } from "../../lib/http.mjs";
import { body, error } from "../../middleware/security.mjs";
import {
  MANUAL_PROVIDERS,
  validateSchedule,
} from "../../../../packages/contracts/marketing.mjs";
import { owned } from "./owned.mjs";
import social from "../../../../packages/social-contract.cjs";
export async function postSchedule(request, env, context, execution) {
  const { workspaceId } = context;
  const path = new URL(request.url).pathname,
    method = request.method,
    parts = path.split("/");
  if (parts[3] !== "posts") return;
  if (parts.length === 6 && parts[5] === "schedule" && method === "POST") {
    const input = await body(request, 5000);
    const schedule = validateSchedule(input);
    const post = await owned(env, "marketing_posts", workspaceId, parts[4]);
    if (post.status !== "approved" || post.revision !== Number(input.revision))
      throw error(409, "Cần duyệt phiên bản hiện tại trước khi đặt lịch.");
    const variants = JSON.parse(post.variants);
    const statements = [];
    for (const channelId of schedule.channelIds) {
      const channel = await owned(
        env,
        "marketing_channels",
        workspaceId,
        channelId,
      );
      if (channel.brand_id !== post.brand_id || channel.status !== "connected")
        throw error(
          400,
          "Tài khoản phải đang kết nối và thuộc cùng thương hiệu.",
        );
      if (channel.expires_at && channel.expires_at <= schedule.scheduledAt)
        throw error(
          400,
          "Kết nối sẽ hết hạn trước lịch đăng. Hãy kết nối lại hoặc chọn lịch sớm hơn.",
        );
      const variant = variants.find((v) => v.provider === channel.provider);
      if (!variant)
        throw error(400, `Chưa có nội dung cho ${channel.provider}.`);
      if (channel.transport === "desktop") {
        const asset = variant.assetId
          ? await one(
              env,
              "SELECT mime FROM assets WHERE id=? AND workspace_id=?",
              variant.assetId,
              workspaceId,
            )
          : null;
        social.variant(channel.provider, variant, asset);
        const device = await one(
          env,
          "SELECT id FROM devices WHERE id=? AND workspace_id=? AND revoked_at IS NULL AND social_supported=1",
          channel.device_id,
          workspaceId,
        );
        if (!device)
          throw error(
            409,
            "Máy của kênh đã ngắt hoặc cần cập nhật app. Kết nối lại kênh trước khi đặt lịch.",
          );
      }
      const unresolved = await one(
        env,
        "SELECT scheduled_at FROM marketing_publications WHERE post_id=? AND revision=? AND channel_id=? AND status IN ('scheduled','retry_wait','publishing','unknown','needs_reauth','awaiting_manual')",
        post.id,
        post.revision,
        channelId,
      );
      if (unresolved && unresolved.scheduled_at !== schedule.scheduledAt)
        throw error(
          409,
          "Bản nội dung này đang có lịch hoặc kết quả chưa rõ trên tài khoản đã chọn. Xử lý lượt đó trước khi đặt lịch mới.",
        );
      const snapshot = {
        ...variant,
        postTitle: post.title,
        sourceUrl: post.source_url,
        approvedAt: post.approved_at,
      };
      const transport =
        channel.transport === "desktop"
          ? "desktop"
          : MANUAL_PROVIDERS.includes(channel.provider)
            ? "manual"
            : "api";
      const status = transport === "manual" ? "awaiting_manual" : "scheduled";
      statements.push(
        env.DB.prepare(
          "INSERT INTO marketing_publications(id,workspace_id,post_id,channel_id,revision,snapshot,scheduled_at,status,created_at,updated_at,transport) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM marketing_posts WHERE id=? AND workspace_id=? AND revision=? AND status='approved') AND EXISTS(SELECT 1 FROM marketing_channels WHERE id=? AND status='connected') ON CONFLICT(post_id,revision,channel_id,scheduled_at) DO NOTHING",
        ).bind(
          id(),
          workspaceId,
          post.id,
          channelId,
          post.revision,
          JSON.stringify(snapshot),
          schedule.scheduledAt,
          status,
          Date.now(),
          Date.now(),
          transport,
          post.id,
          workspaceId,
          post.revision,
          channelId,
        ),
      );
    }
    try {
      await env.DB.batch(statements);
    } catch (e) {
      if (/UNIQUE constraint/.test(String(e)))
        throw error(
          409,
          "Có lượt đăng cùng nội dung đang chờ. Tải lại danh sách trước khi đặt lịch.",
        );
      throw e;
    }
    const publications = await all(
      env,
      "SELECT id,channel_id,status FROM marketing_publications WHERE post_id=? AND workspace_id=? AND revision=? AND scheduled_at=?",
      post.id,
      workspaceId,
      post.revision,
      schedule.scheduledAt,
    );
    if (
      publications.filter((p) => schedule.channelIds.includes(p.channel_id))
        .length !== schedule.channelIds.length
    )
      throw error(
        409,
        "Nội dung hoặc kết nối đã thay đổi. Tải lại rồi đặt lịch.",
      );
    return json({
      publications,
    });
  }
}
