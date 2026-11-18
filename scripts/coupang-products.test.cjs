#!/usr/bin/env node
// 酷澎商品主檔 PR-C2 第 1 塊：分片與雲端合併純函式的 node 測試（只讀，不寫任何檔案、不連網路、不碰 Firestore）。
//
//   node scripts/coupang-products.test.cjs
//
// 從 js/profit.js 抽 CUP-PS-PURE-BEGIN/END 區塊，以及它依賴的 MOMO 函式（momoProductsPlanMerge、_momoProductsBuildSig、
// _momoStableStr、_momoDelGuardLevel、MOMO_DEL_GUARD_* 常數），用 new Function 跑。資料全是合成的假資料。
'use strict';
const fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (cond, name, extra) => { if (cond) pass++; else { fail++; console.error('✗ ' + name + (extra ? '\n    ' + extra : '')); } };
const eq = (a, b, name) => { const A = String(JSON.stringify(a)), B = String(JSON.stringify(b)); ok(A === B, name, A !== B ? '得到 ' + A.slice(0, 400) + '\n    預期 ' + B.slice(0, 400) : ''); };

// ── 從 profit.js 擷取程式 ──
const src = fs.readFileSync(path.join(ROOT, 'js/profit.js'), 'utf8').replace(/\r\n/g, '\n');
function between(s, a, b) {
  const i = s.indexOf(a), j = s.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('找不到標記 ' + a + ' / ' + b);
  if (s.indexOf(a, i + 1) >= 0) throw new Error('標記重複：' + a);
  return s.slice(i, j + b.length);
}
// 多行函式：宣告起、到第一個「\n}\n」止；單行函式：到行尾。
function fnMulti(s, name) {
  const i = s.indexOf('\nfunction ' + name + '(');
  if (i < 0) throw new Error('找不到 function ' + name);
  const j = s.indexOf('\n}\n', i + 1);
  return s.slice(i + 1, j + 3);
}
function fnLine(s, name) {
  const i = s.indexOf('\nfunction ' + name + '(');
  if (i < 0) throw new Error('找不到 function ' + name);
  return s.slice(i + 1, s.indexOf('\n', i + 1) + 1);
}
function consts(s, prefix) {
  const out = s.split('\n').filter(l => l.startsWith('const ' + prefix));
  if (!out.length) throw new Error('找不到 const ' + prefix);
  return out.join('\n') + '\n';
}
const PS_BLOCK = between(src, '/* ═══ CUP-PS-PURE-BEGIN', 'CUP-PS-PURE-END ═══ */');
// LZString（瀏覽器端 vendor 檔）與 LZ1 包裝：C3 補修的 lastpushed 壓縮用
const LZ_SRC = fs.readFileSync(path.join(ROOT, 'js/vendor/lz-string-1.5.0.min.js'), 'utf8');
const LZString = new Function(LZ_SRC + '\nreturn LZString;')();
const DEPS = 'const window={LZString:__LZ};\n' + consts(src, 'MOMO_DEL_GUARD_') + fnMulti(src, '_momoStableStr') + fnLine(src, '_momoProductsBuildSig')
  + fnMulti(src, 'momoProductsPlanMerge') + fnMulti(src, '_momoDelGuardLevel') + fnMulti(src, '_lz1Unwrap') + fnMulti(src, '_lz1Encode');
const NAMES = ['CUP_PRODUCTS_SHARDS', 'CUP_PRODUCTS_SHARD_WARN_KB', 'cupProductsPidOk', 'cupProductsShardOf', 'cupProductsSplitShards',
  'cupProductsShardBytes', 'cupProductsCloudMerge', 'cupProductsWriteConfirmed', 'cupLpEncode', 'cupLpDecode', 'cupSigEqual', '_momoProductsBuildSig', 'momoProductsPlanMerge', '_momoDelGuardLevel'];
function load(block) { return new Function('__LZ', DEPS + block + '\nreturn {' + NAMES.join(',') + '};')(LZString); }

// ── 假資料 ──
let skuSeq = 85000000000;
function item(pid, o) {
  return Object.assign({ sku: String(++skuSeq), pid: String(pid), sid: '1' + String(pid).slice(-9), code: 'F' + (Number(String(pid).slice(-4)) % 900) + '-01',
    price: 590, base: 990, status: '판매중', stock: 12, firstSeen: '2026-11-10 09:00:00', lastSeen: '2026-11-10 09:00:00' }, o || {});
}
const clone = x => JSON.parse(JSON.stringify(x));
const T1 = '2026-11-10 09:00:00', T2 = '2026-11-17 20:50:04', T0 = '2026-11-03 08:00:00';

