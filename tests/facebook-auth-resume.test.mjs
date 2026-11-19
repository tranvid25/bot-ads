import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { facebookWorker } from './helpers/facebook-worker.mjs';
test('expired auth requeues the same job only when no submission is uncertain', async () => {
  const w = await facebookWorker();
  try {
    const a = await w.owner('auth-resume'), campaign = randomUUID(), job = randomUUID();
    await w.db.prepare("INSERT INTO campaigns VALUES (?,?,?,'{}',0,?)").bind(campaign,a.workspaceId,'Auth retry',Date.now()).run();
    await w.db.prepare("INSERT INTO jobs(id,workspace_id,campaign_id,slot,snapshot,status,device_id,created_at,updated_at) VALUES (?,?,?,?,'{}','running',?,?,?)").bind(job,a.workspaceId,campaign,randomUUID(),a.deviceId,Date.now(),Date.now()).run();
    const report = () => w.request('/device/report',{ method:'POST',token:a.token,data:{ jobId:job,finished:true,authRequired:true,error:'Login expired' } });
    assert.equal((await report()).status,200);
    assert.equal((await w.db.prepare('SELECT status FROM jobs WHERE id=?').bind(job).first()).status,'queued');
    await w.db.prepare("UPDATE jobs SET status='running' WHERE id=?").bind(job).run();
    await w.db.prepare("INSERT INTO attempts VALUES (?,?,?,?,'unknown','2026-11-19','{}',?)").bind(randomUUID(),a.workspaceId,job,'https://www.facebook.com/groups/website',Date.now()).run();
    assert.equal((await report()).status,200);
    assert.equal((await w.db.prepare('SELECT status FROM jobs WHERE id=?').bind(job).first()).status,'needs_review');
  } finally { await w.mf.dispose(); }
});
