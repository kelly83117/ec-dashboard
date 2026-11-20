#!/usr/bin/env node
// PChome 淨利表「合併商品頁」（2026-11-20）的 node 測試（只讀，不寫檔、不連網路）。
//
//   node scripts/pchome-page-merge.test.cjs
//   PCHOME_BACKUP_JSON=<v3 備份檔> node scripts/pchome-page-merge.test.cjs   ← 另外用真實商品主檔驗分組數字（不印內容）
//
// 測 js/profit.js 的 PCH-PG-PURE 區塊：商品頁歸屬（含一個料號掛兩頁）、第一個規格、外層合計、排序、搜尋／篩選（成員判斷）。
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (cond, name, extra) => { if (cond) pass++; else { fail++; console.error('✗ ' + name + (extra ? '\n    ' + extra : '')); } };
const eq = (a, b, name) => ok(JSON.stringify(a) === JSON.stringify(b), name, '實際 ' + JSON.stringify(a) + '\n    預期 ' + JSON.stringify(b));

const src = fs.readFileSync(path.join(ROOT, 'js/profit.js'), 'utf8').replace(/\r\n/g, '\n');
const a = src.indexOf('/* ═══ PCH-PG-PURE-BEGIN'), b = src.indexOf('/* ═══ PCH-PG-PURE-END');
if (a < 0 || b < a) throw new Error('找不到 PCH-PG-PURE 區塊');
const baseLine = (src.match(/^function pchomeBaseCode\(v\)\{.*\}$/m) || [])[0];
if (!baseLine) throw new Error('找不到 pchomeBaseCode');
const P = new Function(baseLine + '\n' + src.slice(a, b) + '\nreturn { pchomeBaseCode, pchomePageIdsOf, pchomeSpecCodeOf, pchomePageAnchor, pchomePageUniq, pchomePageAgg, pchomeGroupByPage, pchomeRowCmp, pchomeGroupSort, pchomeGroupFilter, pchomeRowSearchHit, pchomeOptlogPageList };')();
const oa = src.indexOf('// PCH-OLCELL-PURE-BEGIN'), ob = src.indexOf('// PCH-OLCELL-PURE-END');
const C = new Function(src.slice(oa, ob) + '\nreturn { pchomeOptlogCellInnerHTML };')();
const esc = x => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ── 商品頁 ID ──
eq(P.pchomePageIdsOf({ 商品編號: ['DDBK72-A900KK915-001'] }), ['DDBK72-A900KK915'], '去最後一段');
eq(P.pchomePageIdsOf({ 商品編號: ['A-B-001', 'A-C-001', 'A-B-002'] }), ['A-B', 'A-C'], '多個商品編號：去重、保留順序');
eq(P.pchomePageIdsOf({ 商品編號: 'X-Y-003' }), ['X-Y'], '不是陣列也接受');
eq(P.pchomePageIdsOf({ 商品編號: [] }), [], '沒有商品編號 → 空');
eq(P.pchomePageIdsOf({}), [], '沒有欄位 → 空');
eq(P.pchomeSpecCodeOf({ 商品編號: ['A-B-007', 'A-C-001'] }, 'A-B'), '007', '規格碼只看那一頁的');
eq(P.pchomeSpecCodeOf({ 商品編號: ['A-C-001'] }, 'A-B'), '', '不在那一頁 → 空');

// ── 第一個規格 ──
eq(P.pchomePageAnchor([{ 料號: 'Z', spec: '002' }, { 料號: 'Y', spec: '001' }, { 料號: 'X', spec: '010' }]), 'Y', '規格碼最小');
eq(P.pchomePageAnchor([{ 料號: 'B', spec: '001' }, { 料號: 'A', spec: '001' }]), 'A', '同碼比料號');
eq(P.pchomePageAnchor([{ 料號: 'A', spec: '' }, { 料號: 'B', spec: '005' }]), 'B', '沒有規格碼的排最後');
eq(P.pchomePageAnchor([]), '', '空清單');
{ const L = [{ 料號: 'Z', spec: '002' }, { 料號: 'Y', spec: '001' }], c = JSON.stringify(L); P.pchomePageAnchor(L); ok(JSON.stringify(L) === c, '不改動傳進來的陣列'); }

