#!/usr/bin/env node
// PChome 整頁優化紀錄（合併商品頁塊 3，2026-11-20）的 node 測試（只讀，不寫檔、不連網路）。
//
//   node scripts/pchome-optlog-page.test.cjs
//   PCHOME_BACKUP_JSON=<v3 備份檔> node scripts/pchome-optlog-page.test.cjs   ← 用真實優化紀錄跑等價性（不印內容）
//   PCHOME_BASE_REV=<commit>（預設 49ce741）＝改版前的版本，用 git show 取舊程式當對照
//
// 三個硬條件：
//   ① 沒有 page 的既有紀錄：顯示、同步合併、墓碑、工作日誌、新增的物件，跟改版前逐字相同。
//   ② 舊分頁（改版前的程式）讀到有 page 的紀錄：不會壞、不會刪掉或改掉它；搬移後也不會重複或復活。
//   ③ 推雲端後讀回確認（A-347）對新的整頁紀錄一樣有效（用假雲端跑 pchomeSyncOptlog 本體）。
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (cond, name, extra) => { if (cond) pass++; else { fail++; console.error('✗ ' + name + (extra ? '\n    ' + extra : '')); } };
const eq = (a, b, name) => ok(JSON.stringify(a) === JSON.stringify(b), name, '實際 ' + JSON.stringify(a).slice(0, 400) + '\n    預期 ' + JSON.stringify(b).slice(0, 400));

const NEW = fs.readFileSync(path.join(ROOT, 'js/profit.js'), 'utf8').replace(/\r\n/g, '\n');
const BASE = process.env.PCHOME_BASE_REV || '49ce741';
const OLD = cp.execSync('git show ' + BASE + ':js/profit.js', { cwd: ROOT, maxBuffer: 64 << 20 }).toString('utf8').replace(/\r\n/g, '\n');
const block = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('找不到區塊 ' + a); return src.slice(i, j); };
const fn = (src, name) => { const re = new RegExp('\\n((?:async )?function ' + name + '\\s*\\()'); const m = re.exec(src); if (!m) throw new Error('找不到函式 ' + name); const i = m.index + 1, j = src.indexOf('\n}\n', i); return src.slice(i, j + 2); };
const line = (src, re) => { const m = src.match(re); if (!m) throw new Error('找不到 ' + re); return m[0]; };

const tombNames = 'PCHOME_OL_TOMB_PREFIX, PCHOME_OL_TOMB_KEEP_MS, pchomeOptlogTombField, pchomeOptlogIsTombField, pchomeOptlogTombClean, pchomeOptlogTombUnion, pchomeOptlogTombCanon, pchomeOptlogTombApply, pchomeOptlogSyncPlan, pchomeOptlogWriteConfirmed';
const cellNames = 'pchomeOptlogLatest, pchomeOptlogCellView, pchomeOptlogCellInnerHTML';
const load = (src, isNew) => {
  let code = fn(src, 'pchomeMergeByIdMap') + '\n' + block(src, '// PCH-OLTOMB-PURE-BEGIN', '// PCH-OLTOMB-PURE-END') + '\n' + block(src, '// PCH-OLCELL-PURE-BEGIN', '// PCH-OLCELL-PURE-END');
  let names = 'pchomeMergeByIdMap, ' + tombNames + ', ' + cellNames;
  if (isNew) {
    code += '\n' + line(src, /^function pchomeBaseCode\(v\)\{.*\}$/m) + '\n' + block(src, '/* ═══ PCH-PG-PURE-BEGIN', '/* ═══ PCH-PG-PURE-END') + '\n' + block(src, '/* ═══ PCH-OLPAGE-PURE-BEGIN', '/* ═══ PCH-OLPAGE-PURE-END');
    names += ', pchomeOptlogPageList, pchomeOptlogMakeEntry, pchomeOptlogPageNewIds, pchomeOptlogPageConfirmed, pchomeOptlogPageMovePlan, pchomePageIdsOf, pchomeSpecCodeOf, pchomePageAnchor';
  }
  return new Function(code + '\nreturn { ' + names + ' };')();
};
const N = load(NEW, true), O = load(OLD, false);
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const TYPES = ['商品內容優化', '調價', '上下架', '相關商品', '影片', '五星好評', '做活動', '其他'];
const deps = { esc, types: TYPES, nameOf: u => ({ a: '甲' })[u] || u };
const clone = x => JSON.parse(JSON.stringify(x));

