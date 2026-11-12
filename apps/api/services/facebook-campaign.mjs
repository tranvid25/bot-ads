import { all } from "../models/database.mjs";
import { error } from "../middleware/security.mjs";

export async function reviewedCampaign(
  env,
  workspaceId,
  campaign,
  requireTargets = false,
  snapshot = false,
) {
  if (campaign.workflowVersion !== 2) return campaign;
  if (!campaign.groupIds.length) {
    if (requireTargets || campaign.enabled)
      throw error(
        409,
        "Chưa có nhóm được duyệt. Mở Facebook Groups, tìm hoặc nhập nhóm rồi duyệt và chọn nhóm trước khi chạy.",
      );
    return { ...campaign, groupUrls: [], autoDiscover: false, autoJoin: false };
  }
  const groups = await all(
    env,
    "SELECT id,url,account_key,eligibility,reviewed_at FROM facebook_groups WHERE workspace_id=?",
    workspaceId,
  );
  const selected = campaign.groupIds.map((id) =>
    groups.find((g) => g.id === id),
  );
  if (
    selected.some(
      (g) =>
        !g ||
        g.eligibility !== "approved" ||
        !g.reviewed_at ||
        g.reviewed_at < Date.now() - 7 * 86400000,
    )
  )
    throw error(
      409,
      "Danh sách nhóm đã thay đổi hoặc cần kiểm tra lại sau 7 ngày. Duyệt và chọn lại nhóm.",
    );
  const accounts = [
    ...new Set(
      selected.map((g) => g.account_key).filter((key) => key !== "import"),
    ),
  ];
  if (accounts.length > 1)
    throw error(
      409,
      "Chọn nhóm của cùng một tài khoản Facebook cho mỗi chiến dịch.",
    );
  if (
    snapshot &&
    selected.some((g) => campaign.groupReviews?.[g.id] !== g.reviewed_at)
  )
    throw error(
      409,
      "Nhóm đã được duyệt lại sau khi xếp lịch. Hủy lượt cũ và tạo lượt chạy mới.",
    );
  return {
    ...campaign,
    facebookAccountKey: accounts[0] || "",
    groupReviews: Object.fromEntries(
      selected.map((g) => [g.id, g.reviewed_at]),
    ),
    groupUrls: [...new Set(selected.map((g) => g.url))],
    autoDiscover: false,
    autoJoin: false,
  };
}