// ── 假資料列 ──
const R = (料號, o) => Object.assign({ 料號, 商品名: '品' + 料號, 營收: 0, 銷量: 0, 費用: 0, 費用合計: 0, 成本: null, unitCost: null, costKnown: false, 供貨價: null, 售價: null, 淨利: null, 淨利率: null, 商品淨利: null, 商品淨利率: null, hasBiz: false, discontinued: false }, o || {});
const ids = { A1: ['P-A'], A2: ['P-A'], A3: ['P-A'], B1: ['P-B'], C1: [], D1: ['P-D1', 'P-D2'], D2: ['P-D1', 'P-D2'], E1: ['P-E', 'P-A'] };
const idsOf = r => ids[r.料號] || [];
const rows = [R('A1', { 營收: 100, 銷量: 2, 費用: 10, 費用合計: 15, 成本: 40, unitCost: 20, costKnown: true, 淨利: 45, 淨利率: 0.45, 商品淨利: 50, 商品淨利率: 0.5, 售價: 99, 供貨價: 80, hasBiz: true }),
  R('B1', { 營收: 50, hasBiz: true }),
  R('A2', { 營收: 300, 銷量: 3, 費用: 30, 費用合計: 40, 成本: 90, unitCost: 30, costKnown: true, 淨利: 170, 淨利率: 170 / 300, 商品淨利: 180, 商品淨利率: 0.6, 售價: 99, 供貨價: 80, hasBiz: true, 商品名: '大的' }),
  R('A3', { 營收: 60, 銷量: 1, 費用: 5, 費用合計: 6, hasBiz: true, 售價: 99, 供貨價: 70 }),   // 缺成本
  R('C1', {}), R('D1', {}), R('D2', {}), R('E1', { discontinued: true, unitCost: 20, costKnown: true, 售價: 99, 供貨價: 80 })];
const G = P.pchomeGroupByPage(rows, idsOf);
{ const it = G.items;
  eq(it.map(x => x.type === 'group' ? 'G:' + x.pageId + ':' + x.members.map(m => m.料號).join(',') : 'S:' + x.row.料號),
    ['G:P-A:A1,A2,A3,E1', 'S:B1', 'S:C1', 'G:P-D1:D1,D2'], '分組、順序＝第一個成員的位置；單成員不成組；沒有商品頁自成一列');
  eq(G.multi, { D1: 1, D2: 1, E1: 1 }, '掛多頁的料號記另掛幾頁');
  eq([G.stats.rows, G.stats.groups, G.stats.grouped, G.stats.singles, G.stats.maxMembers], [8, 2, 6, 2, 4], 'stats');
  ok(it[3].pageId === 'P-D1', '掛兩頁同數 → 取寫在前面的');
  ok(it[0].pageId === 'P-A', 'E1 掛 P-E(1) 與 P-A(4) → 歸 P-A（掛最多的）'); }

