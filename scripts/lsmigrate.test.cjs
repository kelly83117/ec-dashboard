// 本機資料搬家（第 1 塊）純函式測試：node scripts/lsmigrate.test.cjs
//   從 js/pages/lsmigrate.js 抽 LSMIG-PURE-BEGIN/END。資料全是合成的假資料；不碰瀏覽器、不碰雲端。
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'js', 'pages', 'lsmigrate.js'), 'utf8').replace(/\r\n/g, '\n');
const A = '/* ═══ LSMIG-PURE-BEGIN ═══ */', B = '/* ═══ LSMIG-PURE-END ═══ */';
const i = src.indexOf(A), j = src.indexOf(B);
if (i < 0 || j < 0 || src.indexOf(A, i + 1) >= 0) throw new Error('找不到或重複 LSMIG-PURE 標記');
const T = new Function(src.slice(i, j) + '\nreturn { lsmigClassify, lsmigInspect, lsmigScan, lsmigSig, lsmigSite, lsmigTaipeiDay, lsmigTaipeiIso, lsmigFileName, lsmigBuildExport, lsmigShouldShowBanner, lsmigSummaryText, lsmigParseFile, lsmigPlanImport, lsmigApplyPlan, lsmigActionText, lsmigPickerFailAction, LSMIG_MOVE_DATE, LSMIG_REQUIRED_KEYS };')();
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

// ════ 第 2 塊：匯入 ════
const mkFile = (req, opt, extra) => JSON.stringify(Object.assign({ schema: 'ec-local-migrate', v: 1, fromOrigin: 'https://kelly83117.github.io', exportedAt: 'x', exportedBy: 'u',
  required: req || {}, optional: opt || {}, counts: {} }, extra || {}), null, 1);
// ── schema 檢查 ──
ok(T.lsmigParseFile('不是 json').why === 'json', '不是 JSON ⇒ 擋');
ok(T.lsmigParseFile('{"a":1}').why === 'schema', '隨便一個 json ⇒ 擋');
ok(T.lsmigParseFile(mkFile({}, {}, { schema: 'other' })).why === 'schema', 'schema 不對 ⇒ 擋');
ok(T.lsmigParseFile(mkFile({}, {}, { v: 2 })).why === 'schema', 'v 不是 1 ⇒ 擋');
ok(T.lsmigParseFile('[]').why === 'schema' && T.lsmigParseFile('null').why === 'schema', '陣列／null ⇒ 擋');
ok(T.lsmigParseFile('﻿' + mkFile({ ec_d3_suppliers: '[1]' })).ok, 'BOM 開頭也讀得懂');
// ── 白名單外忽略 ──
const PF = T.lsmigParseFile(mkFile({ ec_d3_suppliers: sup3, 'ec.session': '{"username":"x"}', 'ec|好麻吉|2026/10|first': '[]', 'ec.d2.pricing.custom.商品母表': prMaster, ec_d3_kanban: broken, ec_d3_calc_hist: 123 },
  { 'ec.d2.pricing.cols.商品母表': '{"v":2}', 'ec.users': '[]', ec_momo_moplus_otherfee: '4' }));
ok(PF.ok, '合法檔');
ok(J(PF.ignored.slice().sort()) === J(['ec.session', 'ec.users', 'ec_d3_calc_hist', 'ec|好麻吉|2026/10|first'].sort()), '白名單外與非字串值都忽略：' + J(PF.ignored));
ok(!PF.entries.some(e => e[0] === 'ec.session' || e[0].startsWith('ec|')), 'entries 沒有 session／淨利表');
ok(J(PF.entries.map(e => e[2])) === J(['required', 'required', 'required', 'optional', 'optional']), '分類');

