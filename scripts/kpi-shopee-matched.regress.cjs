#!/usr/bin/env node
// 蝦皮成本跟著撥款走 塊 3 回歸比對（只讀：不寫任何檔案、不連網路、不碰 Firestore）。
//
//   SNAP_BEFORE=<改前快照.json> node scripts/kpi-shopee-matched.regress.cjs
//   SNAP_BEFORE=… SNAP_AFTER=<改後快照.json> node scripts/kpi-shopee-matched.regress.cjs
//   BASE_REF（預設 f019f5d＝塊 3 commit A）：「改前」的 _kpiShopeeCalc 從這個 ref 拿；「改後」用工作區的 js/profit.js。
//
//   快照是 __kpiShopeeAutoSnap() 在瀏覽器拍的（只有彙總數字，放 ec-backup、不進 repo）。檢查：
//   ① 用快照裡的 sources 跑改前版 _kpiShopeeCalc，結果要等於快照裡的 calc（證明 node 擷取跟瀏覽器一致）。
//   ② 沒有 matched 的月份：改後 ＝ 改前，逐字相同；唯一差別是 qty／cost／misc 算得出值時多 legacy:true。
//   ③ 把 MATCHED_10（10 月四店，node 用真檔算的）注入 2026-10：只有 qty／cost／misc 變，rev／fee／ads 逐字相同；
//      qty＝orders、cost＝round(cost)、misc 差額＝Δ一般×2.5＋Δ無包裝×2（各自四捨五入，容許 ±1）。
//   ④ 有 SNAP_AFTER：兩份快照的 regression（月結表）完全相同；帶入計畫逐格比，只允許 qty／cost／misc 多「舊口徑」黃字、頂端來源列多「成本配對」。
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
process.env.TZ = process.env.TZ || 'Asia/Taipei';
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (c, n, x) => { if (c) pass++; else { fail++; console.error('✗ ' + n + (x ? '\n    ' + x : '')); } };
const J = v => JSON.stringify(v);
const eq = (a, b, n) => ok(J(a) === J(b), n, J(a) === J(b) ? '' : '得到 ' + String(J(a)).slice(0, 500) + '\n    預期 ' + String(J(b)).slice(0, 500));

const lf = s => s.replace(/\r\n/g, '\n');
function extract(src, label) {
  const fn = n => { const i = src.indexOf('\nfunction ' + n + '('); if (i < 0) throw new Error(label + ' 找不到 ' + n); return src.slice(i + 1, src.indexOf('\n}\n', i) + 2); };
  const line = p => { const i = src.indexOf('\n' + p); if (i < 0) throw new Error(label + ' 找不到 ' + p); return src.slice(i + 1, src.indexOf('\n', i + 1)); };
  const code = [fn('_kpiIsMap'), line('const KPI_SHOPEE_PACK_PLAIN='), line('const KPI_SHOPEE_PACK_NOPACK='), fn('_kpiShopeeSources'), line('const _kpiShopeeFin='),
    fn('_kpiShopeeN'), fn('_kpiShopeeTerm'), fn('_kpiShopeeTime'), fn('_kpiShopeeCalc')].join('\n');
  return new Function(code + '\nreturn{_kpiShopeeSources,_kpiShopeeCalc};')();
}
const baseRef = process.env.BASE_REF || 'f019f5d';
const OLD = extract(lf(cp.execFileSync('git', ['show', baseRef + ':js/profit.js'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 })), baseRef);
const NEW = extract(lf(fs.readFileSync(path.join(ROOT, 'js/profit.js'), 'utf8')), '工作區');
const SHOPS = ['好麻吉', '玩樂', '維克', '森之旅'], FIELDS = ['qty', 'rev', 'cost', 'ads', 'fee', 'misc'];
const plainCalc = c => JSON.parse(J(c));
const noLegacy = c => { const o = plainCalc(c); FIELDS.forEach(f => { if (o[f]) delete o[f].legacy; }); return o; };

