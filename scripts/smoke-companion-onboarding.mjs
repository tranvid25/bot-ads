import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless:true });
try {
  const page = await browser.newPage({ viewport:{ width:1100,height:900 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    const listeners = [];
    window.fixture = { linked:false,logs:[],facebookReady:false,online:false,receivingEnabled:false,socialAccounts:{},phase:'login_required' };
    window.emitFixture = change => { Object.assign(window.fixture,change); listeners.forEach(fn => fn(window.fixture)); };
    window.botads = { onState:fn => listeners.push(fn), command:async name => {
      if (window.failCommand) throw Error('Fixture: không liên lạc được máy chủ.');
      if (name === 'website') window.openedCampaign = true;
      if (name === 'stop') window.emitFixture({ receivingEnabled:false,phase:'paused' });
      return window.fixture;
    } };
  });
  await page.goto(pathToFileURL(path.resolve('apps/companion/index.html')).href);
  await page.evaluate(() => window.emitFixture({ linked:true,online:true,facebookLogin:true,phase:'connecting' }));
  assert.equal(await page.locator('#finish-login').isVisible(),false);
  assert.equal(await page.locator('#resume').isVisible(),false);
  await page.getByText(/BotAds sẽ tự chuyển sang sẵn sàng/).waitFor();
  await page.evaluate(() => window.emitFixture({ facebookLogin:false,facebookReady:true,receivingEnabled:true,phase:'ready' }));
  await page.getByText(/Sẵn sàng. Vào chiến dịch/).waitFor();
  assert.equal(await page.locator('#login').isVisible(),false,'connected users are not prompted to log in again');
  await page.getByRole('button',{ name:'Mở chiến dịch Facebook ↗',exact:true }).click();
  assert.equal(await page.evaluate(() => window.openedCampaign),true);
  await page.getByText('Nâng cao · tạm dừng, đổi tài khoản và ngắt kết nối',{ exact:true }).click();
  await page.locator('#stop').click();
  await page.getByText(/Trên website, bấm Chạy và chọn Tiếp tục/).waitFor();
  await page.evaluate(() => { window.failCommand = true; });
  await page.locator('#login').click();
  await page.getByRole('alert').filter({hasText:'Fixture: không liên lạc được máy chủ.'}).waitFor();
  assert.deepEqual(errors,[]);
  await page.screenshot({path:'test-results/companion-simple-flow.png',fullPage:true});
  console.log('PASS: automatic-ready desktop flow, campaign link, advanced controls and errors.');
} finally { await browser.close(); }
