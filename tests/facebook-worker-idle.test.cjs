const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fork } = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
test('Facebook worker accepts sequential requests without exiting or keeping the task lock', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'botads-idle-worker-'));
  const child = fork(path.resolve('apps/companion/runner.cjs'), [], { env: { ...process.env, BOTADS_DATA_DIR: dir }, stdio: ['ignore','ignore','ignore','ipc'] });
  const request = () => new Promise((resolve,reject) => {
    const timer = setTimeout(() => reject(Error('worker did not return')), 45000);
    const listener = event => { if (event.type === 'done') { clearTimeout(timer); child.removeListener('message', listener); resolve(event); } };
    child.on('message', listener); child.send({ type:'start', action:'recheck', attemptId:'missing' });
  });
  try {
    assert.match((await request()).error, /bằng chứng gốc/);
    assert.equal(child.connected, true);
    assert.match((await request()).error, /bằng chứng gốc/);
    assert.equal(child.connected, true);
  } finally { child.disconnect(); await new Promise(resolve => child.once('exit',resolve)); fs.rmSync(dir,{recursive:true,force:true}); }
});