const planOf = (entries, cur) => { const m = {}; T.lsmigPlanImport(entries, cur).forEach(it => { m[it.key] = it; }); return m; };
// ── 這台空的：直接寫原字串；讀不懂不寫 ──
const P0 = planOf(PF.entries, {});
ok(P0.ec_d3_suppliers.action === 'new' && P0.ec_d3_suppliers.write === sup3 && P0.ec_d3_suppliers.afterCount === 3, '空 ⇒ 寫入原字串');
ok(P0['ec.d2.pricing.custom.商品母表'].write === prMaster && P0['ec.d2.pricing.custom.商品母表'].added === 2, '自訂列空 ⇒ 原字串');
ok(P0.ec_d3_kanban.action === 'bad' && P0.ec_d3_kanban.write === null, '讀不懂不寫');
ok(T.lsmigActionText(P0.ec_d3_kanban)[0] === '讀不懂，沒有匯入（原內容仍在檔案裡）' && T.lsmigActionText(P0.ec_d3_kanban)[1] === 'bad', '讀不懂標紅');
ok(P0['ec.d2.pricing.cols.商品母表'].action === 'optNew' && P0['ec.d2.pricing.cols.商品母表'].write === '{"v":2}', '選填這台沒有 ⇒ 補上');
ok(planOf([['ec_d3_suppliers', sup3, 'required']], { ec_d3_suppliers: '[]' }).ec_d3_suppliers.write === sup3, '這台是空陣列 ⇒ 寫入原字串');
ok(planOf([['ec_d3_suppliers', '[]', 'required']], {}).ec_d3_suppliers.action === 'fileEmpty', '檔案空陣列 ⇒ 跳過');
// ── 逐字相同 ⇒ 跳過 ──
const Psame = planOf(PF.entries, { ec_d3_suppliers: sup3, 'ec.d2.pricing.custom.商品母表': prMaster, 'ec.d2.pricing.cols.商品母表': '{"v":9}', ec_momo_moplus_otherfee: '3' });
ok(Psame.ec_d3_suppliers.action === 'same' && Psame.ec_d3_suppliers.write === null, '逐字相同 ⇒ 跳過');
ok(Psame['ec.d2.pricing.cols.商品母表'].action === 'optKeep' && Psame['ec.d2.pricing.cols.商品母表'].write === null, '選填這台有 ⇒ 不蓋（即使內容不同）');
ok(Psame.ec_momo_moplus_otherfee.write === null, '選填不蓋');
// ── 自訂列 __id 合併：新 id 加、同內容跳過、不同內容衝突保留這台 ──
const curPr = JSON.stringify([{ __custom: true, __id: 'c1', 品名: 'X' }, { __custom: true, __id: 'c2', 品名: '這台改過' }, { __custom: true, __id: 'c9', 品名: '這台才有' }]);
const filePr = JSON.stringify([{ __custom: true, __id: 'c1', 品名: 'X' }, { __custom: true, __id: 'c2', 品名: 'Y' }, { __custom: true, __id: 'c3', 品名: '新的' }]);
const Ppr = planOf([['ec.d2.pricing.custom.商品母表', filePr, 'required']], { 'ec.d2.pricing.custom.商品母表': curPr })['ec.d2.pricing.custom.商品母表'];
ok(Ppr.action === 'merge' && Ppr.added === 1 && Ppr.dup === 1 && Ppr.conflict === 1, '自訂列：新增 1、相同 1、衝突 1');
const prOut = JSON.parse(Ppr.write);
ok(J(prOut.map(r => r.__id)) === J(['c1', 'c2', 'c9', 'c3']) && prOut[1].品名 === '這台改過', '衝突保留這台、這台原有在前、新的在後');
ok(Ppr.afterCount === 4 && Ppr.curCount === 3 && Ppr.fileCount === 3, '筆數');
const prTxt = T.lsmigActionText(Ppr);
ok(prTxt[0] === '合併，新增 1 列、相同 1 列跳過、衝突 1 列，保留這台的' && prTxt[1] === 'warn', '衝突標黃：' + prTxt[0]);
// ── 商開附加與去重 ──
const curSup = JSON.stringify([{ name: '甲', phone: '0900' }, { name: '這台的' }]);
const Psup = planOf([['ec_d3_suppliers', sup3, 'required']], { ec_d3_suppliers: curSup }).ec_d3_suppliers;
ok(Psup.added === 2 && Psup.dup === 1 && J(JSON.parse(Psup.write).map(r => r.name)) === J(['甲', '這台的', '乙', '丙']), '商開：整筆相同算重複，其餘附加在後');
ok(T.lsmigActionText(Psup)[0] === '合併，新增 2 筆、重複 1 筆跳過', '商開文字');
const PsupNone = planOf([['ec_d3_suppliers', JSON.stringify([{ name: '甲', phone: '0900' }]), 'required']], { ec_d3_suppliers: curSup }).ec_d3_suppliers;
ok(PsupNone.action === 'merge' && PsupNone.added === 0 && PsupNone.write === null, '全部重複 ⇒ 不寫');
ok(planOf([['ec_d3_suppliers', sup3, 'required']], { ec_d3_suppliers: '{壞' }).ec_d3_suppliers.action === 'curBad', '這台讀不懂 ⇒ 不蓋');

