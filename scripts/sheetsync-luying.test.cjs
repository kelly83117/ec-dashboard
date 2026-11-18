// node scripts/sheetsync-luying.test.cjs
// 首頁「從試算表同步」加入選填欄「酷澎露營館|營收」（2026-12 起）的回歸測試。
//   1. 舊格式（14 個資料欄）回應：改版前（BASE_COMMIT 的 sheetsync.js）與改版後，validateResponse / buildDiff / checkDayTotals 結果相同
//      （唯一允許的差異：驗算項目名稱「10 家合計」→「11 家合計」，只在驗算不符時出現）。
//   2. 新格式（15 個資料欄、露營館整段空白）＝ 舊格式結果。
//   3. 新格式露營館有值：雲端 ec.platforms 沒有露營館 ⇒ 擋下；有 ⇒ 照常比對。
//   4. 酷澎驗算＝酷澎＋酷澎露營館。
//   5. sheet-sync.gs（repo 副本）：舊表頭照常通過、露營館欄回 ''；插入露營館欄後讀得到；打錯表頭照樣擋。
// 資料全是假的（不含正式站數字）。
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BASE_COMMIT = '83fba99';   // 改版前（2026-11-18-932）

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
// 把結果轉成可比較的純資料（vm 內外的物件原型不同）
const plain = v => JSON.parse(JSON.stringify(v));

/* ── 假資料 ── */
const OLD_KEYS = [
  '玩樂盒子|營收', '玩樂盒子|廣告費', '生活好麻吉|營收', '生活好麻吉|廣告費',
  '維克生活|營收', '維克生活|廣告費', '森之旅|營收', '森之旅|廣告費',
  'MOMO|營收', 'MO+|營收', '酷澎|營收', 'PChome|營收', '博客來|營收', 'Friday|營收',
];
const CH10 = ['生活好麻吉', '玩樂盒子', '森之旅', '維克生活', 'MOMO', 'MO+', '酷澎', 'PChome', '博客來', 'Friday'];
function mkRow(date, seed, opts) {
  opts = opts || {};
  const r = { date };
  OLD_KEYS.forEach((k, i) => { r[k] = (seed * 37 + i * 101) % 5000 + 100; });
  if (opts.blank) opts.blank.forEach(k => { r[k] = ''; });
  if (opts.bad) Object.assign(r, opts.bad);
  const n = k => (typeof r[k] === 'number' ? r[k] : 0);
  const lu = opts.luying;   // undefined＝沒有這個 key；''＝空白；數字＝有值
  if (lu !== undefined) r['酷澎露營館|營收'] = lu;
  const luN = typeof lu === 'number' ? lu : 0;
  r._shopeeTotal = n('玩樂盒子|營收') + n('生活好麻吉|營收') + n('維克生活|營收') + n('森之旅|營收');
  r._momoTotal = n('MOMO|營收') + n('MO+|營收');
  r._coupangTotal = n('酷澎|營收') + luN + (opts.coupangOff || 0);
  r._dayTotal = OLD_KEYS.filter(k => k.endsWith('|營收')).reduce((s, k) => s + n(k), 0) + luN + (opts.dayOff || 0);
  return r;
}
function mkPlatforms(withLuying) {
  const ps = CH10.map((name, i) => ({
    name, icon: 'x', color: '#000',
    daily: { '2026-11-02': 1000 + i, '2026-11-03': (1000 + i) % 7 === 0 ? 0 : 200 + i },
    dailyAdSpend: i < 4 ? { '2026-11-02': 50 + i } : {},
    dailyBy: { '2026-11-02': { name: '別人', username: 'other', at: 1 } },
  }));
  if (withLuying) ps.push({ name: '酷澎露營館', icon: '⛺', color: '#1d4ed8', daily: { '2026-11-03': 77 }, dailyAdSpend: {}, dailyBy: {} });
  return ps;
}
const RNG = { from: '2026-11-01', to: '2026-11-04' };
const OPTS = { operatorName: 'Kelly', operatorUsername: 'kelly' };
// 舊格式情境：一般、含空白、含無法讀取、酷澎驗算不符、當日合計不符
const OLD_ROWS = [
  mkRow('2026-11-01', 1),
  mkRow('2026-11-02', 2, { blank: ['PChome|營收', '森之旅|廣告費'] }),
  mkRow('2026-11-03', 3, { bad: { '博客來|營收': '1,234' }, coupangOff: 5 }),
  mkRow('2026-11-04', 4, { dayOff: 9 }),
];
const resp = rows => ({ ok: true, rows, sheets: ['2026十一月'], totals: {}, layouts: {}, error: null });