// ── 真實資料（沒有就用假資料）──
let cloudDoc;
const BK = process.env.PCHOME_BACKUP_JSON;
if (BK) {
  const d = JSON.parse(fs.readFileSync(BK, 'utf8'));
  const dec = v => { if (v == null) return v; if ('stringValue' in v) return v.stringValue; if ('integerValue' in v) return Number(v.integerValue); if ('doubleValue' in v) return v.doubleValue; if ('booleanValue' in v) return v.booleanValue; if ('nullValue' in v) return null; if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec); if ('mapValue' in v) { const o = {}, f = v.mapValue.fields || {}; for (const k in f) o[k] = dec(f[k]); return o; } return v; };
  cloudDoc = {}; const f = d['app/pchome_optlog'].fields; for (const k in f) cloudDoc[k] = dec(f[k]);
} else {
  cloudDoc = { 轉單: { S1: [{ id: 'p1', date: '2026-11-18', time: '10:00', shop: '轉單', sku: 'S1', by: 'a', type: '調價', note: 'x' }], S2: [{ id: 'p2', date: '2026-11-19', time: '09:00', shop: '轉單', sku: 'S2', by: 'b', type: '做活動', note: 'y' }, { date: '2026-11-01', note: '沒有 id 的舊紀錄' }] } };
}
const shop = '轉單', cloudOpt = cloudDoc[shop] || {};
const hasPageInData = Object.values(cloudOpt).some(a => (a || []).some(e => e && e.page));
ok(!hasPageInData, '（前提）資料裡還沒有任何 page 欄');
const skus = Object.keys(cloudOpt);
ok(skus.length > 0, '（前提）有優化紀錄可以比', String(skus.length));

// ═══ ① 沒有 page 的紀錄：跟改版前逐字相同 ═══
{ let same = 0, diff = [];
  skus.forEach(s => { const L = cloudOpt[s];
    const a = JSON.stringify(N.pchomeOptlogCellView(L, deps.nameOf)), b = JSON.stringify(O.pchomeOptlogCellView(L, deps.nameOf));
    const h1 = N.pchomeOptlogCellInnerHTML(L, null, deps), h2 = O.pchomeOptlogCellInnerHTML(L, null, deps);
    const e1 = N.pchomeOptlogCellInnerHTML(L, { type: '調價', note: 'z', warn: true }, deps), e2 = O.pchomeOptlogCellInnerHTML(L, { type: '調價', note: 'z', warn: true }, deps);
    if (a === b && h1 === h2 && e1 === e2) same++; else diff.push(s); });
  ok(diff.length === 0, '① 顯示：每個料號的格子（檢視＋編輯中）跟改版前逐字相同（' + same + ' 個料號）', diff.slice(0, 5).join(',')); }
