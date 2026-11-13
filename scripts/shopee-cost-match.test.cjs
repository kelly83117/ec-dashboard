#!/usr/bin/env node
// 蝦皮「成本跟著撥款走」塊 1 的 node 回歸測試（只讀，不寫任何檔案、不連網路、不碰 Firestore）。
//
//   node scripts/shopee-cost-match.test.cjs                         只跑假資料單元測試
//   SHOPEE_SAMPLE_DIR=<資料夾> node scripts/shopee-cost-match.test.cjs   另外跑真樣本（找不到的樣本自動略過）
//     資料夾底下（含子資料夾）：檔名含「Income」的 xlsx＝進帳報表 Excel（檔名第一個字 好／玩／森／維 判斷是哪一家），
//     檔名含「銷售金額明細」或「莫筆克銷售分析」的 xlsx＝莫筆克。
//   BASE_REF=<git ref>（預設 main）：_reconMobicCalc 改版前的版本從這個 ref 的 js/profit.js 拿，跟目前的逐字比對輸出。
//   XLSX_LIB=<xlsx.full.min.js 路徑>（選填）：用 SheetJS 讀樣本；沒給就用本檔內建的簡易 xlsx 讀取器。
//
// 🔴 樣本有訂單編號、買家帳號：本檔只放「彙總數字」當基準（單數、成本合計），
//    不印、不存任何訂單編號或買家帳號。假資料的訂單編號都是 T 開頭的假號碼。
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib'), cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const RECON_SHOPS = ['好麻吉', '玩樂', '維克', '森之旅'];
let pass = 0, fail = 0, skip = 0;
const ok = (cond, name, extra) => { if (cond) pass++; else { fail++; console.error('✗ ' + name + (extra ? '\n    ' + extra : '')); } };
const eq = (a, b, name) => { const A = String(JSON.stringify(a)), B = String(JSON.stringify(b)); ok(A === B, name, A !== B ? '得到 ' + A.slice(0, 400) + '\n    預期 ' + B.slice(0, 400) : ''); };

// ── 從 profit.js 擷取程式 ──
function between(src, a, b, label) {
  const i = src.indexOf(a), j = src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error(label + '：找不到標記 ' + a + ' / ' + b);
  return src.slice(i, j);
}
// _reconMobicCalc 那一段（改版前沒有標記，用宣告名稱找：RECON_MOBIC_SHOP_MAP 起、_reconMobicCalc 結尾的「\n}\n」止）
function mobicRegion(src, label) {
  const i = src.indexOf('const RECON_MOBIC_SHOP_MAP=');
  const f = src.indexOf('function _reconMobicCalc(', i);
  const j = src.indexOf('\n}\n', f);
  if (i < 0 || f < 0 || j < 0) throw new Error(label + '：找不到 _reconMobicCalc');
  return src.slice(i, j + 2);
}
function load(code, names) {
  return new Function('RECON_SHOPS', code + '\nreturn {' + names.join(',') + '};')(RECON_SHOPS);
}
const lf = s => s.replace(/\r\n/g, '\n');   // profit.js 是 CRLF
const cur = lf(fs.readFileSync(path.join(ROOT, 'js/profit.js'), 'utf8'));
const NEW = load(mobicRegion(cur, '目前版本') + '\n' + between(cur, '// SHOPEE_COST_MATCH_PURE_BEGIN', '// SHOPEE_COST_MATCH_PURE_END', '目前版本'),
  ['_reconMobicCalc', '_reconIncomeParse', '_reconIncomeDate', '_reconIncomeNum', '_reconCostMatch']);
