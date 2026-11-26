#!/usr/bin/env node
// 蝦皮淨利表「商品調整含…」關鍵字篩選（2026-11-26）的 node 測試（只讀，不寫檔、不連網路）。
//
//   node scripts/growth-keyword-filter.test.cjs
//
// 測 js/profit.js 的 GROWTH-KW-PURE 區塊（正規化、拆字、比對、提示文字），
// 以及跟 _inGrowthPeriod 一起用時「整月看得到上下半月寫的紀錄」；再用原始碼檢查接線（applyFilters、存讀、lmFiltOn、唯讀白名單）。
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (cond, name, extra) => { if (cond) pass++; else { fail++; console.error('✗ ' + name + (extra ? '\n    ' + extra : '')); } };
const eq = (a, b, name) => ok(JSON.stringify(a) === JSON.stringify(b), name, '實際 ' + JSON.stringify(a) + '\n    預期 ' + JSON.stringify(b));

const src = fs.readFileSync(path.join(ROOT, 'js/profit.js'), 'utf8').replace(/\r\n/g, '\n');
const a = src.indexOf('// GROWTH-KW-PURE-BEGIN'), b = src.indexOf('// GROWTH-KW-PURE-END');
if (a < 0 || b < a) throw new Error('找不到 GROWTH-KW-PURE 區塊');
const P = new Function(src.slice(a, b) + '\nreturn { growthKwNorm, growthKwTokens, growthKwAdjs, growthKwMatch, growthKwHint };')();
// 期間判斷用正式的那兩支（同一個檔案，純函式）
const g1 = src.indexOf('function _growthPeriodOf('), g2 = src.indexOf('window._growthPeriodOf=');
const G = new Function(src.slice(g1, g2) + '\nreturn { _growthPeriodOf, _inGrowthPeriod };')();

const T = P.growthKwTokens, M = (texts, q) => P.growthKwMatch(texts.map(t => ({ text: t })), T(q));

// ── 正規化與拆字 ──
eq(T(''), [], '空字串 → 不篩');
eq(T('   '), [], '只有空白 → 不篩');
eq(T(null), [], 'null → 不篩');
eq(T(undefined), [], 'undefined → 不篩');
eq(T('  清倉品  '), ['清倉品'], '去前後空白');
eq(T('清倉品　換主圖'), ['清倉品', '換主圖'], '全形空白也算分隔');
eq(T('清倉品   換主圖\t'), ['清倉品', '換主圖'], '連續空白、tab 收成一個');
eq(T('ＡＢＣ'), ['abc'], '全形英文 → 半形小寫');
eq(T('１０％'), ['10%'], '全形數字與符號 → 半形');
eq(P.growthKwNorm('「清倉」'), '「清倉」', '中文括號不動');

// ── 比對（真值表）──
ok(M(['本週清倉品'], '清倉品'), '包含就算');
ok(!M(['換主圖'], '清倉品'), '沒有就不算');
ok(M(['Banner 換新'], 'banner'), '不分大小寫（關鍵字小寫）');
ok(M(['banner 換新'], 'BANNER'), '不分大小寫（關鍵字大寫）');
ok(M(['ＳＥＯ 優化'], 'seo'), '紀錄是全形、關鍵字半形');
ok(M(['SEO 優化'], 'ｓｅｏ'), '紀錄是半形、關鍵字全形');
ok(M(['清倉品 換主圖'], '清倉品 換主圖'), 'AND：同一筆都有');
ok(M(['清倉品', '換主圖'], '換主圖 清倉品'), 'AND：分在兩筆、順序不同也算');
ok(!M(['清倉品'], '清倉品 換主圖'), 'AND：少一個就不算');
ok(M(['清倉品'], '  清倉品  '), '關鍵字前後空白不影響');
ok(M(['x'], ''), '空關鍵字＝全部符合（不篩）');
ok(!M([], '清倉品'), '沒有紀錄 → 不符合');
ok(!P.growthKwMatch([{ date: '2026/10/01' }, { text: null }], T('清倉品')), '沒有 text 的紀錄不會當成符合');
ok(M(['清 倉品'], '清 倉品'), '關鍵字裡的空白是 AND（「清」「倉品」都在）');
ok(!M(['清倉'], '清倉品'), '只對到一部分不算');

