// 洞察表上傳前的單檔上限預檢（2026-11-19）：node scripts/insight-capguard.test.cjs
//   抽 js/pages/marketing.js 的 INS-DOC-CAP-PURE（門檻判斷）、js/firebase.js 的 PROFIT_DOC_MEASURE（量法），
//   並靜態檢查三個上傳入口都在 Store.set 之前接了預檢、調整紀錄不擋。資料全是合成的；不碰瀏覽器、不碰雲端。
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');
const between = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('找不到 ' + a); if (src.indexOf(a, i + 1) >= 0) throw new Error('標記重複 ' + a); return src.slice(i, j + b.length); };
const mk = read('js/pages/marketing.js'), fb = read('js/firebase.js');
const P = new Function(between(mk, '/* ═══ INS-DOC-CAP-PURE-BEGIN', '/* ═══ INS-DOC-CAP-PURE-END ═══ */') + '\nreturn { INS_DOC_BLOCK_RATIO, insDocCapVerdict, insDocCapCheckAll, _insUploadErrMsg };')();
const M = new Function(between(fb, '// PROFIT_DOC_MEASURE_BEGIN', '// PROFIT_DOC_MEASURE_END') + '\nreturn { profitDocMeasure, PROFIT_DOC_LIMIT_BYTES };')();
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const LIMIT = 1048576;

// ── 門檻 ──
ok(P.INS_DOC_BLOCK_RATIO === 0.95, '預檢門檻 95%（驗收時暫時調低，改回後這條要過）');
ok((mk.match(/INS_DOC_BLOCK_RATIO\s*=/g) || []).length === 1, '門檻只定義一次');

// ── 判斷 ──
{ const v = P.insDocCapVerdict('好麻吉', Math.floor(LIMIT * 0.95), LIMIT, 0.95); ok(v.ok && v.msg === '', '剛好 95% 以下 ⇒ 放行'); }
{ const v = P.insDocCapVerdict('好麻吉', 1000000, LIMIT, 0.95);
  ok(!v.ok && v.pct === 95.4, '超過 95% ⇒ 擋（' + v.pct + '）');
  ok(v.msg === '好麻吉洞察表資料已接近雲端單檔上限（目前 95.4%），這次沒有上傳，雲端資料沒有變。請通知 Keani 處理。', '訊息逐字'); }
{ const v = P.insDocCapVerdict('維克', LIMIT, LIMIT, 0.95); ok(!v.ok && /（目前 100\.0%）/.test(v.msg), '整數百分比也帶一位小數'); }
ok(P.insDocCapVerdict('好麻吉', NaN, LIMIT, 0.95).ok && P.insDocCapVerdict('好麻吉', null, LIMIT, 0.95).pct === null, '量不到 ⇒ 放行');
ok(P.insDocCapVerdict('好麻吉', 927148, LIMIT, 0.95).ok && !P.insDocCapVerdict('好麻吉', 927148, LIMIT, 0.60).ok, '88.4%：門檻 95% 放行、60% 擋');

// ── 多通路：全部量完才回，有一個超過 ⇒ blocked ──
{ const sizes = { 玩樂: 500000, 好麻吉: 1010000, 森之旅: 300000, 維克: 1040000 };
  const calls = [];
  const r = P.insDocCapCheckAll(Object.keys(sizes).map(s => ({ shop: s, key: 'ec.insight_' + s + '_master', value: {} })),
    (shop, key) => { calls.push(shop + '|' + key); return { bytes: sizes[shop], limit: LIMIT }; }, 0.95);
  ok(calls.length === 4, '四個通路都量過（不是遇到第一個超過就停）');
  ok(r.blocked && r.blocked.shop === '好麻吉' && /^好麻吉洞察表資料已接近/.test(r.blocked.msg), 'blocked＝第一個超過的');
  ok(r.results.filter(x => !x.ok).map(x => x.shop).join() === '好麻吉,維克' && r.unmeasured.length === 0, '每一筆都有結果'); }
{ const r = P.insDocCapCheckAll([{ shop: '玩樂', key: 'k', value: 1 }, { shop: '好麻吉', key: 'k', value: 1 }],
    (shop) => shop === '玩樂' ? null : { bytes: 10, limit: LIMIT }, 0.95);
  ok(!r.blocked && r.unmeasured.join() === '玩樂' && r.results[0].measured === false && r.results[1].ok, '量不到的放行並列在 unmeasured'); }
{ const r = P.insDocCapCheckAll([{ shop: '玩樂', key: 'k', value: 1 }], () => { throw new Error('x'); }, 0.95); ok(!r.blocked && r.unmeasured.length === 1, '量測丟錯 ⇒ 當成量不到'); }
ok(P.insDocCapCheckAll(null, () => null, 0.95).results.length === 0, '沒有東西要寫 ⇒ 空');

