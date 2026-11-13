#!/usr/bin/env node
// KPI 已確認警示「看得到」（2026-11-13）測試。只讀：不寫任何檔案、不連網路、不碰 Firestore。
//
//   node scripts/kpi-ack-view.test.cjs                         只跑純函式（KPI_ACK_PURE_BEGIN／END）
//   KPI_BACKUP=<app/kpi 備份 json> node scripts/kpi-ack-view.test.cjs   另外用真實資料驗：
//     ① 每一筆 acks 紀錄對得上的警示，都出現在已確認項目裡（誰／原因一致）
//     ② 已確認項目只來自 acked 的警示；未確認的警示一條都沒混進來
//     ③ 月結表 HTML：有已確認項目的通路列、店列，純利率格旁有 km-ack-mark
//   備份檔是 Firestore 匯出的 app/kpi（ec-backup，不進 repo）。
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0, skip = 0;
const ok = (c, n, x) => { if (c) pass++; else { fail++; console.error('✗ ' + n + (x ? '\n    ' + x : '')); } };
const eq = (a, b, n) => ok(a === b, n, '得到 ' + JSON.stringify(a) + '，預期 ' + JSON.stringify(b));

const src = fs.readFileSync(path.join(ROOT, 'js/profit.js'), 'utf8').replace(/\r\n/g, '\n');
const cut = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('profit.js 找不到 ' + a + ' … ' + b); return src.slice(i, j); };

// ════ 1. 純函式 ════
const P = new Function(cut('// KPI_ACK_PURE_BEGIN', '// KPI_ACK_PURE_END') + '\nreturn{_kpiAckAtMs,_kpiAckDate,_kpiAckLine,_kpiAckItems,_kpiAckTipText};')();
{
  // 2026-11-10 13:37:55 台灣時間 = 05:37:55 UTC
  const ms = Date.UTC(2026, 10, 10, 5, 37, 55);
  eq(P._kpiAckAtMs(ms), ms, 'at 是數字');
  eq(P._kpiAckAtMs({ __ts: ms }), ms, 'at 是備份檔的 {__ts}');
  eq(P._kpiAckAtMs({ toMillis: () => ms }), ms, 'at 是 Firestore Timestamp（toMillis）');
  eq(P._kpiAckAtMs({ seconds: ms / 1000, nanoseconds: 0 }), ms, 'at 是 {seconds,nanoseconds}');
  eq(P._kpiAckAtMs(null), null, 'at 沒有');
  eq(P._kpiAckAtMs('x'), null, 'at 讀不懂');
  eq(P._kpiAckDate(ms), '11/10', '日期 M/D');
  eq(P._kpiAckDate(Date.UTC(2026, 9, 31, 17, 0, 0)), '11/1', '台灣時間跨日（UTC 10/31 17:00＝台灣 11/1）');
  eq(P._kpiAckDate(undefined), '', '沒有日期 ⇒ 空字串');
  eq(P._kpiAckLine({ by: '楊心雨', at: ms, reason: '10月有開多筆廣告' }), '— 楊心雨 11/10 確認：10月有開多筆廣告', '確認那一行（有原因）');
  eq(P._kpiAckLine({ by: 'Vanessa', at: ms, reason: '' }), '— Vanessa 11/10 確認', '沒填原因就只寫誰、哪天');
  eq(P._kpiAckLine({ by: 'Vanessa' }), '— Vanessa 確認', '沒有日期');
  eq(P._kpiAckLine({}), '— 確認', '什麼都沒有');

  const list = [
    { group: 'shopee', shop: '維克', label: '廣告費', key: 'A', full: '維克 廣告費率 10.4%…', msg: '廣告費率 10.4%…', acked: true, ackBy: '楊心雨', ackReason: 'r' },
    { group: 'shopee', shop: '維克', label: '廣告費', key: 'A', full: '維克 廣告費 量級…', msg: '量級…', acked: true, diff: 'D1', hint: 'H1' },
    { group: 'shopee', shop: '好麻吉', label: '商品成本', key: 'B', full: '好麻吉 成本…', msg: '成本…' },   // 沒確認
    { group: 'pchome', shop: '', label: '小計純利率', key: 'C', full: 'PChome 小計…', msg: 'PChome 小計…', acked: true, diff: 'D1' },
  ];
  const acks = { A: { by: '楊心雨', at: ms, reason: '10月有開多筆廣告' }, C: { by: 'Vanessa', at: { __ts: ms } } };
  const items = P._kpiAckItems(list, k => acks[k]);
  eq(items.length, 2, '一格一項、未確認的不算');
  eq(items[0].msgs.join('|'), '廣告費率 10.4%…|量級…', '同一格多條合在一起');
  eq(items[0].diffs.join('|'), 'D1|H1', '主要差異＋提示（去重）');
  eq(items[0].ack.reason, '10月有開多筆廣告', '確認紀錄取 ackOf');
  eq(P._kpiAckItems(list, null)[0].ack.by, '楊心雨', '沒有 ackOf 時退回 ackBy');
  eq(P._kpiAckItems([], () => null).length, 0, '空清單');
  const tip = P._kpiAckTipText(items, s => s + '店');
  ok(tip.startsWith('✓ 已確認 2 條\n\n維克店 · 廣告費：廣告費率 10.4%…；量級…\nD1\nH1\n— 楊心雨 11/10 確認：10月有開多筆廣告'), '滑鼠提示：店 · 欄位＋差異＋確認', tip);
  ok(/\n\n小計純利率：PChome 小計…\nD1\n— Vanessa 11\/10 確認$/.test(tip), '滑鼠提示：整組（沒有店名）', tip);
  eq(P._kpiAckTipText([], null), '', '沒有項目 ⇒ 空字串');

  // 純函式區不准有寫入
  const block = cut('// KPI_ACK_PURE_BEGIN', '// KPI_ACK_PURE_END');
  ok(!/writePaths|Store\.set|setItem|__cloud/.test(block), '純函式區沒有任何寫入呼叫');
}