ok(cur.includes('// RECON_MOBIC_PURE_BEGIN') && cur.includes('// RECON_MOBIC_PURE_END'), 'profit.js 有 RECON_MOBIC_PURE 標記');
let OLD = null;
const baseRef = process.env.BASE_REF || 'main';
try {
  const src = cp.execFileSync('git', ['show', baseRef + ':js/profit.js'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
  OLD = load(mobicRegion(lf(src), baseRef), ['_reconMobicCalc']);
} catch (e) { console.warn('⚠ 拿不到 ' + baseRef + ' 的 js/profit.js（' + e.message.split('\n')[0] + '），略過改版前比對'); skip++; }

// 輸出轉成可以比對的形狀（Map → 陣列）
const plain = o => JSON.parse(JSON.stringify(o, (k, v) => v instanceof Map ? [...v.entries()] : v));
const noMap = o => { const c = Object.assign({}, o); delete c.orderMap; return c; };

// ════ 1. 假資料單元測試 ════
const MH = ['建立日期', '店鋪名稱', '店鋪編號', '交易平台', '交易序號', '平台訂單編號', '出貨方式', '付款方式', '商品小計', '運費', '折扣', '商品成本', '是否出貨'];
const mrow = (shop, oid, ship, cost, disc, st) => ['2026-09-01', shop, '', '蝦皮', '', oid, ship, '', 0, 0, disc, cost, st];
const MOBIC = [MH,
  mrow('維克生活', 'T001', '7-11', 100, 0, '已出貨'),
  mrow('維克生活', 'T001', '7-11 無包裝', 50.5, -3, '已出貨'),   // 同一單兩列、兩種出貨方式
  mrow('維克生活', 'T002', '店到店 無包裝', 80, 0, '已出貨'),
  mrow('維克生活', 'T003', '7-11', 'x', 0, '已取消'),             // 已取消：成本格壞掉也不檢查
  mrow('維克生活', 'T004', '7-11', 30, 0, '已出貨'),
  mrow('維克生活', 'T004', '7-11', 30, 0, '已取消'),
  mrow('生活好麻吉', 'T101', '宅配', 200, 0, '已出貨'),
  mrow('不認識的店', 'T900', '宅配', 1, 0, '已出貨'),
  [],
  mrow('玩樂盒子', 'T201', '宅配', 10, 0, '處理中'),
];
{
  const a = NEW._reconMobicCalc(MOBIC), b = NEW._reconMobicCalc(MOBIC, { orderMap: true });
  ok(a.ok && !('orderMap' in a), '莫筆克：沒帶 opts 不回 orderMap');
  eq(noMap(b), a, '莫筆克：帶 orderMap 時其他輸出不變');
  eq(a.shops['維克'], { orders: 3, ordersPlain: 2, ordersNoPack: 2, cost: 260.5, discount: -3, rows: 4 }, '莫筆克：維克彙總');
  eq(a.unmapped, { '不認識的店': 1 }, '莫筆克：對不到的店');
  const m = b.orderMap['維克'];
  eq(plain(m.get('T001')), { cost: 150.5, shipped: 2, cancelled: 0, other: 0, plain: true, noPack: true }, 'orderMap：T001 兩列加總、兩種出貨方式');
  eq(plain(m.get('T003')), { cost: 0, shipped: 0, cancelled: 1, other: 0, plain: false, noPack: false }, 'orderMap：T003 只有已取消');
  eq(plain(m.get('T004')), { cost: 30, shipped: 1, cancelled: 1, other: 0, plain: true, noPack: false }, 'orderMap：T004 已出貨＋已取消');
  eq(plain(b.orderMap['玩樂'].get('T201')), { cost: 0, shipped: 0, cancelled: 0, other: 1, plain: false, noPack: false }, 'orderMap：其他狀態記 other');
  ok(!b.orderMap['維克'].has('T900') && Object.keys(b.orderMap).join() === RECON_SHOPS.join(), 'orderMap：只有四店、不收對不到的店');
  if (OLD) {
    eq(OLD._reconMobicCalc(MOBIC), a, '莫筆克（假資料）：改版前後輸出逐字相同');
    const broken = [MH, mrow('維克生活', 'T1', '7-11', 'abc', 0, '已出貨')];
    eq(NEW._reconMobicCalc(broken), OLD._reconMobicCalc(broken), '莫筆克（壞資料）：錯誤訊息改版前後相同');
    eq(NEW._reconMobicCalc(broken, { orderMap: true }), OLD._reconMobicCalc(broken), '莫筆克（壞資料）：帶 opts 也一樣報錯');
    eq(NEW._reconMobicCalc([['店鋪名稱']]), OLD._reconMobicCalc([['店鋪名稱']]), '莫筆克（缺欄）：改版前後相同');
  }
}
// 日期、金額
eq([NEW._reconIncomeDate('2026-10-02'), NEW._reconIncomeDate('2026/9/7 13:00'), NEW._reconIncomeDate(46297), NEW._reconIncomeDate('2026-13-01'), NEW._reconIncomeDate(''), NEW._reconIncomeDate('abc')],
  ['2026-10-02', '2026-09-07', '2026-10-02', null, null, null], '日期格式');
eq([NEW._reconIncomeNum(-3), NEW._reconIncomeNum('1,234'), NEW._reconIncomeNum('−15'), NEW._reconIncomeNum(''), NEW._reconIncomeNum(null), NEW._reconIncomeNum('x')],
  [-3, 1234, -15, 0, 0, null], '金額格式');
// 進帳 Excel
const IH = ['序號', '訂單編號', '退款編號', '買家帳號', '訂單成立日期', '買家付款方式', '熱門商品', '錢包入帳日期', '商品原價', '賣場商品促銷折扣', '退款金額'];
const irow = (oid, created, paid, orig, refund) => [1, oid, null, 'buyer', created, '', 'NO', paid, orig, 0, refund];
const head = (from, to) => [['賣家帳號', '從', '至'], ['seller-a', from, to], [null], [null], ['小計(NT$)']];
const S1 = { name: 'Income - 1', aoa: head('2026-09-01', '2026-10-31').concat([IH,
  irow('T001', '2026-08-30', '2026-09-02', 300, 0),
  irow('T002', '2026-09-20', '2026-10-01', 200, -50),
  irow('T003', '2026-09-25', '2026-10-03', 100, 0),
]) };
const S2 = { name: 'Income - 2', aoa: head('2026-09-01', '2026-10-31').concat([IH.slice().reverse(),   // 欄位順序不同也要讀得到
  irow('T004', '2026-10-05', '2026-10-09', 120, 0).slice().reverse(),
  irow('T009', '2026-07-01', '2026-10-20', 99, 0).slice().reverse(),
  [], [null, null, null, null, '說明文字'],   // 表尾說明（沒有訂單編號、商品原價空白）
]) };
{
  const r = NEW._reconIncomeParse([{ name: 'Summary', aoa: [['x']] }, S1, S2, { name: 'Service Fee Details', aoa: [] }]);
  ok(r.ok, '進帳：兩張 Income 分頁', r.err);
  eq(r.sheets, ['Income - 1', 'Income - 2'], '進帳：只讀 Income 分頁');
  eq(r.months, { '2026-09': { orders: 1, created: { '2026-08': 1 } }, '2026-10': { orders: 4, created: { '2026-09': 2, '2026-10': 1, '2026-07': 1 } } }, '進帳：照錢包入帳日期分月');
  eq([r.seller, r.range, r.paidRange, r.rows, r.dupRows], ['seller-a', { from: '2026-09-01', to: '2026-10-31' }, { from: '2026-09-02', to: '2026-10-20' }, 5, 0], '進帳：檔頭與期間');
  const d = NEW._reconIncomeParse([{ name: 'Income', aoa: [IH, irow('T1', '2026-09-01', '2026-10-01', 10, 0), irow('T1', '2026-09-01', '2026-10-05', 5, -1), irow('T2', '2026-09-01', '2026-10-30', 7, 0), irow('T2', '2026-09-01', '2026-09-30', 8, 0)] }]);
  eq(d.orders.map(o => [o.oid, o.paid, o.orig, o.refund]), [['T1', '2026-10-01', 15, -1], ['T2', '2026-09-30', 8, 0]], '進帳：重複訂單（同月相加、跨月算最早那月）');
  eq([d.dupRows, d.dupCross.length], [1, 1], '進帳：重複計數');
  ok(!NEW._reconIncomeParse([{ name: 'Summary', aoa: [] }]).ok, '進帳：沒有 Income 分頁 ⇒ 錯誤');
  ok(/缺少必要欄位：退款金額/.test(NEW._reconIncomeParse([{ name: 'Income', aoa: [IH.slice(0, 10), irow('T1', '2026-09-01', '2026-10-01', 1, 0)] }]).err || ''), '進帳：缺欄 ⇒ 錯誤');
  ok(/錢包入帳日期讀不出來/.test(NEW._reconIncomeParse([{ name: 'Income', aoa: [IH, irow('T1', '2026-09-01', '', 1, 0)] }]).err || ''), '進帳：日期壞 ⇒ 錯誤');
  ok(/訂單編號空白/.test(NEW._reconIncomeParse([{ name: 'Income', aoa: [IH, irow('', '2026-09-01', '2026-10-01', 50, 0)] }]).err || ''), '進帳：沒訂單編號但有金額 ⇒ 錯誤');
  const other = { name: 'Income - 2', aoa: [['賣家帳號', '從', '至'], ['seller-b', '2026-09-01', '2026-10-31'], IH, irow('T5', '2026-09-01', '2026-10-01', 1, 0)] };
  ok(/賣家帳號跟其他分頁不同/.test(NEW._reconIncomeParse([S1, other]).err || ''), '進帳：兩家混在一起 ⇒ 錯誤');
  // 配對
  const map9 = NEW._reconMobicCalc([MH, mrow('維克生活', 'T002', '7-11 無包裝', 80, 0, '已出貨'), mrow('維克生活', 'T003', '7-11', 0, 0, '已取消')], { orderMap: true }).orderMap['維克'];
  const map10 = NEW._reconMobicCalc([MH, mrow('維克生活', 'T004', '7-11', 60, 0, '已出貨'), mrow('維克生活', 'T004', '宅配', 40, 0, '已出貨')], { orderMap: true }).orderMap['維克'];
  const m = NEW._reconCostMatch(r.orders, '2026-10', [{ month: '2026-09', map: map9 }, { month: '2026-10', map: map10 }]);
  eq([m.orders, m.matched, m.cost, m.ordersPlain, m.ordersNoPack], [4, 2, 180, 1, 1], '配對：單數、成本、一般／無包裝');
  eq(m.refund, { orders: 1, cost: 80, amt: -50 }, '配對：退款單照算成本、另外列');
  eq(m.cancelled, { n: 1, amt: 100, items: [{ oid: 'T003', created: '2026-09-25', orig: 100, status: '已取消' }] }, '配對：已取消列出來、不算成本');
  eq([m.missing.n, m.missing.amt, m.missing.byMonth, m.missing.items[0].noFile], [1, 99, { '2026-07': 1 }, true], '配對：找不到（沒上傳那個月）');
  eq([m.needMonths, m.loadedMonths, m.noFileMonths], [{ '2026-09': 2, '2026-10': 1, '2026-07': 1 }, ['2026-09', '2026-10'], { '2026-07': 1 }], '配對：需要哪些月份');
  const m2 = NEW._reconCostMatch(r.orders, '2026-10', [{ month: '2026-10', map: map10 }]);
  eq([m2.matched, m2.missing.n, m2.missing.items.filter(x => x.noFile).length], [1, 3, 3], '配對：只給 10 月莫筆克');
  const m3 = NEW._reconCostMatch(r.orders, '2026-10', [{ month: '2026-08', map: map9 }]);   // 下單月對不上也找得到（找其他份）
  eq([m3.matched, m3.cost], [1, 80], '配對：下單月那份沒有就找其他份');
  const m4 = NEW._reconCostMatch(r.orders, '2026-10', [{ month: '2026-09', map: map9 }, { month: '2026-10', map: map9 }]);
  eq([m4.matched, m4.multiHit], [1, 2], '配對：兩份都有 ⇒ 記 multiHit、只算一次');
  ok(!NEW._reconCostMatch(r.orders, '2026-10', [{ month: '2026-09', map: map9 }, { month: '2026-09', map: map10 }]).ok, '配對：同月兩份莫筆克 ⇒ 錯誤');
  ok(!NEW._reconCostMatch(r.orders, '2026/10', []).ok, '配對：月份格式錯 ⇒ 錯誤');
  eq(NEW._reconCostMatch(r.orders, '2026-09', []).missing.byMonth, { '2026-08': 1 }, '配對：9 月撥款只看 9 月入帳的單');
}

// ════ 2. 真樣本（SHOPEE_SAMPLE_DIR，找不到就略過）════
// 基準只放彙總數字。樣本：2026-10 四店進帳 Excel、2026-08 / 2026-09 莫筆克（2026-11-13 首次產生）。
const BASE = {
  income: {
    '好麻吉': { sheets: 2, rows: 15953, months: { '2026-10': { orders: 15953, created: { '2026-08': 4, '2026-09': 3348, '2026-10': 12601 } } }, refundRows: 447 },
    '森之旅': { sheets: 1, rows: 759, months: { '2026-10': { orders: 759, created: { '2026-09': 146, '2026-10': 613 } } }, refundRows: 21 },
    '玩樂': { sheets: 1, rows: 5953, months: { '2026-10': { orders: 5953, created: { '2025-08': 1, '2026-08': 1, '2026-09': 1069, '2026-10': 4882 } } }, refundRows: 160 },
    '維克': { sheets: 1, rows: 709, months: { '2026-10': { orders: 709, created: { '2026-09': 110, '2026-10': 599 } } }, refundRows: 28 },
  },
  // 9 月下單、10 月撥款的部分 × 9 月莫筆克（只給 9 月那份時的結果）
  match09: {
    '維克': { matched: 110, cost: 16241, plain: 73, noPack: 37, cancelled: 0, missing09: 0 },
    '森之旅': { matched: 146, cost: 25278, plain: 68, noPack: 78, cancelled: 0, missing09: 0 },
    '玩樂': { matched: 1069, cost: 146941, plain: 587, noPack: 482, cancelled: 0, missing09: 0 },
    '好麻吉': { matched: 3347, cost: 411499, plain: 1936, noPack: 1411, cancelled: 1, missing09: 0 },
  },
};
const SHOP_BY_CHAR = { '好': '好麻吉', '玩': '玩樂', '森': '森之旅', '維': '維克' };

function miniXlsx(file) {
  const b = fs.readFileSync(file);
  let e = b.length - 22; while (e >= 0 && b.readUInt32LE(e) !== 0x06054b50) e--;
  const n = b.readUInt16LE(e + 10); let p = b.readUInt32LE(e + 16); const ents = {};
  for (let i = 0; i < n; i++) {
    const fnl = b.readUInt16LE(p + 28), exl = b.readUInt16LE(p + 30), cml = b.readUInt16LE(p + 32);
    ents[b.toString('utf8', p + 46, p + 46 + fnl)] = { meth: b.readUInt16LE(p + 10), csz: b.readUInt32LE(p + 20), lo: b.readUInt32LE(p + 42) };
    p += 46 + fnl + exl + cml;
  }
  const get = name => { const x = ents[name]; if (!x) return null; const st = x.lo + 30 + b.readUInt16LE(x.lo + 26) + b.readUInt16LE(x.lo + 28);
    const raw = b.subarray(st, st + x.csz); return (x.meth === 0 ? raw : zlib.inflateRawSync(raw)).toString('utf8'); };
  const dec = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d)).replace(/&amp;/g, '&');
  const rmap = {}; get('xl/_rels/workbook.xml.rels').replace(/<Relationship [^>]*>/g, t => { rmap[/Id="([^"]+)"/.exec(t)[1]] = /Target="([^"]+)"/.exec(t)[1].replace(/^\/?(xl\/)?/, 'xl/'); });
  const sheets = []; get('xl/workbook.xml').replace(/<sheet [^>]*>/g, t => { sheets.push({ name: dec(/name="([^"]*)"/.exec(t)[1]), path: rmap[/r:id="([^"]+)"/.exec(t)[1]] }); });
  const ss = []; const sx = get('xl/sharedStrings.xml');
  if (sx) { const re = /<si>([\s\S]*?)<\/si>/g; let m; while ((m = re.exec(sx))) { let s = ''; m[1].replace(/<t[^>]*>([\s\S]*?)<\/t>/g, (a, t) => { s += t; }); ss.push(dec(s)); } }
  const col = ref => { let k = 0; for (const c of /^[A-Z]+/.exec(ref)[0]) k = k * 26 + c.charCodeAt(0) - 64; return k - 1; };
  return { names: sheets.map(s => s.name), aoa(name) {
    const x = get(sheets.find(s => s.name === name).path); const rows = []; const re = /<row[^>]*>([\s\S]*?)<\/row>|<row[^>]*\/>/g; let m;
    while ((m = re.exec(x))) { const r = []; (m[1] || '').replace(/<c ([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g, (a, at, _e, inner) => {
      const ref = /r="([A-Z]+\d+)"/.exec(at), t = (/t="([^"]+)"/.exec(at) || [])[1]; let v;
      if (inner != null) { const vm = /<v>([\s\S]*?)<\/v>/.exec(inner);
        if (t === 's') v = vm ? ss[+vm[1]] : undefined; else if (t === 'inlineStr') { let s = ''; inner.replace(/<t[^>]*>([\s\S]*?)<\/t>/g, (q, w) => { s += w; }); v = dec(s); }
        else if (t === 'str' || t === 'e') v = vm ? dec(vm[1]) : undefined; else if (t === 'b') v = vm ? vm[1] === '1' : undefined; else v = vm ? Number(vm[1]) : undefined; }
      r[ref ? col(ref[1]) : r.length] = v; }); rows.push(r); }
    return rows; } };
}
function openBook(file) {
  if (process.env.XLSX_LIB) {
    const X = require(path.resolve(process.env.XLSX_LIB));
    const wb = X.read(fs.readFileSync(file), { type: 'buffer', dense: true });
    return { names: wb.SheetNames, aoa: n => X.utils.sheet_to_json(wb.Sheets[n], { header: 1 }) };
  }
  return miniXlsx(file);
}
function walk(dir) { let out = []; for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) out = out.concat(walk(p)); else if (/\.xlsx$/i.test(f.name)) out.push(p); } return out; }