// ── 外層合計 ──
{ const g = G.items[0].agg;
  eq([g.營收, g.銷量, g.費用, g.費用合計, g.成本], [460, 6, 45, 61, 130], '營收、銷量、費用相加；成本只加有成本的（E1 零銷成本 null 不加）');
  ok(g.淨利 === 215 && Math.abs(g.淨利率 - 215 / 400) < 1e-12, '淨利只加有數字的、淨利率 ÷ 同一批營收', g.淨利 + ' ' + g.淨利率);
  ok(g.商品淨利 === 230 && Math.abs(g.商品淨利率 - 230 / 400) < 1e-12, '商品淨利同上');
  eq([g.unitCost, g.costKnown, g.costInfo.min, g.costInfo.max], [null, false, 20, 30], '成本不同 → null＋範圍');
  eq([g.售價, g.priceInfo.same], [99, true], '售價全部一樣 → 一個值');
  eq([g.供貨價, g.supplyInfo.min, g.supplyInfo.max], [null, 70, 80], '供貨價不同 → 範圍');
  eq([g.missN, g.discN, g.hasBiz, g.discontinued, g.n, g.商品名, g.料號], [1, 1, true, false, 4, '大的', 'P-A'], '缺成本數、已下架數、名稱＝營收最高的');
  const z = G.items[3].agg; eq([z.淨利, z.淨利率, z.商品淨利, z.成本, z.售價], [null, null, null, null, null], '全部零銷 → 都是 null（顯示「—」）');
  const one = P.pchomePageAgg('Q', [R('q1', { unitCost: 5, costKnown: true }), R('q2', { unitCost: 5, costKnown: true })]);
  eq([one.unitCost, one.costKnown], [5, true], '成本全部一樣 → 一個值'); }

// ── 排序 ──
{ const kf = { revenue: x => x.營收, name: x => x.料號, margin: x => x.淨利率 };
  const s = P.pchomeGroupSort(G.items, P.pchomeRowCmp(kf, { col: 'revenue', dir: 'desc' }));
  eq(s.map(x => x.type === 'group' ? x.pageId : x.row.料號), ['P-A', 'B1', 'C1', 'P-D1'], '外層用合計排（P-A 460 > B1 50 > 0 > 0，同值維持原順序）');
  eq(s[0].members.map(m => m.料號), ['A2', 'A1', 'A3', 'E1'], '組內成員用同一個比法');
  eq(G.items[0].members.map(m => m.料號), ['A1', 'A2', 'A3', 'E1'], '不改動原本的成員順序');
  const m = P.pchomeGroupSort(G.items, P.pchomeRowCmp(kf, { col: 'margin', dir: 'asc' }));
  eq(m[0].members.map(x => x.料號), ['A1', 'A2', 'A3', 'E1'], 'null 排最後（升冪）');
  const n = P.pchomeGroupSort(G.items, P.pchomeRowCmp(kf, { col: 'tags', dir: 'desc' }));
  eq(n.map(x => x.type === 'group' ? x.pageId : x.row.料號), ['B1', 'C1', 'P-A', 'P-D1'], '沒有對應欄 → 依料號升冪（外層用商編）'); }
{ // 跟兩支表格原本的比法逐一對照
  const kf = { revenue: x => x.營收, name: x => x.料號 }, sort = { col: 'revenue', dir: 'desc' };
  const orig = rows.slice(); { const dir = -1, f = kf.revenue; orig.sort(function (a, b) { var va = f(a), vb = f(b); if (va == null && vb == null) return 0; if (va == null) return 1; if (vb == null) return -1; if (typeof va === 'string') return va < vb ? -dir : (va > vb ? dir : 0); return (va - vb) * dir; }); }
  const mine = rows.slice().sort(P.pchomeRowCmp(kf, sort));
  eq(mine.map(x => x.料號), orig.map(x => x.料號), 'pchomeRowCmp 跟表格原本的排序結果相同'); }

// ── 搜尋／篩選（成員判斷）──
{ const passA = r => r.料號 !== 'A3' && !r.discontinued;
  const f = P.pchomeGroupFilter(G.items, passA, false);
  eq(f[0].shown.map(x => x.料號), ['A1', 'A2'], '只列通過的成員'); ok(f[0].forceOpen === false, '只有已下架這類基本條件 → 不自動展開');
  ok(f[0].agg.營收 === 460, '外層合計仍是整頁');
  const q = P.pchomeGroupFilter(G.items, r => P.pchomeRowSearchHit(r, 'a3'), true);
  eq(q.map(x => x.type === 'group' ? x.pageId + ':' + x.shown.map(m => m.料號).join(',') : x.row.料號), ['P-A:A3'], '搜尋到某規格 → 留整組、只列它'); ok(q[0].forceOpen === true, '有在搜尋 → 自動展開');
  eq(P.pchomeGroupFilter(G.items, () => false, true), [], '都不通過 → 整組不顯示');
  const allDisc = P.pchomeGroupByPage([R('x1', { discontinued: true }), R('x2', { discontinued: true })], () => ['P-X']);
  eq(P.pchomeGroupFilter(allDisc.items, r => !r.discontinued, false), [], '整頁都已下架、沒開顯示已下架 → 整組不顯示');
  ok(P.pchomeRowSearchHit({ 商品名: '手提化妝包', 商品編號: 'DIBM-AB-001', 料號: 'F1' }, 'dibm-ab'), '搜尋比對商品名／商編／原編'); }

