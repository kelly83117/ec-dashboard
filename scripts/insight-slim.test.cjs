// 洞察表上傳內容瘦身（2026-11-19）：node scripts/insight-slim.test.cjs
//   抽 js/pages/marketing.js 的 INS-SLIM-PURE（每列商品／每個商品的欄位、拿掉舊週的 cost），並靜態檢查解析器與上傳入口接上了。
//   資料全是合成的；不碰瀏覽器、不碰雲端。
//   INSIGHT_BACKUP_JSON 指到 ec-tools v3 備份檔（Firestore REST 形狀）時，另外用真實的四份 app/insight_{通路}
//   模擬「套用新規則後」的文件大小並印出來（備份不進 repo）。INSIGHT_EXPECT_PCT='好麻吉=66.5,玩樂=37.4' 時再比對（±0.3）。
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');
const between = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('找不到 ' + a); if (src.indexOf(a, i + 1) >= 0) throw new Error('標記重複 ' + a); return src.slice(i, j + b.length); };
const mk = read('js/pages/marketing.js'), fb = read('js/firebase.js');
const S = new Function(between(mk, '/* ═══ INS-SLIM-PURE-BEGIN', '/* ═══ INS-SLIM-PURE-END ═══ */') + '\nreturn { _insSalesNewRow, _insPerfEntry, _insWeeksStripCost };')();
const M = new Function(between(fb, '// PROFIT_DOC_MEASURE_BEGIN', '// PROFIT_DOC_MEASURE_END') + '\nreturn { profitDocMeasure, PROFIT_DOC_LIMIT_BYTES };')();
let n = 0, skipped = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const keys = o => Object.keys(o).join(',');

// ── 欄位清單 ──
ok(keys(S._insSalesNewRow('B40', '電池')) === 'code,name,stock,demand,revenue,profit,qty', '每週銷售每列：沒有 cost');
{ const r = S._insSalesNewRow('B40', '電池'); ok(r.code === 'B40' && r.name === '電池' && r.stock === 0 && r.qty === 0, '初始值'); }
ok(keys(S._insPerfEntry(undefined, 10, 2, 0.2, 0.05)) === 'impressions,clicks,ctr,convRate', '商品表現每個商品：沒有 name');
// 同一 ID 多分頁取最大值；沒有那一欄 ⇒ 沿用前值（同改版前）
{ let e = S._insPerfEntry(undefined, 10, 2, 0.2, 0.05);
  e = S._insPerfEntry(e, 7, 5, 0.1, null);
  ok(e.impressions === 10 && e.clicks === 5 && e.ctr === 0.2 && e.convRate === 0.05, '取最大值、沒有的欄位沿用');
  const first = S._insPerfEntry(undefined, 3, 0, null, null); ok(first.ctr === 0 && first.convRate === 0, '第一次就沒有那一欄 ⇒ 0'); }
// 舊資料（有 name）當前值傳進來不會帶到新的
{ const e = S._insPerfEntry({ impressions: 1, clicks: 1, ctr: 0, convRate: 0, name: '舊品名' }, 2, 0, 0.5, 0); ok(!('name' in e) && e.impressions === 2 && e.clicks === 1, '前值有 name 也不帶出來'); }

