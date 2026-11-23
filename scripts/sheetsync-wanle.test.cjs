// node scripts/sheetsync-wanle.test.cjs
// 首頁「從試算表同步」：酷澎第二館改成「酷澎玩樂」＋「酷澎拆分」防呆（2026-11-23，取代原本的 sheetsync-luying.test.cjs）。
//   1. 試算表沒有任何玩樂欄（現在所有分頁）：改版前（BASE_COMMIT 的 sheetsync.js）與改版後，validateResponse／buildDiff／precheck／apply 結果逐字相同。
//      回應三種來源都測：舊版 Apps Script 第 4 版（每列帶空白的「酷澎露營館|營收」）、第 5 版沒有玩樂欄（帶空白的「酷澎玩樂|營收」）、兩個都沒有。
//   2. 舊 key「酷澎露營館|營收」有值 ⇒ 擋下。
//   3. 酷澎拆分：相符、差額、只有一格、玩樂填 0、10/24 以前、雲端已有酷澎玩樂、玩樂空白、驗算不符；precheck 擋只動一格；寫完摘要。
//   4. 玩樂有值、雲端還沒有「酷澎玩樂」⇒ 擋下（要先 append 到雲端）。
//   5. sheet-sync.gs 第 5 版：平的兩欄、雙層 好麻吉／玩樂、舊分頁沒拆 三種寫法；寫成「露營館」會被擋。
// 資料全是假的（不含正式站數字）。
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BASE_COMMIT = '32a1a71';   // 改版前（2026-11-23-942，sheetsync.js 還是露營館版）

function loadSheetSync(src) {
  const win = {
    App: {},
    Store: { KEYS: { platforms: 'ec.platforms', users: 'ec.users' }, get: () => [] },
    PLATFORMS_WITH_AD_SPEND: new Set(['生活好麻吉', '玩樂盒子', '森之旅', '維克生活']),
    escapeHtml: s => String(s), showToast: () => {},
  };
  const ctx = { window: win, console, Intl, Date, Math, JSON, Object, Array, Set, Promise, setTimeout, clearTimeout };
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: 'sheetsync.js' });
  return win.SheetSync;
}
const NEW = loadSheetSync(fs.readFileSync(path.join(ROOT, 'js/pages/sheetsync.js'), 'utf8'));
let OLD = null;
try {
  OLD = loadSheetSync(execFileSync('git', ['show', BASE_COMMIT + ':js/pages/sheetsync.js'], { cwd: ROOT, encoding: 'utf8' }));
} catch (e) { console.log('⚠ 讀不到 ' + BASE_COMMIT + ' 的 sheetsync.js（沒有 git 歷史？），略過改版前比對'); }

let pass = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); pass++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); pass++; };
const plain = v => JSON.parse(JSON.stringify(v));