// ── 外層優化紀錄：整頁聯集 ──
{ const map = { A1: [{ id: 'x1', date: '2026-11-01', time: '10:00', type: '調價', note: 'A1 自己' }], A2: [{ id: 'x2', date: '2026-11-02', time: '10:00', type: '做活動', note: 'A2 自己' }, { id: 'x1', date: '2026-11-01', time: '10:00', type: '調價', note: '重複 id' }],
    A3: [{ id: 'y1', date: '2026-11-03', time: '10:00', page: 'P-OTHER', note: '別頁的整頁紀錄' }], Z9: [{ id: 'p1', date: '2026-11-04', time: '10:00', page: 'P-A', note: '掛在別的料號、標這一頁' }], B1: [{ id: 'b1', note: '別頁的' }] };
  const c = JSON.stringify(map);
  const L = P.pchomeOptlogPageList(map, ['A1', 'A2', 'A3'], 'P-A');
  eq(L.map(e => e.id), ['x1', 'x2', 'p1'], '聯集：成員自己的＋標這一頁的；同 id 只留一筆；標別頁的不算');
  ok(JSON.stringify(map) === c, '不改動傳進來的資料');
  eq(P.pchomeOptlogPageList(null, ['A1'], 'P-A'), [], '沒有資料 → 空');
  const h = C.pchomeOptlogCellInnerHTML(L, null, { esc, types: ['調價'], nameOf: u => u, page: true });
  ok(h.includes('共 3 筆') && h.includes('pchomeOptlogPageCellEdit(this)') && !h.includes('pchomeOptlogCellEdit(') && !h.includes('pchomeOptlogCellOpen'), '外層格子：共 N 筆、點了走整頁新增（不是規格的）、沒有開彈窗', h);
  ok(h.includes('>掛在別的料號、標這一頁<') && h.includes('<span class="pch-ol-page">整頁</span>'), '外層格子顯示最近一筆，整頁紀錄標「整頁」');
  const e0 = C.pchomeOptlogCellInnerHTML([], null, { esc, types: ['調價'], nameOf: u => u, page: true });
  ok(e0.includes('輸入整頁優化紀錄…') && e0.includes('pchomeOptlogPageCellEdit(this)'), '外層沒有紀錄 → 灰字、點了替整頁新增');
  const ed = C.pchomeOptlogCellInnerHTML([], { type: '調價', note: '' }, { esc, types: ['調價'], nameOf: u => u, page: true });
  ok(ed.includes('pchomeOptlogPageCellSave(this)') && !ed.includes('pchomeOptlogCellSave(') && ed.includes('pchomeOptlogCellCancel()'), '外層編輯中：Enter／✓ 存整頁、Esc／✕ 取消');
  const plain = C.pchomeOptlogCellInnerHTML(L, null, { esc, types: ['調價'], nameOf: u => u });
  ok(plain.includes('pchomeOptlogCellEdit(this)') && plain.includes('pchomeOptlogCellOpen(this)'), '不帶 page → 跟原本一樣（可新增、可開彈窗）'); }