// 一組測試，給定一份（可能被改過的）PURE 區塊；回傳失敗數（反向測試用）
function suite(P, opt) {
  const quiet = opt && opt.quiet; const f0 = fail;
  const t = (c, n, e) => { if (quiet) { if (!c) fail++; else pass++; } else ok(c, n, e); };
  const e = (a, b, n) => { const A = JSON.stringify(a), B = JSON.stringify(b); t(A === B, n, A !== B ? '得到 ' + A.slice(0, 300) + '\n    預期 ' + B.slice(0, 300) : ''); };

  if (!(opt && opt.onlyMerge)) {
    // ── 分片 ──
    e(P.CUP_PRODUCTS_SHARDS, 4, '分片數＝4');
    e(P.cupProductsShardOf('9007199254740993'), Number(9007199254740993n % 4n), '超過 2^53 的 pid 用 BigInt 取餘數');
    e(P.cupProductsShardOf('9007199254740993'), 1, '9007199254740993 % 4 ＝ 1（Number 會算成 0）');
    e(P.cupProductsShardOf(12), 0, '12 → 0'); e(P.cupProductsShardOf('13'), 1, '13 → 1'); e(P.cupProductsShardOf(' 15 '), 3, '前後空白去掉');
    let stable = true; for (let k = 0; k < 50; k++) { const pid = String(7000000000 + k * 7919); const a = P.cupProductsShardOf(pid); for (let r = 0; r < 5; r++) if (P.cupProductsShardOf(pid) !== a) stable = false; }
    t(stable, '同一個 pid 多次算都同一片');
    ['', null, undefined, 'abc', '12a', '1.5', '-3', '１２'].forEach(v => e(P.cupProductsShardOf(v), 0, '不是純數字 pid（' + JSON.stringify(v) + '）→ 第 0 片'));
    t(!P.cupProductsPidOk('') && !P.cupProductsPidOk('-3') && P.cupProductsPidOk('0012'), 'cupProductsPidOk 判斷');
    // 同頁同片＋badPid
    const items = [];
    for (let pg = 0; pg < 40; pg++) { const pid = String(8100000000 + pg * 13); for (let o = 0; o < 1 + (pg % 5); o++) items.push(item(pid)); }
    items.push(item('', { pid: '' })); items.push(item('x', { pid: 'ABC' })); items.push(Object.assign(item('1'), { pid: undefined }));
    const sp = P.cupProductsSplitShards(items);
    e(sp.shards.length, 4, 'SplitShards 回 4 片');
    e(sp.shards.reduce((s, a) => s + a.length, 0), items.length, '4 片合計＝原筆數（沒有掉、沒有重複）');
    e(sp.badPid, 3, 'badPid 計數＝3');
    t(sp.shards[0].filter(p => !P.cupProductsPidOk(p.pid)).length === 3, 'badPid 的選項都在第 0 片');
    const pidShard = new Map(); let samePage = true;
    sp.shards.forEach((a, i) => a.forEach(p => { if (!P.cupProductsPidOk(p.pid)) return; if (pidShard.has(p.pid) && pidShard.get(p.pid) !== i) samePage = false; pidShard.set(p.pid, i); }));
    t(samePage, '同一 Product ID 的選項全在同一片');
    let rightShard = true; sp.shards.forEach((a, i) => a.forEach(p => { if (P.cupProductsShardOf(p.pid) !== i) rightShard = false; }));
    t(rightShard, '每筆都在 cupProductsShardOf 算出的那片');
    e(P.cupProductsSplitShards(null).shards.map(a => a.length), [0, 0, 0, 0], 'null → 4 片空');
    // ShardBytes 基本算法
    const one = { sku: 'a', n: 1 };
    const b0 = P.cupProductsShardBytes([], { shop: '麻吉', docId: 'maji_0', latestExport: T2 });
    const b1 = P.cupProductsShardBytes([one], { shop: '麻吉', docId: 'maji_0', latestExport: T2 });
    e(b1 - b0, (3 + 1 + 2) + (1 + 1 + 8), '一筆 {sku:"a",n:1} 加 ("sku"+1 + "a"+1) + ("n"+1 + 8) 位元組');
    t(P.cupProductsShardBytes([{ s: '판매중' }]) - P.cupProductsShardBytes([]) === 2 + 10, '韓文用 UTF-8 計（판매중＝9 位元組＋1）');
  }

  // ── 合併 ──
  const A = item('8200000001', { firstSeen: T1, lastSeen: T1 });
  const B = item('8200000002', { firstSeen: T1, lastSeen: T1 });
  const C = item('8200000003', { firstSeen: T1, lastSeen: T1 });
  // bootstrap：雲端空、沒有 lastpushed ⇒ 推全部、不刪
  {
    const r = P.cupProductsCloudMerge([], '', { latestExport: T1, items: [A, B, C] }, null);
    e(r.mode, 'bootstrap', 'bootstrap：mode'); e(r.pushSkus.length, 3, 'bootstrap 雲端空：推全部'); e(r.deleteSkus, [], 'bootstrap：不刪');
    e(r.merged.length, 3, 'bootstrap：merged 3 筆'); e(r.latestExport, T1, 'bootstrap：latestExport'); e(r.guardLevel.level, 'ok', 'bootstrap：guard ok');
  }
  // bootstrap：雲端有本機沒有的 ⇒ 保留、不刪
  {
    const X = item('8200000009');
    const r = P.cupProductsCloudMerge([clone(A), X], T1, { latestExport: T1, items: [A, B] }, null);
    e(r.deleteSkus, [], 'bootstrap 雲端獨有：不刪'); t(r.merged.some(p => p.sku === X.sku), 'bootstrap 雲端獨有：保留在 merged');
    e(r.pushSkus, [B.sku], 'bootstrap：跟雲端一樣的不推，只推本機才有的');
  }
  // lastpushed 模式：只推有改的；本機沒有、lastpushed 有的才刪
  {
    const cloud = [clone(A), clone(B), clone(C)];
    const build = arr => { const m = {}; arr.forEach(p => { m[p.sku] = stableStr(p); }); return m; };
    const lastpushed = build(cloud);
    const B2 = Object.assign(clone(B), { price: 490, lastSeen: T2 });
    const D = item('8200000004', { firstSeen: T2, lastSeen: T2 });
    const r = P.cupProductsCloudMerge(cloud, T1, { latestExport: T2, items: [clone(A), B2, D] }, lastpushed);
    e(r.mode, 'lastpushed', 'lastpushed：mode');
    e(r.pushSkus.slice().sort(), [B2.sku, D.sku].sort(), 'lastpushed：只推改過（B）與新增（D）');
    e(r.deleteSkus, [C.sku], 'lastpushed：本機刪掉、上次推過的 C 才刪');
    t(!r.merged.some(p => p.sku === C.sku), 'lastpushed：merged 沒有 C');
    e(r.merged.find(p => p.sku === B.sku).price, 490, 'lastpushed：B 用本機的新價格');
    e(r.latestExport, T2, 'latestExport 取較大（本機 T2 ＞ 雲端 T1）');
    // 雲端獨有（同事加的、我沒推過）⇒ 不刪
    const E = item('8200000005');
    const r2 = P.cupProductsCloudMerge(cloud.concat([E]), T1, { latestExport: T1, items: [clone(A), clone(B), clone(C)] }, lastpushed);
    e(r2.pushSkus, [], '沒改：推 0'); e(r2.deleteSkus, [], '雲端獨有、沒推過：不刪'); t(r2.merged.some(p => p.sku === E.sku), '雲端獨有保留');
  }
  // 雲端某筆 lastSeen 較新 ⇒ 保留雲端、進 keptCloud；firstSeen 取早；latestExport 取大
  {
    const cloudA = Object.assign(clone(A), { price: 450, stock: 3, firstSeen: T1, lastSeen: T2 });   // 同事傳了 11/17 的檔
    const localA = Object.assign(clone(A), { price: 590, stock: 12, firstSeen: T0, lastSeen: T1 });   // 我這台是 11/10 的，但更早就看過（T0）
    const r = P.cupProductsCloudMerge([cloudA], T2, { latestExport: T1, items: [localA] }, null);
    e(r.keptCloud, [A.sku], '雲端較新：進 keptCloud');
    const m = r.merged.find(p => p.sku === A.sku);
    e([m.price, m.stock, m.lastSeen], [450, 3, T2], '雲端較新：價格／庫存／lastSeen 用雲端的');
    e(m.firstSeen, T0, 'firstSeen 取兩邊較早（本機 T0）');
    e(r.latestExport, T2, 'latestExport 取較大（雲端 T2）');
    // 反過來：本機較新 ⇒ 用本機，firstSeen 仍取早
    const cloudB = Object.assign(clone(B), { price: 450, firstSeen: T0, lastSeen: T1 });
    const localB = Object.assign(clone(B), { price: 390, firstSeen: T1, lastSeen: T2 });
    const r2 = P.cupProductsCloudMerge([cloudB], T1, { latestExport: T2, items: [localB] }, null);
    e(r2.keptCloud, [], '本機較新：不進 keptCloud');
    const m2 = r2.merged.find(p => p.sku === B.sku);
    e([m2.price, m2.lastSeen, m2.firstSeen], [390, T2, T0], '本機較新：用本機的，firstSeen 取雲端較早的 T0');
    // 一邊 firstSeen 空白 ⇒ 用另一邊
    const r3 = P.cupProductsCloudMerge([Object.assign(clone(C), { firstSeen: '' })], T1, { latestExport: T1, items: [Object.assign(clone(C), { firstSeen: T0 })] }, null);
    e(r3.merged[0].firstSeen, T0, 'firstSeen 一邊空白：用非空的那邊');
    // 同一個 lastSeen ⇒ 用本機的（不進 keptCloud）
    const r4 = P.cupProductsCloudMerge([Object.assign(clone(C), { price: 1 })], T1, { latestExport: T1, items: [Object.assign(clone(C), { price: 2 })] }, null);
    e([r4.keptCloud.length, r4.merged[0].price], [0, 2], 'lastSeen 相同：用本機的');
  }

  if (!(opt && opt.onlyMerge)) {
    // ── 刪除防線三級 ──
    const mk = n => Array.from({ length: n }, (_, i) => item(String(8300000000 + i)));
    const cloud = mk(100);
    const sig = {}; cloud.forEach(p => { sig[p.sku] = stableStr(p); });
    const lvl = keep => P.cupProductsCloudMerge(cloud, T1, { latestExport: T1, items: cloud.slice(0, keep) }, sig).guardLevel;
    e([lvl(85).level, lvl(85).n], ['ok', 15], '刪 15／100 ⇒ ok（≤20）');
    e([lvl(70).level, lvl(70).n, lvl(70).m], ['confirm', 30, 100], '刪 30／100 ⇒ confirm');
    e([lvl(40).level, lvl(40).n], ['abort', 60], '刪 60／100 ⇒ abort');
    // bootstrap 時就算本機少很多也不刪
    e(P.cupProductsCloudMerge(cloud, T1, { latestExport: T1, items: cloud.slice(0, 10) }, null).guardLevel.level, 'ok', 'bootstrap 本機少 90 筆：不刪、ok');
  }
  return fail - f0;
}
// _momoStableStr 的測試端副本（只用來產生 lastpushed 簽名）；用 profit.js 抽出來的那支
const stableStr = new Function(fnMulti(src, '_momoStableStr') + '\nreturn _momoStableStr;')();

