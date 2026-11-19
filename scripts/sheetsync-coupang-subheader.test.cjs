// node scripts/sheetsync-coupang-subheader.test.cjs
// sheet-sync.gs（repo 副本）第 4 版：酷澎表頭三種寫法都認得，回傳 key 不變（'酷澎|營收'、'酷澎露營館|營收'）。
//   ① 舊格式：第 1 列「酷澎」、第 2 列「營收」（2026-11 以前）
//   ② 第 1 列「酷澎露營館」、第 2 列「營收」（酷澎欄右邊加一欄）
//   ③ 第 1 列「酷澎」合併兩欄、第 2 列「好麻吉」「露營館」（2026-12 Kelly 的排法）
//   ④ 兩種寫法指到同一個 key ⇒ 資料欄重複
//   ⑤ 只有露營館、沒有好麻吉 ⇒ 缺少「酷澎 營收」
//   ⑥ 前端驗算（checkDayTotals）在三種格式下的結果
//   ⑦ 舊格式的 classify_／publicLayout_／pick_ 輸出跟改版前（BASE_COMMIT）逐字相同
// 全離線、資料全是假的（不含正式站數字）。
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BASE_COMMIT = '0aae919';   // 改版前（2026-11-19-935，sheet-sync.gs 第 3 版）

function loadGs(src, names) {
  const ctx = { console };
  vm.createContext(ctx);
  vm.runInContext(src + '\n;this.__t={' + names.join(',') + '};', ctx, { filename: 'sheet-sync.gs' });
  return ctx.__t;
}
const G = loadGs(fs.readFileSync(path.join(ROOT, 'sheet-sync.gs'), 'utf8'),
  ['classify_', 'pick_', 'publicLayout_', 'headerRows_', 'layoutNotices_', 'DATA_KEYS', 'OPTIONAL_KEYS', 'CHECK_KEYS']);
let B = null;
try {
  B = loadGs(execFileSync('git', ['show', BASE_COMMIT + ':sheet-sync.gs'], { cwd: ROOT, encoding: 'utf8' }),
    ['classify_', 'pick_', 'publicLayout_']);
} catch (e) { console.log('⚠ 讀不到 ' + BASE_COMMIT + ' 的 sheet-sync.gs（沒有 git 歷史？），略過改版前比對'); }

function loadSheetSync() {
  const win = {
    App: {}, Store: { KEYS: { platforms: 'ec.platforms', users: 'ec.users' }, get: () => [] },
    PLATFORMS_WITH_AD_SPEND: new Set(['生活好麻吉', '玩樂盒子', '森之旅', '維克生活']),
    escapeHtml: s => String(s), showToast: () => {},
  };
  const ctx = { window: win, console, Intl, Date, Math, JSON, Object, Array, Set, Promise, setTimeout, clearTimeout };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/pages/sheetsync.js'), 'utf8'), ctx, { filename: 'sheetsync.js' });
  return win.SheetSync;
}
const FE = loadSheetSync();

let pass = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); pass++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); pass++; };
const plain = v => JSON.parse(JSON.stringify(v));

