// 開站加速第二包（2026-11-26）：node scripts/boot-subs-defer.test.cjs
//   1. 靜態：firebase.js 開站的 23 份訂閱都包在 __bootDefer 裡、沒有漏網的直接訂閱；new Event( 剛好一行；__cloud 物件 35；
//      貼入點（new Event( 那行）之後沒有 window.__cloud… =；新名字都不以 __cloud 開頭。
//   2. 靜態：app.js 發 mainFirstSnapshot／cloudSetupFailed、__ensureProfit 等到齊；profit.js W1～W4 開頭都接 _profitDocBlocked。
//   3. vm：firebase.js 的啟動區塊（三條觸發只跑一次、慢速模擬、到齊判斷、__bootSubsWhenReady 到齊／逾時）。
//   不碰瀏覽器、不碰雲端。
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');
const between = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('找不到 ' + a); if (src.indexOf(a, i + 1) >= 0) throw new Error('標記重複 ' + a); return src.slice(i, j + b.length); };
const fb = read('js/firebase.js'), app = read('js/app.js'), pf = read('js/profit.js');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

// ══════ 1. firebase.js 靜態 ══════
const lines = fb.split('\n');
const markIdx = lines.findIndex(l => /new Event\(/.test(l));
ok(lines.filter(l => /new Event\(/.test(l)).length === 1, 'new Event( 剛好一行（ec-offline-on 的貼入點）');
ok(/window\.dispatchEvent\(new Event\('cloudStoreReady'\)\)/.test(lines[markIdx]), '那一行就是 cloudStoreReady');
ok((fb.match(/^\s*(window\.)?__cloud[A-Za-z0-9_]*\s*=/gm) || []).length === 35, '__cloud 物件仍是 35 個');
ok(!lines.slice(markIdx + 1).some(l => /window\.__cloud\w*\s*=/.test(l)), '貼入點之後沒有 window.__cloud… =');
ok(/^import \{ initializeApp \} from 'https:\/\/www\.gstatic\.com\/firebasejs\/10\.13\.2\/firebase-app\.js'/m.test(fb), '第 2 行 import 沒動');
const arr = (name) => { const m = new RegExp('const ' + name + ' = (\\[[^\\]]*\\]);').exec(fb); if (!m) throw new Error('找不到 ' + name); return JSON.parse(m[1].replace(/'/g, '"')); };
const GROWTH = arr('GROWTH_SHOPS'), OPTLOG = arr('OPTLOG_SHOPS');
ok(GROWTH.length === 4 && OPTLOG.length === 11, 'growth 4 家、optlog 11 家');
const defers = fb.match(/__bootDefer\('[^']+'/g) || [];
const literal = defers.map(s => s.slice("__bootDefer('".length, -1));
ok(literal.join('|') === ['app/profit', 'app/pchome_orders', 'app/pchome_optlog', 'app/pchome_history', 'app/pchome_products', 'app/pchome_recon', 'app/books_recon', 'app/friday_recon', 'app/growth_', 'app/optlog_'].join('|'), '__bootDefer 呼叫點依原本順序：' + literal.join('、'));
ok(1 + 5 + 1 + 1 + GROWTH.length + OPTLOG.length === 23, '執行時共 23 份');
// 沒有漏網的直接訂閱：每一個原本的訂閱呼叫都在 __bootDefer( 的同一行
const mustWrapped = [/onSnapshot\(profitDocRef, snap => \{/, /__cloudSubscribeCached\(window\.__cloudPchome\w+/, /__cloudSubscribeCached\(window\.__cloudBooksRecon/, /__cloudSubscribeCached\(window\.__cloudFridayRecon/];
mustWrapped.forEach(re => {
  const hit = lines.filter(l => re.test(l));
  ok(hit.length > 0 && hit.every(l => /__bootDefer\(/.test(l)), '直接訂閱都包在 __bootDefer：' + re);
});
{ const gi = fb.indexOf("GROWTH_SHOPS.forEach(shop => __bootDefer('app/growth_' + shop"), oi = fb.indexOf("OPTLOG_SHOPS.forEach(shop => __bootDefer('app/optlog_' + shop");
  ok(gi > 0 && fb.indexOf('window.__cloudGrowth.subscribe(shop', gi) > gi && fb.indexOf('window.__cloudGrowth.subscribe(shop', gi) < gi + 400, 'growth 訂閱在 __bootDefer 裡');
  ok(oi > 0 && fb.indexOf('window.__cloudOptlog.subscribe(shop', oi) > oi && fb.indexOf('window.__cloudOptlog.subscribe(shop', oi) < oi + 400, 'optlog 訂閱在 __bootDefer 裡');
  ok((fb.match(/window\.__cloudGrowth\.subscribe\(shop/g) || []).length === 1 && (fb.match(/window\.__cloudOptlog\.subscribe\(shop/g) || []).length === 1, 'growth／optlog 開站訂閱各只有一處'); }
{ const blk = between(fb, '// ══════ 開站加速第二包：延後的開站訂閱', "window.dispatchEvent(new Event('cloudStoreReady'));");
  ok(!/window\.__cloud\w*\s*=/.test(blk) && !/new Event\(/.test(blk.slice(0, blk.lastIndexOf('window.dispatchEvent'))), '啟動區塊沒有 __cloud 名字、沒有多的 new Event(');
  ok(/addEventListener\('mainFirstSnapshot'/.test(blk) && /addEventListener\('cloudSetupFailed'/.test(blk) && /setTimeout\(\(\) => window\.__bootSubsStart\('timeout20s'\), 20000\)/.test(blk), '三條觸發都在');
  ok(!/onSnapshot|getDoc|setField|writePaths|updateDoc|setDoc/.test(blk.replace(/'[^']*'/g, '')), '啟動區塊不讀不寫雲端（只叫佇列）'); }
ok(/window\.__profitDocReady = \(\) => !!profitParts\.gotFirst;/.test(fb), '__profitDocReady＝profitParts.gotFirst');

// ══════ 2. app.js、profit.js 靜態 ══════
{ const s = app.slice(app.indexOf('window.__firstMainSnapshotDone = true;'), app.indexOf('window.__firstMainSnapshotDone = true;') + 400);
  ok(/if \(isFirstSnapshot\) \{ try \{ window\.dispatchEvent\(new CustomEvent\('mainFirstSnapshot'\)\)/.test(s), 'app.js 第一批快照發 mainFirstSnapshot'); }
{ const c = app.slice(app.indexOf("console.error('Cloud setup failed"), app.indexOf("console.error('Cloud setup failed") + 900);
  ok(/new CustomEvent\('cloudSetupFailed'\)/.test(c), 'app.js setup 失敗發 cloudSetupFailed'); }
{ const e = between(app, 'window.__ensureProfit = function () {', '\n};');
  ok(/__bootSubsWhenReady\(PROFIT_BOOT_SUBS_WAIT_MS\)/.test(e) && /PROFIT_BOOT_SUBS_WAIT_MS = 15000/.test(app), '__ensureProfit 等到齊，上限 15 秒');
  ok(e.indexOf('subsP.then') > 0 && e.indexOf('subsP.then') < e.indexOf('window.__profitReady = true'), '__profitReady 在等待之後才設'); }
const fnHead = (sig, len) => { const i = pf.indexOf(sig); if (i < 0) throw new Error('找不到 ' + sig); return pf.slice(i, i + (len || 260)); };
ok(/^function _cloudWrite\(k,v\)\{\n  if\(_profitDocBlocked\(k\)\) return false;/.test(fnHead('function _cloudWrite(k,v){')), 'W1 _cloudWrite 開頭擋');
ok(/const k='ec_tag_defs';\n  if\(_profitDocBlocked\(k\)\) return false;/.test(fnHead('async function saveTagDefs(list){')), 'W2 saveTagDefs 開頭擋');
['saveScoreTargetsAll', 'saveScoreMonthlyAll', 'saveScoreBonusAll'].forEach(f => ok(new RegExp('^function ' + f + '\\(all\\)\\{\\n  if\\(_profitDocBlocked\\(').test(fnHead('function ' + f + '(all){')), 'W3 ' + f + ' 開頭擋'));
ok(/^function saveSplits\(shop,map\)\{\n  if\(_profitDocBlocked\('ec_split\|'\+shop\)\) return \{ok:false,err:null,key:null,profitNotReady:true\};/.test(fnHead('function saveSplits(shop,map){')), 'W4 saveSplits 開頭擋（回物件）');
ok(/const res=saveSplits\(shop,map\);\n  if\(res&&res\.profitNotReady\) return;/.test(pf), 'saveSplitDraft 認得 profitNotReady');
ok((pf.match(/_profitDocBlocked\(/g) || []).length === 1 + 6, '_profitDocBlocked：定義 1＋呼叫 6');
{ // _profitDocBlocked 行為
  const src = between(pf, 'function _profitDocBlocked(label){', '\n}');
  const run = (ready) => { const toasts = []; const w = { __profitDocReady: ready === undefined ? undefined : () => ready }; const f = new Function('window', 'showToast', 'console', src + '\nreturn _profitDocBlocked;')(w, (m) => toasts.push(m), { error() {} }); return { r: f('k'), toasts }; };
  ok(run(true).r === false && run(true).toasts.length === 0, 'app/profit 到了 ⇒ 放行');
  ok(run(undefined).r === false, '沒有 firebase.js（__profitDocReady 不存在）⇒ 照舊');
  const b = run(false); ok(b.r === true && b.toasts[0] === '淨利表雲端設定還在載入，這次沒有存，雲端資料沒有變。請稍候再試。', '沒到 ⇒ 擋下、提示原句'); }

// ══════ 3. vm：啟動區塊 ══════
const blk = between(fb, '// ══════ 開站加速第二包：延後的開站訂閱', "window.dispatchEvent(new Event('cloudStoreReady'));").replace("window.dispatchEvent(new Event('cloudStoreReady'));", '');
function env(opt) {
  opt = opt || {};
  const et = new EventTarget(), started = [], ss = {};
  if (opt.slow) ss['ec.__bootSubsSlowMock'] = String(opt.slow);
  const timers = [];
  const ctx = {
    console: { info() {}, log() {}, warn() {}, error() {} }, Date, Math, Number, String, Object, Promise, CustomEvent,
    setTimeout: (fn, ms) => { if (ms === 20000) { timers.push(fn); return 0; } return setTimeout(fn, ms); },
    location: { hostname: opt.host || 'localhost' }, sessionStorage: { getItem: k => (k in ss ? ss[k] : null), setItem: (k, v) => { ss[k] = v; }, removeItem: k => { delete ss[k]; } },
    addEventListener: et.addEventListener.bind(et), dispatchEvent: et.dispatchEvent.bind(et),
  };
  ctx.window = ctx;
  const arrived = { profit: false, growth: {}, optlog: {} };
  ctx.__bootPart = { profit: () => arrived.profit, growth: s => !!arrived.growth[s], optlog: s => !!arrived.optlog[s] };
  const names = ['app/profit', 'app/pchome_orders', 'app/pchome_optlog', 'app/pchome_history', 'app/pchome_products', 'app/pchome_recon', 'app/books_recon', 'app/friday_recon']
    .concat(GROWTH.map(s => 'app/growth_' + s), OPTLOG.map(s => 'app/optlog_' + s));
  ctx.__bootDeferred = names.map(name => ({ name, start: () => { started.push(name); if (name === 'app/pchome_recon' && opt.throwOn) throw new Error('x'); } }));
  vm.createContext(ctx);
  vm.runInContext(blk, ctx);
  const arriveAll = () => {
    arrived.profit = true; GROWTH.forEach(s => { arrived.growth[s] = true; }); OPTLOG.forEach(s => { arrived.optlog[s] = true; });
    ['__pchomeOrdersCloudLatest', '__pchomeOptlogCloudLatest', '__pchomeHistoryCloudLatest', '__pchomeProductsCloudLatest', '__pchomeReconCloudLatest', '__booksReconCloudLatest', '__fridayReconCloudLatest'].forEach(k => { ctx[k] = {}; });
  };
  return { ctx, started, timers, arrived, arriveAll, names };
}
const tick = (ms) => new Promise(r => setTimeout(r, ms || 0));

(async () => {
  { const e = env();
    ok(e.started.length === 0 && e.ctx.__bootSubsReady().started === false && e.ctx.__bootSubsReady().pending.length === 23, '還沒觸發：一份都沒訂、23 份都 pending');
    e.ctx.dispatchEvent(new CustomEvent('mainFirstSnapshot'));
    ok(e.started.length === 23 && e.started.join('|') === e.names.join('|'), 'mainFirstSnapshot ⇒ 依原本順序訂 23 份');
    e.ctx.dispatchEvent(new CustomEvent('cloudSetupFailed')); e.timers.forEach(f => f()); e.ctx.__bootSubsStart('manual');
    ok(e.started.length === 23, '之後的觸發都不會再訂一次');
    ok(e.ctx.__bootSubsReady().reason === 'mainFirstSnapshot' && !e.ctx.__bootSubsReady().done, 'reason 記第一個；還沒到齊');
    const wp = e.ctx.__bootSubsWhenReady(5000);
    e.arrived.profit = true; await tick(250);
    ok(e.ctx.__bootSubsReady().pending.length === 22, 'app/profit 到了 ⇒ 剩 22');
    e.arriveAll(); const r = await wp;
    ok(r.done && !r.timedOut && e.ctx.__bootSubsReady().done, '全部到 ⇒ __bootSubsWhenReady resolve done'); }
  { const e = env(); e.ctx.dispatchEvent(new CustomEvent('cloudSetupFailed'));
    ok(e.started.length === 23 && e.ctx.__bootSubsReady().reason === 'cloudSetupFailed', 'cloudSetupFailed 也會開始'); }
  { const e = env(); e.timers.forEach(f => f());
    ok(e.started.length === 23 && e.ctx.__bootSubsReady().reason === 'timeout20s', '20 秒保險也會開始'); }
  { const e = env({ throwOn: true }); e.ctx.dispatchEvent(new CustomEvent('mainFirstSnapshot'));
    ok(e.started.length === 23, '其中一份啟動丟錯，其他照樣訂'); }
  { const e = env(); e.ctx.dispatchEvent(new CustomEvent('mainFirstSnapshot'));
    const r = await e.ctx.__bootSubsWhenReady(300);
    ok(!r.done && r.timedOut && r.pending.length === 23, '逾時 ⇒ timedOut，列出還沒到的'); }
  { const e = env({ slow: 1 }); e.ctx.dispatchEvent(new CustomEvent('mainFirstSnapshot'));
    ok(e.started.length === 0 && e.ctx.__bootSubsReady().started && !e.ctx.__bootSubsReady().ranAt, '慢速模擬：觸發了但還沒訂');
    e.arriveAll(); ok(!e.ctx.__bootSubsReady().done, '還沒真的訂之前不算到齊');
    await tick(1100); ok(e.started.length === 23 && e.ctx.__bootSubsReady().done, '1 秒後才訂'); }
  { const e = env({ slow: 5, host: 'kelly83117.github.io' }); e.ctx.dispatchEvent(new CustomEvent('mainFirstSnapshot'));
    ok(e.started.length === 23, '正式站不吃慢速設定');
    e.ctx.__bootSubsSlowMock(10); ok(e.ctx.sessionStorage.getItem('ec.__bootSubsSlowMock') === '5', '正式站不能設慢速'); }
  console.log('boot-subs-defer：' + n + ' 項全部通過');
})().catch(e => { console.error(e); process.exit(1); });
