#!/usr/bin/env node
// PChome 優化紀錄刪除墓碑（2026-11-19）的 node 測試（只讀，不寫檔、不連網路）。
//
//   node scripts/pchome-optlog-tomb.test.cjs
//   PCHOME_BACKUP_JSON=<v3 備份檔> node scripts/pchome-optlog-tomb.test.cjs   ← 等價性另外用真實資料跑（不印內容）
//
// 做法：把 js/profit.js 的優化紀錄資料層整段（合併、讀寫、墓碑、pchomeSyncOptlog、雲端套用、pchomeDeleteOptlog）放進假環境執行，
//   每台「電腦」有自己的 localStorage／Store，共用一份假的雲端文件（setField＝真的改那份文件）。
// 🔴 等價性：同樣的情境另外用【修改前】的程式（git show <基準>:js/profit.js，預設 2026-11-19-938 的 0439fc7）跑一次，
//   比對「寫進雲端的每一次 setField（欄位與內容的 JSON）」「寫回本機的 localStorage」「記憶體」「回傳值」要逐字相同。
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (cond, name, extra) => { if (cond) pass++; else { fail++; console.error('✗ ' + name + (extra ? '\n    ' + extra : '')); } };
const eq = (a, b, name) => ok(JSON.stringify(a) === JSON.stringify(b), name, '實際 ' + JSON.stringify(a).slice(0, 400) + '\n    預期 ' + JSON.stringify(b).slice(0, 400));

const NEW_SRC = fs.readFileSync(path.join(ROOT, 'js/profit.js'), 'utf8').replace(/\r\n/g, '\n');
const BASE = process.env.PCHOME_TOMB_BASE || '0439fc7';
let OLD_SRC = null;
try { OLD_SRC = cp.execSync('git show ' + BASE + ':js/profit.js', { cwd: ROOT, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8').replace(/\r\n/g, '\n'); }
catch (e) { console.log('（讀不到基準版 ' + BASE + ' 的 js/profit.js，等價性只能跳過）'); }

const fnSrc = (src, name) => { const i = src.indexOf('\nfunction ' + name + '('); if (i < 0) throw new Error('找不到 ' + name); const nl = src.indexOf('\n', i + 1);
  const line = src.slice(i + 1, nl); if (/\}\s*(\/\/.*)?$/.test(line) && (line.match(/\{/g) || []).length === (line.match(/\}/g) || []).length) return line;   // 單行函式
  return src.slice(i + 1, src.indexOf('\n}\n', i) + 2); };
// 優化紀錄資料層那一段：從 PCHOME_OPTLOG_TYPES 到雲端套用函式結束
const layer = src => { const a = src.indexOf('var PCHOME_OPTLOG_TYPES=MOMO_OPTLOG_TYPES;'), b = src.indexOf("window.__cloudDrainLatest('__pchomeOptlogCloudLatest'"); if (a < 0 || b < a) throw new Error('找不到優化紀錄資料層'); return src.slice(a, b); };
const clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));

