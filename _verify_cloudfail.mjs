/* 驗證雲端寫入失敗時 modal 真的跳得出來
 * 1. 假登入 + 進到儀表板
 * 2. 把 Store.pushKeyToCloud monkey-patch 成 reject
 * 3. 觸發儲存 → 應該看到 modal-backdrop.show + title 含「失敗」
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
await new Promise(r => setTimeout(r, 3000));

// 假登入
await page.evaluate(() => {
  const users = window.Store.get(window.Store.KEYS.users, []);
  const admin = users.find(u => u.role === 'admin') || { username: 'admin', role: 'admin', name: 'admin', departments: [] };
  window.App.currentUser = admin;
});

// 切到儀表板
await page.evaluate(() => {
  window.App.route = 'dashboard';
  window.App.render();
});
await new Promise(r => setTimeout(r, 800));

// 第一個測試：直接呼叫 showAlertModal 看 UI 是否有出來
console.log('test 1: showAlertModal 直接呼叫');
await page.evaluate(() => {
  window.App.showAlertModal({
    title: '測試標題',
    message: '這是一段訊息\n第二行',
    detail: 'detail text here\nstack trace...',
    kind: 'error',
  });
});
await new Promise(r => setTimeout(r, 500));
let modal = await page.evaluate(() => {
  const bd = document.querySelector('#modal-backdrop');
  const m = document.querySelector('#modal');
  return {
    backdropShown: bd && bd.classList.contains('show'),
    title: m?.querySelector('.modal-header h3')?.textContent,
    bodyHas: !!m?.querySelector('.modal-body'),
    hasOkBtn: !!document.querySelector('#alert-modal-ok'),
  };
});
console.log('  result:', JSON.stringify(modal));
await page.screenshot({ path: 'cloudfail_modal.png' });

// 關 modal
await page.evaluate(() => window.App.closeModal());
await new Promise(r => setTimeout(r, 300));

// 第二個測試：strong-patch Store.pushKeyToCloud 讓它 reject，模擬「按 ✓ 但雲端失敗」
console.log('\ntest 2: 模擬 ✓ 儲存失敗（強迫 pushKeyToCloud reject）');
await page.evaluate(() => {
  window.__origPush = window.Store.pushKeyToCloud;
  window.Store.pushKeyToCloud = async (k) => { throw new Error('TEST: simulated cloud reject (1 MiB)'); };
});

// 找一個 card-rev input、改值、按該列的 ✓
const found = await page.evaluate(() => {
  const inp = document.querySelector('.card-rev[data-idx="0"]');
  if (!inp) return { found: false };
  inp.value = '99999';
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  const btn = document.querySelector('.row-save-btn[data-idx="0"]');
  if (!btn) return { found: true, hasBtn: false };
  btn.style.display = 'inline-block';
  btn.click();
  return { found: true, hasBtn: true };
});
console.log('  setup:', JSON.stringify(found));
await new Promise(r => setTimeout(r, 1500));

const modal2 = await page.evaluate(() => {
  const bd = document.querySelector('#modal-backdrop');
  const m = document.querySelector('#modal');
  return {
    backdropShown: bd && bd.classList.contains('show'),
    title: m?.querySelector('.modal-header h3')?.textContent,
    bodyText: m?.querySelector('.modal-body')?.textContent?.slice(0, 200),
  };
});
console.log('  after-fail:', JSON.stringify(modal2));
await page.screenshot({ path: 'cloudfail_save.png' });

await page.evaluate(() => { window.Store.pushKeyToCloud = window.__origPush; });

await browser.close();

console.log('\n======== SUMMARY ========');
const ok1 = modal.backdropShown && modal.title?.includes('測試') && modal.hasOkBtn;
const ok2 = modal2.backdropShown && modal2.title?.includes('失敗');
console.log('test 1 showAlertModal 直接呼叫:', ok1 ? '✓ PASS' : '✗ FAIL');
console.log('test 2 模擬雲端失敗時 modal 自動跳:', ok2 ? '✓ PASS' : '✗ FAIL');
console.log('console errors:', errors.length);
if (errors.length) errors.forEach(e => console.log('  ' + e));
process.exit((ok1 && ok2) ? 0 : 1);
