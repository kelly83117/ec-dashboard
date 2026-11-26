// 開站加速第一包（2026-11-26）：node scripts/insight-ready-gate.test.cjs
//   1. marketing.js INS-READY-PURE（_insReadyMsg）真值表
//   2. 靜態檢查：洞察表會寫 master／weeks／perf 的入口、✕ 清除、整月上傳都接了擋板；app.js 的 Store.set 閘門在 origSet 之前
//   3. 用 vm 跑 app.js 的 __setupCloud（假雲端）：
//      空快照（文件不存在／從空快取來）絕不取代 Store._mem、ec.users 不會變空、登入正常；
//      第一批快照在 __bootApp 之後才處理；setup 失敗時訂閱關掉；洞察表背景載入的 ready／failed、擋板、__insightCloudReady。
//   資料全是合成的；不碰瀏覽器、不碰雲端。
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');
const between = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('找不到 ' + a); if (src.indexOf(a, i + 1) >= 0) throw new Error('標記重複 ' + a); return src.slice(i, j + b.length); };
const mk = read('js/pages/marketing.js'), app = read('js/app.js');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

// ══════ 1. 純函式 ══════
const P = new Function(between(mk, '/* ═══ INS-READY-PURE-BEGIN', '/* ═══ INS-READY-PURE-END ═══ */') + '\nreturn { _insReadyMsg };')();
ok(P._insReadyMsg(null, ['好麻吉']) === null, 'null（沒用雲端）⇒ 放行');
ok(P._insReadyMsg({ 好麻吉: 'ready' }, ['好麻吉']) === null, 'ready ⇒ 放行');
ok(P._insReadyMsg({ 好麻吉: 'ready' }, ['不認得']) === null, '不在列管的通路 ⇒ 放行');
ok(P._insReadyMsg({ 好麻吉: 'loading' }, ['好麻吉']) === '洞察表資料還在載入（好麻吉），這次沒有上傳，雲端資料沒有變。請等畫面出現資料後再試。', 'loading 原句');
ok(P._insReadyMsg({ 玩樂: 'failed' }, ['玩樂']) === '洞察表資料讀取失敗（玩樂），這次沒有上傳，雲端資料沒有變。請重新整理後再試。', 'failed 原句');
{ const st = { 玩樂: 'ready', 好麻吉: 'loading', 森之旅: 'failed', 維克: 'loading' };
  ok(/^洞察表資料讀取失敗（森之旅）/.test(P._insReadyMsg(st, ['玩樂', '好麻吉', '森之旅', '維克'])), '混合時 failed 優先');
  ok(/還在載入（好麻吉、維克）/.test(P._insReadyMsg(st, ['玩樂', '好麻吉', '維克'])), '多家 loading 都列出來');
  ok(P._insReadyMsg(st, ['玩樂']) === null, '只檢查指定的通路'); }

// ══════ 2. 靜態檢查 ══════
const sliceFrom = (src, marker, len) => { const i = src.indexOf(marker); if (i < 0) throw new Error('找不到 ' + marker); return src.slice(i, i + len); };
const before = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b); return i >= 0 && j >= 0 && i < j; };
{ const s = sliceFrom(mk, "const masterInput = document.getElementById('insight-master-upload');", 6000);
  ok(before(s, '_insReadyBlocked(INSIGHT_SHOPS, masterInput)', 'confirmUpload('), '母表：選檔後、確認窗前檢查 4 家');
  ok(before(s.slice(s.indexOf('confirmUpload(')), '_insReadyGate(INSIGHT_SHOPS)', 'Store.set(w.key, w.value)'), '母表：寫入前再檢查一次 4 家'); }
{ const s = sliceFrom(mk, 'const wireSalesUpload = (inputId, slotIdx, slotLabel) => {', 5000);
  ok(before(s, '_insReadyBlocked([currentShop], input)', 'confirmUpload('), '每週銷售：確認窗前檢查目前通路');
  ok(before(s.slice(s.indexOf('confirmUpload(')), '_insReadyGate([currentShop])', "Store.set(sKey('weeks')"), '每週銷售：寫入前再檢查'); }
{ const s = sliceFrom(mk, "const perfInput = document.getElementById('insight-perf-upload');", 3000);
  ok(before(s, '_insReadyBlocked([currentShop], perfInput)', 'confirmUpload('), '商品表現：確認窗前檢查目前通路');
  ok(before(s.slice(s.indexOf('confirmUpload(')), '_insReadyGate([currentShop])', "Store.set(sKey('perf')"), '商品表現：寫入前再檢查'); }
{ const s = sliceFrom(mk, "const btn = e.target.closest('[data-clear-piece]');", 6000);
  ok(before(s, '_insReadyBlocked([curShop])', 'this.openModal('), '✕ 清除：確認窗前檢查目前通路');
  ok(before(s.slice(s.indexOf('if (!confirmed) return;')), '_insReadyBlocked([curShop])', 'Store.set(op.key, op.value)'), '✕ 清除：寫入前再檢查'); }
