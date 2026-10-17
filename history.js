const crypto = require('crypto');
const { read, write, canonicalGroup, fingerprint } = require('./storage');
const { dateKey } = require('./settings');
const ACCEPTED = ['success', 'pending_approval'];
const UNCERTAIN = ['submitting', 'unknown'];
function loadState() {
  const state = read('automation_state.json', null);
  if (state) {
    if (!Array.isArray(state.attempts) || !state.groups || !Array.isArray(state.runs)) throw new Error('automation_state.json không hợp lệ.');
    return state;
  }
  const attempts = [];
  for (const [day, records] of Object.entries(read('history.json', {}))) {
    for (const [url, record] of Object.entries(records)) {
      const groupUrl = canonicalGroup(url);
      if (groupUrl) attempts.push({ ...record, id: `legacy:${day}:${groupUrl}`, groupUrl, timestamp: record.timestamp || `${day}T00:00:00+07:00`, legacy: true, poolConsumed: true });
    }
  }
  return { version: 2, attempts, groups: {}, runs: [] };
}
const configuredTimezone = () => read('config.json', {}).timezone || 'Asia/Ho_Chi_Minh';
const getTodayKey = (date = new Date()) => dateKey(date, configuredTimezone());
function beginAttempt(groupUrl, post, submittedContent) {
  const state = loadState();
  const attempt = {
    id: crypto.randomUUID(), groupUrl: canonicalGroup(groupUrl), status: 'submitting',
    timestamp: new Date().toISOString(), title: post.title, source: post.source,
    content: post.content, submittedContent, poolId: post.poolId, contentHash: fingerprint(post), poolConsumed: post.source !== 'AI_GEMINI'
  };
  if (!attempt.groupUrl) throw new Error('URL nhóm không hợp lệ.');
  state.attempts.push(attempt); write('automation_state.json', state); return attempt.id;
}
function updateAttempt(id, changes) {
  const state = loadState();
  const attempt = state.attempts.find(item => item.id === id);
  if (!attempt) throw new Error('Không tìm thấy lượt gửi bài.');
  if (changes.status === 'success' && attempt.status !== 'success') changes = { ...changes, publishedAt: new Date().toISOString() };
  Object.assign(attempt, changes, { updatedAt: new Date().toISOString() });
  write('automation_state.json', state);
}
function recordPostResult(groupUrl, status, error = '', details = {}) {
  const state = loadState();
  state.attempts.push({ id: crypto.randomUUID(), groupUrl: canonicalGroup(groupUrl), status, error, timestamp: new Date().toISOString(), ...details });
  write('automation_state.json', state);
}
function eligibility(url, config, now = new Date(), state = loadState()) {
  const groupUrl = canonicalGroup(url);
  if (!groupUrl) return 'URL nhóm không hợp lệ';
  const group = state.groups[groupUrl] || {};
  const permission = require('./group_policy').permissionReason(group, config, now);
  if (permission) return permission;
  if ((config.excludedKeywords || []).some(word => word && (group.name || '').toLowerCase().includes(word.toLowerCase()))) return 'Tên nhóm có từ khóa loại trừ';
  const records = state.attempts.filter(a => canonicalGroup(a.groupUrl) === groupUrl);
  if (records.some(a => UNCERTAIN.includes(a.status))) return 'Có lượt gửi chưa xác nhận';
  if (records.some(a => a.status === 'pending_approval')) return 'Bài đang chờ duyệt';
  const sent = records.filter(a => a.status === 'success').sort((a, b) => new Date(b.publishedAt || b.timestamp) - new Date(a.publishedAt || a.timestamp))[0];
  if (sent && now - new Date(sent.publishedAt || sent.timestamp) < config.cooldownDays * 86400000) return `Chưa hết khoảng nghỉ ${config.cooldownDays} ngày`;
  if ((group.failures || 0) >= 3) return 'Nhóm lỗi nhiều lần; kiểm tra rồi cho phép lại';
  return null;
}
function dailyUsage(config, now = new Date(), state = loadState()) {
  const day = dateKey(now, config.timezone);
  return state.attempts.filter(a => [...ACCEPTED, ...UNCERTAIN].includes(a.status) && dateKey(new Date(a.timestamp), config.timezone) === day).length;
}
function updateGroup(url, changes) {
  const key = canonicalGroup(url);
  if (!key) throw new Error('URL nhóm không hợp lệ.');
  const state = loadState();
  state.groups[key] = { ...state.groups[key], ...changes, updatedAt: new Date().toISOString() };
  write('automation_state.json', state);
}
function isGroupPostedToday(url) {
  return loadState().attempts.some(a => canonicalGroup(a.groupUrl) === canonicalGroup(url) && a.status === 'success' && getTodayKey(new Date(a.timestamp)) === getTodayKey());
}
function shouldSkipGroupToday(url) {
  return loadState().attempts.some(a => canonicalGroup(a.groupUrl) === canonicalGroup(url) &&
    (['pending_approval', ...UNCERTAIN].includes(a.status) || a.status === 'success' && getTodayKey(new Date(a.timestamp)) === getTodayKey()));
}
function getTodayStats(allGroups = []) {
  const state = loadState();
  const stats = { date: getTodayKey(), total: allGroups.length, success: [], failed: [], pending: [], awaitingApproval: [], unconfirmed: [] };
  for (const url of allGroups) {
    const records = state.attempts.filter(a => canonicalGroup(a.groupUrl) === canonicalGroup(url));
    const record = records.filter(a => ['pending_approval', ...UNCERTAIN].includes(a.status)).at(-1) || records.filter(a => getTodayKey(new Date(a.timestamp)) === stats.date).at(-1);
    const key = !record ? 'pending' : record.status === 'success' ? 'success' : record.status === 'pending_approval' ? 'awaitingApproval' : UNCERTAIN.includes(record.status) ? 'unconfirmed' : 'failed';
    stats[key].push(record ? { ...record, url, time: new Date(record.timestamp).toLocaleTimeString('vi-VN', { timeZone: configuredTimezone() }) } : url);
  }
  return stats;
}
function saveRun(run) { const state = loadState(); state.runs.push(run); state.runs = state.runs.slice(-200); write('automation_state.json', state); }
module.exports = { loadState, getTodayKey, beginAttempt, updateAttempt, recordPostResult, eligibility, dailyUsage, updateGroup, isGroupPostedToday, shouldSkipGroupToday, getTodayStats, saveRun };