/* ── 假資料 ── */
const OLD_KEYS = [
  '玩樂盒子|營收', '玩樂盒子|廣告費', '生活好麻吉|營收', '生活好麻吉|廣告費',
  '維克生活|營收', '維克生活|廣告費', '森之旅|營收', '森之旅|廣告費',
  'MOMO|營收', 'MO+|營收', '酷澎|營收', 'PChome|營收', '博客來|營收', 'Friday|營收',
];
const CH10 = ['生活好麻吉', '玩樂盒子', '森之旅', '維克生活', 'MOMO', 'MO+', '酷澎', 'PChome', '博客來', 'Friday'];
// opts.extra＝{ key: 值 }（例 '酷澎露營館|營收':'' 或 '酷澎玩樂|營收':123）；coupang＝指定酷澎值；coupangOff／dayOff＝合計欄故意不符
function mkRow(date, seed, opts) {
  opts = opts || {};
  const r = { date };
  OLD_KEYS.forEach((k, i) => { r[k] = (seed * 37 + i * 101) % 5000 + 100; });
  if (opts.coupang !== undefined) r['酷澎|營收'] = opts.coupang;
  if (opts.blank) opts.blank.forEach(k => { r[k] = ''; });
  if (opts.bad) Object.assign(r, opts.bad);
  Object.assign(r, opts.extra || {});
  const n = k => (typeof r[k] === 'number' ? r[k] : 0);
  const wl = n('酷澎玩樂|營收');
  r._shopeeTotal = n('玩樂盒子|營收') + n('生活好麻吉|營收') + n('維克生活|營收') + n('森之旅|營收');
  r._momoTotal = n('MOMO|營收') + n('MO+|營收');
  r._coupangTotal = n('酷澎|營收') + wl + (opts.coupangOff || 0);
  r._dayTotal = OLD_KEYS.filter(k => k.endsWith('|營收')).reduce((s, k) => s + n(k), 0) + wl + (opts.dayOff || 0);
  return r;
}
// 雲端：10 家（＋選擇性的「酷澎玩樂」放最後面）。酷澎 10/20～11/05 每天有「兩館合計」
const MERGED = {};
['2026-10-20', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03']
  .forEach((d, i) => { MERGED[d] = 10000 + i * 111; });
function mkPlatforms(withWanle, wanleDaily) {
  const ps = CH10.map((name, i) => ({
    name, icon: 'x', color: '#000',
    daily: name === '酷澎' ? Object.assign({}, MERGED) : { '2026-11-02': 1000 + i, '2026-11-03': (1000 + i) % 7 === 0 ? 0 : 200 + i },
    dailyAdSpend: i < 4 ? { '2026-11-02': 50 + i } : {},
    dailyBy: { '2026-11-02': { name: '別人', username: 'other', at: 1 } },
  }));
  if (withWanle) ps.push({ name: '酷澎玩樂', icon: '🧸', color: '#1d4ed8', daily: Object.assign({}, wanleDaily || {}), dailyAdSpend: {}, dailyBy: {} });
  return ps;
}
const RNG = { from: '2026-10-01', to: '2026-11-05' };
const OPTS = { operatorName: 'Kelly', operatorUsername: 'kelly' };
const BY = { name: 'Kelly', at: 5, src: 'sheet', username: 'kelly' };
const resp = rows => ({ ok: true, rows, sheets: ['2026十月', '2026十一月'], totals: {}, layouts: {}, error: null });

/* ── 1. 沒有玩樂欄：改版前後逐字相同 ── */
// 10、11 月「現在的表頭」產生的資料列（有空白、無法讀取、驗算不符的日子），酷澎＝雲端合計或改過的值
const BASE_ROWS = [
  mkRow('2026-10-20', 1, { coupang: MERGED['2026-10-20'] }),
  mkRow('2026-10-25', 2, { coupang: MERGED['2026-10-25'] }),
  mkRow('2026-10-26', 3, { coupang: MERGED['2026-10-26'] - 500 }),                  // 酷澎跟雲端不同（一般的「不同」）
  mkRow('2026-10-31', 4, { blank: ['PChome|營收', '森之旅|廣告費'] }),
  mkRow('2026-11-01', 5, { bad: { '博客來|營收': '1,234' }, coupangOff: 5 }),
  mkRow('2026-11-02', 6, { dayOff: 9 }),
  mkRow('2026-11-04', 7),
];
const FLAVORS = [
  ['第 4 版回應（帶空白的酷澎露營館）', r => Object.assign({}, r, { '酷澎露營館|營收': '' })],
  ['第 5 版回應、沒有玩樂欄（帶空白的酷澎玩樂）', r => Object.assign({}, r, { '酷澎玩樂|營收': '' })],
  ['沒有任何選填欄', r => Object.assign({}, r)],
];
FLAVORS.forEach(([name, f]) => {
  const rows = BASE_ROWS.map(f);
  const vN = NEW.validateResponse(resp(rows), RNG);
  ok(vN.ok, '1. ' + name + '：新版接受' + (vN.ok ? '' : '（' + vN.error + '）'));
  ok(vN.rows.every(r => r['酷澎玩樂|營收'] === '' && !('酷澎露營館|營收' in r)), '1. ' + name + '：rows 補成空白的酷澎玩樂、不帶露營館');
  ok(rows.every((r, i) => JSON.stringify(r) === JSON.stringify(BASE_ROWS.map(f)[i])), '1. ' + name + '：不改傳入的 row');
  if (!OLD) return;
  const oldRows = rows.map(r => { const o = Object.assign({}, r); delete o['酷澎玩樂|營收']; return o; });   // 改版前不認得酷澎玩樂（第 5 版只在新版才會遇到）
  const vO = OLD.validateResponse(resp(oldRows), RNG);
  ok(vO.ok, '1. ' + name + '：舊版接受同一份資料');
  const strip = rs => plain(rs).map(r => { delete r['酷澎玩樂|營收']; delete r['酷澎露營館|營收']; return r; });
  eq(strip(vN.rows), strip(vO.rows), '1. ' + name + '：rows 除了選填欄以外逐字相同');
  const dN = NEW.buildDiff(vN.rows, mkPlatforms(false), OPTS), dO = OLD.buildDiff(vO.rows, mkPlatforms(false), OPTS);
  eq(plain(dN), plain(dO), '1. ' + name + '：buildDiff（預覽格子、預設勾選、計數、驗算、署名）逐字相同');
  ok(!('splits' in dN), '1. ' + name + '：沒有拆分組、也不帶 splits 欄位');
  // 寫入：同一批勾選（預設＋把「不同」也勾上）apply／precheck 結果逐字相同
  const selN = dN.cells.filter(c => c.cat !== 'same'), selO = dO.cells.filter(c => c.cat !== 'same');
  const mN = NEW.apply(mkPlatforms(false), selN, BY), mO = OLD.apply(mkPlatforms(false), selO, BY);
  eq(plain(mN), plain(mO), '1. ' + name + '：apply 寫出去的 ec.platforms 逐字相同');
  eq(plain(NEW.precheck(mkPlatforms(false), mN, selN, { yesterday: '2026-11-22', by: BY, docData: {}, key: 'ec.platforms', splits: dN.splits })),
     plain(OLD.precheck(mkPlatforms(false), mO, selO, { yesterday: '2026-11-22', by: BY, docData: {}, key: 'ec.platforms' })), '1. ' + name + '：precheck 結果相同');
  BASE_ROWS.forEach(r => eq(plain(NEW.checkDayTotals(f(r))), plain(OLD.checkDayTotals(oldRows.find(x => x.date === r.date))), '1. ' + name + '：逐日驗算相同 ' + r.date));
});
// 雲端已經加了「酷澎玩樂」、試算表還沒拆：所有格子跟沒有酷澎玩樂時一樣（酷澎玩樂只多空白計數）
{
  const v = NEW.validateResponse(resp(BASE_ROWS), RNG);
  const d0 = NEW.buildDiff(v.rows, mkPlatforms(false), OPTS), d1 = NEW.buildDiff(v.rows, mkPlatforms(true), OPTS);
  eq(plain(d1.cells), plain(d0.cells), '1. 雲端有酷澎玩樂、試算表沒拆：格子逐字相同');
  eq(d1.counts.blank, d0.counts.blank + BASE_ROWS.length, '1. 酷澎玩樂每天多 1 格空白');
  ok(!('splits' in d1), '1. 雲端有酷澎玩樂、試算表沒拆：沒有拆分組');
}

/* ── 2. 舊 key 有值 ⇒ 擋下 ── */
{
  const v = NEW.validateResponse(resp([mkRow('2026-10-25', 1, { extra: { '酷澎露營館|營收': 55 } })]), RNG);
  ok(!v.ok && /酷澎露營館/.test(v.error), '2. 「酷澎露營館|營收」有值 ⇒ 擋下：' + v.error);
  const v2 = NEW.validateResponse(resp([mkRow('2026-10-25', 1, { extra: { '其他|營收': '' } })]), RNG);
  ok(!v2.ok && /多：其他\|營收/.test(v2.error), '2. 其他多出來的 key 照舊擋下');
}

/* ── 3. 酷澎拆分 ── */
const old = d => MERGED[d];
const SPLIT_ROWS = [
  mkRow('2026-10-24', 1, { coupang: old('2026-10-24') - 100, extra: { '酷澎玩樂|營收': 100 } }),   // 10/24：不在拆分範圍
  mkRow('2026-10-25', 2, { coupang: old('2026-10-25') - 300, extra: { '酷澎玩樂|營收': 300 } }),   // 相符
  mkRow('2026-10-26', 3, { coupang: old('2026-10-26') - 300, extra: { '酷澎玩樂|營收': 250 } }),   // 差 −50
  mkRow('2026-10-27', 4, { coupang: old('2026-10-27'), extra: { '酷澎玩樂|營收': 80 } }),          // 酷澎沒改（只有一格）：差 +80
  mkRow('2026-10-28', 5, { coupang: old('2026-10-28'), extra: { '酷澎玩樂|營收': 0 } }),           // 玩樂 0、酷澎沒改：相符（只有一格）
  mkRow('2026-10-29', 6, { coupang: old('2026-10-29') - 200, extra: { '酷澎玩樂|營收': 200 } }),   // 雲端已有酷澎玩樂（見 WD）
  mkRow('2026-10-30', 7, { coupang: old('2026-10-30') - 10, extra: { '酷澎玩樂|營收': '' } }),     // 玩樂空白：不是拆分
  mkRow('2026-10-31', 8, { coupang: old('2026-10-31') - 400, extra: { '酷澎玩樂|營收': 400 }, coupangOff: 7 }),   // 相符，但試算表酷澎合計不符
  mkRow('2026-11-01', 9, { coupang: old('2026-11-01') - 0.004, extra: { '酷澎玩樂|營收': 0.004 } }), // 差 0.01 以內：相符
];
const WD = { '2026-10-29': 200 };
const vS = NEW.validateResponse(resp(SPLIT_ROWS), RNG);
ok(vS.ok, '3. 拆欄後的回應通過驗證');
const dS = NEW.buildDiff(vS.rows, mkPlatforms(true, WD), OPTS);
ok(!dS.error, '3. buildDiff 沒有錯誤');
const sp = plain(dS.splits || []);
eq(sp.map(x => x.date), ['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-31', '2026-11-01'], '3. 拆分組的日期（不含 10/24、雲端已有玩樂的 10/29、玩樂空白的 10/30）');
const by = d => sp.find(x => x.date === d);
eq([by('2026-10-25').ok, by('2026-10-25').gap, by('2026-10-25').ids.length], [true, 0, 2], '3. 相符：兩格一組');
eq([by('2026-10-26').ok, by('2026-10-26').gap], [false, -50], '3. 差 −50');
eq([by('2026-10-27').ok, by('2026-10-27').gap, by('2026-10-27').ids], [false, 80, ['酷澎玩樂|daily|2026-10-27']], '3. 酷澎沒改、只有玩樂一格：差 +80');
eq([by('2026-10-28').ok, by('2026-10-28').ids], [true, ['酷澎玩樂|daily|2026-10-28']], '3. 玩樂 0、酷澎沒改：相符（只有一格）');
eq([by('2026-10-31').ok, by('2026-10-31').dayBad], [true, true], '3. 相加相符但試算表合計不符：dayBad');
ok(by('2026-11-01').ok, '3. 差 0.01 以內算相符');
const cell = (ch, d) => dS.cells.find(c => c.ch === ch && c.field === 'daily' && c.date === d);
eq([cell('酷澎', '2026-10-25').checked, cell('酷澎玩樂', '2026-10-25').checked], [true, true], '3. 相符 ⇒ 兩格都預設勾');
eq([cell('酷澎', '2026-10-26').checked, cell('酷澎玩樂', '2026-10-26').checked], [false, false], '3. 差額 ⇒ 兩格都不勾');
eq(cell('酷澎玩樂', '2026-10-27').checked, false, '3. 只有一格且差額 ⇒ 不勾');
eq([cell('酷澎', '2026-10-31').checked, cell('酷澎玩樂', '2026-10-31').checked], [false, false], '3. 試算表合計不符 ⇒ 不勾');
eq([cell('酷澎', '2026-10-24').cat, cell('酷澎', '2026-10-24').checked, cell('酷澎玩樂', '2026-10-24').cat, cell('酷澎玩樂', '2026-10-24').checked, 'split' in cell('酷澎玩樂', '2026-10-24')],
   ['diff', false, 'add', true, false], '3. 10/24 以前：照一般的新增／不同，不成組');
eq([cell('酷澎玩樂', '2026-10-29').cat, 'split' in cell('酷澎', '2026-10-29')], ['same', false], '3. 雲端已有酷澎玩樂：不成組');
eq(['split' in cell('酷澎', '2026-10-30'), cell('酷澎', '2026-10-30').checked, cell('酷澎玩樂', '2026-10-30')], [false, false, undefined], '3. 玩樂空白：酷澎照一般「不同」、不勾');
// precheck：只動一組裡的一格 ⇒ 中止；兩格都動 ⇒ 沒有拆分的問題
{
  const fresh = mkPlatforms(true, WD);
  const pair = dS.cells.filter(c => c.split === '2026-10-25');
  const one = [cell('酷澎', '2026-10-25')];
  const p1 = NEW.precheck(fresh, NEW.apply(fresh, one, BY), one, { yesterday: '2026-11-22', by: BY, docData: {}, key: 'ec.platforms', splits: dS.splits });
  ok(p1.some(x => /酷澎拆分 2026-10-25 只動了一格/.test(x)), '3. precheck：只勾酷澎 ⇒ 中止：' + p1.join('；'));
  const one2 = [cell('酷澎玩樂', '2026-10-25')];
  ok(NEW.precheck(fresh, NEW.apply(fresh, one2, BY), one2, { yesterday: '2026-11-22', by: BY, docData: {}, key: 'ec.platforms', splits: dS.splits }).some(x => /只動了一格/.test(x)), '3. precheck：只勾玩樂 ⇒ 中止');
  const p2 = NEW.precheck(fresh, NEW.apply(fresh, pair, BY), pair, { yesterday: '2026-11-22', by: BY, docData: {}, key: 'ec.platforms', splits: dS.splits });
  eq(plain(p2), [], '3. precheck：兩格一起 ⇒ 通過');
  const merged = NEW.apply(fresh, pair, BY);
  eq([merged[6].daily['2026-10-25'] + merged[10].daily['2026-10-25'], old('2026-10-25')], [old('2026-10-25'), old('2026-10-25')], '3. 寫入後 酷澎＋酷澎玩樂＝原本的合計');
  const def = dS.cells.filter(c => c.checked);
  eq(plain(NEW.precheck(fresh, NEW.apply(fresh, def, BY), def, { yesterday: '2026-11-22', by: BY, docData: {}, key: 'ec.platforms', splits: dS.splits })), [], '3. 預設勾選整批寫入 ⇒ precheck 通過');
  // 摘要
  const selIds = new Set(def.map(c => c.id));
  eq(NEW.ssSplitSummary(dS.splits, selIds), '已拆分 3 天：酷澎 −300、酷澎玩樂 +300，合計不變。', '3. 摘要（預設勾選＝10/25、10/28、11/01）：' + NEW.ssSplitSummary(dS.splits, selIds));
  eq(NEW.ssSplitSummary(dS.splits, new Set()), '', '3. 沒勾拆分組 ⇒ 沒有摘要');
  const all = new Set(dS.cells.filter(c => c.split).map(c => c.id));
  ok(/合計變動 30。$/.test(NEW.ssSplitSummary(dS.splits, all)), '3. 連差額的一起勾 ⇒ 摘要寫合計變動：' + NEW.ssSplitSummary(dS.splits, all));
}

/* ── 4. 玩樂有值、雲端沒有酷澎玩樂 ⇒ 擋下 ── */
{
  const d = NEW.buildDiff(vS.rows, mkPlatforms(false), OPTS);
  ok(d.error && /酷澎玩樂/.test(d.error), '4. 雲端沒有酷澎玩樂 ⇒ 擋下：' + d.error);
  const v0 = NEW.validateResponse(resp([mkRow('2026-10-28', 5, { extra: { '酷澎玩樂|營收': 0 } })]), RNG);
  ok(NEW.buildDiff(v0.rows, mkPlatforms(false), OPTS).error, '4. 填 0 也算有值 ⇒ 雲端沒有要擋');
}
// 驗算名稱與組成
eq(plain(NEW.SS_DAY_CHECKS[2]), ['酷澎', ['酷澎', '酷澎玩樂'], '_coupangTotal'], '驗算：酷澎＝酷澎＋酷澎玩樂');
eq(NEW.SS_DAY_CHECKS[3][0], '11 家合計', '驗算：11 家合計');

/* ── 5. sheet-sync.gs（repo 副本，第 5 版） ── */
const gsCtx = { console };
vm.createContext(gsCtx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'sheet-sync.gs'), 'utf8') + '\n;this.__t={classify_,pick_,headerRows_,DATA_KEYS,OPTIONAL_KEYS};', gsCtx);
const G = gsCtx.__t;
ok(G.DATA_KEYS.includes('酷澎玩樂|營收') && !G.DATA_KEYS.some(k => /露營館/.test(k)), 'gs：DATA_KEYS 有酷澎玩樂、沒有露營館');
eq(plain(G.OPTIONAL_KEYS), ['酷澎玩樂|營收'], 'gs：選填欄＝酷澎玩樂');
// 2026-11 現在的表頭（合併後的值，A～X）
const R1 = ['2026', '玩樂盒子', '玩樂盒子', '玩樂盒子', '生活好麻吉', '生活好麻吉', '生活好麻吉', '維克生活', '維克生活', '維克生活', '森之旅', '森之旅', '森之旅', 'MOMO', 'MOMO', '酷澎', 'PChome', '博客來', 'Friday', '', '蝦皮總營收', 'MOMO', '酷澎', '當日總營收'];
const R2 = ['日期', '營收', '廣告費', 'ROAS', '營收', '廣告費', 'ROAS', '營收', '廣告費', 'ROAS', '營收', '廣告費', 'ROAS', 'MOMO', 'MO+', '營收', '營收', '營收', '營收', '', '', '', '', ''];
const ins = (a, v) => a.slice(0, 16).concat([v], a.slice(16));
const row = (r1, first) => r1.map((_, i) => (i === 0 ? first : i * 10));
// ① 舊分頁沒拆
const l1 = G.classify_(R1, R2);
eq(plain(l1.problems), [], 'gs ① 舊分頁（沒拆）沒有問題');
const p1 = plain(G.pick_(row(R1, '10/25'), l1));
eq([p1['酷澎|營收'], p1['酷澎玩樂|營收'], Object.keys(p1).length], [150, '', 15 + 4], 'gs ① 酷澎讀 P、玩樂空白、15 個資料欄＋4 個合計');
ok(!('酷澎露營館|營收' in p1), 'gs ① 不再回露營館 key');
ok(NEW.validateResponse(resp([Object.assign({ date: '2026-10-25' }, p1)]), RNG).ok, 'gs ① 回應 → 前端新版接受');
// ② 平的兩欄：酷澎／營收＋酷澎玩樂／營收
const l2 = G.classify_(ins(R1, '酷澎玩樂'), ins(R2, '營收'));
eq(plain(l2.problems), [], 'gs ② 平的兩欄沒有問題');
eq([l2.data['酷澎|營收'], l2.data['酷澎玩樂|營收'], l2.data['PChome|營收'], l2.separator], ['P', 'Q', 'R', 'U'], 'gs ② 酷澎 P、酷澎玩樂 Q、PChome R、分隔 U');
const p2 = plain(G.pick_(row(ins(R1, '酷澎玩樂'), '10/25'), l2));
eq([p2['酷澎|營收'], p2['酷澎玩樂|營收']], [150, 160], 'gs ② 讀得到兩欄');
// ③ 雙層：酷澎（合併兩欄）／好麻吉、玩樂（用 headerRows_ 帶合併值）
const RAW1 = ins(R1, ''), RAW2 = ins(R2, '玩樂'); RAW2[15] = '好麻吉';
const h3 = G.headerRows_(RAW1, RAW2, [{ row: 1, col: 16, numCols: 2 }]);
const l3 = G.classify_(h3.r1, h3.r2);
eq(plain(l3.problems), [], 'gs ③ 雙層 好麻吉／玩樂 沒有問題');
eq([l3.data['酷澎|營收'], l3.data['酷澎玩樂|營收']], ['P', 'Q'], 'gs ③ 好麻吉 → 酷澎|營收、玩樂 → 酷澎玩樂|營收');
eq(plain(G.pick_(row(RAW1, '12/1'), l3)), plain(G.pick_(row(RAW1, '12/1'), l2)), 'gs ③ 讀出來的值跟 ② 相同');
// ④ 寫成「露營館」⇒ 擋下
const RAW2x = RAW2.slice(); RAW2x[16] = '露營館';
const h4 = G.headerRows_(RAW1, RAW2x, [{ row: 1, col: 16, numCols: 2 }]);
ok(G.classify_(h4.r1, h4.r2).problems.some(p => /無法辨識的資料欄 Q（第 1 列「酷澎」／第 2 列「露營館」）/.test(p)), 'gs ④ 酷澎／露營館 ⇒ 無法辨識');
ok(G.classify_(ins(R1, '酷澎露營館'), ins(R2, '營收')).problems.some(p => /無法辨識的資料欄 Q/.test(p)), 'gs ④ 酷澎露營館／營收 ⇒ 無法辨識');
// ⑤ 只有玩樂、沒有好麻吉 ⇒ 缺少酷澎＋補一句原因
const R2o = R2.slice(); R2o[15] = '玩樂';
const l5 = G.classify_(R1, R2o);
ok(l5.problems.some(p => /缺少 1 個資料欄：酷澎 營收/.test(p)) && l5.problems.some(p => /P 欄是「酷澎／玩樂」，但找不到「酷澎／好麻吉」/.test(p)), 'gs ⑤ 只有玩樂 ⇒ 缺少＋原因：' + l5.problems.join('；'));
// ⑥ 兩種寫法指到同一個 key ⇒ 重複
const ins2 = (arr, v) => arr.slice(0, 17).concat([v], arr.slice(17));
const h6 = { r1: ins2(h3.r1, '酷澎玩樂'), r2: ins2(h3.r2, '營收') };   // P 酷澎／好麻吉、Q 酷澎／玩樂、R 酷澎玩樂／營收
ok(G.classify_(h6.r1, h6.r2).problems.some(p => /資料欄重複：酷澎玩樂 營收（Q、R）/.test(p)), 'gs ⑥ 酷澎／玩樂＋酷澎玩樂／營收 ⇒ 重複');

console.log('✅ sheetsync-wanle：' + pass + ' 項通過' + (OLD ? '' : '（未做改版前比對）'));