eq(N.pchomeOptlogCellInnerHTML([], null, deps), O.pchomeOptlogCellInnerHTML([], null, deps), '① 顯示：沒有紀錄的格子相同');
{ // 同步合併：拿雲端當基準，模擬本機三種狀態（一樣、少幾筆＋多幾筆、本機有墓碑）
  const now = Date.parse('2026-11-20T00:00:00Z');
  const local1 = clone(cloudOpt);
  const local2 = clone(cloudOpt); const ks = Object.keys(local2); if (ks[0]) delete local2[ks[0]]; if (ks[1]) local2[ks[1]].push({ id: 'popt_new_1', date: '2026-11-20', time: '10:00', shop, sku: ks[1], by: 'a', type: '調價', note: '本機新加' });
  const firstId = (() => { for (const s of ks) for (const e of cloudOpt[s]) if (e && e.id) return e.id; return null; })();
  const tomb = firstId ? { [firstId]: { at: now - 1000, by: 'a' } } : {};
  [[local1, {}], [local2, {}], [local2, tomb]].forEach(([loc, tb], i) => {
    const pn = N.pchomeOptlogSyncPlan(cloudDoc, shop, loc, tb, now), po = O.pchomeOptlogSyncPlan(cloudDoc, shop, loc, tb, now);
    eq(pn, po, '① 同步合併 情境 ' + (i + 1) + '：合併結果、墓碑、要不要寫墓碑跟改版前相同');
    eq(N.pchomeOptlogPageNewIds(cloudDoc, shop, pn.merged), [], '① 同步 情境 ' + (i + 1) + '：沒有整頁紀錄 ⇒ 不多做讀回（走改版前的路徑）');
    eq(N.pchomeOptlogPageConfirmed([], shop, null), '', '① 沒有整頁紀錄時讀回確認一律放行');
  });
  eq(N.pchomeOptlogTombApply(cloudOpt, tomb), O.pchomeOptlogTombApply(cloudOpt, tomb), '① 墓碑套用跟改版前相同');
  eq(N.pchomeMergeByIdMap(cloudOpt, local2), O.pchomeMergeByIdMap(cloudOpt, local2), '① 依 id 聯集跟改版前相同'); }
{ // 新增的物件：不帶 page ⇒ 跟改版前 pchomeAddOptlog 寫死的物件逐字相同（key 順序也一樣）
  const old = { id: 'popt_1_2', date: '2026-11-20', time: '10:00', shop: '轉單', sku: 'S1', by: 'a', type: '調價', note: 'n' };
  eq(N.pchomeOptlogMakeEntry('轉單', 'S1', { type: '調價', note: 'n' }, 'a', '2026-11-20', '10:00', 'popt_1_2'), old, '① 新增：沒帶 page 的物件跟改版前一樣');
  eq(N.pchomeOptlogMakeEntry('轉單', 'S1', {}, 'a', 'd', 't', 'i'), { id: 'i', date: 'd', time: 't', shop: '轉單', sku: 'S1', by: 'a', type: '其他', note: '' }, '① 新增：沒有類型 → 其他、沒有內容 → 空字串（同改版前）');
  const pe = N.pchomeOptlogMakeEntry('轉單', 'S1', { type: '調價', note: 'n', page: 'P-A' }, 'a', '2026-11-20', '10:00', 'x');
  eq(Object.keys(pe), ['id', 'date', 'time', 'shop', 'sku', 'by', 'type', 'note', 'page'], '整頁紀錄：只在最後多一個 page');
  const addOld = fn(OLD, 'pchomeAddOptlog'), addNew = fn(NEW, 'pchomeAddOptlog');
  ok(/id:'popt_'\+Date\.now\(\)\+'_'\+Math\.floor\(Math\.random\(\)\*100000\), date:momoNowParts\(\)\.date, time:momoNowParts\(\)\.time, shop:shop, sku:sku, by:by, type:\(entry&&entry\.type\)\|\|'其他', note:\(entry&&entry\.note\)\|\|''/.test(addOld), '（對照）改版前 pchomeAddOptlog 的物件寫法');
  ok(addNew.includes("pchomeOptlogMakeEntry(shop, sku, entry, by, momoNowParts().date, momoNowParts().time, 'popt_'+Date.now()+'_'+Math.floor(Math.random()*100000))"), '新 pchomeAddOptlog 用同一組 id／日期／時間產生方式'); }
{ // 工作日誌：計數函式沒有改（一筆紀錄算一次 ⇒ 整頁紀錄只記一筆就只算 1）
  eq(fn(NEW, 'pchomeOptlogTodayCounts'), fn(OLD, 'pchomeOptlogTodayCounts'), '① 工作日誌計數 pchomeOptlogTodayCounts 跟改版前一字不差');
  eq(fn(NEW, 'pchomeUpdateDailyProgress'), fn(OLD, 'pchomeUpdateDailyProgress'), '① 工作日誌寫入 pchomeUpdateDailyProgress 跟改版前一字不差');
  const dpN = fn(NEW, 'pchomeOpenDpDetail'), dpO = fn(OLD, 'pchomeOpenDpDetail');
  eq(dpN.replace("name:(nameBy[sku]||'')+(e.page?'（整頁）':'')", "name:nameBy[sku]||''").replace(/   \/\/ 整頁紀錄只有一筆.*\n/, '\n'), dpO, '① 工作日誌明細：只多了「有 page 才標（整頁）」，其他一字不差');
  // 合併／同步主體：只多了整頁讀回那幾行
  const syN = fn(NEW, 'pchomeSyncOptlog');
  ok(syN.includes('if(plan.hasTomb&&snap&&snap.metadata&&snap.metadata.fromCache)') && syN.includes('pchomeOptlogWriteConfirmed(plan, shop, vd)'), '① 同步主體：原本的快取檢查、讀回確認都還在'); }
{ // 商品彈窗的列：沒有 page ⇒ 多出來的那一段是空字串
  const sec = fn(NEW, 'pchomeRenderOptlogSection');
  ok(sec.includes("+(e.page?'<span class=\"pch-ol-page\"") && sec.includes(":'')   // 沒有 page 的紀錄"), '① 商品彈窗：只有 page 的紀錄多一個「整頁」標籤'); }

