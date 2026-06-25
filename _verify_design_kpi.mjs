/* 驗設計 KPI 頁：
 * 1. 假登入成 林美玲 → 切到 office-d4
 * 2. 確認三張小卡（每日該完成 / 今天應已累計 / 領先落後）有 render
 * 3. 確認圖種 select 有 7 個 option (含 剪輯/社群圖文)
 * 4. 確認 console 無 error
 */
import puppeteer from 'puppeteer';
const URL = process.env.URL || 'http://localhost:8765/';

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
page.setDefaultTimeout(15000);
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push('[console.error] ' + m.text()); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

await page.goto(URL, { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 2500));

// 假裝成林美玲（設計師）登入
await page.evaluate(() => {
  // 先建一筆 Linda 帳號（如果還沒有）避免 currentUser.name 對不上設計師白名單
  const users = window.Store.get(window.Store.KEYS.users, []);
  let linda = users.find(u => u.name === '林美玲');
  if (!linda) {
    linda = { username: 'linda', name: '林美玲', role: 'staff', departments: ['設計'] };
    users.push(linda);
    window.Store.setLocalOnly ? window.Store.setLocalOnly(window.Store.KEYS.users, users)
                              : window.Store.set(window.Store.KEYS.users, users);
  }
  window.App.currentUser = linda;
  document.body.classList.add('logged-in');
});

// 跳到設計辦公室
await page.evaluate(() => {
  window.App.route = 'office-d4';
  window.App.render();
});
await new Promise(r => setTimeout(r, 800));

const check = await page.evaluate(() => {
  const text = document.querySelector('#main-content')?.textContent || '';
  const cards = {
    dailyTargetCard: text.includes('每日該完成的分數'),
    todayShouldHaveCard: text.includes('今天應該已累計'),
    aheadBehindCard: /領先進度|落後進度/.test(text),
    showsScore: /\d+\.\d+\s*\/\s*100/.test(text),
    showsDesignerName: text.includes('林美玲'),
  };
  const select = document.getElementById('designA-type');
  const options = select ? Array.from(select.options).map(o => o.value) : [];
  return { cards, options, hasSelect: !!select };
});

console.log('cards visible:', JSON.stringify(check.cards));
console.log('image-type options count:', check.options.length);
console.log('options:', check.options.join(' | '));

await page.screenshot({ path: 'verify_design_kpi.png' });
await browser.close();

const requiredOpts = ['主圖','主圖（森）','套圖','Banner','剪輯-有素材','剪輯-自拍','社群圖文'];
const missing = requiredOpts.filter(t => !check.options.includes(t));

console.log('\n==== SUMMARY ====');
const ok1 = Object.values(check.cards).every(Boolean);
const ok2 = missing.length === 0;
const ok3 = errors.length === 0;
console.log('three daily progress cards:', ok1 ? '✓ PASS' : '✗ FAIL');
console.log('7 image types present:    ', ok2 ? '✓ PASS' : `✗ FAIL (missing: ${missing.join(', ')})`);
console.log('no console errors:        ', ok3 ? '✓ PASS' : `✗ FAIL (${errors.length})`);
errors.forEach(e => console.log('  ' + e));
process.exit((ok1 && ok2 && ok3) ? 0 : 1);