// 假雲端：一份文件。getDoc 回深拷貝；setField 真的寫（可關掉＝模擬寫入被擋）。
function makeCloud(doc) {
  const c = { doc: doc === null ? null : clone(doc || {}), log: [], reads: 0, writable: true, fromCache: false };
  c.api = {
    getDoc: async () => { c.reads++; const d = c.doc === null ? null : clone(c.doc); return { exists: () => d !== null, data: () => d, metadata: { fromCache: c.fromCache } }; },
    setField: async (k, v) => { c.log.push([k, JSON.stringify(v)]); if (!c.writable) return; if (c.doc === null) c.doc = {}; c.doc[k] = clone(v); },
  };
  return c;
}
// 一台電腦
function makeMachine(src, cloud, user, nowRef) {
  const ls = new Map(); const lsLog = [];
  const localStorage = { getItem: k => ls.has(k) ? ls.get(k) : null, setItem: (k, v) => { ls.set(k, String(v)); lsLog.push(['set', k, String(v)]); }, removeItem: k => { ls.delete(k); lsLog.push(['del', k]); } };
  const Store = { _profitMem: {}, _mem: {} };
  const dirty = new Set();
  const window = { __cloudPchomeOptlog: cloud.api, App: { currentUser: { username: user } } };
  const FakeDate = { now: () => nowRef.t };
  let seq = 0;
  const body = layer(src) + '\n' + fnSrc(src, 'pchomeDeleteOptlog') + '\n' + fnSrc(src, 'momoFsSanitizeDeep') + '\n' + fnSrc(src, 'momoFsSafeKey')
    + '\nreturn { pchomeSyncOptlog, pchomeLoadOptlog, pchomeSaveOptlog, pchomeDeleteOptlog, apply: window.__pchomeApplyCloudOptlog,'
    + ' pure: (typeof pchomeOptlogSyncPlan==="function") ? { pchomeOptlogSyncPlan, pchomeOptlogTombApply, pchomeOptlogTombUnion, pchomeOptlogTombClean, pchomeOptlogWriteConfirmed, pchomeOptlogTombField, pchomeOptlogIsTombField, pchomeOptlogPendingDeletes, pchomeOptlogTombLoad, PCHOME_OL_TOMB_KEEP_MS } : null };';
  const api = new Function('window', 'localStorage', 'Store', 'Date', 'console', 'MOMO_OPTLOG_TYPES', 'momoNowParts', '_markPending', 'pchomeDirtyAdd', 'pchomeDirtyGet',
    'pchomeUpdateDailyProgress', 'pchomeOptlogClearCache', 'pchomeRefreshSyncBtn', 'pchomeRenderOptlogSection', 'pchomeOptlogCellRefresh', 'pchomeOptlogCellsRefreshAll', 'PCHOME_OPTLOG_DP_SHOPS', 'TextEncoder', body)(
    window, localStorage, Store, FakeDate, { error() {}, warn() {}, log() {} }, ['調價', '其他'], () => ({ date: '2026-11-19', time: '10:00' }), k => dirty.add(k), k => dirty.add(k), () => [...dirty],
    () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, ['轉單', '寄倉'], TextEncoder);
  const m = { ls, lsLog, Store, dirty, window, api, cloud,
    setLocal(shop, map) { const k = 'ec_pchome_optlog|' + shop; ls.set(k, JSON.stringify(map)); Store._profitMem[k] = clone(map); Store._mem[k] = Store._profitMem[k]; },
    local(shop) { return api.pchomeLoadOptlog(shop); },
    ids(shop) { const mp = m.local(shop) || {}; return Object.keys(mp).flatMap(s => mp[s].map(e => e.id)).sort(); },
    add(shop, sku, note) { const mp = api.pchomeLoadOptlog(shop); const id = 'popt_' + user + '_' + (++seq); (mp[sku] = mp[sku] || []).push({ id, date: '2026-11-19', time: '10:0' + (seq % 10), shop, sku, by: user, type: '調價', note: note || id }); api.pchomeSaveOptlog(shop, mp); return id; },
    del(shop, sku, id) { const arr = (api.pchomeLoadOptlog(shop) || {})[sku] || []; const idx = arr.findIndex(e => e.id === id); if (idx < 0) throw new Error('本機沒有 ' + id); api.pchomeDeleteOptlog(shop, sku, idx, id); },
    async sync(shop) { const r = await api.pchomeSyncOptlog(shop); dirty.delete('ec_pchome_optlog|' + shop); return r; },   // 成功才清待同步（同 syncToCloud）
    pull() { api.apply(clone(cloud.doc || {})); },   // 雲端訂閱套用到本機
  };
  return m;
}
const cloudIds = (cloud, shop) => { const mp = (cloud.doc || {})[shop] || {}; return Object.keys(mp).flatMap(s => mp[s].map(e => e.id)).sort(); };
const E = (id, sku, date, time, note, by) => ({ id, date: date || '2026-11-10', time: time || '09:00', shop: '轉單', sku, by: by || 'u1', type: '調價', note: note || id });