// ═══ ② 舊分頁讀到有 page 的紀錄 ═══
const pageEntry = { id: 'popt_page_1', date: '2026-11-20', time: '11:00', shop, sku: skus[0], by: 'a', type: '商品內容優化', note: '整頁換主圖', page: 'DDBK72-A900KK915' };
const cloudWithPage = clone(cloudDoc); (cloudWithPage[shop][skus[0]] = cloudWithPage[shop][skus[0]] || []).push(clone(pageEntry));
{ const now = Date.now();
  // 舊分頁本機沒有這筆（還沒拿到）→ 同步：照舊依 id 聯集，page 欄原封不動留著
  const p1 = O.pchomeOptlogSyncPlan(cloudWithPage, shop, clone(cloudOpt), {}, now);
  const got = (p1.merged[skus[0]] || []).find(e => e.id === pageEntry.id);
  eq(got, pageEntry, '② 舊分頁同步（本機沒有那筆）：整頁紀錄留著、內容一字不差（含 page）');
  // 舊分頁本機有舊版本的同一筆（拿掉 page，模擬舊分頁自己的副本）→ 同 id 保留雲端那份
  const loc = clone(cloudOpt); (loc[skus[0]] = loc[skus[0]] || []).push(Object.assign({}, pageEntry, { page: undefined }));
  const p2 = O.pchomeOptlogSyncPlan(cloudWithPage, shop, loc, {}, now);
  eq((p2.merged[skus[0]] || []).find(e => e.id === pageEntry.id), pageEntry, '② 舊分頁同步（同 id）：保留雲端那份，page 沒被蓋掉');
  ok(Object.keys(p2.merged).reduce((s, k) => s + p2.merged[k].length, 0) === Object.keys(cloudWithPage[shop]).reduce((s, k) => s + cloudWithPage[shop][k].length, 0), '② 舊分頁同步：筆數不變（沒有刪掉也沒有多一筆）');
  // 舊分頁顯示：不會壞
  let okRender = true; try { O.pchomeOptlogCellInnerHTML(cloudWithPage[shop][skus[0]], null, deps); O.pchomeOptlogCellView(cloudWithPage[shop][skus[0]], deps.nameOf); } catch (e) { okRender = false; }
  ok(okRender, '② 舊分頁畫格子不會壞');
  ok(O.pchomeOptlogCellInnerHTML([pageEntry], null, deps).includes('整頁換主圖'), '② 舊分頁照樣顯示內容（只是沒有「整頁」標籤）');
  // 舊分頁套用雲端墓碑：沒有墓碑 ⇒ 原物件
  ok(O.pchomeOptlogTombApply(cloudWithPage[shop], {}).map === cloudWithPage[shop], '② 舊分頁套用雲端（沒有墓碑）：原物件、不動'); }
{ // 搬移後：舊分頁本機還有舊料號底下那筆 → 不會重複、不會復活
  const prods = [{ 料號: 'C52-08', 商品編號: ['DDBK72-A900KK915-001'] }, { 料號: 'C52-04', 商品編號: ['DDBK72-A900KK915-002'] }, { 料號: 'C52-01', 商品編號: ['DDBK72-A900KK915-007'] }];
  const pe = Object.assign({}, pageEntry, { sku: 'C52-08' });
  const cloud = { [shop]: { 'C52-08': [clone(pe), { id: 'own1', date: '2026-11-10', time: '09:00', shop, sku: 'C52-08', by: 'a', type: '調價', note: '這個規格自己的' }] } };
  let k = 0; const mv = N.pchomeOptlogPageMovePlan(cloud[shop]['C52-08'], prods.filter(p => p.料號 !== 'C52-08'), () => 'popt_mv_' + (++k));
  eq(mv.moves.map(m => [m.from.id, m.to, m.entry.id, m.entry.sku, m.entry.movedFrom, m.entry.page, m.entry.note]), [['popt_page_1', 'C52-04', 'popt_mv_1', 'C52-04', 'popt_page_1', 'DDBK72-A900KK915', '整頁換主圖']], '搬移：整頁紀錄搬到剩下規格碼最小的（-002）、換新 id、記 movedFrom');
  eq(mv.drop, [], '搬移：同頁還有規格 ⇒ 不丟');
  ok(mv.moves[0].from === cloud[shop]['C52-08'][0] && cloud[shop]['C52-08'][0].id === 'popt_page_1', '搬移：不改動原本的紀錄物件');
  // 本機（新程式）：舊 id 進墓碑、新料號多新那筆、舊料號整個刪掉 → 同步
  const local = { 'C52-04': [mv.moves[0].entry] }, tomb = { popt_page_1: { at: Date.now(), by: 'a' } };
  const pn = N.pchomeOptlogSyncPlan(cloud, shop, local, tomb, Date.now());
  const ids = Object.values(pn.merged).flat().map(e => e.id).sort();
  eq(ids, ['own1', 'popt_mv_1'], '搬移後同步（新程式）：只剩新 id 那筆＋規格自己的紀錄（雲端舊料號那筆被墓碑濾掉、沒復活）');
  eq(N.pchomeOptlogPageNewIds(cloud, shop, pn.merged), ['popt_mv_1'], '搬移後同步：新 id 那筆要讀回確認');
  // 雲端寫完之後的樣子
  const after = { [shop]: pn.merged, ['_tomb_' + shop]: pn.tomb };
  eq(N.pchomeOptlogWriteConfirmed(pn, shop, after), '', '搬移後讀回（A-347）：舊 id 不在、墓碑在');
  eq(N.pchomeOptlogPageConfirmed(['popt_mv_1'], shop, after), '', '搬移後讀回：新 id 在');
  // 舊分頁（改版前程式，有墓碑功能）本機還有舊料號那筆、又按同步
  const oldLocal = clone(cloud[shop]);
  const po = O.pchomeOptlogSyncPlan(after, shop, oldLocal, {}, Date.now());
  const oids = Object.values(po.merged).flat().map(e => e.id).sort();
  eq(oids, ['own1', 'popt_mv_1'], '② 舊分頁本機還有舊那筆、又同步：墓碑濾掉、不重複、不復活');
  ok(!po.writeTomb, '② 舊分頁不會改動雲端墓碑');
  // 整頁都刪光 ⇒ 跟著刪（drop）
  const mv2 = N.pchomeOptlogPageMovePlan([pe], [], () => 'z');
  eq([mv2.moves.length, mv2.drop.map(e => e.id)], [0, ['popt_page_1']], '整頁都刪光 ⇒ 整頁紀錄跟著刪（不搬）');
  // 沒有 page 的紀錄不搬
  eq(N.pchomeOptlogPageMovePlan([{ id: 'own1', note: 'x' }], prods, () => 'z'), { moves: [], drop: [] }, '沒有 page 的紀錄：不搬也不列入 drop（照舊跟著料號刪）'); }

