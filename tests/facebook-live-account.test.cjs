const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertFacebookIdentity } = require('../packages/automation/account_guard.cjs');
test('submission guard checks live cookie identity and distinguishes logout from an account switch', async () => {
  let current = 'owner';
  const page = { context: () => ({ cookies: async () => current ? [{name:'c_user',value:current}] : [] }) };
  await assertFacebookIdentity(page,'owner');
  current = 'other';
  await assert.rejects(assertFacebookIdentity(page,'owner'),{code:'FACEBOOK_ACCOUNT_CHANGED'});
  current = null;
  await assert.rejects(assertFacebookIdentity(page,'owner'),{code:'FACEBOOK_AUTH_REQUIRED'});
  await assertFacebookIdentity({},undefined);
});