// ── 拿掉舊週的 cost ──
{ const w0 = { products: [{ code: 'A', name: 'a', stock: 1, demand: 0, revenue: 5, profit: 2, qty: 1 }], period: 'p0', periodKey: 'k0', rawRows: 1, uploadedAt: 1, uploadedBy: 'u' };
  const w1 = { products: [{ code: 'A', name: 'a', stock: 1, demand: 0, revenue: 5, cost: 3, profit: 2, qty: 1 }, { code: 'B', name: 'b', stock: 0, demand: 0, revenue: 1, cost: 0, profit: 1, qty: 1 }], period: 'p1', periodKey: 'k1', rawRows: 2, uploadedAt: 2, uploadedBy: 'u' };
  const input = [w0, w1, null, w1];
  const frozen = JSON.stringify(input);
  const out = S._insWeeksStripCost(input);
  ok(JSON.stringify(input) === frozen, '不改輸入');
  ok(out.length === 4 && out[0] === w0 && out[2] === null, '沒有 cost 的那一週是同一個物件、null 槽保留');
  ok(out[1] !== w1 && out.slice(1).filter(Boolean).every(w => w.products.every(p => !('cost' in p))), '四週每列都沒有 cost');
  ok(keys(out[1].products[0]) === 'code,name,stock,demand,revenue,profit,qty' && out[1].products[1].revenue === 1, '其他欄位與順序不變');
  ok(keys(out[1]) === keys(w1) && out[1].period === 'p1' && out[1].uploadedAt === 2, '週的其他屬性不變');
  ok(S._insWeeksStripCost(null) === null && S._insWeeksStripCost('x') === 'x', '不是陣列原樣回傳');
  ok(S._insWeeksStripCost([{ products: 'bad' }, { products: [null, 'x', { code: 'C' }] }]).length === 2, '不認得的形狀不丟錯'); }

// ── 解析器與上傳入口接上了 ──
{ const i = mk.indexOf('  parseInsightExcel(file) {'), j = mk.indexOf('  parseInsightMasterExcel(file) {');
  const sales = mk.slice(i, j);
  ok(/merged\[code\] = _insSalesNewRow\(code, /.test(sales), '每週銷售解析器用 _insSalesNewRow');
  ok(!/cost/.test(sales.replace(/\/\/.*$/gm, '')), '每週銷售解析器不再碰 cost');
  ok(/revenue \+= num\(colPrice\)/.test(sales) && /profit  \+= num\(colProfit\)/.test(sales) && /qty     \+= num\(colQty\)/.test(sales) && /stock   \+= num\(colStock\)/.test(sales) && /demand  \+= num\(colDemand\)/.test(sales), '其他欄位照舊累加'); }
{ const i = mk.indexOf('  parseInsightPerfExcel(file) {'), j = mk.indexOf('蝦皮「整月商品表現」', i);
  const perf = mk.slice(i, j);
  ok(/byShopeeId\[id\] = _insPerfEntry\(byShopeeId\[id\], imp, clk,/.test(perf), '商品表現解析器用 _insPerfEntry');
  ok(!/\bname\b/.test(perf.replace(/\/\/.*$/gm, '')) && !/商品名稱/.test(perf.replace(/\/\/.*$/gm, '')), '商品表現解析器不再讀、不再存商品名稱'); }
{ const i = mk.indexOf('const wireSalesUpload = (inputId, slotIdx, slotLabel) => {'); const s = mk.slice(i, i + 3500);
  const a = s.indexOf('const slimWeeks = _insWeeksStripCost(weeks);'), b = s.indexOf("Store.set(sKey('weeks'), slimWeeks);");
  ok(a > 0 && b > a && !/Store\.set\(sKey\('weeks'\), weeks\)/.test(s), '每週銷售上傳：寫的是拿掉 cost 之後的 4 週'); }
// 讀取端沒有人讀這兩樣（之後有人加了讀取，這裡會先紅）
{ const files = ['js/pages/marketing.js', 'js/pages/daily.js', 'js/pages/health.js', 'js/app.js'].map(read).join('\n');
  ok(!/perfEntry\.name|perfByShopeeId\[[^\]]*\]\.name|byShopeeId\[[^\]]*\]\.name/.test(files), '沒有讀取端讀商品表現的 name');
  const mkNoPure = mk.replace(between(mk, '/* ═══ INS-SLIM-PURE-BEGIN', '/* ═══ INS-SLIM-PURE-END ═══ */'), '');
  ok(!/\.cost\b/.test(mkNoPure), 'marketing.js 沒有任何地方讀每列的 cost'); }

