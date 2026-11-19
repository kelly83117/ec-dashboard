#!/usr/bin/env node
// #501 唯讀帳號同步總閘的 node 測試（只讀，不寫任何檔案、不連網路、不碰 Firestore）。
//
//   node scripts/ro-sync-gate.test.cjs
//
// ① 從 js/profit.js 抽 RO_SYNC_GATE_PURE_BEGIN/END 區塊，用 new Function 跑純函式 _roSyncDecide。
// ② 靜態檢查：每個推送入口的第一個敘述就是 _roSyncBlocked(...)（閘門在最前面，之後才碰按鈕、sweep、讀雲端）。
// ③ 靜態檢查：app.js 那道把 __cloud* 寫入換成 Promise.resolve() 的防護還在（最後一道，不能被拿掉）。
'use strict';
const fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (cond, name, extra) => { if (cond) pass++; else { fail++; console.error('✗ ' + name + (extra ? '\n    ' + extra : '')); } };
const eq = (a, b, name) => { const A = String(JSON.stringify(a)), B = String(JSON.stringify(b)); ok(A === B, name, A !== B ? '得到 ' + A.slice(0, 400) + '\n    預期 ' + B.slice(0, 400) : ''); };

const src = fs.readFileSync(path.join(ROOT, 'js/profit.js'), 'utf8').replace(/\r\n/g, '\n');
const app = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8').replace(/\r\n/g, '\n');

// ── ① 純函式 ──
const A = '// RO_SYNC_GATE_PURE_BEGIN', B = '// RO_SYNC_GATE_PURE_END';
const i = src.indexOf(A), j = src.indexOf(B, i);
if (i < 0 || j < 0) throw new Error('找不到標記');
if (src.indexOf(A, i + 1) >= 0) throw new Error('標記重複');
const P = new Function(src.slice(i, j + B.length) + '\nreturn { RO_SYNC_MSG, _roSyncDecide };')();
const MSG = '這個帳號是唯讀，不能同步到雲端。你在這台電腦改的內容還留在本機，請找有權限的同事處理。';
eq(P.RO_SYNC_MSG, MSG, '提示文字逐字相同');

const D = P._roSyncDecide;
eq(D({ isReadOnly: () => true }), { blocked: true, msg: MSG }, '唯讀 ⇒ 擋、帶提示');
eq(D({ isReadOnly: () => false }), { blocked: false, msg: '' }, '非唯讀 ⇒ 不擋');
eq(D({ isReadOnly: () => 1 }), { blocked: true, msg: MSG }, 'truthy 也算唯讀');
eq(D({ isReadOnly: () => 0 }), { blocked: false, msg: '' }, 'falsy ⇒ 不擋');
eq(D({ isReadOnly: () => undefined }), { blocked: false, msg: '' }, 'undefined ⇒ 不擋');
eq(D(null), { blocked: false, msg: '' }, '沒有 App ⇒ 不擋（跟改版前一樣）');
eq(D(undefined), { blocked: false, msg: '' }, 'App 未定義 ⇒ 不擋');
eq(D({}), { blocked: false, msg: '' }, '沒有 isReadOnly ⇒ 不擋');
eq(D({ isReadOnly: true }), { blocked: false, msg: '' }, 'isReadOnly 不是函式 ⇒ 不擋');
eq(D({ isReadOnly: () => { throw new Error('boom'); } }), { blocked: false, msg: '' }, 'isReadOnly 丟錯 ⇒ 不擋、不往外丟');
// 判斷跟 app.js 同一支：用 app.js __isReadOnly 的寫法（role==='view'）接上去
const mkApp = role => { const App = { currentUser: role === null ? null : { role } }; App.isReadOnly = () => { try { return !!(App && App.currentUser && App.currentUser.role === 'view'); } catch { return false; } }; return App; };
eq(D(mkApp('view')).blocked, true, 'role=view ⇒ 擋');
eq(D(mkApp('admin')).blocked, false, 'role=admin ⇒ 不擋');
eq(D(mkApp('staff')).blocked, false, 'role=staff ⇒ 不擋');
eq(D(mkApp(null)).blocked, false, '沒登入 ⇒ 不擋');
// 純函式沒有副作用：同一個輸入連續呼叫結果一樣、不改傳入物件
const frozen = Object.freeze({ isReadOnly: () => true });
eq([D(frozen), D(frozen)], [{ blocked: true, msg: MSG }, { blocked: true, msg: MSG }], '重複呼叫結果一樣');