// ── 真實資料（v3 備份）──
const BK = process.env.PCHOME_BACKUP_JSON;
if (BK) {
  const d = JSON.parse(fs.readFileSync(BK, 'utf8'));
  const dec = v => { if (v == null) return v; if ('stringValue' in v) return v.stringValue; if ('integerValue' in v) return Number(v.integerValue); if ('doubleValue' in v) return v.doubleValue; if ('booleanValue' in v) return v.booleanValue; if ('nullValue' in v) return null; if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec); if ('mapValue' in v) { const o = {}, f = v.mapValue.fields || {}; for (const k in f) o[k] = dec(f[k]); return o; } return v; };
  const list = dec(d['app/pchome_products'].fields.list);
  // 本賣場檢視：轉單＝主欄位；寄倉＝出貨方式清單含寄倉、蓋上 p.寄倉（同 pchomeShopView）
  const views = { 轉單: list.filter(p => !(p.出貨方式清單 || []).length || (p.出貨方式清單 || []).includes('轉單')), 寄倉: list.filter(p => (p.出貨方式清單 || []).includes('寄倉')).map(p => Object.assign({}, p, p.寄倉 || {})) };
  const res = {};
  for (const shop of ['轉單', '寄倉']) {
    const ps = views[shop], by = {}; ps.forEach(p => { by[p.料號] = p; });
    const g = P.pchomeGroupByPage(ps.map(p => ({ 料號: p.料號 })), r => P.pchomePageIdsOf(by[r.料號]));
    res[shop] = { g, by };
  }
  const t = res['轉單'].g, c = res['寄倉'].g;
  ok(t.stats.rows === 1011, '轉單 1011 個料號', String(t.stats.rows));
  const pagesT = t.items.length, multiT = t.stats.groups;
  // 商編共 323 個；雙頁料號歸到一頁後，DIAX8O-A900KJSTY（D46 十個）、DEBQEJ-A900KFR9M（F394 兩個）、DAAC0A-A900KI96D（F326-10）空掉，
  // E128-01 兩頁都只有它 → 一列。所以 323 − 4 ＝ 319 列、多規格頁 213 − 2 ＝ 211。
  eq([multiT, t.stats.maxMembers], [211, 15], '轉單：多規格頁 211、最大 15 規格（雙頁料號歸一頁後）');
  ok(pagesT === 319, '轉單：合併後 319 列', String(pagesT));
  const where = sku => { const it = t.items.find(x => x.type === 'group' ? x.members.some(m => m.料號 === sku) : x.row.料號 === sku); return it ? (it.type === 'group' ? it.pageId : 'single') : 'none'; };
  eq(['D46-11', 'D46-20', 'F394-03', 'F394-04', 'F326-10', 'E128-01'].map(where), ['DIAX8O-A900KGOYI', 'DIAX8O-A900KGOYI', 'DEBQEJ-A900KDYHE', 'DEBQEJ-A900KDYHE', 'DAAC0A-A900KKEJ0', 'single'], '雙頁料號歸屬');
  ok(Object.keys(t.multi).length === 14, '另掛 1 頁的料號 14 個', JSON.stringify(t.multi));
  ok(c.items.length === 16 && c.stats.maxMembers === 15, '寄倉 16 頁、最大 15', c.items.length + ' ' + c.stats.maxMembers);
  // 第一個規格：每組都找得到、規格碼是組內最小
  let bad = 0; t.items.filter(x => x.type === 'group').forEach(x => {
    const L = x.members.map(m => ({ 料號: m.料號, spec: P.pchomeSpecCodeOf(res['轉單'].by[m.料號], x.pageId) }));
    const an = P.pchomePageAnchor(L), min = L.map(l => l.spec).sort()[0];
    if (!an || P.pchomeSpecCodeOf(res['轉單'].by[an], x.pageId) !== min) bad++; });
  ok(bad === 0, '每一頁的第一個規格＝規格碼最小', String(bad));
  console.log('  (備份) 轉單 頁數 ' + pagesT + '、多規格 ' + multiT + '、雙頁 ' + Object.keys(t.multi).length + '；寄倉 頁數 ' + c.items.length);
}

console.log((fail ? '❌' : '✅') + ' pchome-page-merge：' + pass + ' 通過、' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
