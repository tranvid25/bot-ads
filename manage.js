const fs = require('fs');
const { file, read, write, canonicalGroup } = require('./storage');
const { loadConfig } = require('./settings');
const { loadState, updateGroup, updateAttempt } = require('./history');
const { plan, reconcilePool } = require('./post_runner');
const { cli } = require('./runtime');
function option(args, name) { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; }
function resolveAttempt(id, status, note, postUrl) {
  if (!['success', 'pending_approval', 'failed', 'rejected'].includes(status)) throw new Error('Trạng thái: success, pending_approval, failed hoặc rejected.');
  if (!note?.trim()) throw new Error('Cần --note mô tả kết quả đã kiểm tra trên Facebook.');
  const attempt = loadState().attempts.find(a => a.id === id);
  if (!attempt) throw new Error('ID lượt gửi không tồn tại.');
  if (postUrl) {
    const url = new URL(postUrl);
    if (!['https:', 'http:'].includes(url.protocol) || !['facebook.com', 'www.facebook.com', 'm.facebook.com'].includes(url.hostname)) throw new Error('Liên kết bài phải thuộc Facebook.');
  }
  if (status === 'success' && !postUrl && !attempt.postUrl) throw new Error('Cần --url liên kết bài đã đăng.');
  updateAttempt(id, {
    status, postUrl: postUrl || attempt.postUrl || null,
    resolutions: [...(attempt.resolutions || []), { previousStatus: attempt.status, status, note, at: new Date().toISOString() }]
  });
  if (['success', 'pending_approval'].includes(status)) reconcilePool();
  if (status === 'rejected') {
    const group = loadState().groups[attempt.groupUrl] || {};
    updateGroup(attempt.groupUrl, { failures: (group.failures || 0) + 1 });
  }
}
async function main(args = process.argv.slice(2)) {
  const [command, value, status] = args;
  if (command === 'groups') {
    const config = loadConfig(); const state = loadState();
    const targets = [...new Set([...config.groups, ...config.discoveredGroups])];
    console.table(targets.map(url => ({ url, name: state.groups[url]?.name || '', permission: state.groups[url]?.blocked ? 'blocked' : state.groups[url]?.advertisingAllowed ? 'allowed' : 'review', source: state.groups[url]?.approvalSource || '', reason: state.groups[url]?.selection?.reason || '', membership: state.groups[url]?.membership || 'unknown' })));
  } else if (command === 'allow' || command === 'block') {
    const url = canonicalGroup(value);
    if (!url) throw new Error('Cần URL nhóm Facebook.');
    const reason = option(args, '--note') || (command === 'block' ? 'Loại trừ thủ công' : 'Người dùng xác nhận nhóm cho phép quảng cáo');
    updateGroup(url, { advertisingAllowed: command === 'allow', approvalSource: 'manual', blocked: command === 'block', reason, failures: 0 });
    if (command === 'allow') {
      const config = read('config.json', {});
      config.discoveredGroups = [...new Set([...(config.discoveredGroups || []), url])]; write('config.json', config);
    }
    console.log('Đã cập nhật:', url);
  } else if (command === 'attempts') {
    console.table(loadState().attempts.slice(-100).map(({ id, groupUrl, status, timestamp, postUrl, error }) => ({ id, groupUrl, status, timestamp, postUrl, error })));
  } else if (command === 'resolve') {
    resolveAttempt(value, status, option(args, '--note'), option(args, '--url')); console.log('Đã lưu kết quả kiểm tra.');
  } else if (command === 'membership') {
    if (!['joined', 'requested', 'manual_required', 'unknown', 'retry'].includes(status)) throw new Error('membership: joined/requested/manual_required/unknown/retry');
    updateGroup(value, { membership: status });
  } else if (command === 'plan') {
    console.table(plan().items);
  } else if (command === 'report') {
    const state = loadState();
    const report = { generatedAt: new Date().toISOString(), attempts: state.attempts, groups: state.groups, runs: state.runs };
    write('report.json', report);
    const escape = value => '"' + String(value ?? '').replace(/^[=+@-]/, "'$&").replace(/"/g, '""') + '"';
    const columns = ['id', 'groupUrl', 'status', 'timestamp', 'title', 'postUrl', 'error'];
    const csv = [columns.join(','), ...state.attempts.map(a => columns.map(key => escape(a[key])).join(','))].join('\r\n');
    fs.writeFileSync(file('report.csv'), '\uFEFF' + csv, 'utf8');
    console.log('Đã xuất:', file('report.json'), file('report.csv'));
    console.table(state.runs.slice(-10));
  } else {
    console.log('groups | allow URL | block URL --note "lý do" | membership URL retry | attempts | resolve ID STATUS --note "kết quả" [--url LINK] | plan | report');
  }
}
if (require.main === module) cli(() => main(), { allowStopped: true });
module.exports = { main, resolveAttempt };