/* ── 表頭（試算表原始值：合併儲存格只有左上角有值） ── */
// 2026-11-18 用 ?headers=1&month=2026-11 實測到的欄位排列（A～X）。這裡是「合併前」的原始列＋合併範圍。
const RAW1 = ['2026', '玩樂盒子', '', '', '生活好麻吉', '', '', '維克生活', '', '', '森之旅', '', '', 'MOMO', '', '酷澎', 'PChome', '博客來', 'Friday', '', '蝦皮總營收', 'MOMO', '酷澎', '當日總營收'];
const RAW2 = ['日期', '營收', '廣告費', 'ROAS', '營收', '廣告費', 'ROAS', '營收', '廣告費', 'ROAS', '營收', '廣告費', 'ROAS', 'MOMO', 'MO+', '營收', '營收', '營收', '營收', '', '', '', '', ''];
const MERGES = [
  { row: 1, col: 2, numCols: 3 }, { row: 1, col: 5, numCols: 3 }, { row: 1, col: 8, numCols: 3 }, { row: 1, col: 11, numCols: 3 },
  { row: 1, col: 14, numCols: 2 },
  { row: 1, col: 21, numCols: 1 },   // 垂直合併（U1:U2）：numCols 1，不往右補
];
const P = 15;   // 酷澎欄（P）的 0 起算索引
const ins = (a, i, v) => a.slice(0, i).concat([v], a.slice(i));
const shiftMerges = (ms, fromCol) => ms.map(m => (m.col >= fromCol ? Object.assign({}, m, { col: m.col + 1 }) : m));
const classify = (raw1, raw2, merges) => { const h = G.headerRows_(raw1, raw2, merges); return { h, l: G.classify_(h.r1, h.r2) }; };
const mkRow = (len, first) => Array.from({ length: len }, (_, i) => (i === 0 ? first : i * 10));

/* ── ① 舊格式 ── */
const f1 = classify(RAW1, RAW2, MERGES);
eq(plain(f1.l.problems), [], '① 舊格式沒有問題');
eq(f1.h.r1[14], 'MOMO', '① 合併儲存格往右補值（O1＝MOMO）');
eq(f1.l.data['酷澎|營收'], 'P', '① 酷澎在 P 欄');
ok(!('酷澎露營館|營收' in f1.l.cols), '① 沒有露營館欄');
eq(f1.l.separator, 'T', '① 分隔欄 T');
eq(plain(f1.l.totalCols), { '蝦皮總營收': 'U', 'MOMO': 'V', '酷澎': 'W', '當日總營收': 'X' }, '① 合計區');
const p1 = plain(G.pick_(mkRow(24, '11/1'), f1.l));
eq([p1['酷澎|營收'], p1['酷澎露營館|營收'], p1._coupangTotal], [150, '', 220], '① 酷澎讀 P、露營館空白、合計讀 W');

/* ── ② 第 1 列「酷澎露營館」、第 2 列「營收」 ── */
const f2 = classify(ins(RAW1, P + 1, '酷澎露營館'), ins(RAW2, P + 1, '營收'), shiftMerges(MERGES, P + 2));
eq(plain(f2.l.problems), [], '② 沒有問題');
eq([f2.l.data['酷澎|營收'], f2.l.data['酷澎露營館|營收'], f2.l.data['PChome|營收'], f2.l.separator], ['P', 'Q', 'R', 'U'], '② 酷澎 P、露營館 Q、PChome R、分隔 U');

