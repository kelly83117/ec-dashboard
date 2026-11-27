// 本機資料搬家（第 1 塊）純函式測試：node scripts/lsmigrate.test.cjs
//   從 js/pages/lsmigrate.js 抽 LSMIG-PURE-BEGIN/END。資料全是合成的假資料；不碰瀏覽器、不碰雲端。
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'js', 'pages', 'lsmigrate.js'), 'utf8').replace(/\r\n/g, '\n');
const A = '/* ═══ LSMIG-PURE-BEGIN ═══ */', B = '/* ═══ LSMIG-PURE-END ═══ */';
const i = src.indexOf(A), j = src.indexOf(B);
if (i < 0 || j < 0 || src.indexOf(A, i + 1) >= 0) throw new Error('找不到或重複 LSMIG-PURE 標記');
const T = new Function(src.slice(i, j) + '\nreturn { lsmigClassify, lsmigInspect, lsmigScan, lsmigSig, lsmigSite, lsmigTaipeiDay, lsmigTaipeiIso, lsmigFileName, lsmigBuildExport, lsmigShouldShowBanner, lsmigSummaryText, LSMIG_MOVE_DATE, LSMIG_REQUIRED_KEYS };')();
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const J = x => JSON.stringify(x);

// ── 分類（白名單） ──
T.LSMIG_REQUIRED_KEYS.forEach(k => ok(T.lsmigClassify(k) === 'required', k + ' 是必搬'));
ok(T.lsmigClassify('ec.d2.pricing.custom.商品母表') === 'required', '訂價表自訂列前綴是必搬');
ok(T.lsmigClassify('ec.d2.pricing.custom.我自己加的分頁') === 'required', '自訂分頁也掃得到（不寫死）');
ok(T.lsmigClassify('ec.d2.pricing.custom.') === null, '只有前綴、沒有分頁名不算');
['ec_momo_moplus_otherfee', 'ec.d2.pricing.sheet', 'ec.d2.pricing.q', 'ec.d2.pricing.cols.商品母表', 'ec.d2.pricing.sort.MOMO', 'ec.d2.pricing.numfilters.MOMO',
  'ec.d2.pricing.colpanel', 'ec.d2.pricing.filterpanel', 'ec_colorder_user', 'ec_hcols_user', 'ec_colorder_coupang', 'ec_hcols_coupang',
  'momo_cols|甲配', 'pchome_cols|轉單', 'ec_health_metcols', 'ec_tagfilters_user', 'ec_filterstate|好麻吉']
  .forEach(k => ok(T.lsmigClassify(k) === 'optional', k + ' 是選填'));
['ec.session', 'ec|好麻吉|2026/10|first', 'ec_notes|好麻吉|2026/10|first', 'ec_momo_products|甲配', 'ec.platforms', 'ec.dailyProgress',
  'ec.pricing.rates', 'ec.d2.pricing.rates', 'ec_d3_suppliersX', 'xec_d3_suppliers', 'ec.users', '__app_version', 'ec_lsmig_exported', 'ec.lsWarnDay', 'ec_pagemode_pchome']
  .forEach(k => ok(T.lsmigClassify(k) === null, k + ' 不匯出'));

// ── 偵測：空陣列不算、讀不懂算 ──
ok(T.lsmigInspect('[]').state === 'empty', '[] 不算');
ok(T.lsmigInspect('').state === 'empty' && T.lsmigInspect(null).state === 'empty' && T.lsmigInspect('null').state === 'empty', '空字串／null 不算');
ok(J(T.lsmigInspect('[{"a":1},{"a":2}]')) === J({ state: 'ok', count: 2 }), '非空陣列算筆數');
ok(T.lsmigInspect('[{"a":1}').state === 'bad', '壞掉的 JSON 算有資料（讀不懂）');
ok(T.lsmigInspect('{"a":1}').state === 'bad', '不是陣列也標讀不懂、原樣匯出');

