const { checkStop, startDeadline } = require('./runtime');
async function main(config, dependencies = {}) {
  checkStop();
  if (!config.groups?.length) throw new Error('Chưa chọn nhóm để đăng; không tự tìm nhóm thay thế.');
  if (config.discoveredGroups?.length || ['search', 'sync', 'join'].some(key => config.automation?.[key]))
    throw new Error('Cấu hình đăng chiến dịch không được bật tìm hoặc tham gia nhóm.');
  console.log(`ĐĂNG CHIẾN DỊCH · ${config.cloudJobId} · ${config.groups.length} nhóm đã chọn`);
  startDeadline(config.maxRunMinutes || 45);
  const state = (dependencies.loadState || require('./history').loadState)();
  const attemptIds = state.attempts.filter(attempt => config.groups.includes(attempt.groupUrl)).map(attempt => attempt.id);
  if (attemptIds.length) {
    await (dependencies.reconcile || require('./reconcile_posts').main)({ config, attemptIds });
    checkStop();
  }
  // Posting retains reservations, duplicate guards, quotas, media, comments and evidence.
  return (dependencies.runPosting || require('./post_runner').runPosting)({ config, managedDeadline: true });
}
module.exports = { main };
