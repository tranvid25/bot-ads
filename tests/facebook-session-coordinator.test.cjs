const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
test('idle Facebook worker is reused without occupying ctx.child or duplicating IPC listeners', async () => {
  let forks = 0;
  const child = new EventEmitter();
  Object.assign(child, { connected:true,stdout:new EventEmitter(),stderr:new EventEmitter(),send: () => setImmediate(() => child.emit('message',{type:'done'})) });
  const ctx = { fs:{mkdirSync(){}}, dataDir:()=>'fixture', app:{isPackaged:false}, path:require('node:path'), baseDir:'fixture',
    fork:()=>{forks++;return child;},notify(){},log(){},socialEvent:async()=>false,credentials:{} };
  const runner = require('../apps/companion/runtime/runner.cjs')(ctx);
  await runner.spawnRunner({action:'login'});
  assert.equal(ctx.child,null); assert.equal(ctx.facebookWorker,child);
  await runner.spawnRunner({action:'recheck'});
  assert.equal(ctx.child,null); assert.equal(forks,1);
  assert.equal(child.listenerCount('message'),0);
  assert.equal(child.stdout.listenerCount('data'),1);
});
test('duplicate connect commands do not reopen an already-ready browser', async () => {
  let acks = 0;
  const ctx = { credentials:{},hasWork:()=>false,state:()=>({phase:'ready',facebookReady:true}),saveCredentials(){},request:async()=>acks++ };
  const command = require('../apps/companion/runtime/device-command.cjs');
  await command(ctx,{id:'connect-once',action:'connect'});
  await command(ctx,{id:'connect-once',action:'connect'});
  assert.equal(acks,2); assert.equal(ctx.facebookLogin,undefined);
});
