const fs = require('fs');
const path = require('path');
const { getTodayStats, getTodayKey } = require('./history');

const CONFIG_PATH = path.join(__dirname, 'config.json');

const config = fs.existsSync(CONFIG_PATH) ? JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) : { groups: [] };
const groups = config.groups || [];

const stats = getTodayStats(groups);

console.log('========================================================');
console.log(`📊 THỐNG KÊ TIẾN ĐỘ ĐĂNG BÀI NGÀY HÔM NAY (${stats.date})`);
console.log('========================================================');
console.log(`📌 Tổng số nhóm trong danh sách: ${stats.total}`);
console.log(`✅ Đã đăng thành công:          ${stats.success.length} nhóm`);
console.log(`❌ Đăng thất bại:               ${stats.failed.length} nhóm`);
console.log(`⏳ Chưa đăng (Đang chờ):        ${stats.pending.length} nhóm`);
console.log(`🕒 Đã gửi, đang chờ duyệt:      ${stats.awaitingApproval.length} nhóm`);
console.log(`❔ Chưa xác nhận, cần kiểm tra: ${stats.unconfirmed.length} nhóm`);
console.log('========================================================\n');

if (stats.success.length > 0) {
  console.log('🎉 DANH SÁCH NHÓM ĐÃ ĐĂNG THÀNH CÔNG HÔM NAY:');
  stats.success.forEach((item, idx) => {
    console.log(`  ${idx + 1}. [${item.time}] ${item.url}`);
  });
  console.log('');
}

if (stats.failed.length > 0) {
  console.log('⚠️ DANH SÁCH NHÓM ĐĂNG THẤT BẠI:');
  stats.failed.forEach((item, idx) => {
    console.log(`  ${idx + 1}. [${item.time}] ${item.url}`);
    if (item.error) console.log(`     Lỗi: ${item.error}`);
  });
  console.log('');
}

for (const item of [...stats.awaitingApproval, ...stats.unconfirmed]) {
  console.log(`  [${item.time}] ${item.url}${item.error ? ' — ' + item.error : ' — Đang chờ duyệt'}`);
}

if (stats.pending.length > 0) {
  console.log('⏳ CÁC NHÓM CHƯA ĐĂNG HÔM NAY:');
  stats.pending.slice(0, 10).forEach((url, idx) => {
    console.log(`  ${idx + 1}. ${url}`);
  });
  if (stats.pending.length > 10) {
    console.log(`  ... và còn ${stats.pending.length - 10} nhóm nữa.`);
  }
}

console.log('\n========================================================');
