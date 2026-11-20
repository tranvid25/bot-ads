import { all } from '../models/database.mjs';
import { error } from '../middleware/security.mjs';
export async function legacyTargets(env, workspaceId, campaign, snapshot) {
  if (snapshot) throw error(409, 'Lượt chiến dịch cũ cần chọn lại nhóm. Hủy lượt cũ, mở Chỉnh sửa và tạo lượt đăng mới.');
  const urls = [...new Set(campaign.groupUrls || [])];
  if (!urls.length) throw error(409, 'Chưa chọn nhóm để đăng. Tìm nhóm trong Facebook Groups, sau đó chọn nhóm cho chiến dịch.');
  const groups = await all(env, 'SELECT * FROM facebook_groups WHERE workspace_id=?', workspaceId);
  const selected = urls.map(url => groups.filter(g => g.url === url && g.eligibility === 'approved' && g.reviewed_at >= Date.now() - 7 * 86400000));
  if (selected.some(matches => matches.length !== 1))
    throw error(409, 'Chiến dịch cũ cần chọn lại nhóm đã duyệt trong thư viện. Nội dung vẫn được giữ; mở Chỉnh sửa → Nhóm mục tiêu.');
  return { ...campaign, workflowVersion: 2, groupIds: selected.map(matches => matches[0].id), autoDiscover: false, autoJoin: false };
}
