const { HaltError } = require('./runtime');
async function assertFacebookIdentity(page, expectedUid) {
  if (!expectedUid) return;
  const current = (await page.context().cookies(['https://www.facebook.com'])).find(c => c.name === 'c_user')?.value;
  if (current !== expectedUid) throw Object.assign(new HaltError('Tài khoản Facebook đã thay đổi hoặc hết phiên. Kết nối lại đúng tài khoản trước khi tiếp tục.'), { code:current ? 'FACEBOOK_ACCOUNT_CHANGED' : 'FACEBOOK_AUTH_REQUIRED' });
}
module.exports = { assertFacebookIdentity };