/* ── 1. 舊格式：改版前後相同 ── */
const vNew = NEW.validateResponse(resp(OLD_ROWS), RNG);
ok(vNew.ok, '新版接受舊格式（14 個資料欄）');
ok(vNew.rows.every(r => r['酷澎露營館|營收'] === ''), '舊格式補成空白');
ok(!('酷澎露營館|營收' in OLD_ROWS[0]), '不改傳入的 row');
// 10 家 → 11 家：驗算名稱改為依名單長度產生
const relabel = d => { const o = plain(d); Object.values(o.dayFails || {}).forEach(fs => fs.forEach(f => { if (f.item === '10 家合計') f.item = '11 家合計'; })); return o; };
for (const withLu of [false, true]) {
  const dNew = NEW.buildDiff(vNew.rows, mkPlatforms(withLu), OPTS);
  ok(!dNew.error, '舊格式 buildDiff 沒有錯誤（雲端' + (withLu ? '有' : '沒有') + '露營館）');
  if (OLD) {
    const vOld = OLD.validateResponse(resp(OLD_ROWS), RNG);
    ok(vOld.ok, '舊版接受舊格式');
    eq(plain(vNew.rows.map(r => { const o = Object.assign({}, r); delete o['酷澎露營館|營收']; return o; })), plain(vOld.rows), '舊格式 rows 內容相同');
    const dOld = OLD.buildDiff(vOld.rows, mkPlatforms(false), OPTS);
    if (!withLu) {
      eq(plain(dNew), relabel(dOld), '舊格式＋雲端沒有露營館：buildDiff 結果與改版前相同（只差「10→11 家合計」）');
    } else {
      // 雲端有露營館、試算表露營館空白：其他通路的格子完全相同；露營館只多「空白」計數
      const strip = d => plain(d.cells.filter(c => c.ch !== '酷澎露營館'));
      eq(strip(dNew), plain(dOld.cells), '雲端有露營館：其他通路的格子與改版前相同');
      ok(dNew.cells.every(c => c.ch !== '酷澎露營館'), '露營館空白不產生格子');
      eq(dNew.counts.blank, dOld.counts.blank + OLD_ROWS.length, '露營館每天多 1 格空白');
      eq(dNew.counts.blankKeep, dOld.counts.blankKeep + 1, '露營館雲端有值、試算表空白 ⇒ 不動（blankKeep +1）');
    }
    OLD_ROWS.forEach(r => eq(plain(NEW.checkDayTotals(r)).fails.map(f => f.reason), plain(OLD.checkDayTotals(r)).fails.map(f => f.reason), '逐日驗算原因相同 ' + r.date));
  }
}

/* ── 2. 新格式（露營館空白）＝舊格式 ── */
const NEWFMT_BLANK = OLD_ROWS.map((r, i) => mkRow(r.date, i + 1, Object.assign({}, [{}, { blank: ['PChome|營收', '森之旅|廣告費'] }, { bad: { '博客來|營收': '1,234' }, coupangOff: 5 }, { dayOff: 9 }][i], { luying: '' })));
const vB = NEW.validateResponse(resp(NEWFMT_BLANK), RNG);
ok(vB.ok, '新格式（15 個資料欄）通過');
eq(plain(vB.rows), plain(vNew.rows), '新格式空白 rows ＝ 舊格式補齊後');
eq(plain(NEW.buildDiff(vB.rows, mkPlatforms(false), OPTS)), plain(NEW.buildDiff(vNew.rows, mkPlatforms(false), OPTS)), '新格式空白 buildDiff ＝ 舊格式');
if (OLD) {
  const vOldNewFmt = OLD.validateResponse(resp(NEWFMT_BLANK), RNG);
  ok(!vOldNewFmt.ok && /多：酷澎露營館\|營收/.test(vOldNewFmt.error), '（對照）改版前會擋新格式：' + vOldNewFmt.error);
}