(async () => {
  const T0 = Date.UTC(2026, 10, 19, 12), DAY = 86400000;

  // ═══ 2d 等價性：墓碑都空 ⇒ 寫雲端、寫本機、記憶體、回傳值跟修改前逐字相同 ═══
  let real = null;
  if (process.env.PCHOME_BACKUP_JSON) {
    const raw = JSON.parse(fs.readFileSync(process.env.PCHOME_BACKUP_JSON, 'utf8'));
    const dec = v => { if (!v || typeof v !== 'object') return v; if ('stringValue' in v) return v.stringValue; if ('integerValue' in v) return Number(v.integerValue); if ('doubleValue' in v) return v.doubleValue;
      if ('booleanValue' in v) return v.booleanValue; if ('nullValue' in v) return null; if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
      if ('mapValue' in v) { const o = {}; Object.keys(v.mapValue.fields || {}).forEach(k => { o[k] = dec(v.mapValue.fields[k]); }); return o; } return v; };
    const d = raw['app/pchome_optlog']; if (d && d.fields) real = dec({ mapValue: { fields: d.fields } });
  }
  const synth = { '轉單': { A: [E('a1', 'A', '2026-11-01'), E('a2', 'A', '2026-11-03')], B: [E('b1', 'B', '2026-11-02')], C: [E('c1', 'C'), E('c2', 'C', '2026-11-10', '09:00'), E('c3', 'C', '2026-10-01')] },
    '寄倉': { J: [Object.assign(E('j1', 'J'), { shop: '寄倉' })] } };
  const docs = [['合成資料', synth]]; if (real) docs.push(['備份真實資料', real]);
  // 本機差異情境：給雲端那一欄，回本機內容
  const firstSku = m => Object.keys(m)[0], lastSku = m => Object.keys(m)[Object.keys(m).length - 1];
  const VARIANTS = {
    '本機＝雲端': c => clone(c),
    '本機是空的': () => ({}),
    '本機新增兩筆（舊料號＋新料號）': c => { const l = clone(c); const s = firstSku(l) || 'NEW0'; (l[s] = l[s] || []).push(E('popt_new_1', s, '2026-11-19', '18:00', '本機新增')); l['ZZ-NEW'] = [E('popt_new_2', 'ZZ-NEW', '2026-11-19', '18:01', '新料號')]; return l; },
    '本機少一筆（以前的刪除：沒有墓碑）': c => { const l = clone(c); const s = firstSku(l); if (s) { l[s].shift(); if (!l[s].length) delete l[s]; } return l; },
    '本機少一個料號': c => { const l = clone(c); const s = lastSku(l); if (s) delete l[s]; return l; },
    '同 id 內容不同（保留雲端）': c => { const l = clone(c); const s = firstSku(l); if (s) l[s][0] = Object.assign({}, l[s][0], { note: '本機改過的字' }); return l; },
    '本機順序顛倒＋多一筆沒有 id 的': c => { const l = clone(c); Object.keys(l).forEach(s => l[s].reverse()); const s = firstSku(l) || 'N0'; (l[s] = l[s] || []).push({ date: '2026-01-01', time: '', shop: '轉單', sku: s, by: '', type: '其他', note: '沒有 id 的舊紀錄' }); return l; },
    '本機有壞資料（料號的值不是陣列）': c => { const l = clone(c); l['BAD'] = 'x'; return l; },
  };
  let eqRuns = 0;
  if (OLD_SRC) {
    for (const [docName, doc0] of docs) for (const shop of ['轉單', '寄倉']) for (const [vName, mk] of Object.entries(VARIANTS)) for (const cloudCase of ['有文件', '沒有這份文件']) {
      const doc = cloudCase === '有文件' ? doc0 : null; const cloudShop = (doc && doc[shop]) || {};
      const run = async src => { const cloud = makeCloud(doc), M = makeMachine(src, cloud, 'u1', { t: T0 }); M.setLocal(shop, mk(cloudShop)); M.lsLog.length = 0;
        const ret = await M.sync(shop); return { ret, writes: cloud.log, reads: cloud.reads, ls: M.lsLog, mem: JSON.stringify(M.Store._profitMem), mem2: JSON.stringify(M.Store._mem), doc: JSON.stringify(cloud.doc) }; };
      const o = await run(OLD_SRC), n = await run(NEW_SRC); eqRuns++;
      const label = '等價：' + docName + '｜' + shop + '｜' + vName + '｜雲端' + cloudCase;
      ok(JSON.stringify(o.writes) === JSON.stringify(n.writes), label + '：寫進雲端的內容相同', '舊 ' + o.writes.map(w => w[0] + ':' + w[1].length).join(',') + ' 新 ' + n.writes.map(w => w[0] + ':' + w[1].length).join(','));
      ok(JSON.stringify(o.ls) === JSON.stringify(n.ls), label + '：寫回本機的內容相同');
      ok(o.mem === n.mem && o.mem2 === n.mem2, label + '：記憶體相同');
      ok(o.ret === n.ret && o.reads === n.reads && o.doc === n.doc, label + '：回傳值、讀取次數、雲端最後內容相同');
      ok(n.writes.length === 1 && n.writes[0][0] === shop, label + '：只寫通路那一欄（沒有寫墓碑欄）');
    }
    // 雲端套用（訂閱）：沒有墓碑欄時，記憶體相同、而且用的是雲端那個物件本身
    for (const [docName, doc0] of docs) {
      const run = src => { const M = makeMachine(src, makeCloud(doc0), 'u1', { t: T0 }); const data = clone(doc0); M.api.apply(data); return { mem: JSON.stringify(M.Store._profitMem), same: Object.keys(data).every(s => M.Store._profitMem['ec_pchome_optlog|' + s] === data[s]) }; };
      const o = run(OLD_SRC), n = run(NEW_SRC); ok(o.mem === n.mem && o.same && n.same, '等價：' + docName + '｜雲端套用到本機相同（同一個物件）');
    }
    console.log('等價性：' + eqRuns + ' 個情境' + (real ? '（含備份真實資料：轉單 ' + Object.values(real['轉單'] || {}).reduce((s, x) => s + x.length, 0) + ' 筆、寄倉 ' + Object.values(real['寄倉'] || {}).reduce((s, x) => s + x.length, 0) + ' 筆）' : '（沒有給 PCHOME_BACKUP_JSON，只跑合成資料）'));
  }

  // ═══ 舊分頁（修改前的程式）遇到墓碑欄不會壞 ═══
  if (OLD_SRC) {
    const doc = clone(synth); doc['_tomb_轉單'] = { a1: { at: T0, by: 'u1' } }; delete doc['轉單'].A; doc['轉單'].A = [E('a2', 'A', '2026-11-03')];
    const cloud = makeCloud(doc), O = makeMachine(OLD_SRC, cloud, 'old', { t: T0 });
    let threw = null; try { O.api.apply(clone(doc)); } catch (e) { threw = e; }
    ok(!threw, '舊分頁：套用含墓碑欄的雲端資料不會丟例外');
    eq(O.ids('轉單'), ['a2', 'b1', 'c1', 'c2', 'c3'], '舊分頁：通路資料照常讀到');
    eq(Object.keys(O.Store._profitMem).sort(), ['ec_pchome_optlog|_tomb_轉單', 'ec_pchome_optlog|寄倉', 'ec_pchome_optlog|轉單'], '舊分頁：只多一把沒有人讀的記憶體 key');
    ok(![...O.ls.keys()].length, '舊分頁：套用時不寫 localStorage');
    O.add('轉單', 'B', '舊分頁新增'); await O.sync('轉單');
    eq(cloud.log.map(w => w[0]), ['轉單'], '舊分頁同步：只寫通路那一欄');
    eq(cloud.doc['_tomb_轉單'], { a1: { at: T0, by: 'u1' } }, '舊分頁同步：墓碑欄原封不動');
    // 舊分頁本機還留著被刪的那筆 → 會把它寫回雲端；新版套用與下一次同步會再濾掉
    const cloud2 = makeCloud(doc), O2 = makeMachine(OLD_SRC, cloud2, 'old', { t: T0 }); O2.setLocal('轉單', synth['轉單']); O2.add('轉單', 'B', 'x'); await O2.sync('轉單');
    ok(cloudIds(cloud2, '轉單').includes('a1'), '（已知）舊分頁本機還有被刪的那筆時，同步會把它寫回雲端');
    const N2 = makeMachine(NEW_SRC, cloud2, 'new', { t: T0 }); N2.pull(); ok(!N2.ids('轉單').includes('a1'), '…新版套用雲端資料時不顯示它');
    N2.add('轉單', 'B', 'y'); await N2.sync('轉單'); ok(!cloudIds(cloud2, '轉單').includes('a1'), '…新版下一次同步把它從雲端濾掉');
  }

  // ═══ 墓碑行為（新程式）═══
  const now = { t: T0 };
  const two = () => { const cloud = makeCloud(synth); const A = makeMachine(NEW_SRC, cloud, 'ua', now), B = makeMachine(NEW_SRC, cloud, 'ub', now); A.pull(); B.pull(); A.setLocal('轉單', synth['轉單']); B.setLocal('轉單', synth['轉單']); A.setLocal('寄倉', synth['寄倉']); B.setLocal('寄倉', synth['寄倉']); return { cloud, A, B }; };
  const P = makeMachine(NEW_SRC, makeCloud({}), 'x', now).api.pure;

  { // 刪一筆已上雲的 → 同步後不在結果裡
    const { cloud, A } = two(); A.del('轉單', 'A', 'a1');
    ok(!A.ids('轉單').includes('a1') && A.dirty.has('ec_pchome_optlog|轉單'), '刪除：本機立刻消失、標待同步');
    eq(JSON.parse(A.ls.get('pchome_optlog_tomb|轉單')), { a1: { at: T0, by: 'ua' } }, '刪除：墓碑記 id、刪除時間、刪除人');
    cloud.log.length = 0; await A.sync('轉單');
    eq(cloud.log.map(w => w[0]), ['_tomb_轉單', '轉單'], '同步：先寫墓碑欄、再寫通路欄');
    ok(!cloudIds(cloud, '轉單').includes('a1'), '同步後雲端沒有被刪的那筆'); eq(cloudIds(cloud, '轉單'), ['a2', 'b1', 'c1', 'c2', 'c3'], '其他紀錄都還在');
    eq(cloud.doc['_tomb_轉單'], { a1: { at: T0, by: 'ua' } }, '雲端墓碑欄有那個 id');
    ok(!A.ids('轉單').includes('a1') && !A.dirty.size, '同步後本機沒有它、待同步清掉');
    eq(cloud.doc['寄倉'], synth['寄倉'], '寄倉那一欄沒被動到'); ok(!('_tomb_寄倉' in cloud.doc), '沒有寫寄倉的墓碑欄');
    cloud.log.length = 0; A.add('轉單', 'B', '之後再同步'); await A.sync('轉單'); eq(cloud.log.map(w => w[0]), ['轉單'], '墓碑沒變時不重寫墓碑欄'); ok(!cloudIds(cloud, '轉單').includes('a1'), '之後再同步也不會回來');
  }
  { // A 台刪、B 台本機還留著那筆且 B 有別的待同步
    const { cloud, A, B } = two(); const nb = B.add('轉單', 'B', 'B 台新增'); A.del('轉單', 'A', 'a1'); await A.sync('轉單');
    ok(B.ids('轉單').includes('a1'), '（前提）B 台本機還留著 a1'); B.pull(); ok(B.ids('轉單').includes('a1'), '（前提）B 台有待同步，雲端更新不覆蓋本機');
    await B.sync('轉單');
    ok(!cloudIds(cloud, '轉單').includes('a1') && !B.ids('轉單').includes('a1'), 'B 台同步後 a1 沒有回來（雲端、B 台本機都沒有）');
    ok(cloudIds(cloud, '轉單').includes(nb) && B.ids('轉單').includes(nb), 'B 台自己新增的還在');
    eq(JSON.parse(B.ls.get('pchome_optlog_tomb|轉單')), { a1: { at: T0, by: 'ua' } }, 'B 台本機墓碑跟雲端對齊');
    A.pull(); eq(A.ids('轉單'), cloudIds(cloud, '轉單'), 'A 台收到雲端更新後跟雲端一致');
  }
  { // 兩台同時各刪不同筆
    const { cloud, A, B } = two(); A.del('轉單', 'A', 'a1'); B.del('轉單', 'C', 'c2'); await A.sync('轉單'); await B.sync('轉單');
    eq(cloudIds(cloud, '轉單'), ['a2', 'b1', 'c1', 'c3'], '兩台各刪一筆：兩筆都不在雲端');
    eq(Object.keys(cloud.doc['_tomb_轉單']).sort(), ['a1', 'c2'], '雲端墓碑有兩個 id'); eq(B.ids('轉單'), ['a2', 'b1', 'c1', 'c3'], 'B 台本機正確');
    A.pull(); eq(A.ids('轉單'), ['a2', 'b1', 'c1', 'c3'], 'A 台收到更新後也沒有 c2');
    A.add('轉單', 'B', 'z'); await A.sync('轉單'); eq(Object.keys(cloud.doc['_tomb_轉單']).sort(), ['a1', 'c2'], 'A 台再同步不會把 B 的墓碑弄掉');
  }
  { // 被刪後有人新增內容相同但 id 不同的紀錄
    const { cloud, A, B } = two(); A.del('轉單', 'A', 'a1'); await A.sync('轉單'); B.pull();
    const mp = B.local('轉單'); (mp.A = mp.A || []).push(Object.assign({}, synth['轉單'].A[0], { id: 'popt_same_content' })); B.api.pchomeSaveOptlog('轉單', mp); await B.sync('轉單');
    ok(cloudIds(cloud, '轉單').includes('popt_same_content') && !cloudIds(cloud, '轉單').includes('a1'), '內容相同、id 不同的新紀錄不受影響（只比 id）');
  }
  { // 刪到某料號只剩 0 筆
    const { cloud, A } = two(); A.del('轉單', 'B', 'b1'); ok(!('B' in A.local('轉單')), '刪到 0 筆：本機料號整個拿掉'); await A.sync('轉單');
    ok(!('B' in cloud.doc['轉單']), '刪到 0 筆：雲端也沒有這個料號（不留空陣列）'); eq(cloudIds(cloud, '轉單'), ['a1', 'a2', 'c1', 'c2', 'c3'], '其他料號不變');
  }
  { // 轉單與寄倉互不影響
    const { cloud, A } = two(); A.del('寄倉', 'J', 'j1'); await A.sync('寄倉');
    eq(cloud.log.map(w => w[0]).filter((x, i, a) => a.indexOf(x) === i).sort(), ['_tomb_寄倉', '寄倉'], '刪寄倉：只寫寄倉兩欄'); eq(cloud.doc['轉單'], synth['轉單'], '轉單那一欄不變'); ok(!('_tomb_轉單' in cloud.doc), '沒有轉單的墓碑欄');
    cloud.log.length = 0; A.add('轉單', 'A', 'q'); await A.sync('轉單'); eq(cloud.log.map(w => w[0]), ['轉單'], '之後同步轉單：不寫任何墓碑欄'); eq(Object.keys(cloud.doc['_tomb_寄倉']), ['j1'], '寄倉墓碑還在');
    // 同一個 id 字串出現在另一個通路也不會被濾
    const c2 = makeCloud({ '轉單': { A: [E('same', 'A')] }, '寄倉': { J: [Object.assign(E('same', 'J'), { shop: '寄倉' })] } }), M = makeMachine(NEW_SRC, c2, 'u', now); M.pull(); M.setLocal('轉單', c2.doc['轉單']); M.setLocal('寄倉', c2.doc['寄倉']);
    M.del('轉單', 'A', 'same'); await M.sync('轉單'); M.add('寄倉', 'J', 'k'); await M.sync('寄倉'); ok(cloudIds(c2, '寄倉').includes('same') && !cloudIds(c2, '轉單').length, '墓碑分通路：轉單刪的 id 不影響寄倉同 id');
  }
  { // 沒上過雲的紀錄刪掉：不會回來，也照樣記墓碑
    const { cloud, A } = two(); const id = A.add('轉單', 'A', '沒上過雲'); A.del('轉單', 'A', id); await A.sync('轉單');
    ok(!cloudIds(cloud, '轉單').includes(id) && !A.ids('轉單').includes(id), '沒上過雲的刪掉：不在雲端、不在本機'); ok(id in cloud.doc['_tomb_轉單'], '照樣記墓碑（無害）'); eq(cloudIds(cloud, '轉單'), ['a1', 'a2', 'b1', 'c1', 'c2', 'c3'], '原本的紀錄都還在');
  }
  { // 沒有 id 的舊紀錄：不記墓碑、不用內容比對
    const noId = { date: '2026-01-01', time: '', shop: '轉單', sku: 'A', by: '', type: '其他', note: '舊' };
    const cloud = makeCloud({ '轉單': { A: [noId, E('a1', 'A')] } }), M = makeMachine(NEW_SRC, cloud, 'u', now); M.setLocal('轉單', cloud.doc['轉單']);
    M.api.pchomeDeleteOptlog('轉單', 'A', 0); ok(M.ls.get('pchome_optlog_tomb|轉單') === undefined, '沒有 id 的紀錄：不記墓碑'); await M.sync('轉單');
    ok(cloud.doc['轉單'].A.length === 2 && !('_tomb_轉單' in cloud.doc), '沒有 id 的紀錄：雲端那筆不會被刪（照舊會回來），也沒有寫墓碑欄');
    const r = P.pchomeOptlogTombApply({ A: [noId, E('a1', 'A')] }, { undefined: { at: 1 }, null: { at: 1 }, '': { at: 1 } }); ok(r.removed.length === 0, '墓碑濾不到沒有 id 的紀錄');
  }
  { // 用 id 核對：位置對不上時改用 id 找；找不到就不刪
    const { A } = two(); A.api.pchomeDeleteOptlog('轉單', 'C', 0, 'c3'); eq(A.ids('轉單'), ['a1', 'a2', 'b1', 'c1', 'c2'], '位置是 0、id 是 c3 ⇒ 刪的是 c3'); eq(Object.keys(JSON.parse(A.ls.get('pchome_optlog_tomb|轉單'))), ['c3'], '墓碑記的是 c3');
    A.api.pchomeDeleteOptlog('轉單', 'C', 0, 'not-exist'); eq(A.ids('轉單'), ['a1', 'a2', 'b1', 'c1', 'c2'], 'id 找不到 ⇒ 什麼都不刪'); eq(Object.keys(JSON.parse(A.ls.get('pchome_optlog_tomb|轉單'))), ['c3'], '…也不多記墓碑');
  }
  { // 180 天清理：只清墓碑、不動紀錄
    const { cloud, A, B } = two(); A.del('轉單', 'A', 'a1'); await A.sync('轉單');
    now.t = T0 + 179 * DAY; A.add('轉單', 'B', 'd179'); await A.sync('轉單'); ok('a1' in cloud.doc['_tomb_轉單'], '179 天：墓碑還在');
    now.t = T0 + 180 * DAY; A.add('轉單', 'B', 'd180'); await A.sync('轉單'); ok('a1' in cloud.doc['_tomb_轉單'], '剛好 180 天：墓碑還在');
    const before = cloudIds(cloud, '轉單');
    now.t = T0 + 180 * DAY + 1; cloud.log.length = 0; A.add('轉單', 'B', 'd181'); await A.sync('轉單');
    eq(cloud.doc['_tomb_轉單'], {}, '超過 180 天：墓碑被清掉'); ok(cloud.log.some(w => w[0] === '_tomb_轉單'), '…有把清過的墓碑寫回雲端');
    eq(cloudIds(cloud, '轉單').filter(x => before.includes(x)), before, '清墓碑不動任何紀錄'); ok(A.ls.get('pchome_optlog_tomb|轉單') === undefined, '本機墓碑跟著清');
    // 清掉之後，B 台（本機一直留著 a1）再同步 ⇒ a1 會回來（180 天的取捨）
    B.add('轉單', 'B', 'late'); await B.sync('轉單'); ok(cloudIds(cloud, '轉單').includes('a1'), '（已知取捨）墓碑過期後，仍留著那筆的電腦再同步會把它帶回來');
    now.t = T0;
    const u = P.pchomeOptlogTombUnion({ x: { at: T0 - P.PCHOME_OL_TOMB_KEEP_MS - 1 }, y: { at: 'bad' }, z: { at: T0 } }, { w: { at: T0 - 5 }, z: { at: 1, by: 'local' } }, T0);
    eq(Object.keys(u).sort(), ['w', 'y', 'z'], '聯集：過期的拿掉；at 不是數字的不會過期'); eq(u.z, { at: T0 }, '同 id 留雲端那筆');
    ok(P.PCHOME_OL_TOMB_KEEP_MS === 180 * DAY, '保留期是 180 天');
  }
  { // 2f 讀回確認：寫入沒有生效（被擋）⇒ 丟「寫入未確認」、本機墓碑與資料不動
    const { cloud, A } = two(); A.del('轉單', 'A', 'a1'); cloud.writable = false; const lsBefore = JSON.stringify([...A.ls]);
    let err = null; try { await A.api.pchomeSyncOptlog('轉單'); } catch (e) { err = e; }
    ok(err && /寫入未確認/.test(err.message), '寫入被擋 ⇒ 丟「寫入未確認」', err && err.message); ok(JSON.stringify([...A.ls]) === lsBefore, '…本機資料與墓碑都沒動'); ok(A.dirty.has('ec_pchome_optlog|轉單'), '…待同步留著');
    eq(cloud.log.map(w => w[0]), ['_tomb_轉單', '轉單'], '…有嘗試寫兩欄'); ok(!JSON.parse(cloud.log[1][1]).A.some(e => e.id === 'a1') && 'a1' in JSON.parse(cloud.log[0][1]), '…要寫的內容：通路欄沒有 a1、墓碑欄有 a1');
    cloud.writable = true; await A.sync('轉單'); ok(!cloudIds(cloud, '轉單').includes('a1'), '之後寫得進去時就成功');
    // 只拿到快取 ⇒ 不推
    const t = two(); t.A.del('轉單', 'A', 'a1'); t.cloud.fromCache = true; t.cloud.log.length = 0; let e2 = null; try { await t.A.api.pchomeSyncOptlog('轉單'); } catch (e) { e2 = e; }
    ok(e2 && /本機快取/.test(e2.message) && !t.cloud.log.length, '有刪除、雲端現值只有快取 ⇒ 不推、什麼都沒寫');
    eq(P.pchomeOptlogWriteConfirmed({ tomb: { a1: {} } }, '轉單', { '轉單': { A: [E('a1', 'A')] }, '_tomb_轉單': { a1: {} } }), '刪除的 1 筆還在雲端', '確認：id 還在雲端');
    eq(P.pchomeOptlogWriteConfirmed({ tomb: { a1: {} } }, '轉單', { '轉單': {} }), '刪除標記有 1 筆沒寫進雲端', '確認：墓碑沒進雲端');
    eq(P.pchomeOptlogWriteConfirmed({ tomb: { a1: {} } }, '轉單', null), '讀不回雲端現值', '確認：讀不回');
    eq(P.pchomeOptlogWriteConfirmed({ tomb: { a1: {} } }, '轉單', { '轉單': { A: [E('a2', 'A')] }, '_tomb_轉單': { a1: { at: 1 } } }), '', '確認：通過');
  }
  { // 純函式的邊界
    const m = { A: [E('a1', 'A')] }; ok(P.pchomeOptlogTombApply(m, {}).map === m && P.pchomeOptlogTombApply(m, { zz: { at: 1 } }).map === m, '沒有墓碑、或沒有任何一筆被濾 ⇒ 回原物件');
    eq(P.pchomeOptlogTombClean('x'), {}, '墓碑不是物件 ⇒ 當空的'); eq(P.pchomeOptlogTombClean({ a: 1, b: null, c: [], d: { at: 1 } }), { d: { at: 1 } }, '只留值是物件的');
    ok(P.pchomeOptlogIsTombField('_tomb_轉單') && !P.pchomeOptlogIsTombField('轉單') && !P.pchomeOptlogIsTombField('寄倉'), '墓碑欄判斷');
    const pl = P.pchomeOptlogSyncPlan({ '轉單': m }, '轉單', m, {}, T0); ok(!pl.hasTomb && !pl.writeTomb && !pl.removed.length, '都沒有墓碑 ⇒ 不寫墓碑欄');
    const pl2 = P.pchomeOptlogSyncPlan({ '轉單': m, '_tomb_轉單': { q: { at: T0 } } }, '轉單', m, {}, T0); ok(pl2.hasTomb && !pl2.writeTomb, '雲端墓碑沒變 ⇒ 不重寫');
  }
  { // 雲端套用：跳過墓碑欄、濾掉墓碑裡的 id；有待同步的通路不覆蓋
    const doc = clone(synth); doc['_tomb_轉單'] = { a1: { at: T0, by: 'x' } }; const M = makeMachine(NEW_SRC, makeCloud(doc), 'u', now); M.pull();
    eq(Object.keys(M.Store._profitMem).sort(), ['ec_pchome_optlog|寄倉', 'ec_pchome_optlog|轉單'], '套用：墓碑欄不會變成一個通路'); ok(!M.ids('轉單').includes('a1') && M.ids('轉單').length === 5, '套用：墓碑裡的 id 不顯示');
    const src = NEW_SRC; ok(/pchomeOptlogPendingDeletes\(osh\)/.test(src) && /status:\(\(n>0\|\|pdel>0\)\?'diff':'same'\)/.test(src), '同步預覽：只有刪除（本機 0 筆）也列為有變更');
  }
  // 沒有新增雲端物件或寫入方法；刪除鈕仍在唯讀擋板裡
  { const fb = fs.readFileSync(path.join(ROOT, 'js/firebase.js'), 'utf8'); ok(!/_tomb_|pchome_optlog_tomb/.test(fb), 'firebase.js 沒有改（沒有新增雲端物件或寫入方法）');
    const blk = NEW_SRC.slice(NEW_SRC.indexOf('// ══════ PChome 優化紀錄刪除墓碑'), NEW_SRC.indexOf('// firebase.js app/pchome_optlog 訂閱 → 攤平每 shop 欄回'));
    eq([...new Set((blk.match(/window\.__cloud\w+\.\w+/g) || []))].sort(), ['window.__cloudPchomeOptlog.getDoc', 'window.__cloudPchomeOptlog.setField'], '墓碑只用既有的 __cloudPchomeOptlog.getDoc／setField');
    const app = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8'); ok(/__RO_WRITE_RE = [^\n]*\bpchomeDeleteOptlog\b/.test(app), 'pchomeDeleteOptlog 仍在唯讀擋板');
    ok(!/^ec/.test('pchome_optlog_tomb|轉單') && NEW_SRC.includes("function pchomeOptlogTombKey(shop){ return 'pchome_optlog_tomb|'+shop; }"), '本機墓碑 key 不是 ec 開頭（不進同步掃描）'); }

  console.log((fail ? '✗ 有失敗：' : '✓ 全過：') + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
