function normalize(text = '') {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim();
}
function classifyGroup(evidence, config) {
  const text = normalize([evidence.name, evidence.description, evidence.rules].join('\n'));
  if (!text || !evidence.name) return { allowed: false, reason: 'Không đọc được thông tin nhóm' };
  if (config.excludedKeywords.some(word => word && text.includes(normalize(word)))) return { allowed: false, reason: 'Có từ khóa loại trừ' };
  if (!config.groupSelection.topicKeywords.some(word => word && text.includes(normalize(word)))) return { allowed: false, reason: 'Không khớp chủ đề sản phẩm' };
  const prohibited = /(?:khong|cam|nghiem cam)\s+(?:cho\s+)?(?:duoc\s+)?(?:phep\s+)?(?:dang\s+)?(?:bai\s+)?(?:viet\s+)?(?:quang cao|ban hang|pr\b|spam)|(?:no|without)\s+(?:ads\b|advertis\w*|promot\w*|self[- ]promotion)|(?:do not|don't|does not|doesn't|never)\s+(?:allow|permit)\s+(?:ads|advertis\w*|promot\w*)|(?:advertis\w*|promot\w*|ads)\s+(?:are\s+|is\s+)?(?:not allowed|prohibited|forbidden|banned)/;
  if (prohibited.test(text)) return { allowed: false, reason: 'Nội quy có dấu hiệu cấm quảng cáo' };
  const conditional = /(?:quang cao|promot\w*|advertis\w*|ads).{0,100}(?:chi vao|chi duoc vao|thu [2-7]|chu nhat|tra phi|xin phep|admin approval|only on|only for|paid|permission required|with permission|provided that|subject to|\bneu\b|\bif\b)|(?:xin phep|tra phi|duoc admin duyet).{0,60}(?:quang cao|dang bai)/;
  if (conditional.test(text)) return { allowed: false, reason: 'Quảng cáo có điều kiện; chưa tự xác nhận được điều kiện' };
  const permission = /(?:cho phep|duoc phep|hoan nghenh)\s+(?:cac\s+)?(?:bai\s+)?(?:viet\s+)?(?:dang\s+)?(?:bai\s+)?(?:quang cao|gioi thieu san pham|ban hang)|(?:ads|advertising|promotional posts|self[- ]promotion)\s+(?:are\s+|is\s+)?(?:allowed|welcome|permitted)|(?:allow|welcome)\s+(?:ads|advertising|promotional posts)|feel free to (?:advertise|promote)/;
  const match = permission.exec(text);
  if (!match && config.groupSelection.mode === 'exclude-prohibited') return {
    allowed: true, reason: 'Khớp chủ đề; chưa phát hiện lệnh cấm hoặc điều kiện quảng cáo',
    evidence: text.slice(0, 500), permissionConfirmed: false
  };
  if (!match) return { allowed: false, reason: 'Chưa thấy nội dung cho phép quảng cáo rõ ràng' };
  return { allowed: true, reason: 'Khớp chủ đề và có nội dung cho phép quảng cáo', evidence: text.slice(Math.max(0, match.index - 60), match.index + match[0].length + 100) };
}
function permissionReason(group = {}, config, now = new Date()) {
  if (group.blocked) return `Đã loại trừ: ${group.reason || 'không phù hợp'}`;
  if (group.approvalSource === 'automatic') {
    if (!config.groupSelection.enabled) return 'Chế độ tự chọn nhóm đã tắt';
    if (!group.selection?.checkedAt || now - new Date(group.selection.checkedAt) >= config.groupSelection.recheckDays * 86400000) return 'Cần kiểm tra lại nội quy nhóm';
    if (group.selection.policyMode !== config.groupSelection.mode) return 'Cần đánh giá lại theo chế độ chọn nhóm mới';
  }
  if (config.requireApprovedGroups && group.advertisingAllowed !== true) return group.selection?.reason || 'Chưa xác nhận nhóm cho phép quảng cáo';
  return null;
}
module.exports = { normalize, classifyGroup, permissionReason };