console.log('── 1. 正常版 ──');
const P = load(PS_BLOCK);
suite(P);

// ── 1b. 寫入確認條件（C2-3：enforce 只有全部成立才動本機／lastpushed／dirty）──
console.log('── 1b. 寫入確認條件 ──');
{
  const C = P.cupProductsWriteConfirmed;
  const back = (ns, le, ex) => ({ exists: true, items: [], latestExport: le, perShard: ns.map((n, i) => ({ exists: ex ? ex[i] : true, n, latestExport: le })) });
  const cnt = [3, 1, 2, 0], L = T2;
  eq(C({ ok: true }, back(cnt, L), cnt, 6, L).ok, true, '確認：全部對上 ⇒ ok');
  eq(C(undefined, back(cnt, L), cnt, 6, L).ok, false, '確認：setShop 回 undefined（被防護擋下）⇒ 不算');
  eq(C({ ok: true, extra: 1 }, back(cnt, L), cnt, 6, L).ok, false, '確認：回傳不是嚴格 {ok:true} ⇒ 不算');
  eq(C({ ok: 'true' }, back(cnt, L), cnt, 6, L).ok, false, '確認：ok 是字串 ⇒ 不算');
  eq(C(true, back(cnt, L), cnt, 6, L).ok, false, '確認：回 true ⇒ 不算');
  eq(C({ ok: true }, null, cnt, 6, L).ok, false, '確認：讀回失敗 ⇒ 不算');
  eq(C({ ok: true }, back([3, 1, 2, 1], L), cnt, 6, L).ok, false, '確認：某片筆數不同 ⇒ 不算');
  eq(C({ ok: true }, back(cnt, L, [true, true, true, false]), cnt, 6, L).ok, false, '確認：某片不存在（就算 0 筆）⇒ 不算');
  eq(C({ ok: true }, back(cnt, L), cnt, 7, L).ok, false, '確認：合計跟合併筆數不同 ⇒ 不算');
  eq(C({ ok: true }, back(cnt, T1), cnt, 6, L).ok, false, '確認：latestExport 不同 ⇒ 不算');
  eq(C({ ok: true }, back([3, 1, 2], L), [3, 1, 2], 6, L).ok, false, '確認：不是 4 片 ⇒ 不算');
}

