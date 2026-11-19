import { test } from 'node:test';
import assert from 'node:assert/strict';
import { facebookWorker } from './helpers/facebook-worker.mjs';
test('runtime phases and remote commands are scoped, idempotent, acknowledged and expiring', async () => {
  const w = await facebookWorker();
  try {
    const a = await w.owner('runtime-owner'), b = await w.owner('runtime-other');
    const heartbeat = runtime => w.request('/device/heartbeat', { method:'POST', token:a.token, data:{ facebookReady:true, runtime } });
    await heartbeat({ phase:'paused' });
    const snapshot = await w.request('/devices/runtime', { cookie:a.cookie });
    assert.equal(snapshot.data.devices[0].phase, 'paused');
    const deviceId = snapshot.data.devices[0].id;
    const send = cookie => w.request('/devices/commands', { cookie, method:'POST', data:{ deviceId, action:'resume' } });
    const first = await send(a.cookie), again = await send(a.cookie);
    assert.equal(first.status, 200, JSON.stringify(first.data));
    assert.equal(first.data.command.id, again.data.command.id);
    assert.equal((await send(b.cookie)).status, 404);
    const command = (await heartbeat({ phase:'paused' })).data.command;
    assert.equal(command.action, 'resume');
    const ack = () => w.request('/device/commands/ack', { token:a.token, method:'POST', data:{ id:command.id } });
    assert.equal((await ack()).status, 200); assert.equal((await ack()).status, 200);
    assert.equal((await heartbeat({ phase:'ready' })).data.command, null);
    const pending = await send(a.cookie);
    await w.db.prepare('UPDATE desktop_commands SET expires_at=0 WHERE id=?').bind(pending.data.command.id).run();
    assert.equal((await heartbeat({ phase:'ready' })).data.command, null);
  } finally { await w.mf.dispose(); }
});