/* ── ③ Kelly 的新格式：「酷澎」合併 P1:Q1，第 2 列 好麻吉／露營館 ── */
const RAW1k = ins(RAW1, P + 1, '');                               // Q1 是空的（合併範圍內）
const RAW2k = ins(RAW2, P + 1, '露營館'); RAW2k[P] = '好麻吉';
const MERGESk = shiftMerges(MERGES, P + 2).concat([{ row: 1, col: P + 1, numCols: 2 }]);
eq(RAW1k[P + 1], '', '③ 原始第 1 列的第二欄是空的');
const f3 = classify(RAW1k, RAW2k, MERGESk);
eq(f3.h.r1[P + 1], '酷澎', '③ 合併帶值後 Q1＝酷澎');
eq(plain(f3.l.problems), [], '③ 沒有問題');
eq([f3.l.data['酷澎|營收'], f3.l.data['酷澎露營館|營收'], f3.l.data['PChome|營收'], f3.l.separator], ['P', 'Q', 'R', 'U'], '③ 好麻吉 P → 酷澎|營收、露營館 Q → 酷澎露營館|營收');
eq(plain(f3.l.totalCols), { '蝦皮總營收': 'V', 'MOMO': 'W', '酷澎': 'X', '當日總營收': 'Y' }, '③ 合計區的「酷澎」仍是合計欄（X），沒有跟資料區撞名');
eq(Object.keys(f3.l.data).length, 15, '③ 15 個資料欄');
const p3 = plain(G.pick_(mkRow(25, '12/1'), f3.l));
eq([p3['酷澎|營收'], p3['酷澎露營館|營收'], p3._coupangTotal], [150, 160, 230], '③ 讀值：好麻吉 P、露營館 Q、合計 X');
eq(Object.keys(p3).sort(), Object.keys(p1).sort(), '③ 回傳的 key 集合跟舊格式相同（前端不用改）');
// ②③ 除了表頭寫法，layout 完全相同
eq(plain(G.publicLayout_(f3.l, '2026-12')), plain(G.publicLayout_(f2.l, '2026-12')), '③ layout 跟 ② 相同');
// 沒合併（Q1 真的空白）⇒ 擋下、不猜
const f3n = classify(RAW1k, RAW2k, shiftMerges(MERGES, P + 2));
ok(f3n.l.problems.some(p => /無法辨識的資料欄 Q（第 1 列「」／第 2 列「露營館」）/.test(p)), '③ 沒合併 ⇒ 無法辨識 Q：' + f3n.l.problems.join('；'));
eq(f3n.l.separator, 'U', '③ 沒合併時分隔欄也不會被誤判成 Q');
// 只有好麻吉（露營館選填）
const RAW2h = RAW2.slice(); RAW2h[P] = '好麻吉';
const f3h = classify(RAW1, RAW2h, MERGES);
eq(plain(f3h.l.problems), [], '③ 只有「酷澎／好麻吉」⇒ 照舊格式處理');
eq(plain(f3h.l.data), plain(f1.l.data), '③ 只有好麻吉的欄位對應＝舊格式');
// 混用（不同 key，不衝突）：酷澎／營收 ＋ 酷澎／露營館；酷澎／好麻吉 ＋ 酷澎露營館／營收
const RAW2m = ins(RAW2, P + 1, '露營館');
eq(plain(classify(RAW1k, RAW2m, MERGESk).l.problems), [], '③ 「酷澎／營收」＋「酷澎／露營館」可接受');
const RAW2m2 = ins(RAW2, P + 1, '營收'); RAW2m2[P] = '好麻吉';
eq(plain(classify(ins(RAW1, P + 1, '酷澎露營館'), RAW2m2, shiftMerges(MERGES, P + 2)).l.problems), [], '③ 「酷澎／好麻吉」＋「酷澎露營館／營收」可接受');
// 好麻吉／露營館寫在別的群組底下 ⇒ 不認
const RAW1x = RAW1.slice(); RAW1x[P] = 'PChome';
ok(classify(RAW1x, RAW2h, MERGES).l.problems.some(p => /無法辨識的資料欄 P/.test(p)), '③ 「PChome／好麻吉」⇒ 無法辨識');

/* ── ④ 兩種寫法指到同一個 key ── */
// 酷澎／營收 ＋ 酷澎／好麻吉
const f4a = classify(ins(RAW1k, P + 2, ''), ins(RAW2m.map((v, i) => (i === P + 1 ? '好麻吉' : v)), P + 2, '露營館'),
  shiftMerges(MERGES, P + 2).map(m => (m.col >= P + 3 ? Object.assign({}, m, { col: m.col + 1 }) : m)).concat([{ row: 1, col: P + 1, numCols: 3 }]));
ok(f4a.l.problems.some(p => /資料欄重複：酷澎 營收（P、Q）/.test(p)), '④ 酷澎／營收＋酷澎／好麻吉 ⇒ 重複：' + f4a.l.problems.join('；'));
// 酷澎／露營館 ＋ 酷澎露營館／營收
const f4b = classify(ins(RAW1k, P + 2, '酷澎露營館'), ins(RAW2k, P + 2, '營收'),
  shiftMerges(MERGESk, P + 3).map(m => (m.col === P + 1 ? m : m)));