// 10 月四店成本配對（node 用 10 月進帳 Excel × 莫筆克 2026-08／09／10 算的彙總，同對帳分頁存的 matched）
const MATCHED_10 = {
  '好麻吉': { orders: 15953, matched: 15872, cost: 1945464.32, ordersPlain: 8609, ordersNoPack: 7263, cancelled: { n: 81, amt: 24539 }, missing: { n: 0, amt: 0 }, refund: { orders: 376, cost: 48912.92 } },
  '玩樂': { orders: 5953, matched: 5909, cost: 730206.59, ordersPlain: 2964, ordersNoPack: 2945, cancelled: { n: 43, amt: 13732 }, missing: { n: 1, amt: 198 }, refund: { orders: 119, cost: 17046.91 } },
  '維克': { orders: 709, matched: 695, cost: 92596.79, ordersPlain: 473, ordersNoPack: 222, cancelled: { n: 14, amt: 3276 }, missing: { n: 0, amt: 0 }, refund: { orders: 16, cost: 1993.69 } },
  '森之旅': { orders: 759, matched: 750, cost: 115276.53, ordersPlain: 352, ordersNoPack: 398, cancelled: { n: 9, amt: 4104 }, missing: { n: 0, amt: 0 }, refund: { orders: 12, cost: 1494.12 } },
};

