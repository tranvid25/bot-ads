const crypto = require('crypto');
const path = require('path');
const { loadConfig } = require('./settings');
const { loadState, eligibility, dailyUsage, updateAttempt, updateGroup, saveRun } = require('./history');
const { getNextPostContent, confirmPostUsed } = require('./ai_generator');
const { launchBrowser } = require('./browser_helper');
const { sleep, checkStop, startDeadline } = require('./runtime');
function plan(config = loadConfig(), now = new Date()) {
  const state = loadState();
  const remaining = Math.max(0, config.maxPostsPerDay - dailyUsage(config, now, state));
  const limit = Math.min(config.maxPostsPerRun, remaining);
  const items = [...config.groups].sort((a, b) => Number(state.groups[b]?.membership === 'joined') - Number(state.groups[a]?.membership === 'joined'))
    .map(url => ({ url, reason: eligibility(url, config, now, state) }));
  let selected = 0;
  for (const item of items) {
    if (!item.reason && selected >= limit) item.reason = 'Giới hạn bài trong lượt/ngày';
    if (!item.reason) selected++;
  }
  return { limit, remaining, items };
}
function reconcilePool() {
  for (const attempt of loadState().attempts.filter(a => ['success', 'pending_approval'].includes(a.status) && !a.poolConsumed && !a.legacy)) {
    confirmPostUsed(attempt);
    updateAttempt(attempt.id, { poolConsumed: true });
  }
}
async function runPosting({ config = loadConfig(), dryRun = false, managedDeadline = false, dependencies = {} } = {}) {
  const summary = { id: crypto.randomUUID(), type: 'posting', startedAt: new Date().toISOString(), sent: 0, failed: 0, unconfirmed: 0, status: 'completed' };
  let session;
  if (!managedDeadline) startDeadline(config.maxRunMinutes);
  try {
    if (!dryRun) checkStop();
    if (!dryRun) reconcilePool();
    const work = plan(config);
    console.log(`Kế hoạch: tối đa ${work.limit} bài/lượt, còn ${work.remaining} bài/ngày.`);
    const skipped = work.items.filter(item => item.reason);
    for (const item of work.items.filter(item => !item.reason)) console.log(`SẼ ĐĂNG ${item.url}`);
    const reasons = {};
    for (const item of skipped) reasons[item.reason] = (reasons[item.reason] || 0) + 1;
    for (const [reason, count] of Object.entries(reasons)) console.log(`BỎ QUA ${count} nhóm — ${reason}`);
    if (dryRun) return work;
    const uncertain = loadState().attempts.filter(a => ['unknown', 'submitting'].includes(a.status));
    if (uncertain.length && config.haltOnUnknown) throw new Error(`Có ${uncertain.length} lượt gửi chưa rõ kết quả. Dùng npm run manage -- attempts và resolve trước.`);
    const targets = work.items.filter(item => !item.reason);
    if (!targets.length) { summary.status = 'no_targets'; console.warn('Không có nhóm đủ điều kiện nên chưa gửi bài nào. Xem các lý do bỏ qua ở trên.'); return summary; }
    session = await (dependencies.launchBrowser || launchBrowser)({ headless: config.headless ?? false });
    let failures = 0;
    for (let i = 0; i < targets.length; i++) {
      checkStop();
      // Re-evaluate limits after midnight and after each persisted attempt.
      if (dailyUsage(config) >= config.maxPostsPerDay) break;
      if (eligibility(targets[i].url, config)) continue;
      const post = getNextPostContent();
      const images = config.images || [];
      const image = images.length ? path.resolve(__dirname, images[i % images.length]) : null;
      const status = await (dependencies.postToGroup || require('./post').postToGroup)(session.page, targets[i].url, post, image, config);
      const accepted = ['success', 'pending_approval'].includes(status);
      const group = loadState().groups[targets[i].url] || {};
      if (accepted || status === 'failed') updateGroup(targets[i].url, { failures: accepted ? 0 : (group.failures || 0) + 1 });
      if (accepted) { summary.sent++; failures = 0; }
      else if (status === 'unknown') { summary.unconfirmed++; failures = 0; }
      else { summary.failed++; failures++; }
      if (status === 'unknown' && config.haltOnUnknown) throw new Error('Kết quả gửi chưa rõ. Đã dừng để tránh đăng trùng.');
      if (status === 'unknown') console.warn('Giữ nguyên nhóm và bài chưa xác nhận, tiếp tục nhóm khác.');
      if (failures >= config.maxConsecutiveFailures && config.haltOnConsecutiveFailures) throw new Error('Đã đạt giới hạn lỗi liên tiếp.');
      if (failures === config.maxConsecutiveFailures && !config.haltOnConsecutiveFailures) console.warn('Nhiều nhóm lỗi liên tiếp; bỏ qua các nhóm lỗi và tiếp tục trong giới hạn lượt chạy.');
      if (i < targets.length - 1) {
        const seconds = config.minDelaySeconds + Math.floor(Math.random() * (config.maxDelaySeconds - config.minDelaySeconds + 1));
        console.log(`Nghỉ ${seconds}s...`); await (dependencies.sleep || sleep)(seconds * 1000);
      }
    }
    return summary;
  } catch (error) {
    summary.status = 'stopped'; summary.error = error.message; throw error;
  } finally {
    if (session) {
      await session.context.close().catch(() => {});
      await session.browser.close().catch(() => {});
    }
    if (!dryRun) saveRun({ ...summary, endedAt: new Date().toISOString() });
  }
}
module.exports = { plan, runPosting, reconcilePool };
