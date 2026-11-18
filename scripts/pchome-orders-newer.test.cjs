#!/usr/bin/env node
// PChome 訂單「匯入時間較新的贏」純函式的 node 測試（只讀，不寫任何檔案、不連網路、不碰 Firestore）。
//
//   node scripts/pchome-orders-newer.test.cjs
//
// 從 js/profit.js 抽 PCHOME_ORDERS_NEWER_PURE_BEGIN/END 區塊，用 new Function 跑。資料全是合成的假資料。
'use strict';
const fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (cond, name, extra) => { if (cond) pass++; else { fail++; console.error('✗ ' + name + (extra ? '\n    ' + extra : '')); } };
const eq = (a, b, name) => { const A = String(JSON.stringify(a)), B = String(JSON.stringify(b)); ok(A === B, name, A !== B ? '得到 ' + A.slice(0, 400) + '\n    預期 ' + B.slice(0, 400) : ''); };

const src = fs.readFileSync(path.join(ROOT, 'js/profit.js'), 'utf8').replace(/\r\n/g, '\n');
const A = '// PCHOME_ORDERS_NEWER_PURE_BEGIN', B = '// PCHOME_ORDERS_NEWER_PURE_END';
const i = src.indexOf(A), j = src.indexOf(B, i);
if (i < 0 || j < 0) throw new Error('找不到標記');
if (src.indexOf(A, i + 1) >= 0) throw new Error('標記重複');
const block = src.slice(i, j + B.length);
const P = new Function(block + '\nreturn { pchomeOrderImportTs, pchomeOrderLocalWins, pchomeOrdersPickNewer, pchomeOrdersCanon, pchomeOrdersWriteConfirmed };')();

const o = (key, at, cost) => ({ key, 訂單編號: key.split('-')[0], 成本小計: cost, ...(at === undefined ? {} : { 匯入時間: at }) });

// ── 匯入時間解析 ──
const T = P.pchomeOrderImportTs;
eq(T('2026/11/18 14 時'), new Date(2026, 10, 18, 14, 0, 0).getTime(), '檔名格式（只到小時）');
eq(T('2026/11/18 下午7:16:05'), new Date(2026, 10, 18, 19, 16, 5).getTime(), 'zh-TW 下午');
eq(T('2026/11/18 上午12:05:00'), new Date(2026, 10, 18, 0, 5, 0).getTime(), 'zh-TW 上午 12 點＝0 點');
eq(T('2026/11/18 下午12:05:00'), new Date(2026, 10, 18, 12, 5, 0).getTime(), 'zh-TW 下午 12 點＝12 點');
eq(T('11/18/2026, 7:16:00 PM'), new Date(2026, 10, 18, 19, 16, 0).getTime(), 'en-US PM');
eq(T(''), null, '空字串＝缺');
eq(T(undefined), null, 'undefined＝缺');
eq(T('看不懂的字'), null, '讀不懂＝缺');

