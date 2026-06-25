/* 驗設計 KPI 頁（v03）：
 * 1. 假登入成 林美玲 → 切到 office-d4
 * 2. 確認 6 個圖種 option（不再有 主圖（森））
 * 3. 套圖 = 45 分
 * 4. 三張小卡有 render
 * 5. 「📖 指標說明」按鈕存在，點下去 modal 打開且圖能載入
 * 6. console 無 error
 */
import puppeteer from 'puppeteer';
const URL = process.env.URL || 'http://localhost:8765/';

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
page.setDefaultTimeout(15000);
const errors = [];
const failedReqs = [];
page.on('console', m => { if (m.type() === 'error') errors.push('[console.error] ' + m.text()); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
page.on('requestfailed', req => failedReqs.push(req.url() + ' (' + (req.failure()?.errorText) + ')'));

await page.goto(URL, { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 2500));

// 假登入林美玲
await page.evaluate(() => {
  const users = window.Store.get(window.Store.KEYS.users, []);
  let linda = users.find(u => u.name === '林美玲');
  if (!linda) {
    linda = { username: 'linda', name: '林美玲', role: 'staff', departments: ['設計'] };
    users.push(linda);
    if (window.Store.setLocalOnly) window.Store.setLocalOnly(window.Store.KEYS.users, users);
    else window.Store.set(window.Store.KEYS.users, users);
  }
  window.App.currentUser = linda;
});

// 跳設計頁
await page.evaluate(() => {
  window.App.route = 'office-d4';
  window.App.render();
});
await new Promise(r => setTimeout(r, 800));

const check1 = await page.evaluate(() => {
  const text = document.querySelector('#main-content')?.textContent || '';
  const select = document.getElementById('designA-type');
  const opts = select ? Array.from(select.options).filter(o => o.value).map(o => ({
    name: o.value, mins: +(o.dataset.mins || 0)
  })) : [];
  return {
    cards: {
      dailyTarget: text.includes('每日該完成的分數'),
      todayShould: text.includes('今天應該已累計'),
      diff: /領先進度|落後進度/.test(text),
    },
    opts,
    hasInfoBtn: !!document.getElementById('design-kpi-info-btn'),
  };
});

console.log('cards:', JSON.stringify(check1.cards));
console.log('options (' + check1.opts.length + '):', check1.opts.map(o => `${o.name}=${o.mins}分`).join(' | '));
console.log('指標說明 btn:', check1.hasInfoBtn);

// 強迫顯示 view-app
await page.evaluate(() => {
  ['view-boot','view-login'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display='none'; });
  const app = document.getElementById('view-app'); if (app) app.style.display='block';
});
// 點 📖 指標說明 看 modal — 用 JS click 避免被視窗判斷遮蔽
await page.evaluate(() => document.getElementById('design-kpi-info-btn').click());
await new Promise(r => setTimeout(r, 600));
// 等圖片載完
await page.evaluate(() => {
  const img = document.querySelector('#modal img');
  if (img && !img.complete) {
    return new Promise(r => { img.onload = img.onerror = () => r(); });
  }
});
await new Promise(r => setTimeout(r, 400));

const check2 = await page.evaluate(() => {
  const bd = document.querySelector('#modal-backdrop');
  const img = document.querySelector('#modal img[src*="design/kpi_overview"]');
  return {
    modalOpen: bd && bd.classList.contains('show'),
    hasTitle: document.querySelector('#modal .modal-header h3')?.textContent || '',
    hasImg: !!img,
    imgSrc: img?.getAttribute('src'),
    imgNaturalWidth: img?.naturalWidth || 0,
  };
});

console.log('\nmodal:', JSON.stringify(check2));

await page.screenshot({ path: 'verify_kpi_modal.png' });
await browser.close();

const expected = [
  { name: '主圖', mins: 20 },
  { name: '套圖', mins: 45 },
  { name: 'Banner', mins: 40 },
  { name: '剪輯（有素材）', mins: 60 },
  { name: '剪輯（自拍）', mins: 120 },
  { name: '社群圖文', mins: 15 },
];
const optsMatch = expected.every(e => check1.opts.find(o => o.name === e.name && o.mins === e.mins));
const noExtraTypes = !check1.opts.find(o => o.name.includes('森'));

console.log('\n==== SUMMARY ====');
const ok1 = Object.values(check1.cards).every(Boolean);
const ok2 = optsMatch && noExtraTypes && check1.opts.length === 6;
const ok3 = check1.hasInfoBtn;
const ok4 = check2.modalOpen && check2.hasImg && check2.imgNaturalWidth > 0;
const ok5 = errors.length === 0 && failedReqs.length === 0;
console.log('three daily progress cards :', ok1 ? '✓' : '✗');
console.log('6 圖種 (含套圖=45, 無森)   :', ok2 ? '✓' : '✗');
console.log('📖 指標說明 按鈕存在        :', ok3 ? '✓' : '✗');
console.log('modal 打開 + 圖載入        :', ok4 ? '✓' : '✗');
console.log('0 console error + 0 fail   :', ok5 ? '✓' : '✗');
if (errors.length) errors.forEach(e => console.log('  err:', e));
if (failedReqs.length) failedReqs.forEach(r => console.log('  failed-req:', r));
process.exit((ok1 && ok2 && ok3 && ok4 && ok5) ? 0 : 1);