// ═══ ③ 推雲端後讀回確認：用假雲端跑 pchomeSyncOptlog 本體 ═══
async function runSync(src, opts) {
  const cloud = clone(opts.cloud), calls = [];
  let mem = clone(opts.local), lsTomb = clone(opts.tomb || {});
  const ctx = {
    window: { __cloudPchomeOptlog: {
      getDoc: async () => { calls.push('get'); const d = clone(cloud); return { exists: () => true, data: () => d, metadata: { fromCache: false } }; },
      setField: async (k, v) => { calls.push('set:' + k); cloud[k] = opts.dropPage ? JSON.parse(JSON.stringify(v), (kk, vv) => (vv && typeof vv === 'object' && !Array.isArray(vv) && vv.page) ? undefined : vv) : clone(v); if (opts.dropPage && k === shop) { Object.keys(cloud[k]).forEach(s => { cloud[k][s] = (cloud[k][s] || []).filter(Boolean); }); } } } },
    pchomeOptlogTombLoad: () => clone(lsTomb), pchomeOptlogTombSave: (s, t) => { lsTomb = clone(t); return true; },
    pchomeLoadOptlog: () => mem, momoFsSanitizeDeep: x => x, pchomeOptlogKey: s => 'ec_pchome_optlog|' + s,
    localStorage: { setItem: () => {} }, Store: {}, pchomeUpdateDailyProgress: () => {}, PCHOME_OPTLOG_DP_SHOPS: [], pchomeOptlogCellsRefreshAll: () => {}, console: { error: () => {}, warn: () => {}, log: () => {} } };
  const lib = src === NEW ? N : O;
  const keys = Object.keys(ctx), body = fn(src, 'pchomeSyncOptlog');
  const f = new Function(...keys, ...Object.keys(lib), body + '\nreturn pchomeSyncOptlog;')(...keys.map(k => ctx[k]), ...Object.values(lib));
  let err = null, ret; try { ret = await f(shop); } catch (e) { err = String(e.message || e); }
  return { calls, err, ret, cloud };
}
(async () => {
  // 沒有 page：新舊同步主體的雲端呼叫順序、結果完全一樣
  const loc = clone(cloudOpt); const k0 = Object.keys(loc)[0]; loc[k0].push({ id: 'popt_x', date: '2026-11-20', time: '12:00', shop, sku: k0, by: 'a', type: '調價', note: '新' });
  for (const [name, tomb] of [['沒有墓碑', {}], ['有墓碑', (() => { const id = (cloudOpt[k0] || [])[0] && cloudOpt[k0][0].id; return id ? { [id]: { at: Date.now(), by: 'a' } } : {}; })()]]) {
    const a = await runSync(NEW, { cloud: cloudDoc, local: loc, tomb }), b = await runSync(OLD, { cloud: cloudDoc, local: loc, tomb });
    eq([a.calls, a.err, a.ret, a.cloud], [b.calls, b.err, b.ret, b.cloud], '① 同步主體（' + name + '、沒有 page）：雲端呼叫順序、寫進去的內容、回傳值跟改版前一樣');
  }
  // 有新的整頁紀錄：寫完多讀回一次；雲端真的有 ⇒ 成功
  const locP = clone(cloudOpt); (locP[k0] = locP[k0] || []).push(clone(pageEntry));
  const r1 = await runSync(NEW, { cloud: cloudDoc, local: locP });
  eq([r1.err, r1.calls], [null, ['get', 'set:' + shop, 'get']], '③ 新的整頁紀錄：寫完讀回確認、成功');
  ok(Object.values(r1.cloud[shop]).flat().some(e => e.id === pageEntry.id && e.page === pageEntry.page), '③ 雲端有那筆整頁紀錄（含 page）');
  // 雲端沒存到（寫入被吃掉）⇒ 丟錯（待同步留著）
  const r2 = await runSync(NEW, { cloud: cloudDoc, local: locP, dropPage: true });
  ok(r2.err && r2.err.includes('寫入未確認') && r2.err.includes('整頁紀錄有 1 筆沒寫進雲端'), '③ 雲端沒存到 ⇒ 丟「寫入未確認」，不當成功', String(r2.err));
  // 改版前的程式在同樣情況：不讀回、當成功（這就是為什麼要補）
  const r3 = await runSync(OLD, { cloud: cloudDoc, local: locP, dropPage: true });
  eq([r3.err, r3.calls], [null, ['get', 'set:' + shop]], '（對照）改版前：沒有刪除就不讀回');
  // 有刪除＋整頁紀錄：只讀回一次，兩種都檢查
  const id0 = (cloudOpt[k0] || [])[0] && cloudOpt[k0][0].id;
  if (id0) { const r4 = await runSync(NEW, { cloud: cloudDoc, local: locP, tomb: { [id0]: { at: Date.now(), by: 'a' } } });
    eq([r4.err, r4.calls], [null, ['get', 'set:_tomb_' + shop, 'set:' + shop, 'get']], '③ 有刪除＋整頁紀錄：讀回一次、兩種都過');
    const r5 = await runSync(NEW, { cloud: cloudDoc, local: locP, tomb: { [id0]: { at: Date.now(), by: 'a' } }, dropPage: true });
    ok(r5.err && r5.err.includes('整頁紀錄'), '③ 有刪除＋整頁紀錄沒存到 ⇒ 丟錯', String(r5.err)); }
  console.log((fail ? '❌' : '✅') + ' pchome-optlog-page：' + pass + ' 通過、' + fail + ' 失敗' + (BK ? '（含備份真實資料 ' + skus.length + ' 個料號）' : ''));
  process.exit(fail ? 1 : 0);
})();
