#!/usr/bin/env node
// KPI 異常警示「主要差異」（塊 A，2026-11-13）測試。只讀：不寫任何檔案、不連網路、不碰 Firestore。
//
//   node scripts/kpi-pure-diff.test.cjs                        只跑純函式（_kpiDiffCalc／_kpiDiffText）
//   KPI_BACKUP=<app/kpi 備份 json> node scripts/kpi-pure-diff.test.cjs   另外用真實資料驗：
//     ① 每個月、每個通路的每家店與小計，跟上月比：營收變動的影響 ＋ Σ各項影響 ＝ 純利差額（誤差 < 0.01）
//     ② 項目表 KPI_DIFF_ITEMS 跟純利公式對得上：「其他」一律不出現
//     ③ 拆解用的純利率 ＝ 警示用的純利率（_kpiAnomShopRate／_kpiGroupTotals.pureRateAgg）
//     ④ 有 diff 的警示只會是純利率類（R8、R2 純利率、R5 純利率）
//   備份檔是 Firestore 匯出的 app/kpi（ec-backup，不進 repo）。
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0, skip = 0;
const ok = (c, n, x) => { if (c) pass++; else { fail++; console.error('✗ ' + n + (x ? '\n    ' + x : '')); } };
const near = (a, b, n, eps) => ok(Math.abs(a - b) < (eps || 0.01), n, '得到 ' + a + '，預期 ' + b);

const src = fs.readFileSync(path.join(ROOT, 'js/profit.js'), 'utf8').replace(/\r\n/g, '\n');
const cut = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('profit.js 找不到 ' + a + ' … ' + b); return src.slice(i, j); };

// ════ 1. 純函式 ════
const P = new Function(cut('// KPI_DIFF_PURE_BEGIN', '// KPI_DIFF_PURE_END') + '\nreturn{_kpiDiffCalc,_kpiDiffText,_kpiDiffMoney,_kpiDiffPct};')();
{
  const mk = (rev, it) => { const items = {}; let used = 0; Object.keys(it).forEach(k => { items[k] = { l: k, v: it[k] }; used += it[k]; }); return { rev, pure: rev - used, items }; };
  const base = mk(100000, { 成本: 50000, 廣告: 10000, 稅金: 4762 });
  const cur = mk(80000, { 成本: 46000, 廣告: 6000, 稅金: 3810 });
  const r = P._kpiDiffCalc(cur, [base]);
  near(r.total, cur.pure - base.pure, '上月基期：營收影響＋各項影響＝純利差額');
  near(r.revEff, (base.pure / base.rev) * (cur.rev - base.rev), '營收變動的影響＝上月純利率 × 營收差');
  const it = k => r.items.find(x => x.k === k);
  near(it('成本').imp, -(46000 / 80000 - 0.5) * 80000, '成本影響＝−(本月比率−上月比率)×本月營收');
  // 平均基期
  const b2 = mk(120000, { 成本: 66000, 廣告: 9000, 稅金: 5714 });
  const ra = P._kpiDiffCalc(cur, [base, b2]);
  near(ra.rate0, (base.pure / base.rev + b2.pure / b2.rev) / 2, '平均基期：純利率取平均');
  near(ra.total, ra.revEff + ra.items.reduce((a, x) => a + x.imp, 0), '平均基期：total＝各項加總');
  near(ra.rate1 - ra.rate0, -ra.items.reduce((a, x) => a + (x.q1 - x.q0), 0), '平均基期：純利率差＝−Σ比率差（剛好加總）', 1e-12);
  // 某一項只有基期有（本月沒有這個 key）也要算進去
  const c3 = { rev: 80000, pure: 80000 - 46000, items: { 成本: { l: '成本', v: 46000 } } };
  const r3 = P._kpiDiffCalc(c3, [base]);
  near(r3.total, c3.pure - base.pure, '本月少一項：照樣加總');
  // 文字
  const t = P._kpiDiffText(r, '跟 2026/07 比', false, 1000, 3);
  ok(t.startsWith('主要差異（跟 2026/07 比）：'), '文字開頭', t);
  ok(/成本率 50\.0% → 57\.5%（純利約 −6,000）/.test(t), '第一項寫比率前後＋「純利約」', t);
  ok(/廣告率 10\.0% → 7\.5%（約 \+2,000）/.test(t), '第二項寫「約」', t);
  ok(!/稅金率/.test(t), '影響小於 $1,000 的不列（稅金率幾乎沒變）', t);
  ok(/營收 −2\.0 萬（照上月純利率算，純利約 −7,048）/.test(t), '營收那句', t);
  const tAvg = P._kpiDiffText(ra, '跟 2026/07、2026/06 平均比', true, 1000, 3);
  ok(/營收比平均 /.test(tAvg) && /照平均純利率算/.test(tAvg), '平均基期的營收那句', tAvg);
  const flat = P._kpiDiffCalc(base, [base]);
  ok(P._kpiDiffText(flat, '跟 2026/07 比', false, 1000, 3) === '主要差異（跟 2026/07 比）：各項比率變化都不大（單項影響都小於 $1,000）。', '沒有大項時的文字');
  ok(P._kpiDiffMoney(-196000) === '−19.6 萬' && P._kpiDiffMoney(8000) === '+8,000' && P._kpiDiffMoney(-999.6) === '−1,000', '金額格式');
  ok(P._kpiDiffPct(-0.0123) === '−1.2%', '負比率格式');
  // 取前 3 名
  const many = mk(100000, { a: 1, b: 1, c: 1, d: 1 });
  const many2 = mk(100000, { a: 5001, b: 4001, c: 3001, d: 2001 });
  const tm = P._kpiDiffText(P._kpiDiffCalc(many2, [many]), 'x', false, 1000, 3);
  ok(/a率/.test(tm) && /b率/.test(tm) && /c率/.test(tm) && !/d率/.test(tm), '只取影響最大的 3 項', tm);
}

