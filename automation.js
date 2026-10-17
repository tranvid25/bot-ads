const { loadConfig } = require('./settings');
const { runPosting, plan, reconcilePool } = require('./post_runner');
const { cli, checkStop, startDeadline } = require('./runtime');
function shouldDiscover(config, state, now = Date.now()) {
  const previous = state.lastDiscoveryAt || state.runs.filter(run => run.status === 'completed' && run.stages?.includes('search')).at(-1)?.endedAt;
  return !config.discoveredGroups.length || !previous || now - new Date(previous).getTime() >= config.discoveryIntervalHours * 3600000;
}
async function main({ dryRun = false, dependencies = {} } = {}) {
  let config = loadConfig();
  if (dryRun) return runPosting({ config, dryRun: true });
  const run = { id: require('crypto').randomUUID(), type: 'pipeline', startedAt: new Date().toISOString(), stages: [], status: 'completed' };
  try {
  startDeadline(config.maxRunMinutes);
  await require('./reconcile_posts').main({ config });
  if (config.haltOnUnknown && require('./history').loadState().attempts.some(a => ['unknown', 'submitting'].includes(a.status))) throw new Error('Còn lượt gửi chưa xác nhận. Dùng manage attempts / resolve trước.');
  reconcilePool();
  for (const [flag, script] of [['search', './search_groups'], ['sync', './get_groups'], ['selection', './select_groups'], ['join', './join_groups']]) {
    checkStop();
    if (flag === 'search' && config.automation.search && !shouldDiscover(config, require('./history').loadState())) {
      console.log(`Dùng lại ${config.discoveredGroups.length} nhóm đã cào; chưa đến kỳ tìm mới ${config.discoveryIntervalHours} giờ.`);
      continue;
    }
    if (flag.startsWith('selection') ? config.groupSelection.enabled : config.automation[flag]) {
      console.log(`Bước: ${flag}`);
      if (dependencies.runStage) await dependencies.runStage(flag, config);
      else await require(script).main({ config });
      config = loadConfig();
      run.stages.push(flag);
    }
  }
  if (config.automation.generateAI) {
    const count = plan(config).items.filter(item => !item.reason).length;
    const pool = require('./storage').read('ai_posts_pool.json', []);
    if (count > pool.length) await require('./ai_generator').replenishAIPool(Math.min(50, count - pool.length));
  }
  checkStop();
  return await (dependencies.runPosting || runPosting)({ config, managedDeadline: true });
  } catch (error) {
    run.status = 'stopped'; run.error = error.message; throw error;
  } finally { require('./history').saveRun({ ...run, endedAt: new Date().toISOString() }); }
}
if (require.main === module) cli(() => main({ dryRun: process.argv.includes('--dry-run') }), { allowStopped: process.argv.includes('--dry-run') });
module.exports = { main, shouldDiscover };