ok(f4b.l.problems.some(p => /資料欄重複：酷澎露營館 營收（Q、R）/.test(p)), '④ 酷澎／露營館＋酷澎露營館／營收 ⇒ 重複：' + f4b.l.problems.join('；'));
// 好麻吉寫兩次
const f4c = classify(RAW1k, RAW2k.map((v, i) => (i === P + 1 ? '好麻吉' : v)), MERGESk);
ok(f4c.l.problems.some(p => /資料欄重複：酷澎 營收（P、Q）/.test(p)), '④ 好麻吉寫兩次 ⇒ 重複');

/* ── ⑤ 只有露營館、沒有好麻吉 ── */
const RAW2o = RAW2.slice(); RAW2o[P] = '露營館';
const f5 = classify(RAW1, RAW2o, MERGES);
ok(f5.l.problems.some(p => /缺少 1 個資料欄：酷澎 營收/.test(p)), '⑤ 報缺少「酷澎 營收」：' + f5.l.problems.join('；'));
ok(f5.l.problems.some(p => /P 欄是「酷澎／露營館」，但找不到「酷澎／好麻吉」/.test(p)), '⑤ 補一句原因');
eq(f5.l.problems.length, 2, '⑤ 只有這兩條');

/* ── ⑥ 驗算（前端 checkDayTotals；Apps Script 端只回傳合計欄、不自己驗算）── */
const RNG = { from: '2026-11-01', to: '2026-12-31' };
const resp = rows => ({ ok: true, rows, sheets: [], totals: {}, layouts: {}, error: null });
// 用「每格 100、合計欄照試算表公式算」的假資料列
function dataRow(first, l, len, vals) {
  const row = Array.from({ length: len }, () => 100); row[0] = first;
  const v = k => (k in l.cols ? row[l.cols[k]] : 0);
  Object.keys(vals || {}).forEach(k => { row[l.cols[k]] = vals[k]; });
  row[l.checks.shopeeTotal] = v('玩樂盒子|營收') + v('生活好麻吉|營收') + v('維克生活|營收') + v('森之旅|營收');
  row[l.checks.momoTotal] = v('MOMO|營收') + v('MO+|營收');
  row[l.checks.coupangTotal] = v('酷澎|營收') + v('酷澎露營館|營收');
  row[l.checks.dayTotal] = G.DATA_KEYS.filter(k => /\|營收$/.test(k)).reduce((s, k) => s + v(k), 0);
  return row;
}
[['① 舊格式', f1.l, 24, '2026-11-01'], ['② 酷澎露營館／營收', f2.l, 25, '2026-12-01'], ['③ 酷澎／好麻吉＋露營館', f3.l, 25, '2026-12-01']].forEach(([name, l, len, date]) => {
  const vals = { '酷澎|營收': 700 }; if ('酷澎露營館|營收' in l.cols) vals['酷澎露營館|營收'] = 55;
  const raw = dataRow('x', l, len, vals);
  const row = Object.assign({ date }, plain(G.pick_(raw, l)));
  const v = FE.validateResponse(resp([row]), RNG);
  ok(v.ok, '⑥ ' + name + '：前端接受回應' + (v.ok ? '' : '（' + v.error + '）'));
  eq(plain(FE.checkDayTotals(v.rows[0])), { ok: true, fails: [] }, '⑥ ' + name + '：四項驗算相符');
  eq(row._coupangTotal, 700 + ('酷澎露營館|營收' in l.cols ? 55 : 0), '⑥ ' + name + '：合計區酷澎＝' + ('酷澎露營館|營收' in l.cols ? '好麻吉＋露營館' : '酷澎那一欄'));
  if ('酷澎露營館|營收' in l.cols) {
    // 合計公式沒含露營館 ⇒ 要報不符
    const stale = Object.assign({}, row, { _coupangTotal: 700 });
    ok(plain(FE.checkDayTotals(stale)).fails.some(f => f.item === '酷澎'), '⑥ ' + name + '：合計沒含露營館 ⇒ 酷澎驗算不符');
  }
});

