const { read, write } = require('./storage');
const { loadConfig, dateKey } = require('./settings');
const { runExclusive, checkStop, sleep } = require('./runtime');
function scheduleSlot(now, config) {
  const day = dateKey(now, config.timezone);
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: config.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const clock = ['hour', 'minute'].map(type => parts.find(p => p.type === type).value).join(':');
  const weekday = new Date(day + 'T12:00:00Z').getUTCDay();
  return config.schedule.weekdays.includes(weekday) && clock >= config.schedule.time ? day : null;
}
async function tick(now = new Date(), execute = () => require('./automation').main()) {
  const config = loadConfig();
  const slot = scheduleSlot(now, config);
  if (!slot) return false;
  return runExclusive(async () => {
    const state = read('schedule_state.json', {});
    if (state.lastSlot === slot) return false;
    write('schedule_state.json', { lastSlot: slot, startedAt: now.toISOString(), status: 'running' });
    try {
      await execute();
      write('schedule_state.json', { lastSlot: slot, endedAt: new Date().toISOString(), status: 'completed' });
    } catch (error) {
      write('schedule_state.json', { lastSlot: slot, endedAt: new Date().toISOString(), status: 'failed', error: error.message });
      throw error;
    }
    return true;
  });
}
async function main() {
  console.log('Bộ đặt lịch đang chạy. Giữ máy bật; Ctrl+C để dừng. Giờ/ngày lấy từ config.json.');
  let stopped = false;
  const stop = () => { stopped = true; };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  try {
    while (!stopped) {
      checkStop();
      try { await tick(); } catch (error) { console.error(error.message); }
      if (!stopped) await sleep(15000);
    }
  } finally { process.off('SIGINT', stop); process.off('SIGTERM', stop); }
}
if (require.main === module) (process.argv.includes('--once') ? tick() : main()).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { scheduleSlot, tick };