// ── 假 localStorage：寫入、讀回、失敗回滾 ──
const mkLS = (init, opts) => { const m = new Map(Object.entries(init || {})); opts = opts || {}; let sets = 0;
  return { m, getItem: k => (m.has(k) ? m.get(k) : null), removeItem: k => { m.delete(k); },
    setItem: (k, v) => { sets++; if (opts.throwOn === k) throw new Error('QuotaExceededError'); m.set(k, opts.corruptOn === k ? v + 'x' : String(v)); }, sets: () => sets }; };
const imp = (ls, entries) => { const cur = {}; entries.forEach(([k]) => { cur[k] = ls.getItem(k); }); const plan = T.lsmigPlanImport(entries, cur); return { plan, r: T.lsmigApplyPlan(plan, ls) }; };
const LS1 = mkLS({ 'ec.session': '{"username":"me"}', 'ec.d2.pricing.cols.商品母表': '{"v":1}' });
const r1 = imp(LS1, PF.entries);
ok(r1.r.ok && J(r1.r.written.slice().sort()) === J(['ec.d2.pricing.custom.商品母表', 'ec_d3_suppliers', 'ec_momo_moplus_otherfee'].sort()), '寫入：' + J(r1.r.written));
ok(LS1.getItem('ec_d3_suppliers') === sup3 && LS1.getItem('ec.d2.pricing.custom.商品母表') === prMaster, '逐字寫入原字串');
ok(LS1.getItem('ec_d3_kanban') === null, '讀不懂的沒寫');
ok(LS1.getItem('ec.d2.pricing.cols.商品母表') === '{"v":1}' && LS1.getItem('ec.session') === '{"username":"me"}', '選填沒蓋、session 沒動');
// 重複匯入同一份檔：第二次全部跳過、一次都不 setItem
const before = LS1.sets(); const r2 = imp(LS1, PF.entries);
ok(r2.r.ok && r2.r.written.length === 0 && LS1.sets() === before, '第二次匯入同一份檔：全部跳過、沒寫');
ok(r2.plan.every(it => it.write === null), '第二次計畫全部不寫：' + J(r2.plan.map(it => it.action)));
// 失敗回滾：第二把讀回不一致 ⇒ 第一把改回原值（原本沒有＝移除）
const ents = [['ec_d3_competitors', comp2, 'required'], ['ec_d3_suppliers', sup3, 'required'], ['ec_d3_launch', '[{"a":1}]', 'required']];
const LS2 = mkLS({ ec_d3_competitors: '[]' }, { corruptOn: 'ec_d3_suppliers' });
const r3 = imp(LS2, ents);
ok(!r3.r.ok && r3.r.failedKey === 'ec_d3_suppliers', '讀回不一致 ⇒ 停止');
ok(LS2.getItem('ec_d3_competitors') === '[]' && LS2.getItem('ec_d3_suppliers') === null && LS2.getItem('ec_d3_launch') === null, '已寫的改回原值、後面的不寫');
ok(J(r3.r.rolledBack.slice().sort()) === J(['ec_d3_competitors', 'ec_d3_suppliers']) && r3.r.rollbackFailed.length === 0, '回滾明細');
const LS3 = mkLS({}, { throwOn: 'ec_d3_launch' });
const r4 = imp(LS3, ents);
ok(!r4.r.ok && r4.r.failedKey === 'ec_d3_launch' && /Quota/.test(r4.r.error) && LS3.m.size === 0, 'setItem 丟錯 ⇒ 全部回滾');
// B 檔情境：跟 A 部分重疊
const fileB = T.lsmigParseFile(mkFile({ ec_d3_suppliers: JSON.stringify([{ name: '甲', phone: '0900' }, { name: '丁' }]),
  'ec.d2.pricing.custom.商品母表': JSON.stringify([{ __custom: true, __id: 'c1', 品名: 'X 改' }]), ec_d3_kanban: broken }));