/* ── ⑦ 舊格式輸出跟改版前逐字相同（MOMO／MO+ 與其他通路不受影響）── */
if (B) {
  const hOld = G.headerRows_(RAW1, RAW2, MERGES);
  const lB = B.classify_(hOld.r1, hOld.r2), lG = G.classify_(hOld.r1, hOld.r2);
  eq(JSON.stringify(lG), JSON.stringify(lB), '⑦ 舊格式 classify_ 整份輸出逐字相同');
  ['2026-09', '2026-11'].forEach(ym => eq(JSON.stringify(G.publicLayout_(lG, ym)), JSON.stringify(B.publicLayout_(lB)), '⑦ 舊格式 layout（' + ym + '）逐字相同'));
  eq(JSON.stringify(G.pick_(mkRow(24, '11/1'), lG)), JSON.stringify(B.pick_(mkRow(24, '11/1'), lB)), '⑦ 舊格式 pick_ 逐字相同');
  // ② 是第 3 版就支援的格式：也要逐字相同
  eq(JSON.stringify(f2.l), JSON.stringify(B.classify_(f2.h.r1, f2.h.r2)), '⑦ ② 格式 classify_ 逐字相同');
  // 各種壞表頭：改版前後 problems 相同（沒有酷澎子表頭時行為不變）
  const bad = [
    [RAW1.map((v, i) => (i === 13 ? 'MOMOX' : v)), RAW2],
    [RAW1.slice(0, 19).concat(RAW1.slice(20)), RAW2.slice(0, 19).concat(RAW2.slice(20))],   // 沒有分隔欄
    [RAW1.map((v, i) => (i === 22 ? '酷澎合計' : v)), RAW2],
    [RAW1.map((v, i) => (i === P ? '' : v)), RAW2.map((v, i) => (i === P ? '' : v))],       // 酷澎欄整個空 ⇒ 分隔欄提前
  ];
  bad.forEach(([a, b], i) => {
    const h = G.headerRows_(a, b, MERGES);
    eq(JSON.stringify(G.classify_(h.r1, h.r2)), JSON.stringify(B.classify_(h.r1, h.r2)), '⑦ 壞表頭 #' + (i + 1) + ' 輸出逐字相同');
  });
  // ③ 在改版前會被擋（對照）
  ok(B.classify_(f3.h.r1, f3.h.r2).problems.length > 0, '（對照）改版前會擋 ③ 格式');
}
// 除了酷澎兩個 key，其他 key 在三種格式下的欄位字母只差「插入一欄」的位移
['MOMO|營收', 'MO+|營收', '玩樂盒子|營收', '森之旅|廣告費'].forEach(k => {
  eq([f2.l.data[k], f3.l.data[k]], [f1.l.data[k], f1.l.data[k]], '⑦ ' + k + ' 欄位不變');
});

/* ── notice（#503）：2026-12 起沒有露營館欄 ⇒ layout.notices，不擋同步 ── */
eq(plain(G.publicLayout_(f1.l, '2026-12')).notices, ['這個分頁沒有酷澎露營館欄'], 'notice：2026-12 沒有露營館欄');
eq(plain(G.publicLayout_(f1.l, '2027-01')).notices, ['這個分頁沒有酷澎露營館欄'], 'notice：2027-01 也提醒');
ok(!('notices' in G.publicLayout_(f1.l, '2026-11')), 'notice：2026-11 以前不帶 notices 欄位');
ok(!('notices' in G.publicLayout_(f3.l, '2026-12')), 'notice：有露營館欄就沒有');
ok(!('notices' in G.publicLayout_(f2.l, '2026-12')), 'notice：② 格式也沒有');
eq(plain(G.publicLayout_(f1.l, '2026-12')).problems, [], 'notice 不進 problems（不擋同步）');
ok(!('notices' in G.publicLayout_(f1.l)), 'notice：沒給月份不提醒');

console.log('✅ sheetsync-coupang-subheader：' + pass + ' 項通過' + (B ? '' : '（未做改版前比對）'));