const fb = process.env.SNAP_BEFORE;
if (!fb || !fs.existsSync(fb)) { console.error('要給 SNAP_BEFORE（改前快照 json 的路徑）'); process.exit(2); }
const B = JSON.parse(fs.readFileSync(fb, 'utf8'));
ok(B.ready === true && B.mock === false, '改前快照：ready、沒有模擬');
const months = Object.keys(B.months).sort();
const cloudOf = (m, extra) => ({ sources: { [m]: { shopee: Object.assign({}, B.months[m].sources || {}, extra || {}) } } });
const report = {};
for (const m of months) {
  const mo = B.months[m];
  ok(!mo.err, m + '：快照沒有錯誤', mo.err);
  ok(!(mo.sources && mo.sources.matched), m + '：改前快照沒有 matched');
  const so = OLD._kpiShopeeSources(m, cloudOf(m)), sn = NEW._kpiShopeeSources(m, cloudOf(m));
  for (const s of SHOPS) {
    const o = OLD._kpiShopeeCalc(so, s), n = NEW._kpiShopeeCalc(sn, s);
    eq(plainCalc(o), mo.calc[s], m + ' ' + s + '：node 改前版＝瀏覽器快照');
    eq(noLegacy(n), plainCalc(o), m + ' ' + s + '：沒有 matched ⇒ 改後＝改前（去掉 legacy）');
    ['qty', 'cost', 'misc'].forEach(f => ok(!!(n[f] && n[f].legacy) === !!(n[f] && n[f].val != null), m + ' ' + s + ' ' + f + '：有值才標 legacy'));
    ['rev', 'fee', 'ads'].forEach(f => ok(!(n[f] && 'legacy' in n[f]), m + ' ' + s + ' ' + f + '：不標 legacy'));
  }
}
// ③ 注入 10 月 matched
if (B.months['2026-10']) {
  const m = '2026-10';
  const so = OLD._kpiShopeeSources(m, cloudOf(m)), sn = NEW._kpiShopeeSources(m, cloudOf(m, { matched: MATCHED_10 }));
  report[m] = {};
  for (const s of SHOPS) {
    const o = OLD._kpiShopeeCalc(so, s), n = NEW._kpiShopeeCalc(sn, s), t = MATCHED_10[s];
    ['rev', 'fee', 'ads'].forEach(f => eq(n[f], plainCalc(o)[f], m + ' ' + s + ' ' + f + '：有 matched 也不變'));
    eq([n.qty.val, n.cost.val, !!n.qty.legacy, !!n.cost.legacy, !!(n.misc && n.misc.legacy)], [t.orders, Math.round(t.cost), false, false, false], m + ' ' + s + '：qty／cost 改用 matched、不標 legacy');
    const Ms = B.months[m].sources.mobic.shops[s];
    const d = (t.ordersPlain - Ms.ordersPlain) * 2.5 + (t.ordersNoPack - Ms.ordersNoPack) * 2;
    ok(n.misc && o.misc && Math.abs((n.misc.val - o.misc.val) - d) <= 1, m + ' ' + s + '：misc 差額＝Δ一般×2.5＋Δ無包裝×2', 'Δ' + (n.misc && o.misc && n.misc.val - o.misc.val) + ' vs ' + d);
    ok(/（撥款單）/.test(n.misc.comp) && n.misc.comp.replace('（撥款單）', '').replace(/一般 [\d,]+ 筆×2\.5＋無包裝 [\d,]+ 筆×2/, 'X') === o.misc.comp.replace(/一般 [\d,]+ 筆×2\.5＋無包裝 [\d,]+ 筆×2/, 'X'), m + ' ' + s + '：misc 算式只差包裝筆數與「（撥款單）」');
    ok(/撥款訂單/.test(n.qty.comp) && /不算成本/.test(n.cost.comp), m + ' ' + s + '：qty／cost 算式寫成本配對');
    report[m][s] = { qty: [o.qty.val, n.qty.val], cost: [o.cost.val, n.cost.val], misc: [o.misc.val, n.misc.val], Δ純利: -((n.cost.val - o.cost.val) + (n.misc.val - o.misc.val)) };
  }
  // 部分店有 matched：其他店照舊、標 legacy
  const sp = NEW._kpiShopeeSources(m, cloudOf(m, { matched: { '維克': MATCHED_10['維克'] } }));
  eq(noLegacy(NEW._kpiShopeeCalc(sp, '好麻吉')), plainCalc(OLD._kpiShopeeCalc(so, '好麻吉')), m + '：只有維克有 matched ⇒ 好麻吉照舊');
  // matched 缺欄位 ⇒ 不用、退回舊口徑
  const bad = NEW._kpiShopeeSources(m, cloudOf(m, { matched: { '維克': { orders: 709, cost: 1 } } }));
  eq(noLegacy(NEW._kpiShopeeCalc(bad, '維克')), plainCalc(OLD._kpiShopeeCalc(so, '維克')), m + '：matched 缺欄位 ⇒ 退回舊口徑');
}
// ④ 改後快照
const fa = process.env.SNAP_AFTER;
if (fa && fs.existsSync(fa)) {
  const A = JSON.parse(fs.readFileSync(fa, 'utf8'));
  ok(A.ready === true && A.mock === false, '改後快照：ready、沒有模擬');
  eq(A.regression, B.regression, '月結表（regression）改前改後完全相同');
  const LEG = '舊口徑（下單月）：這個月還沒在對帳分頁做成本配對';
  for (const m of months) {
    const pb = B.months[m].plan, pa = A.months[m] && A.months[m].plan;
    if (!pa) { ok(false, m + '：改後快照沒有這個月'); continue; }
    // Firestore 讀回來的 map 欄位順序每次可能不同 ⇒ 排序 key 後再比
    const C = v => Array.isArray(v) ? '[' + v.map(C).join(',') + ']' : (v && typeof v === 'object') ? '{' + Object.keys(v).sort().map(k => J(k) + ':' + C(v[k])).join(',') + '}' : J(v);
    ok(C(A.months[m].sources) === C(B.months[m].sources), m + '：sources 沒變（不看欄位順序）');
    ok(pa.items.length === pb.items.length, m + '：格數相同');
    pb.items.forEach((ib, i) => {
      const ia = Object.assign({}, pa.items[i]);
      const legacyField = ['qty', 'cost', 'misc'].includes(ib.field) && ib.status !== 'wait';
      if (legacyField) {
        const want = ib.warnNote ? ib.warnNote + '；' + LEG : LEG;
        eq(ia.warnNote, want, m + ' ' + ib.shop + ' ' + ib.field + '：多「舊口徑」黃字');
        ia.warnNote = ib.warnNote;
      }
      eq(ia, ib, m + ' ' + ib.shop + ' ' + ib.field + '：其他欄位逐字相同');
    });
    ok(pa.topHtml.replace(/　成本配對 0／4 店（[^）]*）/, '') === pb.topHtml, m + '：頂端來源列只多「成本配對 0／4 店」', pa.topHtml);
  }
} else console.log('（沒有 SNAP_AFTER，略過改後快照比對）');

if (Object.keys(report).length) { console.log('\n10 月注入 matched 後（[改前, 改後]）：'); console.table(Object.fromEntries(Object.entries(report['2026-10']).map(([s, r]) => [s, { qty: r.qty.join(' → '), cost: r.cost.join(' → '), misc: r.misc.join(' → '), Δ純利: r.Δ純利 }]))); }
console.log('\n通過 ' + pass + '、失敗 ' + fail);
process.exit(fail ? 1 : 0);