// ── growthKwAdjs：舊版字串備註、壞資料 ──
eq(P.growthKwAdjs(null), [], 'null → []');
eq(P.growthKwAdjs('清倉品'), [{ date: '', text: '清倉品' }], '舊版字串備註轉成一筆');
eq(P.growthKwAdjs({ adjustments: [{ text: 'a' }, null, 'x', { text: 'b' }] }), [{ text: 'a' }, { text: 'b' }], 'adjustments 裡的 null／字串略過');
eq(P.growthKwAdjs({ text: 'x' }), [], '沒有 adjustments → []');
ok(P.growthKwMatch(P.growthKwAdjs('本期清倉品'), T('清倉品')), '舊版字串備註也找得到');

// ── 全部期間：期間判斷 ＋ 比對 ──
const adjs = [
  { date: '2026/09/03', text: '清倉品，主圖之後再換', period: '2026/09|first' },
  { date: '2026/10/05', text: '調價 -10', period: '2026/10|first' },
  { date: '2026/10/20', text: '換主圖', period: '2026/10|second' },
  { date: '2026/10/31', text: '整月：補貨', period: '2026/10|full' },
  { date: '2026/08/20', text: '舊資料沒有 period，清倉品' },      // 推算成 2026/08|first
];
const inCur = (m, h) => x => G._inGrowthPeriod(x, m, h);
const label = o => o.period ? o.period.replace('|first', ' 上半月').replace('|second', ' 下半月').replace('|full', ' 整月') : (o.date || '未記日期');
ok(P.growthKwMatch(adjs, T('清倉品')), '全部期間：其他期間的清倉品也找得到');
ok(P.growthKwMatch(adjs, T('換主圖 調價')), '全部期間：上半月＋下半月兩筆合起來 AND 成立');
// 整月看的時候，上下半月寫的都不在本期格子裡（_inGrowthPeriod 的既有規則），但篩選照樣找得到
ok(!adjs.filter(inCur('2026/10', 'full')).some(x => x.text === '換主圖'), '前提：整月格子裡看不到下半月寫的「換主圖」');
ok(P.growthKwMatch(adjs, T('換主圖')), '整月時下半月寫的找得到');
ok(P.growthKwMatch(adjs, T('調價')), '整月時上半月寫的找得到');

// ── 提示文字 ──
eq(P.growthKwHint(adjs, T(''), inCur('2026/10', 'second'), label), '', '沒有關鍵字 → 沒有提示');
eq(P.growthKwHint(adjs, T('換主圖'), inCur('2026/10', 'second'), label), '', '本期格子裡就有 → 沒有提示');
eq(P.growthKwHint(adjs, T('換主圖'), inCur('2026/10', 'full'), label), '關鍵字在 2026/10 下半月「換主圖」', '整月看：下半月那筆要提示');
eq(P.growthKwHint(adjs, T('清倉品'), inCur('2026/10', 'first'), label),
  '關鍵字在 2026/09 上半月「清倉品，主圖之後再換」\n關鍵字在 2026/08/20「舊資料沒有 period，清倉品」', '兩筆都在其他期間：依紀錄順序列出');
eq(P.growthKwHint(adjs, T('換主圖 調價'), inCur('2026/10', 'first'), label), '關鍵字在 2026/10 下半月「換主圖」',
  'AND：本期只湊到一半 → 只列其他期間有關鍵字的那筆');