/* ── 3. 新格式有值 ── */
const NEWFMT_VAL = [mkRow('2026-11-01', 1, { luying: 321 }), mkRow('2026-11-02', 2, { luying: '' }), mkRow('2026-11-03', 3, { luying: 0 })];
const vV = NEW.validateResponse(resp(NEWFMT_VAL), RNG);
ok(vV.ok, '新格式有值通過驗證');
const dNoLu = NEW.buildDiff(vV.rows, mkPlatforms(false), OPTS);
ok(dNoLu.error && /酷澎露營館/.test(dNoLu.error), '露營館有值、雲端沒有露營館 ⇒ 擋下：' + dNoLu.error);
const dZeroOnly = NEW.buildDiff(NEW.validateResponse(resp([mkRow('2026-11-03', 3, { luying: 0 })]), RNG).rows, mkPlatforms(false), OPTS);
ok(dZeroOnly.error && /酷澎露營館/.test(dZeroOnly.error), '填 0 也算有值 ⇒ 雲端沒有露營館要擋');
const dLu = NEW.buildDiff(vV.rows, mkPlatforms(true), OPTS);
ok(!dLu.error, '雲端有露營館 ⇒ 照常比對');
const luCells = dLu.cells.filter(c => c.ch === '酷澎露營館');
eq(plain(luCells.map(c => [c.date, c.field, c.value, c.cat, c.checked])), [['2026-11-01', 'daily', 321, 'add', true], ['2026-11-03', 'daily', 0, 'diff', false]], '露營館格子：11/01 新增（預設勾）、11/03 不同（雲端 77，預設不勾）');
ok(!dLu.cells.some(c => c.ch === '酷澎露營館' && c.field === 'dailyAdSpend'), '露營館沒有廣告費格子');
// 寫入流程：apply / precheck 對露營館一樣成立
const sel = dLu.cells.filter(c => c.checked);
const fresh = mkPlatforms(true);
const by = { name: 'Kelly', at: 5, src: 'sheet', username: 'kelly' };
const merged = NEW.apply(fresh, sel, by);
eq(merged[10].daily['2026-11-01'], 321, 'apply 寫進露營館（陣列最後一筆）');
eq(plain(NEW.precheck(fresh, merged, sel, { yesterday: '2026-11-17', by, docData: {}, key: 'ec.platforms' })), [], 'precheck 通過');

/* ── 4. 酷澎驗算含露營館 ── */
const rOk = mkRow('2026-12-01', 5, { luying: 400 });
eq(plain(NEW.checkDayTotals(rOk)), { ok: true, fails: [] }, '酷澎合計＝酷澎＋露營館 ⇒ 相符');
const rStale = Object.assign({}, rOk, { _coupangTotal: rOk['酷澎|營收'] });   // Kelly 忘了改酷澎合計公式
const fStale = plain(NEW.checkDayTotals(rStale)).fails.map(f => f.item);
ok(fStale.includes('酷澎'), '酷澎合計沒含露營館 ⇒ 酷澎驗算不符');
const rDay = Object.assign({}, rOk, { _dayTotal: rOk._dayTotal - 400 });   // 當日總營收沒含露營館
ok(plain(NEW.checkDayTotals(rDay)).fails.map(f => f.item).includes('11 家合計'), '當日總營收沒含露營館 ⇒ 11 家合計不符');
ok(NEW.SS_DAY_CHECKS[3][0] === '11 家合計', '合計名稱依名單長度產生：' + NEW.SS_DAY_CHECKS[3][0]);

