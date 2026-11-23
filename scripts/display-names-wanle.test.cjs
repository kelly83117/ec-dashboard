// node scripts/display-names-wanle.test.cjs
// #505＋酷澎玩樂（2026-11-23）：顯示名只改畫面、不碰資料。
//   1. app.js platformDisplayName：只有「酷澎」→「酷澎好麻吉」，其他名字原字回傳（===）。
//   2. 靜態檢查：顯示名函式（platformDisplayName／cupShopDisplay／_kpiShopLabel）不出現在寫入、data-* 屬性值、查表比對的行。
//   3. 淨利表／KPI：「露營館」顯示「玩樂」「商城-玩樂」；KPI 月結表 Excel 店名與淨利表酷澎匯出檔名也是玩樂（Gini 2026-11-23 決定）。
//   4. 首頁、淨利表、健檢的資料 key 還在（店 key、doc id、KPI 路徑、id）。
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); pass++; };
const line = (src, re) => { const m = src.match(re); if (!m) throw new Error('找不到 ' + re); return m[0]; };

/* ── 1. platformDisplayName ── */
const app = read('js/app.js');
const fnSrc = line(app, /^const PLATFORM_DISPLAY_NAMES = .*$/m) + '\n' + app.slice(app.indexOf('function platformDisplayName(name) {'), app.indexOf('function marketplaceSectionOf('));
const { platformDisplayName } = new Function(fnSrc + '\nreturn { platformDisplayName };')();
eq(platformDisplayName('酷澎'), '酷澎好麻吉', '酷澎 → 酷澎好麻吉');
['生活好麻吉', '玩樂盒子', '森之旅', '維克生活', 'MOMO', 'MO+', '酷澎玩樂', 'PChome', '博客來', 'Friday', '全通路', '', '酷澎 ', 'constructor', 'toString', '__proto__', 'hasOwnProperty']
  .forEach(n => ok(platformDisplayName(n) === n, '原字回傳：' + JSON.stringify(n)));
ok(platformDisplayName(undefined) === undefined && platformDisplayName(null) === null, 'undefined／null 原樣回傳');
ok(/PLATFORM_DISPLAY_NAMES, platformDisplayName,/.test(app), 'app.js 掛到 window');
ok(!/露營館/.test(app), 'app.js 沒有露營館');
// 首頁資料 key：酷澎玩樂在種子、群組、截止日排除、歷年順序、通路對照
['酷澎玩樂', "'酷澎': 'coupang', '酷澎玩樂': 'coupang'", "members: ['酷澎', '酷澎玩樂']", "new Set(['PChome', '博客來', 'Friday', '酷澎玩樂'])", "'酷澎', '酷澎玩樂', 'PChome'"]
  .forEach(s => ok(app.includes(s), 'app.js 有：' + s));
ok(/\{ name: '酷澎玩樂', icon: '🧸', color: '#1d4ed8' \}/.test(app), '種子：酷澎玩樂 🧸 #1d4ed8');