// ════ 2. 真實資料 ════
const bk = process.env.KPI_BACKUP;
if (!bk || !fs.existsSync(bk)) { console.log('（沒有 KPI_BACKUP，略過真實資料）'); skip++; }
else {
  const code = [cut('// ── KPI 月結表（行銷）──', '// Console 只讀觀測點：__kpiAnomalyReport'),
    cut('function _kpiFieldMergeStatus(', '// ── 檢視狀態：月結表／年度總表'),
    'function fmtN(v){return Math.abs(Math.round(v)).toLocaleString();}',
    'function getPlatformRate(){return 0.205;}',
    'const FRIDAY_CVS_FEE=60,FRIDAY_SYS_FEE=500,FRIDAY_ORDER_FEE=1;'].join('\n');
  const stub = () => new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : k === 'then' ? undefined : stub(), apply: () => stub(), construct: () => stub(), set: () => true });
  const ctx = { window: { addEventListener() {}, App: stub() }, document: stub(), Store: { _profitMem: {} }, localStorage: { getItem: () => null, setItem() {} }, console, setTimeout: () => 0, clearTimeout() {} };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(code + '\n;globalThis.__X={KPI_GROUPS,_kpiV2,_kpiCompose,_kpiAnomalies,_kpiAckItems,_kpiAckRec,_kpiAckId,_kpiAcks,_kpiPrevMonthKey};', ctx);
  const X = ctx.__X;
  X._kpiV2.cloud = JSON.parse(fs.readFileSync(bk, 'utf8')); X._kpiV2.legacy = null;
  const rows = X._kpiCompose(false);
  // 月結表 HTML 要靠 getKpiRows／_kpiExpandedGroups：在 context 裡補上（全部展開）
  vm.runInContext('getKpiRows=function(){return __rows;};if(typeof _kpiShopeeBasisHtml==="undefined")globalThis._kpiShopeeBasisHtml=function(){return "";};',Object.assign(ctx, { __rows: rows }));
  let nAck = 0;
  rows.forEach(row => {
    const m = row.month, list = X._kpiAnomalies(m, rows);
    const items = X._kpiAckItems(list, k => X._kpiAckRec(m, k));
    const keys = new Set(items.map(i => i.key));
    list.filter(a => !a.acked).forEach(a => ok(!keys.has(a.key), m + ' ' + a.key + '：未確認的不在已確認區'));
    list.filter(a => a.acked).forEach(a => ok(keys.has(a.key), m + ' ' + a.key + '：已確認的在已確認區'));
    items.forEach(it => {
      const rec = X._kpiAcks(m)[X._kpiAckId(it.key)];
      ok(rec && rec.by === it.ack.by && (rec.reason || '') === (it.ack.reason || ''), m + ' ' + it.key + '：誰／原因跟 acks 一致');
    });
    nAck += items.length;
    if (!items.length) return;
    X.KPI_GROUPS.forEach(g => { try { vm.runInContext('_kpiExpandedGroups.add(' + JSON.stringify(m + ':' + g.key) + ')', ctx); } catch (e) {} });
    const prow = rows.find(r => r.month === X._kpiPrevMonthKey(m));
    const html = vm.runInContext('_kpiChannelTableHtml', ctx)(row, prow);
    const marks = (html.match(/class="km-ack-mark"/g) || []).length;
    const want = new Set(items.map(i => i.group)).size + new Set(items.filter(i => i.shop).map(i => i.group + '|' + i.shop)).size;
    eq(marks, want, m + '：月結表 ✓ 個數＝有確認的通路數＋有確認的店數');
    console.log(m + '：已確認 ' + items.length + ' 格，月結表 ✓ ' + marks + ' 個');
  });
  console.log('真實資料：' + rows.length + ' 個月、已確認 ' + nAck + ' 格');
}
console.log('\n通過 ' + pass + '、失敗 ' + fail + (skip ? '、略過 ' + skip : ''));
process.exit(fail ? 1 : 0);