/* ── 5. sheet-sync.gs（repo 副本） ── */
const gsCtx = { console };
vm.createContext(gsCtx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'sheet-sync.gs'), 'utf8') + '\n;this.__t={classify_,pick_,DATA_KEYS,OPTIONAL_KEYS};', gsCtx);
const G = gsCtx.__t;
// 2026-11-18 用 ?headers=1&month=2026-11 實測到的表頭（A～X）
const R1 = ['2026', '玩樂盒子', '玩樂盒子', '玩樂盒子', '生活好麻吉', '生活好麻吉', '生活好麻吉', '維克生活', '維克生活', '維克生活', '森之旅', '森之旅', '森之旅', 'MOMO', 'MOMO', '酷澎', 'PChome', '博客來', 'Friday', '', '蝦皮總營收', 'MOMO', '酷澎', '當日總營收'];
const R2 = ['日期', '營收', '廣告費', 'ROAS', '營收', '廣告費', 'ROAS', '營收', '廣告費', 'ROAS', '營收', '廣告費', 'ROAS', 'MOMO', 'MO+', '營收', '營收', '營收', '營收', '', '', '', '', ''];
const lOld = G.classify_(R1, R2);
eq(plain(lOld.problems), [], 'gs：現在的表頭（沒有露營館）沒有問題');
ok(!('酷澎露營館|營收' in lOld.cols), 'gs：沒有露營館欄');
const rowOld = R1.map((_, i) => (i === 0 ? '11/1' : i * 10));
const pOld = plain(G.pick_(rowOld, lOld));
eq(pOld['酷澎露營館|營收'], '', 'gs：沒有露營館欄 ⇒ 回 ""');
eq(pOld['酷澎|營收'], 150, 'gs：酷澎照舊讀 P 欄');
eq(Object.keys(pOld).length, 15 + 4, 'gs：回 15 個資料欄＋4 個合計');
ok(NEW.validateResponse(resp([Object.assign({ date: '2026-11-01' }, pOld)]), RNG).ok, 'gs 新版回應 → 前端新版接受');
// 插入露營館欄（P 右邊）
const ins = (a, v) => a.slice(0, 16).concat([v], a.slice(16));
const R1n = ins(R1, '酷澎露營館'), R2n = ins(R2, '營收');
const lNew = G.classify_(R1n, R2n);
eq(plain(lNew.problems), [], 'gs：插入露營館欄後沒有問題');
eq(lNew.data['酷澎露營館|營收'], 'Q', 'gs：露營館在 Q 欄');
eq(lNew.data['PChome|營收'], 'R', 'gs：PChome 往右移到 R 欄');
eq(lNew.separator, 'U', 'gs：分隔欄往右移到 U 欄');
const pNew = plain(G.pick_(R1n.map((_, i) => (i === 0 ? '12/1' : i * 10)), lNew));
eq(pNew['酷澎露營館|營收'], 160, 'gs：讀得到露營館的值');
// 打錯表頭 ⇒ 照樣擋（不會被當成選填默默略過）
const lTypo = G.classify_(ins(R1, '露營館'), R2n);
ok(lTypo.problems.some(p => /無法辨識的資料欄 Q/.test(p)), 'gs：表頭打成「露營館」⇒ 無法辨識：' + lTypo.problems.join('；'));
const lTypo2 = G.classify_(ins(R1, '酷澎-露營館'), R2n);
ok(lTypo2.problems.length > 0, 'gs：表頭打成「酷澎-露營館」⇒ 擋下');
// 空白會被 norm_ 去掉：「酷澎 露營館」視為同一個
const R1sp = ins(R1, '酷澎 露營館').map(v => v.replace(/\s+/g, ''));   // readHeader_ 會先 norm_
eq(plain(G.classify_(R1sp, R2n).problems), [], 'gs：表頭含空白（norm_ 後）照樣認得');

console.log('✅ sheetsync-luying：' + pass + ' 項通過' + (OLD ? '' : '（未做改版前比對）'));