/* ── 2. 靜態檢查：顯示名只用在畫面 ── */
const BAD = [/data-[a-z-]+="\$\{[^}"]*(platformDisplayName|cupShopDisplay|_kpiShopLabel)\(/, /Store\.set\(/, /setField\(/, /writePaths\(/, /\.find\(/, /\.includes\(/, /\.has\(/, /\bsetShop\(/, /lsSave\(/];
function scan(file, fnName) {
  const src = read(file).split(/\r?\n/);
  const hits = [];
  src.forEach((l, i) => {
    if (!l.includes(fnName + '(')) return;
    if (/^\s*(\/\/|\*)/.test(l)) return;
    if (/^\s*function /.test(l)) return;   // 顯示名函式自己的定義
    BAD.forEach(re => { if (re.test(l)) hits.push(file + ':' + (i + 1) + ' ' + re + '  ' + l.trim().slice(0, 140)); });
    hits.length; // eslint
  });
  return hits;
}
eq(scan('js/pages/dashboard.js', 'platformDisplayName'), [], 'dashboard.js：platformDisplayName 不在寫入／data-*／查表比對的行');
eq((read('js/pages/dashboard.js').match(/platformDisplayName\(/g) || []).length, 12, 'dashboard.js：9 個顯示點共 12 次呼叫（填寫表、排名各 2 次：文字＋title）');
const dash = read('js/pages/dashboard.js');
ok(dash.includes('data-rh-goch="${escapeHtml(val)}"') && dash.includes('data-rh-ch="${escapeHtml(val)}"'), '歷年表 data-rh-* 仍用原名');
ok(dash.includes('chLink(ch, platformDisplayName(ch))') && dash.includes('chChip(c, platformDisplayName(c))'), '歷年表只換 label 參數');
eq((dash.match(/酷澎好麻吉 2026-10-25～11-30 含玩樂（試算表回填後會拆開）。/g) || []).length, 2, '歷年營收兩處註解換成拆分前那句');
ok(!/露營館/.test(dash), 'dashboard.js 沒有露營館');
// sheetsync 預覽不換字
ok(!read('js/pages/sheetsync.js').includes('platformDisplayName'), 'sheetsync.js 不用顯示名（預覽對得上試算表欄名）');
// profit／health
['cupShopDisplay', '_kpiShopLabel'].forEach(fn => eq(scan('js/profit.js', fn), [], 'profit.js：' + fn + ' 不在寫入／data-*／查表比對的行'));

/* ── 3. 淨利表／KPI 顯示與匯出 ── */
const prof = read('js/profit.js');
const cupSrc = line(prof, /^const CUP_SHOP_DISPLAY=.*$/m) + '\n' + line(prof, /^function cupShopDisplay\(shop\).*$/m);
const C = new Function(cupSrc + '\nreturn { cupShopDisplay };')();
eq([C.cupShopDisplay('麻吉'), C.cupShopDisplay('露營館'), C.cupShopDisplay('總表')], ['好麻吉', '玩樂', '總表'], '淨利表酷澎顯示名');
ok(prof.includes("const safe=String(cupShopDisplay(shop)).replace(") && prof.includes("'酷澎_'+safe+'_'"), '淨利表酷澎匯出檔名用 cupShopDisplay ⇒「酷澎_玩樂_…」');
ok(!/CUP_SHOP_EXPORT_NAME|_kpiShopLabelExport|KPI_EXPORT_KEEP_NAME/.test(prof), '匯出不再保留舊名（helper 已移除）');
const kStart = prof.indexOf('const KPI_SHOP_LABELS={'), kEnd = prof.indexOf('function _kpiShopLabel(shop)');
const kSrc = prof.slice(kStart, prof.indexOf('\n', kEnd));
const K = new Function(kSrc + '\nreturn { _kpiShopLabel };')();
eq([K._kpiShopLabel('商城-露營館'), K._kpiShopLabel('商城-好麻吉'), K._kpiShopLabel('博客來-寄倉')], ['商城-玩樂', '商城-好麻吉', '寄倉'], 'KPI 畫面顯示名');
ok(prof.includes('aoa.push([_kpiShopLabel(shop),aov'), 'KPI 月結表 Excel 店名用 _kpiShopLabel ⇒「商城-玩樂」');
ok(prof.includes(`setCoupangShop('露營館',this)"><span class="sdot" style="background:#1d4ed8"></span>玩樂</button>`), '分頁按鈕：key 露營館、文字玩樂');

/* ── 4. 資料 key 都還在 ── */
const fb = read('js/firebase.js');
ok(fb.includes("const COUPANG_SHOP_DOCID = { '麻吉':'maji', '露營館':'luying' };") && fb.includes("'酷澎', '麻吉', '露營館']"), 'firebase.js 的 doc id、OPTLOG_SHOPS 不動');
['shops:[\'商城-好麻吉\',\'商城-露營館\',\'酷澎買斷\']', "const KPI_COUPANG_PROFIT_SHOP={'商城-好麻吉':'麻吉','商城-露營館':'露營館'};", "const CUP_OVERLAP_SHOPS=['麻吉','露營館']", "<div id=\"coupang-content-露營館\""]
  .forEach(s => ok(prof.includes(s), 'profit.js 資料 key 還在：' + s.slice(0, 60)));
const hl = read('js/pages/health.js');
ok(hl.includes("{ id: 'coupang-luying', label: '酷澎 商城-玩樂', type: 'coupang', group: 'coupang', shop: '商城-露營館', cup: '露營館' }"), 'health.js：只改 label');
ok(hl.includes("shops: ['商城-好麻吉', '商城-露營館', '酷澎買斷']"), 'health.js：KPI 店名 key 不動');

console.log('✅ display-names-wanle：' + pass + ' 項通過');