const r5 = imp(LS1, fileB.entries), b = {}; r5.plan.forEach(it => { b[it.key] = it; });
ok(r5.r.ok && b.ec_d3_suppliers.added === 1 && b.ec_d3_suppliers.dup === 1 && b['ec.d2.pricing.custom.商品母表'].conflict === 1 && b.ec_d3_kanban.action === 'bad', 'B：新增 1、跳過 1、衝突 1、讀不懂沒寫');
ok(JSON.parse(LS1.getItem('ec.d2.pricing.custom.商品母表'))[0].品名 === 'X', 'B：衝突保留這台');
// 原始碼守則（第 2 塊）
['lsMigrateImportPick', 'lsMigrateImportGo', 'lsMigrateImportCancel', 'lsMigrateImportManualGo', 'lsMigrateImportManualCancel']
  .forEach(h => ok(!RE.test('App.' + h + '()'), h + ' 不會被唯讀擋板擋'));
ok(!/appendChild\(inp\)/.test(src), '選檔 input 不放進頁面（唯讀擋板會擋頁面上的 input[type=file]）');

// ── 存檔視窗被取消 ⇒ 改問下載 ──
ok(T.lsmigPickerFailAction({ name: 'AbortError' }) === 'ask', '按取消（AbortError）⇒ 改問要不要下載');
ok(T.lsmigPickerFailAction({ name: 'NotAllowedError' }) === 'ask' && T.lsmigPickerFailAction({ name: 'SecurityError' }) === 'ask', '瀏覽器不讓開 ⇒ 也改問');
ok(T.lsmigPickerFailAction({ name: 'TypeError' }) === 'fail' && T.lsmigPickerFailAction(null) === 'fail', '其他錯誤 ⇒ 停止');
ok(src.includes('沒有存到備份。要改成下載備份到「下載」資料夾後繼續匯入嗎？') && src.includes('>下載備份並繼續</button>') && src.includes('>取消匯入</button>'), '問句與兩個按鈕文字');
{ const f = src.slice(src.indexOf('  lsMigrateImportDownloadGo() {'), src.indexOf('  lsMigrateImportDownloadCancel()'));
  ok(f.indexOf('_lsmigDownload(') > 0 && f.indexOf('_lsmigCommit(') > f.indexOf('_lsmigDownload('), '下載備份並繼續：先下載、才寫入');
  ok(f.indexOf('catch (e)') > 0 && f.indexOf('return;', f.indexOf('catch (e)')) < f.indexOf('_lsmigCommit('), '下載丟錯 ⇒ 不寫入'); }
{ const g = src.slice(src.indexOf('async function _lsmigSaveBackup('), src.indexOf('function _lsmigCommit('));
  ok(g.includes("if (lsmigPickerFailAction(e) === 'ask') return 'ask';") && !g.includes("'AbortError') return '沒有備份"), '_lsmigSaveBackup：取消回 ask，不再直接取消匯入'); }
['lsMigrateImportDownloadGo', 'lsMigrateImportDownloadCancel'].forEach(h => ok(!RE.test('App.' + h + '()'), h + ' 不會被唯讀擋板擋'));
ok(src.includes('存檔視窗標題寫『警告：這個網站可以看見你編輯的內容』是 Chrome 的正常提示，按『存檔』即可。'), '匯入說明有 Chrome 存檔警告的說明');
console.log('✓ lsmigrate.test.cjs 全部通過（' + n + ' 項）');