// ── 六種情況 ──
const cloud = {
  'A-1': o('A-1', '2026/11/10 09 時', 100),          // 本機較新
  'B-1': o('B-1', '2026/11/18 14 時', 200),          // 雲端較新（同事後來重傳）
  'C-1': o('C-1', '2026/11/10 09 時', 300),          // 相同時間
  'D-1': o('D-1', undefined, 400),                   // 雲端缺匯入時間
  'E-1': o('E-1', '2026/11/10 09 時', 500),          // 本機缺匯入時間
  'F-1': o('F-1', undefined, 600),                   // 兩邊都缺
  'G-1': o('G-1', '2026/11/10 09 時', 700),          // 雲端獨有
};
const local = {
  'A-1': o('A-1', '2026/11/18 下午3:00:00', 101),
  'B-1': o('B-1', '2026/11/10 09 時', 199),
  'C-1': o('C-1', '2026/11/10 09 時', 301),
  'D-1': o('D-1', '2026/11/01 09 時', 401),
  'E-1': o('E-1', undefined, 501),
  'F-1': o('F-1', undefined, 601),
  'H-1': o('H-1', '2026/11/18 10 時', 800),          // 本機獨有
};
const r = P.pchomeOrdersPickNewer(cloud, local);
eq(r.merged['A-1'].成本小計, 101, '本機較新 → 用本機');
eq(r.merged['B-1'].成本小計, 200, '雲端較新 → 用雲端');
eq(r.merged['C-1'].成本小計, 301, '相同 → 用本機');
eq(r.merged['D-1'].成本小計, 401, '雲端缺匯入時間 → 雲端視為較舊、用本機');
eq(r.merged['E-1'].成本小計, 500, '本機缺匯入時間 → 本機視為較舊、用雲端');
eq(r.merged['F-1'].成本小計, 601, '兩邊都缺 → 用本機（同改版前）');
eq(r.merged['G-1'].成本小計, 700, '雲端獨有 → 保留');
eq(r.merged['H-1'].成本小計, 800, '本機獨有 → 加入');
eq(Object.keys(r.merged).sort(), ['A-1', 'B-1', 'C-1', 'D-1', 'E-1', 'F-1', 'G-1', 'H-1'], 'merged 不多不少');
eq(r.keptCloud.map(x => x.key).sort(), ['B-1', 'E-1'], 'keptCloud＝雲端較新的兩筆');
eq(r.keptCloud.find(x => x.key === 'B-1'), { key: 'B-1', localAt: '2026/11/10 09 時', cloudAt: '2026/11/18 14 時' }, 'keptCloud 帶兩邊匯入時間');
eq(r.usedLocal.sort(), ['A-1', 'C-1', 'D-1', 'F-1'], 'usedLocal');
eq(r.localOnly, ['H-1'], 'localOnly');
eq(r.cloudOnly, ['G-1'], 'cloudOnly');
ok(cloud['B-1'].成本小計 === 200 && local['B-1'].成本小計 === 199, '不改動傳進來的物件');
eq(P.pchomeOrdersPickNewer({}, local).localOnly.length, 7, '雲端空 → 全部用本機');
eq(P.pchomeOrdersPickNewer(cloud, {}).cloudOnly.length, 7, '本機空 → 全部雲端');
eq(P.pchomeOrdersPickNewer(null, undefined).merged, {}, 'null 安全');

// ── 不同格式互比 ──
ok(P.pchomeOrderLocalWins({ 匯入時間: '2026/11/18 下午3:00:00' }, { 匯入時間: '2026/11/18 14 時' }), '下午3點 vs 14 時 → 本機較新');
ok(!P.pchomeOrderLocalWins({ 匯入時間: '2026/11/18 上午9:00:00' }, { 匯入時間: '2026/11/18 14 時' }), '上午9點 vs 14 時 → 雲端較新');

// ── 寫入讀回比對 ──
const W = P.pchomeOrdersWriteConfirmed;
const exp = { '2026-11': { 'A-1': { a: 1, b: { x: 1, y: 2 } } } };
eq(W(exp, null) !== '', true, '讀不到 → 不確認');
eq(W(exp, { '2026-11': { 'A-1': { b: { y: 2, x: 1 }, a: 1 }, 'Z-1': {} } }), '', '鍵順序不同、多了別人的訂單 → 確認');
eq(W(exp, { '2026-11': { 'A-1': { a: 0, b: { x: 1, y: 2 } } } }) !== '', true, '雲端還是舊值（防護碼／唯讀擋下）→ 不確認');
eq(W(exp, {}) !== '', true, '整個帳務月不在 → 不確認');
eq(W({}, {}), '', '這次沒推任何東西 → 確認');

console.log((fail ? '❌' : '✅') + ' 通過 ' + pass + '，失敗 ' + fail);
process.exit(fail ? 1 : 0);