ok((mk.match(/showToast\(_insUploadErrMsg\(err\), 'error'\)/g) || []).length === 3, '沒有多出 showToast(_insUploadErrMsg) 呼叫（insight-capguard 數的是 3）');
{ const s = sliceFrom(mk, 'async insPerfMonthUpload(file, shop) {', 2500);
  ok(before(s, '_insReadyMsg(window.__insightShopState || null, [shop])', '_insPmOverlap('), '整月商品表現：算母表重疊率前檢查'); }
{ // marketing.js 每一個寫 master／weeks／perf 的 Store.set（不含舊 key 搬家 migrateInsightDataIfNeeded）：同一個 addEventListener 處理函式裡、寫入之前有擋板
  const re = /Store\.set\((sKey\('(?:weeks|perf|master)'\)|w\.key|op\.key)/g; let m, cnt = 0;
  while ((m = re.exec(mk))) { cnt++; const pre = mk.slice(mk.lastIndexOf('addEventListener(', m.index), m.index); ok(/_insReady(Gate|Blocked)\(/.test(pre), '同一個處理函式裡、寫入點之前有擋板：' + m[1]); }
  ok(cnt === 4, '洞察表上傳寫入點共 4 個（母表、每週銷售、商品表現、清除），實際 ' + cnt); }
{ const s = sliceFrom(mk, 'renderInsightTabHtml() {', 8000);
  ok(before(s, '_insLoadingHtml(currentShop, INSIGHT_SHOPS', 'this.migrateInsightDataIfNeeded()'), '洞察表頁：沒 ready 就只畫載入中／讀取失敗'); }
{ const w = sliceFrom(app, 'Store.set = function(key, value) {', 3000);
  ok(before(w, "ist[im[1]] !== 'ready'", 'origSet(key, value)'), 'Store.set 閘門在 origSet 之前（記憶體也不寫）'); }
ok(!/__cloudInsightSlow|window\.__cloud[A-Za-z0-9_]*Ready\s*=/.test(app), '新的觀測點都不以 __cloud 開頭');

// ══════ 3. vm 模擬 __setupCloud ══════
const region = between(app, '// ══════ 開站加速第一包（2026-11-26）：洞察表背景載入的狀態', '\n}\n\nif (window.__cloudStore) {').replace(/\n\nif \(window\.__cloudStore\) \{$/, '');
const tick = (ms) => new Promise(r => setTimeout(r, ms || 0));
const USERS = [{ username: 'Keani', name: 'Keani', role: 'admin', active: true }, { username: 'a', role: 'member' }, { username: 'b', role: 'member' }];
const snapOf = (d) => ({ exists: () => d !== undefined, data: () => (d === undefined ? undefined : JSON.parse(JSON.stringify(d))) });
const SHOPS = ['好麻吉', '玩樂', '森之旅', '維克'];
const insDoc = (s) => ({ ['ec.insight_' + s + '_master']: { byCode: { A1: { id: '1' } } }, ['ec.insight_' + s + '_weeks']: [{ products: [] }], ['ec.insight_' + s + '_notes']: {}, ['ec.insight_' + s + '_perf']: { byShopeeId: {} } });

function makeEnv(opt) {
  opt = opt || {};
  const log = [], et = new EventTarget(), subs = { main: [], shop: {} }, getResolvers = {};
  const ls = {}; if (opt.session) ls['ec.session'] = JSON.stringify(opt.session);
  const Store = {
    KEYS: { users: 'ec.users', session: 'ec.session', platforms: 'ec.platforms' }, _mem: {}, _useMem: false,
    get(k, f) { if (this._useMem) return this._mem[k] !== undefined ? this._mem[k] : f; const r = ls[k]; return r ? JSON.parse(r) : f; },
    set(k, v) { if (this._useMem) { this._mem[k] = v; return; } ls[k] = JSON.stringify(v); },
    remove(k) { if (this._useMem) { delete this._mem[k]; return; } delete ls[k]; },
  };
  const cloudWrites = [];
  const cs = {
    getDoc: () => opt.mainGet ? opt.mainGet() : Promise.resolve(snapOf({ 'ec.users': USERS, 'ec.platforms': [{ name: 'x' }] })),
    setField: (k, v) => { cloudWrites.push(['main', k]); return Promise.resolve(); },
    removeField: () => Promise.resolve(), removeFields: () => Promise.resolve(),
    subscribe: (cb) => { subs.main.push(cb); log.push('sub-main'); if (opt.mainSubSync) opt.mainSubSync(cb); return () => { log.push('unsub-main'); subs.main = subs.main.filter(x => x !== cb); }; },
  };
  const byShop = {
    shops: SHOPS.slice(),
    forKey: (key) => ({ setField: () => { cloudWrites.push(['insight', key]); return Promise.resolve(); } }),
    getDocForShop: (s) => new Promise((res, rej) => { getResolvers[s] = { res, rej }; }),
    subscribeShop: (s, cb) => { subs.shop[s] = cb; return () => {}; },
  };
  const App = {
    currentUser: null, filter: {}, route: 'dashboard',
    render() { log.push('render'); }, renderFromCloud(sc) { log.push('renderFromCloud:' + sc); },
    enterApp(u) { this.currentUser = u; log.push('enterApp:' + u.username); }, showLogin() { log.push('showLogin'); },
    applyUserPerms() {}, _logoutIfInactive() { return false; }, ensureAdmin() { log.push('ensureAdmin'); }, _forceLogout() { log.push('forceLogout'); },
  };
  const ctx = {
    console: { log() {}, info() {}, warn: (...a) => log.push('warn:' + String(a[0]).slice(0, 40)), error: (...a) => log.push('error:' + String(a[0]).slice(0, 40)), trace() {} },
    setTimeout, clearTimeout, Promise, Object, Array, JSON, Date, Math, Number, String, Error, RegExp, Set, Map, CustomEvent, Event,
    addEventListener: et.addEventListener.bind(et), removeEventListener: et.removeEventListener.bind(et), dispatchEvent: et.dispatchEvent.bind(et),
    location: { hostname: 'node' }, sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: (k) => { delete ls[k]; } },
    document: { getElementById: () => null, activeElement: null, querySelectorAll: () => [] },
    Store, App, showToast: (m) => log.push('toast:' + m.slice(0, 30)),
    __isLocalOnly: (k) => k === 'ec.session', __localGet: (k, f) => (k in ls ? JSON.parse(ls[k]) : f), __localSet: (k, v) => { ls[k] = JSON.stringify(v); }, __localRemove: (k) => { delete ls[k]; },
    __isReadOnly: () => false, __roDenied() {}, __notifyCloudFail: (k) => log.push('cloudfail:' + k), __installReadonlyCloudGuard() {},
    _dropInsightKeys: (o) => { const out = {}; if (!o || typeof o !== 'object') return out; Object.keys(o).forEach(k => { if (!k.startsWith('ec.insight_')) out[k] = o[k]; }); return out; },
    isUserActive: () => true, __bootApp: () => { log.push('bootApp'); if (opt.onBoot) opt.onBoot(ctx); },
  };
  ctx.window = ctx;
  ctx.__cloudStore = cs; ctx.__cloudInsightByShop = byShop; ctx.__cloudInsight = { getDoc: () => Promise.resolve(snapOf({})) };
  vm.createContext(ctx);
  vm.runInContext(region + '\nwindow.__setupCloud = __setupCloud;', ctx);
  return { ctx, log, subs, getResolvers, cloudWrites, Store, App, ls };
}
const users = (env) => env.Store._mem['ec.users'];

(async () => {
  // ── A：訂閱先送空快照、再送正常資料（setup 還沒完成時）→ 空的略過，帳號不會變空、自動登入正常 ──
  { const env = makeEnv({ session: { username: 'Keani' }, onBoot: (c) => { c.__bootPendingSession = { username: 'Keani' }; } });
    const p = env.ctx.__setupCloud();
    env.subs.main[0]({});                                          // 文件不存在／空快取
    env.subs.main[0]({ 'ec.users': [] });                          // 有欄位但沒有帳號
    env.subs.main[0]({ 'ec.users': USERS, 'ec.platforms': [{ name: 'x' }] });
    env.subs.main[0]({});                                          // 正常資料之後又來一份空的：不能蓋掉暫存的正常資料
    await p; await tick(5);
    ok(Array.isArray(users(env)) && users(env).length === 3, 'A：ec.users 仍是 3 個帳號');
    ok(env.ctx.__firstMainSnapshotDone === true, 'A：第一批快照有處理');
    ok(env.App.currentUser && env.App.currentUser.username === 'Keani', 'A：自動登入成功');
    ok(env.log.filter(x => x.indexOf('warn:[boot] app/main 訂閱給了一份沒有 ec.users') === 0).length === 3, 'A：三份空快照都印 warn 略過');
    ok(env.log.indexOf('bootApp') >= 0 && env.log.indexOf('bootApp') < env.log.indexOf('enterApp:Keani'), 'A：第一批快照在 __bootApp 之後才處理');
    ok(env.log.filter(x => x === 'sub-main').length === 1, 'A：app/main 只訂閱一次（getDoc 共用監聽）');
    // setup 之後的即時快照：空的略過、正常的照常套用
    env.subs.main[0]({});
    ok(users(env).length === 3, 'A：setup 之後的空快照也不取代 Store._mem');
    ok(env.log.some(x => x.indexOf('warn:[cloud] app/main 快照沒有 ec.users') === 0), 'A：之後的空快照印 warn');
    env.subs.main[0]({ 'ec.users': USERS.slice(0, 3), 'ec.platforms': [{ name: 'y' }] });
    ok(env.Store._mem['ec.platforms'][0].name === 'y', 'A：正常的下一份照常套用');
    ok(env.cloudWrites.length === 0, 'A：沒有任何雲端寫入'); }

  // ── B：只收到空快照（雲端正常、訂閱還沒給資料）→ 等下一份；getDoc 的資料照用，不會用空的蓋 ──
  { const env = makeEnv({ session: { username: 'Keani' }, onBoot: (c) => { c.__bootPendingSession = { username: 'Keani' }; } });
    const p = env.ctx.__setupCloud(); env.subs.main[0]({}); await p; await tick(5);
    ok(users(env).length === 3, 'B：getDoc 給的帳號還在');
    ok(env.ctx.__firstMainSnapshotDone !== true && !env.App.currentUser, 'B：還沒收到有帳號的快照 ⇒ 不算第一批');
    env.subs.main[0]({ 'ec.users': USERS }); await tick(1);
    ok(env.ctx.__firstMainSnapshotDone === true && env.App.currentUser.username === 'Keani', 'B：下一份正常快照到了才登入'); }

  // ── C：雲端真的是空的新專案（getDoc 沒有文件、本機也沒資料）→ 空快照照常交出，第一批快照不會卡住 ──
  { const env = makeEnv({ mainGet: () => Promise.resolve(snapOf(undefined)) });
    const p = env.ctx.__setupCloud(); env.subs.main[0]({}); await p; await tick(5);
    ok(env.ctx.__firstMainSnapshotDone === true, 'C：空專案的第一批快照照常處理'); }

  // ── D：setup 失敗（getDoc 丟錯）→ 先開的訂閱關掉，之後的快照不處理，洞察表維持 null ──
  { const env = makeEnv({ mainGet: () => Promise.reject(new Error('client is offline')) });
    const p = env.ctx.__setupCloud(); const cb = env.subs.main[0]; await p; await tick(5);
    ok(env.log.indexOf('unsub-main') >= 0, 'D：訂閱已關');
    cb({ 'ec.users': USERS }); await tick(1);
    ok(env.ctx.__firstMainSnapshotDone !== true && env.Store._useMem === false, 'D：失敗後收到的快照不處理、沒切成雲端模式');
    ok(env.ctx.__insightShopState === null && env.ctx.__setupCloudFailed === true, 'D：洞察表回到「沒用雲端」、標記失敗');
    ok(env.ctx.__insightShopReady('好麻吉') === true, 'D：沒用雲端時洞察表照舊（不擋）'); }

  // ── E：洞察表背景載入：擋板、ready、failed、failed→ready、__insightCloudReady ──
  { const env = makeEnv({ session: { username: 'Keani' }, onBoot: (c) => { c.__bootPendingSession = { username: 'Keani' }; } });
    const p = env.ctx.__setupCloud(); env.subs.main[0]({ 'ec.users': USERS }); await p; await tick(5);
    const st = env.ctx.__insightShopState;
    ok(SHOPS.every(s => st[s] === 'loading') && env.ctx.__insightCloudReady !== true, 'E：登入時 4 家都還在 loading');
    ok(env.App.currentUser && env.App.currentUser.username === 'Keani', 'E：不等洞察表就登入');
    env.Store.set('ec.insight_好麻吉_master', { byCode: {} });
    ok(env.Store._mem['ec.insight_好麻吉_master'] === undefined && env.cloudWrites.length === 0, 'E：loading 時 Store.set 擋下（記憶體、雲端都沒寫）');
    ok(env.log.some(x => x.indexOf('error:[洞察表] 好麻吉 資料還沒載入完成') === 0), 'E：擋下有紅字');
    env.Store.set('ec.users', USERS); ok(env.cloudWrites.length === 1, 'E：其他 key 不受影響');
    const whenP = env.ctx.__insightWhenReady('好麻吉');
    env.getResolvers['好麻吉'].res(snapOf(insDoc('好麻吉'))); await tick(1);
    ok(st['好麻吉'] === 'ready' && env.Store._mem['ec.insight_好麻吉_master'].byCode.A1, 'E：getDoc 到了 ⇒ ready、資料寫進 Store._mem');
    ok(await whenP === 'ready', 'E：__insightWhenReady resolve ready');
    env.Store.set('ec.insight_好麻吉_perf', { byShopeeId: { 9: {} } });
    ok(env.cloudWrites.some(w => w[1] === 'ec.insight_好麻吉_perf'), 'E：ready 之後可以寫');
    env.getResolvers['玩樂'].rej(new Error('offline')); await tick(1);
    ok(st['玩樂'] === 'failed', 'E：getDoc 丟錯 ⇒ failed');
    env.Store.set('ec.insight_玩樂_weeks', []); ok(!env.cloudWrites.some(w => w[1] === 'ec.insight_玩樂_weeks'), 'E：failed 也擋');
    env.subs.shop['玩樂']({}); await tick(1); ok(st['玩樂'] === 'failed', 'E：訂閱給空物件不算數');
    env.subs.shop['玩樂'](insDoc('玩樂')); await tick(1);
    ok(st['玩樂'] === 'ready' && env.Store._mem['ec.insight_玩樂_master'], 'E：訂閱給了資料 ⇒ failed→ready');
    env.subs.shop['森之旅'](insDoc('森之旅')); await tick(1);
    env.getResolvers['森之旅'].res(snapOf({ 'ec.insight_森之旅_master': { byCode: { OLD: {} } } })); await tick(1);
    ok(env.Store._mem['ec.insight_森之旅_master'].byCode.A1 && !env.Store._mem['ec.insight_森之旅_master'].byCode.OLD, 'E：訂閱先到 ⇒ 晚到的 getDoc 不蓋');
    ok(env.ctx.__insightCloudReady !== true, 'E：還有一家沒到 ⇒ __insightCloudReady 還是 false');
    // app/main 快照換掉整個 Store._mem 之後，洞察表欄位要保留、晚到的那家寫進新的物件
    env.subs.main[0]({ 'ec.users': USERS, 'ec.platforms': [{ name: 'z' }] });
    ok(env.Store._mem['ec.insight_好麻吉_master'] && env.Store._mem['ec.platforms'][0].name === 'z', 'E：app/main 快照後已到的洞察表欄位還在');
    env.getResolvers['維克'].res(snapOf(undefined)); await tick(1);
    ok(st['維克'] === 'ready' && env.ctx.__insightCloudReady === true, 'E：文件不存在也算 ready；4 家都 ready ⇒ __insightCloudReady');
    ok(env.cloudWrites.filter(w => w[0] === 'insight').length === 1, 'E：整個過程只有那 1 筆 ready 之後的洞察表寫入'); }

  console.log('insight-ready-gate：' + n + ' 項全部通過');
})().catch(e => { console.error(e); process.exit(1); });