// ── catch 的提示 ──
{ const e = new Error('好麻吉洞察表資料已接近雲端單檔上限…'); e.insCap = true;
  ok(P._insUploadErrMsg(e) === e.message, '預檢擋下的不冠「解析失敗：」');
  ok(P._insUploadErrMsg(new Error('找不到必要欄位')) === '解析失敗：找不到必要欄位', '其他錯誤照舊'); }

// ── 量法：把欄位換進去之後整份的大小（同 firebase.js __insightDocMeasure 的算式）──
{ const doc = { 'ec.insight_好麻吉_perf': { byShopeeId: { '1': { clicks: 1 } } }, 'ec.insight_好麻吉_notes': {} };
  const before = M.profitDocMeasure(doc, 'app/insight_好麻吉').bytes;
  const next = Object.assign({}, doc); next['ec.insight_好麻吉_perf'] = { byShopeeId: {} };
  const after = M.profitDocMeasure(next, 'app/insight_好麻吉').bytes;
  ok(before - after === (1 + 1) + (6 + 1) + 8, '換掉欄位後大小跟著變（差 ' + (before - after) + '）');
  ok(doc['ec.insight_好麻吉_perf'].byShopeeId['1'], '不改到原本的資料'); }
ok(/window\.__insightDocMeasure = \(shop, key, value\) => \{[\s\S]{0,400}capDocSnaps\.insight\[shop\][\s\S]{0,400}profitDocMeasure\(data, 'app\/insight_' \+ shop\)/.test(fb), 'firebase.js 有量測函式、用既有快照');
ok(!/__cloudInsightDocMeasure/.test(fb) && (fb.match(/^\s*(window\.)?__cloud[A-Za-z0-9_]*\s*=/gm) || []).length === 35, '沒有新增 __cloud 物件（仍是 35 個）');
{ const body = between(fb, 'window.__insightDocMeasure = (shop, key, value) => {', "limit: PROFIT_DOC_LIMIT_BYTES };\n    };");
  ok(!/getDoc|onSnapshot|updateDoc|setDoc|runTransaction|writeBatch/.test(body), '量測函式不讀不寫'); }

// ── 三個入口都接了，而且在 Store.set 之前 ──
const fnBody = (name) => { const i = mk.indexOf(name); if (i < 0) throw new Error('找不到 ' + name); return mk.slice(i, i + 6000); };
{ const s = fnBody("const masterInput = document.getElementById('insight-master-upload');");
  const g = s.indexOf('_insDocCapGuardAll(writes);'), w = s.indexOf('writes.forEach(w => Store.set(w.key, w.value));');
  ok(g > 0 && w > g, '母表：先全部預檢、再寫');
  ok(!/Store\.set\(`ec\.insight_\$\{shopName\}_master`/.test(s), '母表：迴圈裡不再邊算邊寫');
  ok(s.indexOf('showToast(`商品清單已合併到') > w, '母表：「已合併」提示在寫入之後'); }
{ const s = fnBody('const wireSalesUpload = (inputId, slotIdx, slotLabel) => {');
  const g = s.indexOf("_insDocCapGuard(currentShop, sKey('weeks'), weeks);"), w = s.indexOf("Store.set(sKey('weeks'), weeks);");
  ok(g > 0 && w > g && s.indexOf('已上傳（') > w, '每週銷售：預檢 → 寫 → 才提示已上傳'); }
{ const s = fnBody("const perfInput = document.getElementById('insight-perf-upload');");
  const g = s.indexOf("_insDocCapGuard(currentShop, sKey('perf'), perfValue);"), w = s.indexOf("Store.set(sKey('perf'), perfValue);");
  ok(g > 0 && w > g && s.indexOf('已上傳`') > w, '商品表現：預檢 → 寫 → 才提示已上傳'); }
ok((mk.match(/showToast\(_insUploadErrMsg\(err\), 'error'\)/g) || []).length === 3, '三個 catch 都改用 _insUploadErrMsg');
ok((mk.match(/_insDocCapGuard(All)?\(/g) || []).length === 3 + 3, '預檢只接在這三個入口（3 個呼叫＋2 個定義＋1 個內部呼叫）');
// 調整紀錄不擋
{ const tx = between(fb, 'updateNoteTx: async (shop, code, applyFn) => {', 'finally { clearTimeout(timer); }');
  ok(!/__insightDocMeasure|insDocCap/.test(tx), '調整紀錄的交易沒有接預檢'); }

console.log('insight-capguard: ' + n + ' 項全過');