const sup3 = J([{ name: '甲', phone: '0900' }, { name: '乙' }, { name: '丙' }]);
const comp2 = J([{ mine: 'A' }, { mine: 'B' }]);
const prMaster = J([{ __custom: true, __id: 'c1', 品名: 'X' }, { __custom: true, __id: 'c2', 品名: 'Y' }]);
const broken = '[{"name":"壞';
const entries = [
  ['ec_d3_suppliers', sup3], ['ec_d3_competitors', comp2], ['ec_d3_launch', '[]'], ['ec_d3_kanban', broken],
  ['ec.d2.pricing.custom.商品母表', prMaster], ['ec.d2.pricing.custom.MOMO', '[]'], ['ec.d2.pricing.custom.自訂一', J([{ __id: 'z' }])],
  ['ec.d2.pricing.cols.商品母表', J({ v: 2, order: ['a'] })], ['ec_momo_moplus_otherfee', '3.5'],
  ['ec.session', J({ username: 'u' })], ['ec|好麻吉|2026/10|first', 'LZ1:9:xxx'], ['ec.users', '[]'],
];
const S = T.lsmigScan(entries);
ok(S.hasData === true, '有必搬資料');
ok(J(Object.keys(S.required).sort()) === J(['ec.d2.pricing.custom.商品母表', 'ec.d2.pricing.custom.自訂一', 'ec_d3_competitors', 'ec_d3_kanban', 'ec_d3_suppliers'].sort()), '必搬只收有資料的 key（空陣列不收）');
ok(S.counts.ec_d3_suppliers === 3 && S.counts.ec_d3_competitors === 2 && S.counts.ec_d3_kanban === null, '工具筆數（讀不懂是 null）');
ok(S.counts['ec.d2.pricing.custom.商品母表'] === 2 && S.counts['ec.d2.pricing.custom.自訂一'] === 1, '訂價表每個分頁的列數');
ok(S.toolsN === 5 && S.pricingN === 3, '合計：商開 5 筆、訂價表 3 列');
ok(J(S.badKeys) === J(['ec_d3_kanban']), '讀不懂的 key 列出來');
ok(J(S.tools.map(t => t.key)) === J(['ec_d3_suppliers', 'ec_d3_competitors', 'ec_d3_kanban']), '工具照固定順序');
ok(J(Object.keys(S.optional).sort()) === J(['ec.d2.pricing.cols.商品母表', 'ec_momo_moplus_otherfee']), '選填只收白名單');
ok(!('ec.session' in S.required) && !('ec.session' in S.optional) && !('ec|好麻吉|2026/10|first' in S.required) && !('ec.users' in S.optional), 'session／淨利表／帳號不匯出');
ok(T.lsmigSummaryText(S) === '商開工具 5 筆（供應商 3、競品 2、看板（舊） 讀不懂）、訂價表自訂列 3 列（「商品母表」2、「自訂一」1）', '明細文字：' + T.lsmigSummaryText(S));
const onlyOpt = T.lsmigScan([['ec.d2.pricing.cols.MOMO', '{}'], ['ec_d3_suppliers', '[]']]);
ok(onlyOpt.hasData === false && Object.keys(onlyOpt.optional).length === 1, '只有選填 ⇒ 不算有資料（不提示）');
ok(T.lsmigScan([]).hasData === false, '全空');

// ── 指紋 ──
const sig1 = T.lsmigSig(S.required);
ok(sig1 && sig1 === T.lsmigSig(T.lsmigScan(entries.slice().reverse()).required), '指紋跟 key 順序無關');
const sup4 = J(JSON.parse(sup3).concat([{ name: '丁' }]));
const S2 = T.lsmigScan(entries.map(e => e[0] === 'ec_d3_suppliers' ? [e[0], sup4] : e));
ok(T.lsmigSig(S2.required) !== sig1, '多一筆供應商 ⇒ 指紋變');
ok(T.lsmigSig(T.lsmigScan(entries.concat([['ec.d2.pricing.cols.MOMO', '{"v":2}']])).required) === sig1, '選填變了不影響指紋');
ok(T.lsmigSig({}) === '', '沒有資料的指紋是空字串');
ok(T.lsmigSig({ a: 'xy' }) !== T.lsmigSig({ ax: 'y' }), 'key／值邊界不會混在一起');

// ── 匯出內容逐字還原 ──
const meta = { fromOrigin: 'https://kelly83117.github.io', appVersion: '2026-11-27-963', exportedAt: '2026-11-27T10:00:00+08:00', exportedBy: 'tester' };
const E = T.lsmigBuildExport(S, meta);
ok(E.schema === 'ec-local-migrate' && E.v === 1 && E.fromOrigin === meta.fromOrigin && E.appVersion === meta.appVersion && E.exportedAt === meta.exportedAt && E.exportedBy === 'tester', '表頭欄位');
const back = JSON.parse(JSON.stringify(E, null, 1));
const orig = Object.fromEntries(entries);
Object.keys(back.required).forEach(k => ok(back.required[k] === orig[k], k + ' 逐字還原'));
Object.keys(back.optional).forEach(k => ok(back.optional[k] === orig[k], k + '（選填）逐字還原'));
ok(back.required.ec_d3_kanban === broken, '讀不懂的原字串照匯');
ok(J(back.counts) === J(S.counts), 'counts');
const allKeys = Object.keys(back.required).concat(Object.keys(back.optional));
ok(allKeys.every(k => T.lsmigClassify(k)), '匯出檔裡每把 key 都在白名單');
ok(J(Object.keys(E).sort()) === J(['appVersion', 'counts', 'exportedAt', 'exportedBy', 'fromOrigin', 'optional', 'required', 'schema', 'v']), '沒有多的欄位');