// ── 用備份的真實資料模擬套用新規則後的大小 ──
const bk = process.env.INSIGHT_BACKUP_JSON;
if (!bk) { skipped++; console.log('（沒有給 INSIGHT_BACKUP_JSON，略過真實資料模擬）'); }
else {
  const j = JSON.parse(fs.readFileSync(bk, 'utf8'));
  const conv = v => { if (v == null) return null; if ('stringValue' in v) return v.stringValue; if ('integerValue' in v) return +v.integerValue; if ('doubleValue' in v) return +v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue; if ('nullValue' in v) return null; if ('timestampValue' in v) return 0;
    if ('mapValue' in v) { const o = {}; const f = v.mapValue.fields || {}; for (const k in f) o[k] = conv(f[k]); return o; }
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(conv); return null; };
  const expect = {}; (process.env.INSIGHT_EXPECT_PCT || '').split(',').filter(Boolean).forEach(p => { const [s, v] = p.split('='); expect[s] = +v; });
  ['好麻吉', '玩樂', '森之旅', '維克'].forEach(shop => {
    const d = j['app/insight_' + shop]; if (!d || !d.fields) throw new Error('備份裡沒有 app/insight_' + shop);
    const data = {}; for (const k in d.fields) data[k] = conv(d.fields[k]);
    const before = M.profitDocMeasure(data, 'app/insight_' + shop);
    const next = Object.assign({}, data), pk = 'ec.insight_' + shop + '_perf', wk = 'ec.insight_' + shop + '_weeks';
    // 商品表現：每個商品重新過 _insPerfEntry（＝新解析器會存的形狀）
    const bs = (data[pk] && data[pk].byShopeeId) || {};
    next[pk] = Object.assign({}, data[pk], { byShopeeId: Object.fromEntries(Object.keys(bs).map(id => [id, S._insPerfEntry(undefined, bs[id].impressions, bs[id].clicks, bs[id].ctr, bs[id].convRate)])) });
    next[wk] = S._insWeeksStripCost(data[wk]);
    const after = M.profitDocMeasure(next, 'app/insight_' + shop);
    const pct = x => (x / M.PROFIT_DOC_LIMIT_BYTES * 100).toFixed(1);
    const nameLeft = Object.values(next[pk].byShopeeId).filter(e => 'name' in e).length, costLeft = (next[wk] || []).filter(Boolean).reduce((a, w) => a + w.products.filter(p => 'cost' in p).length, 0);
    console.log('  ' + shop + '：' + before.bytes + ' B（' + pct(before.bytes) + '%）→ ' + after.bytes + ' B（' + pct(after.bytes) + '%），省 ' + (before.bytes - after.bytes) + ' B；索引 ' + before.idx + ' → ' + after.idx);
    ok(nameLeft === 0 && costLeft === 0, shop + '：模擬後沒有 name／cost');
    ok(after.bytes < before.bytes, shop + '：有變小');
    // 其他數字一筆都沒變
    ok(Object.keys(bs).every(id => ['impressions', 'clicks', 'ctr', 'convRate'].every(f => next[pk].byShopeeId[id][f] === bs[id][f])), shop + '：商品表現的四個數字不變');
    ok((data[wk] || []).every((w, i) => !w || w.products.every((p, k) => ['code', 'name', 'stock', 'demand', 'revenue', 'profit', 'qty'].every(f => next[wk][i].products[k][f] === p[f]))), shop + '：每週銷售其他欄位不變');
    if (expect[shop] != null) ok(Math.abs(after.bytes / M.PROFIT_DOC_LIMIT_BYTES * 100 - expect[shop]) <= 0.3, shop + '：預期約 ' + expect[shop] + '%，實際 ' + pct(after.bytes) + '%');
  });
}
console.log('insight-slim: ' + n + ' 項全過' + (skipped ? '（略過 ' + skipped + ' 段）' : ''));