eq(P.growthKwHint(adjs, T('不存在'), inCur('2026/10', 'first'), label), '', '其他期間也沒有 → 空');
{ const long = [{ text: '一二三四五六七八九十一二三四五六七八九十多出來的字 清倉品', period: '2026/01|first' }];
  eq(P.growthKwHint(long, T('清倉品'), () => false, label), '關鍵字在 2026/01 上半月「一二三四五六七八九十一二三四五六七八九十…」', '內容只取前 20 字，多的加 …'); }
{ const many = [1, 2, 3, 4, 5].map(i => ({ text: '清倉品' + i, period: '2026/0' + i + '|first' }));
  const h = P.growthKwHint(many, T('清倉品'), () => false, label).split('\n');
  eq(h.length, 4, '最多列 3 筆＋1 行「另有」'); eq(h[3], '…另有 2 筆', '另有 N 筆'); }
{ const emo = [{ text: '😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀', period: '2026/01|first' }];
  ok(P.growthKwHint(emo, T('😀'), () => false, label).endsWith('😀…」'), '前 20 字照字元算（emoji 不切半）'); }

// ── 接線（原始碼檢查）──
const fn = name => { const i = src.indexOf('function ' + name + '('); if (i < 0) return ''; const j = src.indexOf('\nfunction ', i + 10); return src.slice(i, j < 0 ? i + 6000 : j); };
ok(/growthKwTokens\(s\.growthQ\)/.test(fn('applyFilters')) && /growthKwMatch\(growthKwAdjs\(gAll\[r\.code\]\),gkw\)/.test(fn('applyFilters')), 'applyFilters 有接關鍵字篩選');
ok(fn('applyFilters').indexOf('growthKwMatch') < fn('applyFilters').indexOf('s._filtered=list'), '篩選在 _filtered 之前（筆數、五格、匯出、批次選取都跟著）');
ok(/growthQ:s\.growthQ\|\|''/.test(fn('_saveFilterState')), '_saveFilterState 存 growthQ');
ok(/growthQ:typeof o\.growthQ==='string'/.test(fn('_loadFilterState')), '_loadFilterState 讀 growthQ（型別檢查）');
ok(/_growthKwOn\(s\)/.test(fn('_lastMonthSameTotals')), 'lmFiltOn 算進商品調整關鍵字');
ok(/_growthKwSyncUI\(shop\)/.test(fn('loadIntoUI')), 'loadIntoUI 回填關鍵字框（切月份保留）');
ok(/state\[shop\]\.growthQ=_fs\.growthQ/.test(src) && /_growthKwSyncUI\(shop\);\s*\/\/ 商品調整關鍵字框同上/.test(src), 'initShopUI 還原並回填');
ok(/search:'',growthQ:''\}/.test(src), 'state 初始化有 growthQ');
ok(/setSearch,growthKwInput,growthKwClear,/.test(src), 'growthKwInput／growthKwClear 掛上 window');
ok(/oninput="growthKwInput\('\$\{shop\}',this,event\)">/.test(src), '輸入框有 oninput');
ok(!/oncompositionend=/.test(src), '沒有 inline oncompositionend（不是 HTML 會認的屬性，寫了不會觸發）');
ok(/document\.addEventListener\('compositionend',e=>\{[\s\S]{0,200}gkw-input[\s\S]{0,120}growthKwInput\(el\.id\.slice\(4\),el\)/.test(src), '組字結束由 document 的 compositionend 監聽觸發');
ok(/if\(ev&&ev\.isComposing\)return;/.test(fn('growthKwInput')) && /},200\);/.test(fn('growthKwInput')), '組字中不篩、200ms 延遲');
const app = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
const ro = app.match(/const __RO_WRITE_RE = (\/.*\/);/);
ok(ro && !/growthKw/.test(ro[1]), '唯讀白名單沒有 growthKw（檢視，唯讀帳號也能用）');
ok(!/growthKw|gkw/.test(fs.readFileSync(path.join(ROOT, 'js/firebase.js'), 'utf8')), 'firebase.js 沒有任何改動相關字');

console.log(`growth-keyword-filter: ${pass} 通過、${fail} 失敗`);
if (fail) process.exit(1);