// ── 檔名與台灣時間 ──
const t0 = Date.UTC(2026, 10, 27, 16, 5, 9);   // 台灣 2026-11-28 00:05:09
ok(T.lsmigFileName('keani', t0) === 'ec本機資料_keani_20261128-0005.json', '檔名用台灣時間：' + T.lsmigFileName('keani', t0));
ok(T.lsmigFileName('', t0) === 'ec本機資料_未登入_20261128-0005.json', '沒登入');
ok(T.lsmigFileName('a/b c', t0) === 'ec本機資料_a_b_c_20261128-0005.json', '檔名不合法字元換掉');
ok(T.lsmigTaipeiDay(t0) === '2026-11-28' && T.lsmigTaipeiIso(t0) === '2026-11-28T00:05:09+08:00', '台灣日期／ISO');

// ── 網址判斷 ──
ok(T.lsmigSite('kelly83117.github.io', '') === 'old', '舊網址');
ok(T.lsmigSite('KELLY83117.github.io', '?lsmig=new') === 'old', '舊網址不看參數');
ok(T.lsmigSite('playbox-tw.github.io', '?lsmig=old') === 'new', '新網址不看參數');
ok(T.lsmigSite('localhost', '?lsmig=old') === 'old' && T.lsmigSite('127.0.0.1', '?x=1&lsmig=old') === 'old' && T.lsmigSite('[::1]', '?lsmig=old') === 'old' && T.lsmigSite('::1', '?lsmig=old') === 'old', 'localhost 系列 ?lsmig=old');
ok(T.lsmigSite('localhost', '') === 'new' && T.lsmigSite('localhost', '?lsmig=new') === 'new' && T.lsmigSite('localhost', '?lsmig=xx') === 'new', 'localhost 沒帶／其他值當新網址');
ok(T.lsmigSite('example.com', '?lsmig=old') === 'new' && T.lsmigSite('', '') === 'new', '其他網址當新網址');

// ── 橫幅條件 ──
const base = { site: 'old', scan: S, exported: null, laterDay: null, today: '2026-11-27' };
ok(T.lsmigShouldShowBanner(base) === true, '舊網址＋有資料 ⇒ 顯示');
ok(T.lsmigShouldShowBanner(Object.assign({}, base, { site: 'new' })) === false, '新網址不顯示');
ok(T.lsmigShouldShowBanner(Object.assign({}, base, { scan: onlyOpt })) === false, '沒必搬資料不顯示');
ok(T.lsmigShouldShowBanner(Object.assign({}, base, { exported: { at: 1, sig: sig1 } })) === false, '匯出過、指紋沒變 ⇒ 不顯示');
ok(T.lsmigShouldShowBanner(Object.assign({}, base, { scan: S2, exported: { at: 1, sig: sig1 } })) === true, '匯出後新增資料 ⇒ 又顯示');
ok(T.lsmigShouldShowBanner(Object.assign({}, base, { laterDay: '2026-11-27' })) === false, '之後再說：當天不顯示');
ok(T.lsmigShouldShowBanner(Object.assign({}, base, { laterDay: '2026-11-26' })) === true, '之後再說：隔天又顯示');
ok(T.LSMIG_MOVE_DATE === '12/8', '搬家日期常數');

// ── 原始碼守則 ──
const appSrc = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
const m = appSrc.match(/const __RO_WRITE_RE = (\/.*\/);/);
const RE = new Function('return ' + m[1])();
['lsMigrateExport', 'lsMigrateExportFromBanner', 'lsMigrateExportFromModal', 'lsMigrateLoginExport', 'lsMigrateLater', 'lsMigrateOpenModal']
  .forEach(h => ok(!RE.test('App.' + h + '()'), h + ' 不會被唯讀擋板擋'));
ok(!/__cloud|Store\.set|firebase/.test(src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), 'lsmigrate.js 程式碼不碰 __cloud／Store.set／firebase');
const mainSrc = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
ok(mainSrc.indexOf("pages/lsmigrate.js?v=") > mainSrc.indexOf("pages/health.js?v=") && mainSrc.indexOf("pages/lsmigrate.js?v=") < mainSrc.indexOf("firebase.js?v="), 'main.js 依序 import（pages/* 之後、firebase 之前）');

console.log('✓ lsmigrate.test.cjs 全部通過（' + n + ' 項）');
