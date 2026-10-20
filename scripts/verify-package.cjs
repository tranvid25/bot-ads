const assert = require('node:assert/strict');
const fs = require('node:fs');
const asar = require('@electron/asar');
const archive = process.env.BOTADS_APP_ASAR || 'release/win-unpacked/resources/app.asar';
assert.ok(fs.existsSync(archive), `Packaged app archive not found: ${archive}`);
const files = asar.listPackage(archive).map(name => name.replaceAll('\\', '/'));
for (const required of ['/apps/companion/main.cjs', '/apps/companion/runner.cjs', '/packages/automation/automation.js', '/packages/automation/storage.js', '/packages/desktop-state.cjs']) {
  assert.ok(files.includes(required), `Missing runtime file: ${required}`);
}
const forbidden = files.filter(name => !name.startsWith('/node_modules/') && /(?:^|\/)(?:auth\.json|config\.json|\.dev\.vars|credentials\.bin|history\.json|automation_state\.json|ai_posts_pool\.json|user_data)(?:\/|$)/.test(name));
assert.deepEqual(forbidden, [], 'Private data must never be shipped with the app.');
console.log('PASS: packaged runtime present; no private configuration, sessions or history.');