// ── ② 每個入口第一個敘述就是閘門 ──
const firstStmt = (sig) => {
  const k = src.indexOf(sig);
  if (k < 0) return null;
  if (src.indexOf(sig, k + 1) >= 0) return 'DUP';
  const open = src.indexOf('{', k + sig.length - 1);
  let rest = src.slice(open + 1, open + 1200);
  // 去掉開頭的空白與整行／行尾註解
  for (;;) { const t = rest.replace(/^\s+/, ''); if (t.startsWith('//')) { rest = t.slice(t.indexOf('\n') + 1); continue; } rest = t; break; }
  return rest.slice(0, 80);
};
const ENTRIES = [
  ['async function syncToCloud(shop, allowKeys){', 'syncToCloud'],
  ['async function momoOpenSyncPreview(shop, opts){', 'momoOpenSyncPreview'],
  ['function momoConfirmSync(shop){', 'momoConfirmSync'],
  ['async function pchomeOpenSyncPreview(shop){', 'pchomeOpenSyncPreview'],
  ['function pchomeConfirmSync(shop){', 'pchomeConfirmSync'],
  ['async function momoMoPlusPushKeys(shop, keys){', 'momoMoPlusPushKeys'],
  ['async function momoMoPlusAutoPushUploaded(shop, keys){', 'momoMoPlusAutoPushUploaded'],
  ['async function momoAutoPushStock(){', 'momoAutoPushStock'],
  ['function syncAffRptToCloud(shop){', 'syncAffRptToCloud'],
  ['function momoMoPlusCleanDirty(shop, idxList){', 'momoMoPlusCleanDirty'],
  ['window.__momoMergeEnforce=function(shop){', '__momoMergeEnforce'],
  ['window.__cupProductsMergeEnforce=function(shop){', '__cupProductsMergeEnforce'],
];
ENTRIES.forEach(([sig, name]) => {
  const s = firstStmt(sig);
  ok(s !== null, name + '：找得到函式');
  ok(s !== 'DUP', name + '：函式簽名唯一');
  ok(typeof s === 'string' && /^if\(_roSyncBlocked\('/.test(s), name + '：第一個敘述是 _roSyncBlocked', '實際開頭：' + s);
});
// 各入口傳進去的名字跟函式名一致（Console 警告看得出是哪個入口）
ENTRIES.forEach(([sig, name]) => { const s = firstStmt(sig) || ''; ok(s.indexOf("_roSyncBlocked('" + name + "')") === 3, name + '：where 參數＝函式名', s); });
// MO+ 商品主檔直推：閘門在 setSrc('master') 之前，而且唯讀時走不到 setSrc
{
  const k = src.indexOf("_roSyncBlocked('MO+ 商品主檔直推')");
  const w = src.indexOf("window.__cloudMoPlusOrigins.setSrc(shop,'master'");
  ok(k > 0 && w > k && w - k < 900, 'MO+ 商品主檔直推：閘門在直推之前');
  ok(/if\(_roSyncBlocked\('MO\+ 商品主檔直推'\)\)\{[^}]*\}[^\n]*\n\s*else if\(window\.__cloudMoPlusOrigins/.test(src), 'MO+ 商品主檔直推：直推在 else 分支');
}
// 所有呼叫 syncToCloud 的地方都在已接閘門的函式裡（新增呼叫端沒接閘門時這條會紅）
{
  const calls = []; const re = /(?:window\.)?syncToCloud\(/g; let m;
  while ((m = re.exec(src))) {
    const ls = src.lastIndexOf('\n', m.index) + 1, line = src.slice(ls, src.indexOf('\n', m.index));
    if (/^\s*\/\//.test(line) || line.slice(0, m.index - ls).includes('//')) continue;   // 註解
    if (/function syncToCloud\(/.test(line) || /cupSyncToCloud\(/.test(line.slice(Math.max(0, m.index - ls - 3), m.index - ls + 12))) continue;
    calls.push(line.trim().slice(0, 90));
  }
  eq(calls.length, 5, 'syncToCloud 呼叫點數量（全域鈕、MOMO 確認、PChome 確認、MO+ 兩支自動推）', calls.join('\n    '));
}
// 閘門本身：非唯讀直接 return false、沒有副作用（提示與 console 都在 blocked 之後）
{
  const k = src.indexOf('function _roSyncBlocked(where){');
  const body = src.slice(k, src.indexOf('\n}\n', k));
  ok(/const d=_roSyncDecide\(window\.App\);\s*\n\s*if\(!d\.blocked\) return false;/.test(body), '_roSyncBlocked：非唯讀第一步就 return false');
  ok(body.indexOf('showAlertModal') > body.indexOf('if(!d.blocked) return false;'), '_roSyncBlocked：提示在判斷之後');
  ok(!/localStorage|_pendingSyncKeys|Dirty|lastpushed|LastPushed|__cloud/.test(body), '_roSyncBlocked：不碰 dirty／待同步／lastpushed／雲端');
}

// ── ③ app.js 最後一道防護沒被動到 ──
ok(app.includes("if (__isReadOnly()) { __roDenied(); return Promise.resolve(); }"), 'app.js __installReadonlyCloudGuard 的 no-op 還在');
ok(app.includes("try { return !!(App && App.currentUser && App.currentUser.role === 'view'); }"), "app.js __isReadOnly 仍是 role==='view'");
ok(app.includes('App.isReadOnly = __isReadOnly;'), 'App.isReadOnly 指向 __isReadOnly');

console.log((fail ? '✗ 有失敗：' : '✓ 全過：') + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
