/* 自動驗證 dashboard — 假登入後跑各 route 抓 console error */
import puppeteer from 'puppeteer';

const URL = process.env.URL || 'http://localhost:8765/';

const errors = [];
const warnings = [];
const logs = [];

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
page.setDefaultTimeout(15000);

page.on('console', msg => {
  const t = msg.type();
  const txt = msg.text();
  if (t === 'error') errors.push(`[console.error] ${txt}`);
  else if (t === 'warning') warnings.push(`[console.warn] ${txt}`);
  else logs.push(`[${t}] ${txt}`);
});
page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`));
page.on('requestfailed', req => {
  const f = req.failure();
  errors.push(`[fail] ${req.url()} (${f && f.errorText})`);
});

console.log(`→ ${URL}`);
await page.goto(URL, { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 3000));

const initial = await page.evaluate(() => ({
  appExists: !!window.App,
  storeExists: !!window.Store,
  appMethods: window.App ? Object.keys(window.App).length : 0,
  shopsExists: typeof window.SHOPS !== 'undefined',
  setShopExists: typeof window.setShop === 'function',
  loginVisible: !!document.querySelector('#view-login') && getComputedStyle(document.querySelector('#view-login')).display !== 'none',
  appVersion: document.querySelector('meta[name=app-version]')?.content,
  unsafeUtils: ['escapeHtml','showToast','fmtNTD','toDateStr'].every(n => typeof window[n] === 'function'),
}));
console.log('  initial:', JSON.stringify(initial));

// 假登入：模擬 admin 帳號讓需要 currentUser 的路由能跑
await page.evaluate(() => {
  const users = window.Store.get(window.Store.KEYS.users, []);
  const admin = users.find(u => u.role === 'admin') || { username: 'admin', role: 'admin', name: 'admin', departments: [] };
  window.App.currentUser = admin;
});
console.log('  fake-login: admin');

const routes = ['dashboard','employees','users','office-d1','office-d2','office-d3','office-d4','office-d1-profit','office-d1-insight'];
let failed = 0;
for (const route of routes) {
  const before = errors.length;
  try {
    await page.evaluate((r) => {
      window.App.route = r;
      if (typeof window.App.render === 'function') window.App.render();
    }, route);
    await new Promise(r => setTimeout(r, 500));
    const newE = errors.length - before;
    if (newE === 0) console.log(`  ${route.padEnd(20)} OK`);
    else { console.log(`  ${route.padEnd(20)} ${newE} error(s)`); failed++; }
  } catch (e) {
    errors.push(`[route ${route}] ${e.message}`);
    failed++;
  }
}

await page.screenshot({ path: 'verify_dashboard.png', fullPage: false });

await browser.close();

console.log('\n========== RESULT ==========');
console.log(`errors:   ${errors.length}`);
console.log(`warnings: ${warnings.length}`);
console.log(`routes:   ${routes.length} (failed: ${failed})`);
if (errors.length) {
  console.log('\n--- ERRORS ---');
  errors.forEach(e => console.log('  ' + e));
}
if (warnings.length && warnings.length < 10) {
  console.log('\n--- WARNINGS ---');
  warnings.forEach(e => console.log('  ' + e));
}
process.exit(errors.length ? 1 : 0);
