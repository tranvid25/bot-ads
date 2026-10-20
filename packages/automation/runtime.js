const fs = require('fs');
const { file } = require('./storage');
class HaltError extends Error { constructor(message) { super(message); this.name = 'HaltError'; } }
let deadline = Infinity;
let executionGuard = null;
let submissionGuard = null;
function setExecutionGuard(guard) { executionGuard = guard; }
function setSubmissionGuard(guard) { submissionGuard = guard; }
async function authorizeSubmission(details) { checkStop(); return submissionGuard ? submissionGuard(details) : null; }
function startDeadline(minutes) { deadline = Date.now() + minutes * 60000; }
function checkStop() {
  if (executionGuard) executionGuard();
  if (fs.existsSync(file('STOP'))) throw new HaltError('Đã yêu cầu dừng. Chạy npm run resume để cho phép lượt tiếp theo.');
  if (Date.now() >= deadline) throw new HaltError('Đã đạt giới hạn thời gian lượt chạy.');
}
async function sleep(ms) {
  const until = Date.now() + ms;
  do { checkStop(); await new Promise(resolve => setTimeout(resolve, Math.min(500, Math.max(0, until - Date.now())))); } while (Date.now() < until);
  checkStop();
}
function acquireLock() {
  const target = file('botads.lock');
  fs.mkdirSync(require('path').dirname(target), { recursive: true });
  const tryCreate = () => {
    const fd = fs.openSync(target, 'wx');
    fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    fs.closeSync(fd);
  };
  try { tryCreate(); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    let owner;
    try { owner = JSON.parse(fs.readFileSync(target, 'utf8')); } catch { throw new Error('Khóa chạy bị hỏng. Kiểm tra tiến trình rồi xóa botads.lock.'); }
    if (!Number.isInteger(owner.pid) || owner.pid <= 0) throw new Error('Khóa chạy không hợp lệ.');
    try { process.kill(owner.pid, 0); }
    catch (e) {
      if (e.code !== 'ESRCH') throw new Error('Không xác định được tiến trình giữ khóa.');
      fs.unlinkSync(target);
      tryCreate();
      return () => release();
    }
    throw new Error(`Bot đang chạy (PID ${owner.pid}). Không mở hai lượt cùng lúc.`);
  }
  return () => release();
  function release() {
    if (fs.existsSync(target) && JSON.parse(fs.readFileSync(target, 'utf8')).pid === process.pid) fs.unlinkSync(target);
  }
}
async function runExclusive(work, { allowStopped = false } = {}) {
  const release = acquireLock();
  const stop = () => fs.writeFileSync(file('STOP'), 'signal');
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  try { if (!allowStopped) checkStop(); return await work(); }
  finally { process.off('SIGINT', stop); process.off('SIGTERM', stop); release(); deadline = Infinity; }
}
async function assertAccountReady(page) {
  checkStop();
  if (/\/(login|checkpoint|challenge|recover|two_step_verification)(\/|\?|$)/i.test(new URL(page.url()).pathname)) throw new HaltError('Facebook yêu cầu đăng nhập hoặc xác minh. Chạy npm run login.');
  const login = page.locator('input[name="email"], input[name="pass"]');
  if (await login.first().isVisible().catch(() => false)) throw new HaltError('Phiên Facebook hết hạn. Chạy npm run login.');
  const blocked = page.getByText(/you(?:'re| are) temporarily blocked|we limit how often|tài khoản.*bị hạn chế|bạn tạm thời bị chặn|chúng tôi giới hạn tần suất/i).first();
  if (await blocked.isVisible().catch(() => false)) throw new HaltError('Facebook đang hạn chế thao tác. Bot đã dừng.');
}
function cli(work, options) { return runExclusive(work, options).catch(error => { console.error('❌', error.message); process.exitCode = 1; }); }
module.exports = { HaltError, checkStop, sleep, startDeadline, acquireLock, runExclusive, assertAccountReady, cli, setExecutionGuard, setSubmissionGuard, authorizeSubmission };
