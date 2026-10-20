const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = process.env.BOTADS_DATA_DIR || __dirname;
const file = name => path.join(ROOT, name);
function read(name, fallback) {
  const target = file(name);
  if (!fs.existsSync(target)) return structuredClone(fallback);
  try { return JSON.parse(fs.readFileSync(target, 'utf8').replace(/^\uFEFF/, '')); }
  catch { throw new Error(`Không đọc được ${name}. Khôi phục file trước khi chạy tiếp.`); }
}
function write(name, value) {
  fs.mkdirSync(ROOT, { recursive: true });
  const target = file(name);
  const temporary = target + '.' + crypto.randomUUID() + '.tmp';
  try {
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temporary, target);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
function canonicalGroup(value) {
  try {
    const url = new URL(value);
    if (!['facebook.com', 'www.facebook.com', 'm.facebook.com'].includes(url.hostname.toLowerCase())) return null;
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const match = url.pathname.match(/^\/groups\/([^/]+)\/?$/i);
    if (!match || ['feed', 'discover', 'joins', 'create', 'notifications', 'categories', 'search'].includes(match[1].toLowerCase())) return null;
    return `https://www.facebook.com/groups/${match[1].toLowerCase()}`;
  } catch { return null; }
}
const fingerprint = post => crypto.createHash('sha256').update(post.content || '').digest('hex');
module.exports = { ROOT, file, read, write, canonicalGroup, fingerprint };
