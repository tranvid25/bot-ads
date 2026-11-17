const { test } = require('node:test');
const assert = require('node:assert/strict');
test('large Unicode content is split below the API limit and completion is sent last', async () => {
  const requests = [];
  const attempts = Array.from({ length: 30 }, (_, i) => ({ id: String(i), submittedContent: '😀'.repeat(10000) }));
  const ctx = {
    current: { job: { id: 'job' }, events: [], finished: true },
    reportAttempts: () => attempts,
    request: async (path, method, data) => requests.push(data),
    fs: { unlinkSync() {} }, activeFile: () => 'active',
  };
  await require('../apps/companion/runtime/reporting.cjs')(ctx).report();
  assert.ok(requests.length > 1);
  assert.ok(requests.every(r => Buffer.byteLength(JSON.stringify(r)) < 900000));
  assert.ok(requests.slice(0,-1).every(r => !r.finished));
  assert.equal(requests.at(-1).finished, true);
  assert.equal(requests.flatMap(r => r.attempts).length, 30);
  assert.equal(ctx.current, null);
});
