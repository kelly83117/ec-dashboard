#!/usr/bin/env node
// 蝦皮淨利表搜尋框「範圍＝商品調整」的關鍵字篩選（2026-11-26）的 node 測試（只讀，不寫檔、不連網路）。
//
//   node scripts/growth-keyword-filter.test.cjs
//
// 測 js/profit.js 的 GROWTH-KW-PURE 區塊（正規化、拆字、比對、提示文字），
// 以及跟 _inGrowthPeriod 一起用時「整月看得到上下半月寫的紀錄」；再用原始碼檢查接線（搜尋範圍下拉、applyFilters、存讀、lmFiltOn、唯讀白名單）。
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

// ── 接線（原始碼檢查；2026-11-26 第二版：合併成一個搜尋框＋範圍下拉）──
const fn = name => { const i = src.indexOf('function ' + name + '('); if (i < 0) return ''; const j = src.indexOf('\nfunction ', i + 10); return src.slice(i, j < 0 ? i + 6000 : j); };
const has = (hay, needle) => hay.indexOf(needle) >= 0;
const AF = fn('applyFilters');
// 範圍＝商品：改版前那一行搜尋要原封不動（只多了前面的 else）
ok(has(AF, "else if(q)list=list.filter(r=>r.name.toLowerCase().includes(q)||r.code.toLowerCase().includes(q)||(r.shopeeIds||[]).some(id=>String(id).toLowerCase().includes(q)));"), '範圍＝商品：原本的搜尋那一行一字未動');
ok(has(AF, "if(s.searchScope==='growth'){") && has(AF, 'const gkw=growthKwTokens(s.search);') && has(AF, 'growthKwMatch(growthKwAdjs(gAll[r.code]),gkw)'), '範圍＝商品調整：比商品調整');
ok(AF.indexOf('growthKwMatch') < AF.indexOf('s._filtered=list'), '篩選在 _filtered 之前（筆數、五格、匯出、批次選取都跟著）');
ok(has(fn('_saveFilterState'), "searchScope:s.searchScope==='growth'?'growth':'prod'"), '_saveFilterState 存 searchScope');
ok(has(fn('_loadFilterState'), "searchScope:o.searchScope==='growth'?'growth':'prod'"), '_loadFilterState 讀 searchScope（不認得的一律商品）');
ok(has(src, "s.searchScope==='growth'&&growthKwTokens(s.search).length"), '_growthKwOn：範圍＝商品調整而且有字');
ok(has(fn('_lastMonthSameTotals'), 'lmFiltOn=!!(s.search||_growthKwOn(s)'), 'lmFiltOn 沿用 s.search');
ok(has(fn('loadIntoUI'), '_searchSyncUI(shop)'), 'loadIntoUI 回填範圍（切月份保留）');
ok(has(src, 'state[shop].searchScope=_fs.searchScope'), 'initShopUI 還原範圍');
ok(has(src, "search:'',searchScope:'prod'}"), 'state 初始化範圍＝商品');
ok(!/growthQ|gkw-wrap|gkw-input|growthKwInput|growthKwClear/.test(src), '第一版的獨立關鍵字框已拿掉');
ok(has(src, 'setSearch,searchInput,setSearchScope,searchClear,'), 'searchInput／setSearchScope／searchClear 掛上 window');
ok(has(src, '<select class="sch-scope" id="sch-scope-${shop}" onchange="setSearchScope(\'${shop}\',this.value)"') && has(src, '<option value="prod">商品</option><option value="growth">商品調整</option></select>'), '範圍下拉：商品（預設、第一個）／商品調整');
ok(has(src, 'oninput="searchInput(\'${shop}\',this,event)"'), '搜尋框 oninput 改走 searchInput');
const SI = fn('searchInput');
ok(has(SI, "if(!s||s.searchScope!=='growth'){ setSearch(shop,el.value); return; }"), '範圍＝商品：直接 setSearch（同改版前，不延遲）');
ok(has(SI, 'if(ev&&ev.isComposing)return;') && has(SI, '},200);'), '範圍＝商品調整：組字中不篩、200ms 延遲');
ok(!has(src, 'oncompositionend='), '沒有 inline oncompositionend（不是 HTML 會認的屬性）');
{ const i = src.indexOf("document.addEventListener('compositionend'"); const blk = src.slice(i, i + 400);
  ok(i > 0 && has(blk, "searchScope!=='growth')return;") && has(blk, 'searchInput(shop,el)'), '組字結束由 document 監聽觸發，只在範圍＝商品調整時'); }
ok(has(fn('setSearchScope'), 'if(el)s.search=el.value;') && has(fn('setSearchScope'), 'applyFilters(shop)'), '切範圍：文字保留、用新範圍重篩');
ok(has(fn('searchClear'), "s.search='';") && !has(fn('searchClear'), 'searchScope'), '✕ 只清文字、範圍不變');
{ const i = src.indexOf('state[shop].search=code;'); ok(i > 0 && has(src.slice(i, i + 600), "state[shop].searchScope='prod'"), '健檢跳轉：範圍改回商品'); }
const app = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
const roLine = app.split('\n').find(l => l.indexOf('const __RO_WRITE_RE') === 0) || '';
ok(roLine && !/searchInput|setSearchScope|searchClear/.test(roLine), '唯讀白名單沒有搜尋相關（檢視，唯讀帳號也能用）');
const css = fs.readFileSync(path.join(ROOT, 'css/profit.css'), 'utf8');
ok(/\.search-input\{[^}]*width:180px;/.test(css) && !has(css, 'max-width:1360px') && !has(css, 'search-input{width:140px'), 'css：搜尋框寬度 180、沒有第一版的 ≤1360px 縮小');
ok(!/growthKw|searchScope|sch-scope/.test(fs.readFileSync(path.join(ROOT, 'js/firebase.js'), 'utf8')), 'firebase.js 沒有任何改動相關字');

console.log(`growth-keyword-filter: ${pass} 通過、${fail} 失敗`);
if (fail) process.exit(1);
