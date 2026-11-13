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
const P = new Function(cut('// KPI_DIFF_PURE_BEGIN', '// KPI_DIFF_PURE_END') + '\nreturn{_kpiDiffCalc,_kpiDiffText,_kpiDiffMoney,_kpiDiffPct,_kpiDiffTop,_kpiDiffHints};')();
// KPI_HINT 從 profit.js 讀（門檻改了測試跟著用新值）
const H = new Function(cut('const KPI_HINT={', '\n};') + '\n};\nreturn KPI_HINT;')();
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

// ════ 1b. 原因提示（塊 B）觸發條件 ════
{
  const top1 = (k, q0, q1) => [{ k, l: { tax: '稅金', ship: '寄倉運費', fee: '平台費', cost: '商品成本' }[k] || k, q0, q1, imp: -(q1 - q0) * 100000 }];
  const C = o => Object.assign({ g: 'coupang', shop: '商城-好麻吉', top: top1('cost', 0.5, 0.55), avg: false, bl: '上月（2026/02）',
    cur: { qty: 1000, gross: 100000, ret: 0, feeEst: [] }, base: { qty: 1000, gross: 100000, ret: 0 } }, o);
  const h = o => P._kpiDiffHints(C(o), H);
  ok(h({}).length === 0, '沒有條件成立 ⇒ 沒有提示', JSON.stringify(h({})));
  // ① 上月是 0
  const z = h({ top: top1('tax', 0, 0.05) });
  ok(z.length === 1 && z[0] === '上月（2026/02）稅金是 0（或沒填），比率變化可能是上月漏填', '① 上月是 0', z[0]);
  const z2 = h({ top: top1('tax', 0, 0.05).concat([{ k: 'material', l: '耗材', q0: 0, q1: 0.013, imp: -1300 }]) });
  ok(z2.length === 1 && z2[0] === '上月（2026/02）稅金、耗材是 0（或沒填），比率變化可能是上月漏填', '① 兩項都是 0 ⇒ 併成一句', JSON.stringify(z2));
  ok(h({ top: top1('tax', 0.01, 0.05) }).length === 0, '① 上月不是 0 ⇒ 不提示');
  ok(h({ top: top1('tax', 0.05, 0) }).length === 0, '① 本月是 0 ⇒ 不提示（反方向不算漏填）');
  ok(/參考月.*稅金都是 0.*那幾個月漏填/.test(h({ avg: true, bl: '參考月（2026/02、2026/01）', top: top1('tax', 0, 0.05) })[0] || ''), '① 平均基期的說法');
  // ② 訂單數少：本月和上月都 < fewOrders 才提示
  ok(/訂單數少（本月 33 筆、上月 1 筆）/.test(h({ cur: { qty: 33, gross: 1, ret: 0, feeEst: [] }, base: { qty: 1, gross: 1, ret: 0 } }).join()), '② 兩個月都 < ' + H.fewOrders + '（FriDay 主站 2026-09 那種）');
  ok(/訂單數少/.test(h({ cur: { qty: 49, gross: 1, ret: 0, feeEst: [] }, base: { qty: 49, gross: 1, ret: 0 } }).join()), '② 兩個月都是 ' + (H.fewOrders - 1) + ' 筆 ⇒ 提示');
  ok(!/訂單數少/.test(h({ cur: { qty: 117, gross: 1, ret: 0, feeEst: [] }, base: { qty: 45, gross: 1, ret: 0 } }).join()), '② 只有上月 < ' + H.fewOrders + '（博客來寄倉 2026-10 那種）⇒ 不提示');
  ok(!/訂單數少/.test(h({ cur: { qty: 49, gross: 1, ret: 0, feeEst: [] } }).join()), '② 只有本月 < ' + H.fewOrders + ' ⇒ 不提示');
  ok(!/訂單數少/.test(h({ cur: { qty: 50, gross: 1, ret: 0, feeEst: [] }, base: { qty: 49, gross: 1, ret: 0 } }).join()), '② 本月剛好 ' + H.fewOrders + ' 筆 ⇒ 不提示');
  ok(!/訂單數少/.test(h({ cur: { qty: 0, gross: 1, ret: 0, feeEst: [] }, base: { qty: 1, gross: 1, ret: 0 } }).join()), '② 本月沒填訂單數（0）⇒ 不提示');
  // ③ 蝦皮撥款時間差
  const sp = o => h(Object.assign({ g: 'shopee', shop: '玩樂' }, o)).join('|');
  ok(/訂單數比上月 \+54%（2,768 → 4,274 筆），可能是撥款時間差/.test(sp({ cur: { qty: 4274, gross: 1, ret: 0, feeEst: [] }, base: { qty: 2768, gross: 1, ret: 0 } })), '③ +54% 而且 +1,506 筆');
  ok(/訂單數比上月 −30%/.test(sp({ cur: { qty: 700, gross: 1, ret: 0, feeEst: [] }, base: { qty: 1000, gross: 1, ret: 0 } })), '③ 剛好 −30%、−300 筆');
  ok(!/撥款時間差/.test(sp({ cur: { qty: 1299, gross: 1, ret: 0, feeEst: [] }, base: { qty: 1000, gross: 1, ret: 0 } })), '③ +29.9% ⇒ 不提示');
  ok(!/撥款時間差/.test(sp({ cur: { qty: 260, gross: 1, ret: 0, feeEst: [] }, base: { qty: 100, gross: 1, ret: 0 } })), '③ +160% 但只差 160 筆（< ' + H.qtyMin + '）⇒ 不提示');
  ok(!/撥款時間差/.test(h({ cur: { qty: 4274, gross: 1, ret: 0, feeEst: [] }, base: { qty: 2768, gross: 1, ret: 0 } }).join()), '③ 不是蝦皮 ⇒ 不提示');
  // ④ 蝦皮手續費估算
  ok(/手續費是估算值（還沒從對帳單帶入）/.test(sp({ cur: { qty: 1000, gross: 1, ret: 0, feeEst: ['玩樂'] } })), '④ 單店');
  ok(/手續費有 2 店是估算值（玩樂、維克，還沒從對帳單帶入）/.test(h({ g: 'shopee', shop: '__sub__', cur: { qty: 1000, gross: 1, ret: 0, feeEst: ['玩樂', '維克'] } }).join()), '④ 小計');
  // ⑤ MOMO 退貨率
  const mo = o => h(Object.assign({ g: 'momo', shop: 'MOMO-甲配' }, o)).join('|');
  ok(/退貨金額 上月 \$2,000 → 本月 \$5,000（退貨率 2\.0% → 5\.0%）/.test(mo({ cur: { qty: 1000, gross: 100000, ret: 5000, feeEst: [] }, base: { qty: 1000, gross: 100000, ret: 2000 } })), '⑤ 退貨率 +3pp');
  ok(!/退貨金額/.test(mo({ cur: { qty: 1000, gross: 100000, ret: 4900, feeEst: [] }, base: { qty: 1000, gross: 100000, ret: 2000 } })), '⑤ +2.9pp ⇒ 不提示');
  // ⑥ 寄倉運費第一名
  ok(/寄倉運費是整批寄倉時才有/.test(h({ g: 'books', shop: '博客來-寄倉', top: top1('ship', 0.05, 0.17) }).join()), '⑥ 博客來寄倉');
  ok(/寄倉運費是整批寄倉時才有/.test(h({ g: 'momo', shop: 'MOMO-寄倉', top: top1('ship', 0.05, 0.09) }).join()), '⑥ 乙配');
  ok(/寄倉運費是整批寄倉時才有/.test(h({ g: 'books', shop: '__sub__', top: top1('ship', 0.05, 0.17) }).join()), '⑥ 博客來小計');
  ok(!/寄倉運費/.test(h({ g: 'pchome', shop: 'PChome-寄倉', top: top1('ship', 0.05, 0.17) }).join()), '⑥ PChome 寄倉不在名單 ⇒ 不提示');
  ok(!/寄倉運費/.test(h({ g: 'books', shop: '博客來-寄倉', top: top1('cost', 0.3, 0.4).concat(top1('ship', 0.05, 0.06)) }).join()), '⑥ 寄倉運費不是第一名 ⇒ 不提示');
  // ⑦ PChome 平台費第一名
  ok(/平台費含退貨物流費、罰金，請看對帳單 \(D\)/.test(h({ g: 'pchome', shop: 'PChome', top: top1('fee', 0.35, 0.54) }).join()), '⑦ PChome 平台費第一名');
  ok(!/對帳單 \(D\)/.test(h({ g: 'friday', shop: 'FriDay-主站', top: top1('fee', 0.35, 0.54) }).join()), '⑦ 不是 PChome ⇒ 不提示');
  // 最多 H.max 句，照優先順序
  const all = h({ g: 'shopee', shop: '玩樂', top: top1('tax', 0, 0.05), cur: { qty: 40, gross: 1, ret: 0, feeEst: ['玩樂'] }, base: { qty: 30, gross: 1, ret: 0 } });
  ok(all.length === H.max && /是 0/.test(all[0]) && /訂單數少/.test(all[1]), '最多 ' + H.max + ' 句、照優先順序（上月是 0 → 訂單數少）', JSON.stringify(all));
  // _kpiDiffTop 跟主要差異文字用同一批
  const rr = { items: [{ k: 'a', l: 'a', q0: 0, q1: 0, imp: -5000 }, { k: 'b', l: 'b', q0: 0, q1: 0, imp: 999 }, { k: 'c', l: 'c', q0: 0, q1: 0, imp: 2000 }], revEff: 0, rev0: 1, rev1: 1 };
  ok(P._kpiDiffTop(rr, 1000, 3).map(x => x.k).join() === 'a,c', '_kpiDiffTop：|影響| ≥ 1,000、由大到小');
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
      if (a.hint) ok(!!a.diff, row.month + ' ' + a.key + '：有提示一定有主要差異');
      if (a.hint) ok(/^提示：/.test(a.hint) && a.hint.split('；').length <= 2, row.month + ' ' + a.key + '：提示最多 2 句', a.hint);
      if (!a.diff) return;
      ok(['R8', 'R2', 'R5'].includes(a.rule) && /純利率/.test(a.label), row.month + ' ' + a.key + '：diff 只掛在純利率警示', a.rule + ' ' + a.label);
    });
  });
  const all = rows.flatMap(row => X._kpiAnomalies(row.month, rows));
  const withDiff = all.filter(x => x.diff).length, withHint = all.filter(x => x.hint).length;
  console.log('真實資料：' + rows.length + ' 個月、' + n + ' 組跟上月比的拆解，最大誤差 ' + maxErr.toExponential(2) + '；有主要差異的警示 ' + withDiff + ' 條、其中有提示 ' + withHint + ' 條');
}
console.log('\n通過 ' + pass + '、失敗 ' + fail + (skip ? '、略過 ' + skip : ''));
process.exit(fail ? 1 : 0);
