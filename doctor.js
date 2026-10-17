const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { file, read } = require('./storage');
const { loadConfig } = require('./settings');
const { loadState } = require('./history');
function main() {
  const config = loadConfig(); const state = loadState();
  const auth = read('auth.json', { cookies: [] });
  const user = auth.cookies?.find(c => c.name === 'c_user');
  const checks = [
    { check: 'Node >= 20', ok: Number(process.versions.node.split('.')[0]) >= 20 },
    { check: 'Chromium đã cài', ok: fs.existsSync(chromium.executablePath()) },
    { check: 'Có cookie đăng nhập chưa hết hạn (cần kiểm tra trực tiếp để xác nhận phiên)', ok: Boolean(user && (user.expires === -1 || user.expires * 1000 > Date.now())) },
    { check: 'Có nhóm đã chọn hoặc bật tự đánh giá nhóm', ok: config.groupSelection.enabled || Object.values(state.groups).some(g => g.advertisingAllowed && !g.blocked) },
    { check: 'Có thể tiếp tục theo chế độ xử lý kết quả chưa rõ', ok: !config.haltOnUnknown || !state.attempts.some(a => ['unknown', 'submitting'].includes(a.status)) },
    { check: 'Không có yêu cầu dừng', ok: !fs.existsSync(file('STOP')) },
    { check: 'Ảnh hợp lệ', ok: !config.attachImage || Boolean(config.images?.length && config.images.every(p => fs.existsSync(path.resolve(__dirname, p)))) }
  ];
  console.table(checks);
  console.log(`Nhóm: ${config.groups.length}; khoảng nghỉ: ${config.cooldownDays} ngày; tối đa: ${config.maxPostsPerRun}/lượt, ${config.maxPostsPerDay}/ngày.`);
  if (checks.some(check => !check.ok)) process.exitCode = 1;
  return checks;
}
if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
module.exports = { main };
