const { read, canonicalGroup } = require('./storage');
const defaults = {
  timezone: 'Asia/Ho_Chi_Minh', cooldownDays: 7, maxPostsPerRun: 5,
  maxPostsPerDay: 10, maxConsecutiveFailures: 3, maxJoinsPerRun: 3,
  maxRunMinutes: 45, minDelaySeconds: 60, maxDelaySeconds: 120,
  maxScrolls: 30, requireApprovedGroups: true,
  haltOnUnknown: false,
  haltOnConsecutiveFailures: false,
  discoveryIntervalHours: 24,
  commentWebsiteUrl: 'https://pronunreview.com',
  groupSelection: { enabled: true, mode: 'exclude-prohibited', maxGroupsPerRun: 10, recheckDays: 7, topicKeywords: ['tiếng anh', 'english', 'ielts', 'speaking', 'phát âm', 'pronunciation', 'toeic'] },
  searchKeywords: ['tự học tiếng anh', 'luyện thi ielts speaking', 'học phát âm tiếng anh', 'tiếng anh giao tiếp'],
  excludedKeywords: ['nhà đất', 'bất động sản', 'tuyển dụng'],
  automation: { search: true, join: true, sync: true, generateAI: true },
  schedule: { time: '09:00', weekdays: [1, 2, 3, 4, 5] }
};
function loadConfig() {
  const raw = read('config.json', {});
  const config = { ...defaults, ...raw, groupSelection: { ...defaults.groupSelection, ...raw.groupSelection }, automation: { ...defaults.automation, ...raw.automation }, schedule: { ...defaults.schedule, ...raw.schedule } };
  if (typeof config.haltOnUnknown !== 'boolean' || typeof config.groupSelection.enabled !== 'boolean') throw new Error('haltOnUnknown/groupSelection.enabled phải là true/false.');
  if (typeof config.haltOnConsecutiveFailures !== 'boolean') throw new Error('haltOnConsecutiveFailures phải là true/false.');
  if (!['exclude-prohibited', 'explicit-permission'].includes(config.groupSelection.mode)) throw new Error('groupSelection.mode không hợp lệ.');
  if (!Number.isFinite(config.discoveryIntervalHours) || config.discoveryIntervalHours < 1) throw new Error('discoveryIntervalHours phải ít nhất là 1.');
  for (const key of ['maxGroupsPerRun', 'recheckDays']) if (!Number.isInteger(config.groupSelection[key]) || config.groupSelection[key] < 1) throw new Error(`groupSelection.${key} phải là số nguyên dương.`);
  if (!Array.isArray(config.groupSelection.topicKeywords) || !config.groupSelection.topicKeywords.length || config.groupSelection.topicKeywords.some(word => typeof word !== 'string' || !word.trim())) throw new Error('Cần topicKeywords không rỗng.');
  for (const key of ['groups', 'discoveredGroups', 'images', 'geminiModels']) if (raw[key] !== undefined && (!Array.isArray(raw[key]) || raw[key].some(v => typeof v !== 'string'))) throw new Error(`${key} phải là danh sách chữ.`);
  if (config.geminiModels && !config.geminiModels.length) throw new Error('geminiModels không được rỗng.');
  if (config.commentLinkUnderPost) {
    const url = new URL(config.commentWebsiteUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('commentWebsiteUrl phải là link web HTTP/HTTPS.');
  }
  if (typeof config.requireApprovedGroups !== 'boolean') throw new Error('requireApprovedGroups phải là true/false.');
  for (const value of Object.values(config.automation)) if (typeof value !== 'boolean') throw new Error('Các bước automation phải là true/false.');
  for (const key of ['cooldownDays', 'maxPostsPerRun', 'maxPostsPerDay', 'maxConsecutiveFailures', 'maxJoinsPerRun', 'maxRunMinutes', 'maxScrolls']) {
    if (!Number.isInteger(config[key]) || config[key] < 1) throw new Error(`Cấu hình ${key} phải là số nguyên dương.`);
  }
  if (!Number.isFinite(config.minDelaySeconds) || config.minDelaySeconds < 1 || !Number.isFinite(config.maxDelaySeconds) || config.maxDelaySeconds < config.minDelaySeconds) throw new Error('Khoảng nghỉ không hợp lệ.');
  new Intl.DateTimeFormat('en', { timeZone: config.timezone });
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(config.schedule.time)) throw new Error('Giờ chạy phải có dạng HH:mm.');
  if (!Array.isArray(config.schedule.weekdays) || !config.schedule.weekdays.length || config.schedule.weekdays.some(n => !Number.isInteger(n) || n < 0 || n > 6)) throw new Error('weekdays phải gồm số 0..6 (Chủ nhật..Thứ bảy).');
  for (const key of ['searchKeywords', 'excludedKeywords']) if (!Array.isArray(config[key]) || config[key].some(v => typeof v !== 'string')) throw new Error(`${key} phải là danh sách chữ.`);
  config.groups = [...new Set((raw.groups || []).map(canonicalGroup).filter(Boolean))];
  config.discoveredGroups = [...new Set((raw.discoveredGroups || []).map(canonicalGroup).filter(Boolean))];
  return config;
}
function dateKey(date = new Date(), timezone = 'Asia/Ho_Chi_Minh') {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = type => parts.find(p => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
module.exports = { defaults, loadConfig, dateKey };