const dir = process.env.SHOPEE_SAMPLE_DIR;
if (!dir || !fs.existsSync(dir)) { console.log('（沒有 SHOPEE_SAMPLE_DIR，略過真樣本）'); skip++; }
else {
  const files = walk(dir);
  // 莫筆克：改版前後逐字比對 ＋ orderMap 跟彙總一致
  const mobicMaps = {};   // 下單月 → {店: Map}
  for (const f of files.filter(f => /銷售金額明細|莫筆克銷售分析/.test(path.basename(f)))) {
    const t0 = Date.now(), bk = openBook(f), nm = bk.names.filter(n => /建立$/.test(n));
    if (nm.length !== 1) { console.warn('⚠ ' + path.basename(f) + '：「建立」分頁不是一張，略過'); skip++; continue; }
    const month = (/^(\d{4})(\d{2})01/.exec(nm[0]) || []).slice(1, 3).join('-');
    const aoa = bk.aoa(nm[0]);
    const a = NEW._reconMobicCalc(aoa), b = NEW._reconMobicCalc(aoa, { orderMap: true });
    ok(a.ok, '莫筆克 ' + month + '：解析成功', a.err);
    if (OLD) eq(OLD._reconMobicCalc(aoa), a, '莫筆克 ' + month + '：改版前後輸出逐字相同（' + aoa.length + ' 列）');
    eq(noMap(b), a, '莫筆克 ' + month + '：帶 orderMap 時彙總不變');
    RECON_SHOPS.forEach(s => {
      const v = [...b.orderMap[s].values()].filter(e => e.shipped > 0);
      eq([v.length, v.filter(e => e.plain).length, v.filter(e => e.noPack).length, Math.round(v.reduce((x, e) => x + e.cost, 0) * 100) / 100],
        [a.shops[s].orders, a.shops[s].ordersPlain, a.shops[s].ordersNoPack, a.shops[s].cost], '莫筆克 ' + month + ' ' + s + '：orderMap 加總＝彙總');
    });
    mobicMaps[month] = b.orderMap;
    console.log('  莫筆克 ' + month + ' 讀完（' + (Date.now() - t0) + ' ms）');
  }
  // 進帳 Excel
  for (const f of files.filter(f => /Income/.test(path.basename(f)))) {
    const shop = SHOP_BY_CHAR[path.basename(f)[0]];
    if (!shop) { console.warn('⚠ ' + path.basename(f) + '：看不出是哪一家，略過'); skip++; continue; }
    const bk = openBook(f);
    const r = NEW._reconIncomeParse(bk.names.map(n => ({ name: n, aoa: /^Income/.test(n) ? bk.aoa(n) : [] })));
    ok(r.ok, '進帳 ' + shop + '：解析成功', r.err);
    if (!r.ok) continue;
    const got = { sheets: r.sheets.length, rows: r.rows, months: r.months, refundRows: r.orders.filter(o => o.refund).length };
    const months = Object.keys(r.months).sort();
    console.log('  進帳 ' + shop + '：' + r.sheets.length + ' 張分頁、' + r.orders.length + ' 單、撥款月 ' + months.join('、') + '、重複 ' + r.dupRows + '／跨月重複 ' + r.dupCross.length);
    if (months.join() === '2026-10' && BASE.income[shop]) eq(got, BASE.income[shop], '進帳 ' + shop + ' 2026-10：基準');
    else { console.log('    （這份不是 2026-10 單月樣本，沒有基準，只檢查加總）'); skip++; }
    ok(months.reduce((x, m) => x + r.months[m].orders, 0) === r.orders.length, '進帳 ' + shop + '：各月單數加總＝總單數');
    // 配對：每個撥款月都跑，印彙總；2026-10 × 只有 9 月莫筆克 時比基準
    for (const pm of months) {
      const ms = Object.keys(mobicMaps).sort().map(m => ({ month: m, map: mobicMaps[m][shop] }));
      const m = NEW._reconCostMatch(r.orders, pm, ms);
      ok(m.ok && m.matched + m.cancelled.n + m.missing.n === m.orders, '配對 ' + shop + ' ' + pm + '：配到＋已取消＋找不到＝撥款單數');
      console.log('    撥款 ' + pm + '：' + m.orders + ' 單，配到 ' + m.matched + '（成本 ' + m.cost + '，一般 ' + m.ordersPlain + '／無包裝 ' + m.ordersNoPack
        + '，其中退款單 ' + m.refund.orders + ' 單成本 ' + m.refund.cost + '），已取消 ' + m.cancelled.n + ' 單 $' + m.cancelled.amt
        + '，找不到 ' + m.missing.n + ' 單 $' + m.missing.amt + '（缺莫筆克的下單月 ' + JSON.stringify(m.noFileMonths) + '）');
      if (pm === '2026-10' && mobicMaps['2026-09'] && BASE.match09[shop]) {
        const m9 = NEW._reconCostMatch(r.orders.filter(o => o.created.slice(0, 7) === '2026-09'), pm, [{ month: '2026-09', map: mobicMaps['2026-09'][shop] }]);
        eq({ matched: m9.matched, cost: Math.round(m9.cost), plain: m9.ordersPlain, noPack: m9.ordersNoPack, cancelled: m9.cancelled.n, missing09: m9.missing.n },
          BASE.match09[shop], '配對 ' + shop + '：10 月撥款 × 9 月下單 × 9 月莫筆克 基準');
      }
    }
  }
}

console.log('\n通過 ' + pass + '、失敗 ' + fail + '、略過 ' + skip);
process.exit(fail ? 1 : 0);