// ════ 2. 真實資料 ════
const bk = process.env.KPI_BACKUP;
if (!bk || !fs.existsSync(bk)) { console.log('（沒有 KPI_BACKUP，略過真實資料）'); skip++; }
else {
  const code = [cut('// ── KPI 月結表（行銷）──', '// Console 只讀觀測點：__kpiAnomalyReport'),
    cut('function _kpiFieldMergeStatus(', '// ── 檢視狀態：月結表／年度總表'),
    'function fmtN(v){return Math.abs(Math.round(v)).toLocaleString();}',
    'function getPlatformRate(){return 0.205;}',   // 只影響蝦皮手續費沒存值的估算；兩邊用同一支，不影響「剛好加總」
    'const FRIDAY_CVS_FEE=60,FRIDAY_SYS_FEE=500,FRIDAY_ORDER_FEE=1;'].join('\n');
  const stub = () => new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : k === 'then' ? undefined : stub(), apply: () => stub(), construct: () => stub(), set: () => true });
  const ctx = { window: { addEventListener() {}, App: stub() }, document: stub(), Store: { _profitMem: {} }, localStorage: { getItem: () => null, setItem() {} }, console, setTimeout: () => 0, clearTimeout() {} };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(code + '\n;globalThis.__X={KPI_GROUPS,_kpiV2,_kpiCompose,_kpiDiffParts,_kpiDiffCalc,_kpiPureDiff,_kpiAnomalies,_kpiAnomShopRate,_kpiGroupTotals,_kpiPrevMonthKey,_kpiAnomSkipGroup};', ctx);
  const X = ctx.__X;
  X._kpiV2.cloud = JSON.parse(fs.readFileSync(bk, 'utf8')); X._kpiV2.legacy = null;
  const rows = X._kpiCompose(false);
  let n = 0, maxErr = 0;
  rows.forEach(row => {
    const prow = rows.find(r => r.month === X._kpiPrevMonthKey(row.month));
    X.KPI_GROUPS.forEach(g => {
      g.shops.concat(['__sub__']).forEach(s => {
        const cur = X._kpiDiffParts(row, g, s); if (!cur) return;
        const tag = row.month + ' ' + g.key + ' ' + s;
        ok(!cur.items._other, tag + '：項目表對得上純利公式（沒有「其他」）', cur.items._other && String(cur.items._other.v));
        const rate = s === '__sub__' ? X._kpiGroupTotals(row, g).pureRateAgg : X._kpiAnomShopRate(row, g, s);
        near(cur.pure / cur.rev, rate, tag + '：拆解的純利率＝警示的純利率', 1e-9);
        const base = prow && X._kpiDiffParts(prow, g, s); if (!base) return;
        const r = X._kpiDiffCalc(cur, [base]);
        const err = Math.abs(r.total - (cur.pure - base.pure)); maxErr = Math.max(maxErr, err);
        ok(err < 0.01, tag + '：各項加總＝純利差額', '差 ' + err);
        n++;
      });
    });
    X._kpiAnomalies(row.month, rows).forEach(a => {
      if (!a.diff) return;
      ok(['R8', 'R2', 'R5'].includes(a.rule) && /純利率/.test(a.label), row.month + ' ' + a.key + '：diff 只掛在純利率警示', a.rule + ' ' + a.label);
    });
  });
  const withDiff = rows.reduce((a, row) => a + X._kpiAnomalies(row.month, rows).filter(x => x.diff).length, 0);
  console.log('真實資料：' + rows.length + ' 個月、' + n + ' 組跟上月比的拆解，最大誤差 ' + maxErr.toExponential(2) + '；有主要差異的警示 ' + withDiff + ' 條');
}
console.log('\n通過 ' + pass + '、失敗 ' + fail + (skip ? '、略過 ' + skip : ''));
process.exit(fail ? 1 : 0);