// ── 2. 合成 3,724 筆（仿好麻吉：1,408 頁、多數 1～3 個選項、少數頁很多選項）切 4 片 ──
console.log('── 2. 合成 3,724 筆切 4 片 ──');
{
  let seed = 20261118; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const pages = []; for (let i = 0; i < 1408; i++) pages.push(String(7000000000 + Math.floor(rnd() * 2999999999)));
  // 每頁選項數：先每頁 1 個，剩下的照「大頁多拿」的權重分（少數頁 10～30 個）
  const cnt = pages.map(() => 1); let left = 3724 - 1408;
  const big = pages.map((_, i) => i).filter(() => rnd() < 0.05);   // 約 70 頁大頁
  while (left > 0) { const i = rnd() < 0.55 && big.length ? big[Math.floor(rnd() * big.length)] : Math.floor(rnd() * pages.length); if (cnt[i] < 30) { cnt[i]++; left--; } }
  const korean = ['판매중', '판매중', '판매중', '판매중지'];
  const all = []; pages.forEach((pid, i) => { for (let o = 0; o < cnt[i]; o++) all.push({ sku: String(80000000000 + all.length * 37), pid, sid: String(1000000000 + i * 7), code: 'H' + (i % 900) + '-' + String(o + 1).padStart(2, '0'),
    price: 100 + Math.floor(rnd() * 3000), base: 200 + Math.floor(rnd() * 5000), status: korean[Math.floor(rnd() * 4)], stock: Math.floor(rnd() * 1200), firstSeen: T1, lastSeen: T2 }); });
  ok(all.length === 3724, '合成筆數 3,724', String(all.length));
  ok(new Set(all.map(p => p.pid)).size === 1408, '合成商品頁 1,408');
  const sp = P.cupProductsSplitShards(all);
  const kb = sp.shards.map((a, i) => P.cupProductsShardBytes(a, { shop: '麻吉', docId: 'maji_' + i, latestExport: T2 }) / 1024);
  console.log('   四片筆數：' + sp.shards.map(a => a.length).join(' / ') + '；大小 KB：' + kb.map(x => x.toFixed(1)).join(' / ') + '；合計 ' + kb.reduce((s, x) => s + x, 0).toFixed(1) + ' KB；badPid ' + sp.badPid);
  ok(kb.every(x => x < 300), '每片都 < 300 KB', kb.map(x => x.toFixed(1)).join('/'));
  ok(kb.every(x => x < P.CUP_PRODUCTS_SHARD_WARN_KB), '每片都 < 700 KB 警告線');
  ok(sp.badPid === 0, '合成資料 badPid＝0');
  global.__shardReport = { counts: sp.shards.map(a => a.length), kb: kb.map(x => +x.toFixed(1)) };

  // ── C3 補修：lastpushed 壓縮往返 ──
  console.log('── 2b. lastpushed 壓縮（C3 補修）──');
  const sig = P._momoProductsBuildSig(all), rawJson = JSON.stringify(sig);
  const enc = P.cupLpEncode(all);
  ok(typeof enc === 'string' && enc.startsWith('LZ1:'), '壓縮成 LZ1');
  console.log('   合成 3,724 筆 lastpushed：純 JSON ' + rawJson.length.toLocaleString() + ' 字元 → LZ1 ' + enc.length.toLocaleString() + ' 字元');
  const dec = P.cupLpDecode(enc);
  ok(dec.state === 'ok' && dec.legacy === false, '壓縮格式讀得回來（state ok、不是 legacy）');
  ok(JSON.stringify(dec.sig) === rawJson, '壓縮往返後簽名表逐字相同');
  const leg = P.cupLpDecode(rawJson);
  ok(leg.state === 'ok' && leg.legacy === true && JSON.stringify(leg.sig) === rawJson, '舊的純 JSON 格式讀得回來（legacy:true、內容相同）');
  ok(P.cupSigEqual(dec.sig, sig) && P.cupSigEqual(leg.sig, sig), 'cupSigEqual：往返與舊格式都＝原簽名表');
  // 合併計畫：用原簽名表／壓縮往返／舊 JSON 三種 lastpushed，結果逐欄相同（幾種情境）
  const local = JSON.parse(JSON.stringify(all));
  local[5].price += 1; local[6].stock += 1; local.splice(9, 1);   // 改 2 筆、本機少 1 筆（lastpushed 有 ⇒ 會刪）
  local.push({ sku: '99999999999', pid: '7999999999', sid: '1', code: 'NEW-01', price: 1, base: 2, status: '판매중', stock: 3, firstSeen: T2, lastSeen: T2 });
  const cloudNewer = JSON.parse(JSON.stringify(all)); cloudNewer[20] = Object.assign({}, cloudNewer[20], { lastSeen: '2099-01-01 00:00:00', price: 7 });
  const scen = [ ['雲端＝上次推的', all, T2], ['雲端有一筆較新', cloudNewer, '2099-01-01 00:00:00'], ['雲端空', [], ''] ];
  scen.forEach(([name, cloud, cl]) => {
    const ld = { latestExport: T2, items: local };
    const a = JSON.stringify(P.cupProductsCloudMerge(cloud, cl, ld, sig));
    const b = JSON.stringify(P.cupProductsCloudMerge(cloud, cl, ld, dec.sig));
    const c = JSON.stringify(P.cupProductsCloudMerge(cloud, cl, ld, leg.sig));
    ok(a === b && a === c, '合併計畫逐欄相同（' + name + '）：原簽名表＝壓縮往返＝舊 JSON');
  });
  const r0 = P.cupProductsCloudMerge(all, T2, { latestExport: T2, items: local }, dec.sig);
  ok(r0.mode === 'lastpushed' && r0.pushSkus.length === 3 && r0.deleteSkus.length === 1, '往返後的計畫數字合理（推 3＝改 2＋增 1、刪 1）', JSON.stringify({ push: r0.pushSkus.length, del: r0.deleteSkus.length }));
  // 讀不懂 ⇒ bad；沒有 ⇒ none
  [['LZ1:abc:xx', '長度欄不是數字'], ['LZ1:10:garbage', '解不開'], ['{not json', 'JSON 壞掉'], ['[]', '陣列'], ['{"a":1}', '值不是字串']].forEach(([raw, why]) => ok(P.cupLpDecode(raw).state === 'bad', '讀不懂 ⇒ bad（' + why + '）'));
  ok(P.cupLpDecode(null).state === 'none' && P.cupLpDecode('').state === 'none', '沒有 ⇒ none');
  ok(!P.cupSigEqual(sig, Object.assign({}, sig, { x: 'y' })) && !P.cupSigEqual(sig, Object.assign({}, sig, { [all[0].sku]: 'changed' })) && !P.cupSigEqual(null, sig), 'cupSigEqual：多一筆／改一筆／null 都不相等');
  global.__lpReport = { json: rawJson.length, lz: enc.length };
}

// ── 3. 反向：把「lastSeen 較新保留」關掉，測試要失敗 ──
console.log('── 3. 反向測試 ──');
{
  const KEEP = /const cloudNewer=String\(cp\.lastSeen\|\|''\)>String\(lp\.lastSeen\|\|''\);[^\n]*CUP-PS-KEEP-NEWER[^\n]*/;
  ok(KEEP.test(PS_BLOCK), '反向測試：找得到 CUP-PS-KEEP-NEWER 那一行');
  const broken = PS_BLOCK.replace(KEEP, 'const cloudNewer=false;');
  ok(broken !== PS_BLOCK, '反向測試：成功把那一行改掉');
  const savePass = pass, saveFail = fail;
  const failed = suite(load(broken), { quiet: true, onlyMerge: true });
  pass = savePass; fail = saveFail;
  console.log('   關掉之後失敗 ' + failed + ' 項（預期 > 0）');
  ok(failed > 0, '反向測試：關掉 lastSeen 較新保留後，測試抓得到（失敗 ' + failed + ' 項）');
  global.__reverseFailed = failed;
}

console.log('\n' + (fail ? '❌' : '✅') + ' 通過 ' + pass + '，失敗 ' + fail);
process.exit(fail ? 1 : 0);
