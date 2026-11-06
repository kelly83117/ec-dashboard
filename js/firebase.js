/* ===================== Firebase Firestore 雲端同步層 ===================== */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import { getFirestore, doc, collection, getDoc, getDocFromServer, setDoc, deleteDoc, updateDoc, deleteField, onSnapshot, FieldPath, serverTimestamp, runTransaction, query, where, documentId, getDocsFromServer } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyCyPRKrBGGoRddkGEhjQ3TQzkNBFyVaxK0",
  authDomain: "yc-dashboard-9aa6c.firebaseapp.com",
  projectId: "yc-dashboard-9aa6c",
  storageBucket: "yc-dashboard-9aa6c.firebasestorage.app",
  messagingSenderId: "788748560432",
  appId: "1:788748560432:web:aaa65e2d253a77eb7425f5"
};

try {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const docRef = doc(db, 'app', 'main');

  // ============== 直接用 REST API 刪除帶 . 的字面欄位 ==============
  // Firebase SDK 的 updateDoc 即使搭 FieldPath 也不一定能正確刪除頂層含 . 的欄位
  // REST API 用 ?updateMask.fieldPaths=`field.name` 的 backtick escape 可確保成功
  const FIRESTORE_REST_BASE = 'https://firestore.googleapis.com/v1/projects/' + firebaseConfig.projectId
    + '/databases/(default)/documents/app/main';
  const restDeleteFields = async (keys) => {
    console.warn('[restDeleteFields] called with', keys);
    const params = keys.map(k => 'updateMask.fieldPaths=' + encodeURIComponent('`' + k + '`')).join('&');
    const url = FIRESTORE_REST_BASE + '?' + params;
    console.warn('[restDeleteFields] URL:', url);
    try {
      const resp = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: '{"fields":{}}'
      });
      console.warn('[restDeleteFields] response:', resp.status, resp.statusText);
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        console.error('[restDeleteFields] error body:', text);
        throw new Error('REST delete failed: ' + resp.status);
      }
      return resp.json();
    } catch (err) {
      console.error('[restDeleteFields] fetch threw:', err);
      throw err;
    }
  };

  // 共用：帶點字面欄位名（ec.users / ec.dailyProgress / ec.insight_* 等）
  //   走 updateDoc + new FieldPath(k)，避免 setDoc merge:true 對 dotted key
  //   靜默不覆蓋的雷（v171 per-shop 已改用同招，這邊補上 app/main）
  const safeSetField = async (ref, key, value) => {
    try {
      await updateDoc(ref, new FieldPath(key), value);
    } catch (e) {
      if (e && (e.code === 'not-found' || String(e).includes('No document to update'))) {
        await setDoc(ref, {});
        await updateDoc(ref, new FieldPath(key), value);
      } else {
        throw e;
      }
    }
  };

  window.__cloudStore = {
    // getDoc('server')：強制讀伺服器現值（不吃本機快取）；無參數呼叫行為不變
    getDoc: (src) => src === 'server' ? getDocFromServer(docRef) : getDoc(docRef),
    setField: (key, value) => safeSetField(docRef, key, value),
    removeField: (key) => restDeleteFields([key]),
    removeFields: (keys) => restDeleteFields(keys),
    subscribe: (cb) => onSnapshot(docRef, snap => cb(snap.exists() ? snap.data() : {})),
  };

  // ============== 淨利表獨立文件 app/profit（避免 app/main 撞 1MB 上限） ==============
  // app/profit 只放「當期」資料，舊月份分片出去避免單檔過大。分片名依資料種類分成兩式：
  //   舊月份報表         → 2026/05 曾封存在 app/profit_2026_05；現在報表一律以 profits collection 為準，那份文件留著但不載入（見 PROFIT_ARCHIVE_DOCS）
  //   舊月份的廣告調整   → app/profit_notes_YYYY（例 app/profit_notes_2026，ec_notes|通路|月|半月）
  const profitDocRef = doc(db, 'app', 'profit');
  const GROWTH_SHOPS = ['好麻吉', '玩樂', '森之旅', '維克'];   // 商品調整獨立文件 app/growth_{通路} 列管的通路（#436）；沒列的一律走 app/profit 舊欄位
  const PROFIT_ARCHIVE_DOCS = ['profit_notes_2026', 'profit_notes_2026_2'];
  const profitArchiveRefs = PROFIT_ARCHIVE_DOCS.map(name => doc(db, 'app', name));
  // #436 第 ⑤ 塊：之後的廣告調整封存＝notes_archive collection，每通路每月一份（doc id「通路__YYYY-MM」）。上面兩片維持唯讀照常讀。
  //   ⚠ 通路清單寫死：新增蝦皮通路要加進來（同 PROFITS_SUB_SHOPS、GROWTH_SHOPS），沒列的通路一鍵封存工具不處理。
  const NOTES_ARCHIVE_COL = 'notes_archive';
  const NOTES_ARCHIVE_SHOPS = ['好麻吉', '玩樂', '森之旅', '維克', '測試通路'];
  const PROFIT_REST_BASE = 'https://firestore.googleapis.com/v1/projects/' + firebaseConfig.projectId
    + '/databases/(default)/documents/app/profit';
  const restDeleteProfitFields = async (keys) => {
    const params = keys.map(k => 'updateMask.fieldPaths=' + encodeURIComponent('`' + k + '`')).join('&');
    const url = PROFIT_REST_BASE + '?' + params;
    const resp = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{"fields":{}}' });
    if (!resp.ok) throw new Error('REST delete failed: ' + resp.status);
    return resp.json();
  };
  window.__cloudProfit = {
    getDoc: (src) => src === 'server' ? getDocFromServer(profitDocRef) : getDoc(profitDocRef),   // 'server'＝強制讀伺服器（#436 ⑤ 一鍵封存用）；無參數行為不變
    setField: (key, value) => safeSetField(profitDocRef, key, value),
    removeFields: (keys) => restDeleteProfitFields(keys),
    subscribe: (cb) => onSnapshot(profitDocRef, snap => cb(snap.exists() ? snap.data() : {})),
  };
  // 訂閱 profit doc + archive docs → 合併寫入 Store._profitMem
  // 每個 doc 各自記下自己的最新資料，merge 時用 archive + current 順序（current 優先）
  try {
    Store._profitMem = Store._profitMem || {};
    const profitParts = { current: {}, archives: {} };
    // ── 封存分片狀態的唯讀觀測點（給 js/profit.js 判「這把 key 是否已封存」用）──
    //   本區【只提供讀取】、不接任何呼叫端；上線後使用者行為零變化。
    //   ⚠ 掛的是【函式】不是值：module 內的 let/const 掛上 window 會變成當下快照，讀不到即時值
    //     （先例：js/profit.js 的 window.__profitPendingCount 也是掛函式）。
    //   ⚠ 刻意不以 __cloud 開頭：app.js 的 __installReadonlyCloudGuard 只包 __cloud* 物件的非白名單方法，
    //     這三支是純讀取，不該被包、也不該被算進 TEST_NOWRITE 的雲端物件數。
    //   ⚠ 適用範圍：只給 mergeAndNotify 走「直接覆蓋」分支的 key 用（ec_notes|、ec_edits| 這類）。
    //     【不適用】ec| 報表 key —— 報表的權威在 profits collection，mergeAndNotify 對 ec| 只在
    //     _profitMem 無值時才填入（見下方 mergeAndNotify），「在封存分片」對報表不代表「唯讀」。
    //   🔴 本區【只回傳布林值與錯誤紀錄，不回傳封存內容】。「讀封存整把當同步基準」的做法
    //     （改了就解封存）已被否決；不要在這裡加 __profitArchiveValue 之類的取值函式。
    //   profitArchiveMeta[doc]   = { at, exists, fromCache }  每片最近一次快照的 metadata（onSnapshot 成功 callback 寫入）
    //   profitArchiveErrors[doc] = { at, code, message }      onSnapshot 錯誤 callback 寫入；不自動清除
    //     （SDK 的 onSnapshot 出錯後該監聽即終止、不會再送快照，「錯誤已解除」不會有任何訊號，清了等於說謊）
    const profitArchiveMeta = {};
    const profitArchiveErrors = {};
    // #436 ⑤ 新封存的狀態（訂閱在 __loadArchiveSubs）。naParts：doc id → { shop, ym, state, keys:{ 完整 key: 內容 }, raw }。
    //   naMeta.invalid：內容不合法的文件（不併進畫面、ready 為 false ＝ 寫入一律擋下）。
    const naParts = {};
    const naMeta = { subscribed: false, gotSnap: false, fromCache: null, error: null, invalid: {}, warned: '' };
    const naReady = () => naMeta.subscribed && naMeta.gotSnap && naMeta.fromCache === false && !naMeta.error && !Object.keys(naMeta.invalid).length;
    const naFind = (key) => { for (const id in naParts) { if (Object.prototype.hasOwnProperty.call(naParts[id].keys, key)) return naParts[id]; } return null; };
    // 這把 key 是否存在於任一封存分片的【最新快照】（含 #436 ⑤ 新封存，不分 copied / done）。
    //   快照未到 → false，與「確定不在」無法區分 → 呼叫端要先看 __profitArchivesReady()。
    window.__profitArchiveHas = (key) => PROFIT_ARCHIVE_DOCS.some(n => {
      const d = profitParts.archives[n];
      return !!d && Object.prototype.hasOwnProperty.call(d, key);
    }) || !!naFind(key);
    // #436 ⑤：這把 key 在已生效（state 'done'）的新封存裡。app/profit 也有這把時 ＝ 舊分頁寫回的殘留，期別仍算已封存（js/profit.js _notesWriteBlockReason）。
    window.__notesArchiveDoneHas = (key) => { const p = naFind(key); return !!(p && p.state === 'done'); };
    // 一鍵封存工具用：這把 key 在哪裡（只回位置，不回內容）。legacy＝舊封存片名；monthly＝新封存 { id, state }。
    window.__notesArchiveWhere = (key) => {
      const p = naFind(key);
      return { legacy: PROFIT_ARCHIVE_DOCS.filter(n => { const d = profitParts.archives[n]; return !!d && Object.prototype.hasOwnProperty.call(d, key); }),
        monthly: p ? { id: p.id, state: p.state } : null, current: Object.prototype.hasOwnProperty.call(profitParts.current || {}, key) };
    };
    // 唯讀觀測（不以 __cloud 開頭）：新封存的訂閱狀態與每份文件的 key 數
    window.__notesArchiveState = () => ({ ready: naReady(), subscribed: naMeta.subscribed, fromCache: naMeta.fromCache, error: naMeta.error,
      invalid: JSON.parse(JSON.stringify(naMeta.invalid)),
      docs: Object.fromEntries(Object.keys(naParts).sort().map(id => [id, { state: naParts[id].state, keys: Object.keys(naParts[id].keys) }])) });
    // NOTES_ARCHIVE_PURE_BEGIN（node 驗證會擷取這段，改名要一起改 node 腳本；比對用 growthCanon / growthSig，定義在下方 GROWTH_PURE）
    //   文件形狀：{ schema:1, shop, month:'YYYY-MM', state:'copied'|'done', notes:{ first|second|full: { 品號: {adjustments:[…]} } },
    //     src:{ keys:[原 key…], sig:{ 半月: 指紋 }, codes:{ 半月: 品號數 } }, createdAt, createdBy, doneAt?, doneBy? }
    const NA_HALVES = ['first', 'second', 'full'];
    const NA_KEY_RE = /^ec_notes\|([^|]+)\|(\d{4})\/(\d{2})\|(first|second|full)$/;
    const naIsMap = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
    const naDocId = (shop, ym) => shop + '__' + ym;
    const naKey = (shop, ym, half) => 'ec_notes|' + shop + '|' + ym.replace('-', '/') + '|' + half;
    const naParseKey = (k) => { const m = NA_KEY_RE.exec(String(k)); return m ? { shop: m[1], ym: m[2] + '-' + m[3], half: m[4] } : null; };
    const naParseId = (id) => { const i = String(id).lastIndexOf('__'); if (i <= 0) return null; const shop = id.slice(0, i), ym = id.slice(i + 2); return /^\d{4}-\d{2}$/.test(ym) ? { shop, ym } : null; };
    // 文件是否合法。回 { ok:true, shop, ym, state, keys:{ 完整 key: 內容 } } 或 { ok:false, why }。
    const naValidate = (id, d) => {
      const p = naParseId(id);
      if (!p) return { ok: false, why: 'doc id 格式不對' };
      if (!naIsMap(d)) return { ok: false, why: '文件不是物件' };
      if (d.schema !== 1) return { ok: false, why: 'schema 不是 1' };
      if (d.shop !== p.shop || d.month !== p.ym) return { ok: false, why: 'shop / month 跟 doc id 不同' };
      if (!NOTES_ARCHIVE_SHOPS.includes(d.shop)) return { ok: false, why: '不是列管的通路' };
      if (d.state !== 'copied' && d.state !== 'done') return { ok: false, why: 'state 不對' };
      if (!naIsMap(d.notes)) return { ok: false, why: 'notes 不是物件' };
      const halves = Object.keys(d.notes);
      if (!halves.length) return { ok: false, why: 'notes 是空的' };
      const keys = {};
      for (const h of halves) {
        if (!NA_HALVES.includes(h)) return { ok: false, why: '不認得的半月：' + h };
        if (!naIsMap(d.notes[h])) return { ok: false, why: h + ' 不是物件' };
        keys[naKey(p.shop, p.ym, h)] = d.notes[h];
      }
      return { ok: true, shop: p.shop, ym: p.ym, state: d.state, keys };
    };
    // 盤點 app/profit 裡某通路某月的廣告調整。回 { source:{ 完整 key: 內容 }, list:[{ key, half, codes, adjs, maxDate, noBy, bad }] }。
    //   maxDate＝紀錄裡最晚的 date（字串比較，格式 YYYY/MM/DD）；noBy＝沒有 by 的筆數；bad＝內容不是物件（不能封存）。
    const naInventory = (profitDoc, shop, ym) => {
      const source = {}, list = [];
      NA_HALVES.forEach(h => {
        const k = naKey(shop, ym, h);
        if (!profitDoc || !Object.prototype.hasOwnProperty.call(profitDoc, k)) return;
        const v = profitDoc[k];
        const row = { key: k, half: h, codes: 0, adjs: 0, maxDate: '', noBy: 0, bad: !naIsMap(v) };
        if (!row.bad) {
          source[k] = v;
          Object.keys(v).forEach(c => {
            row.codes++;
            const adjs = growthAdjList(v[c]);
            adjs.forEach(a => {
              row.adjs++;
              const dt = a && typeof a.date === 'string' ? a.date : '';
              if (dt > row.maxDate) row.maxDate = dt;
              if (!(a && a.by)) row.noBy++;
            });
          });
        }
        list.push(row);
      });
      return { source, list };
    };
    // 由盤點結果產生要寫入的文件（state 'copied'）。source 只能是同一通路同一月份的 key。
    const naBuild = (shop, ym, source, by, at) => {
      const notes = {}, sig = {}, codes = {};
      Object.keys(source).sort().forEach(k => {
        const p = naParseKey(k);
        if (!p || p.shop !== shop || p.ym !== ym) throw new Error('不是 ' + shop + ' ' + ym + ' 的 key：' + k);
        notes[p.half] = JSON.parse(JSON.stringify(source[k]));
        sig[p.half] = growthSig(source[k]);
        codes[p.half] = Object.keys(source[k]).length;
      });
      return { schema: 1, shop, month: ym, state: 'copied', notes, src: { keys: Object.keys(source).sort(), sig, codes }, createdAt: at, createdBy: by || '' };
    };
    // source（完整 key → 內容）與文件 notes 逐品號比對。回 { same, diffs:[{ key, code, why:'missing'|'extra'|'changed' }] }。
    //   why 以 source 為準：missing＝文件少了、extra＝文件多了、changed＝內容不同。整把 key 少了／多了 code 是 '*'。
    const naCompare = (shop, ym, source, notes) => {
      const diffs = [];
      const doc = {};
      Object.keys(notes || {}).forEach(h => { doc[naKey(shop, ym, h)] = notes[h]; });
      const all = new Set(Object.keys(source || {}).concat(Object.keys(doc)));
      all.forEach(k => {
        const a = (source || {})[k], b = doc[k];
        if (a === undefined) { diffs.push({ key: k, code: '*', why: 'extra' }); return; }
        if (b === undefined) { diffs.push({ key: k, code: '*', why: 'missing' }); return; }
        const codes = new Set(Object.keys(a || {}).concat(Object.keys(b || {})));
        codes.forEach(c => {
          if (!Object.prototype.hasOwnProperty.call(b || {}, c)) diffs.push({ key: k, code: c, why: 'missing' });
          else if (!Object.prototype.hasOwnProperty.call(a || {}, c)) diffs.push({ key: k, code: c, why: 'extra' });
          else if (growthCanon(a[c]) !== growthCanon(b[c])) diffs.push({ key: k, code: c, why: 'changed' });
        });
      });
      return { same: !diffs.length, diffs };
    };
    // 已生效的封存（arch）與 app/profit 的殘留（cur，舊分頁寫的）逐品號合併：封存為主，殘留多的紀錄補到尾端，不刪任何東西。
    //   回 { value, codes:[有補到東西的品號] }。
    const naOverlay = (arch, cur) => {
      const value = Object.assign({}, arch || {});
      const codes = [];
      if (naIsMap(cur)) Object.keys(cur).forEach(c => {
        if (!Object.prototype.hasOwnProperty.call(value, c)) { value[c] = cur[c]; codes.push(c); return; }
        if (growthCanon(value[c]) === growthCanon(cur[c])) return;
        const before = growthAdjList(value[c]).length;
        const next = growthAddExtras(value[c], growthAdjList(cur[c]));
        if (next.adjustments.length !== before) { value[c] = next; codes.push(c); }
      });
      return { value, codes };
    };
    // NOTES_ARCHIVE_PURE_END
    const naPure = { HALVES: NA_HALVES, docId: naDocId, key: naKey, parseKey: naParseKey, parseId: naParseId, validate: naValidate,
      inventory: naInventory, build: naBuild, compare: naCompare, overlay: naOverlay };
    // 所有封存分片是否都已從【伺服器】收到過快照（嚴格版）：
    //   每片都要 (1) profitParts.archives 有那片的 key（訂閱 callback 對 exists()===false 也會寫入 {}，
    //   所以 doc 不存在也算已到達），且 (2) 最近一次快照 metadata.fromCache 為 false。
    //   (2) 的理由：本專案沒開 IndexedDB persistence，離線時 SDK 可能送出 exists()===false + fromCache 的
    //   快照，若只看 (1) 會在離線時把所有封存期別誤判成「未封存」。離線 → ready 永遠 false（fail-closed）。
    //   ⚠ 已 ready 後若又收到 fromCache=true 的快照（連線中斷、SDK 切到快取），ready 會退回 false，
    //     等重新連上收到伺服器快照才恢復 —— 這是刻意的，離線期間不該相信封存判斷。
    //   #436 ⑤：另外要新封存 collection 的最近一次快照來自伺服器、沒有訂閱錯誤、沒有不合法的文件（naReady）。
    window.__profitArchivesReady = () => PROFIT_ARCHIVE_DOCS.every(n =>
      Object.prototype.hasOwnProperty.call(profitParts.archives, n)
      && !!profitArchiveMeta[n] && profitArchiveMeta[n].fromCache === false) && naReady();
    // 封存分片訂閱錯誤（回傳拷貝，呼叫端改不到內部狀態）。{} ＝ 目前沒有錯誤。#436 ⑤：新封存的訂閱錯誤與不合法文件也列在這裡。
    window.__profitArchiveErrors = () => {
      const o = JSON.parse(JSON.stringify(profitArchiveErrors));
      if (naMeta.error) o[NOTES_ARCHIVE_COL] = JSON.parse(JSON.stringify(naMeta.error));
      Object.keys(naMeta.invalid).forEach(id => { o[NOTES_ARCHIVE_COL + '/' + id] = JSON.parse(JSON.stringify(naMeta.invalid[id])); });
      return o;
    };
    // app/profit【最新快照】裡是否有這把 key（讀 profitParts.current；首批快照未到時是 {} → 一律 false）。
    //   與 __profitArchiveHas 搭配用（js/profit.js 的 _notesWriteBlockReason）：app/profit 有 → 不可能是「被搬走」的封存 key。
    //   刻意不另設「app/profit 首批已到」狀態：它只會讓提示文字更細，不改變任何放行／擋下結果
    //   （首批未到 → false → 由封存 ready 判斷接手；離線 fromCache 空快照也是 false → 方向正確）。同樣不回傳內容。
    window.__profitCurrentHas = (key) => Object.prototype.hasOwnProperty.call(profitParts.current || {}, key);

    // ══════ 商品調整獨立文件 app/growth_{通路}（#436 第 ③ 塊）══════
    //   切換判斷（每個通路）：文件有數字 migratedAt ＝ 讀寫都走新文件；伺服器確認沒有這份文件 ＝ 完全走 app/profit 舊欄位。
    //   _profitMem 的 key 名維持 ec_notes|{通路}_growth，讀取端都不用改。寫入見 js/profit.js syncNotesMerge。
    //   舊欄位還在 / 又出現（舊分頁寫的）的處理靠 legacySeen（品號 → 舊欄位內容的指紋）：
    //     指紋相同 ＝ 已經看過，忽略（不能只看「新文件沒有」，否則新文件刪掉的紀錄會一直復活）；
    //     指紋不同 ＝ 舊分頁動過：把新文件沒有的紀錄補進顯示，下次同步寫進新文件並更新指紋。不刪任何東西。
    // GROWTH_PURE_BEGIN（node 驗證會擷取這段，改名要一起改 node 腳本；搬家腳本的指紋必須跟 growthSig 同一套）
    const growthCanon = (v) => {
      if (Array.isArray(v)) return '[' + v.map(growthCanon).join(',') + ']';
      if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + growthCanon(v[k])).join(',') + '}';
      return JSON.stringify(v === undefined ? null : v);
    };
    // FNV-1a 32 位元（UTF-16 碼元）→ 8 碼十六進位。撞號的後果只是漏補一個品號，機率可忽略。
    const growthSig = (v) => {
      const s = growthCanon(v);
      let h = 0x811c9dc5;
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
      return (h >>> 0).toString(16).padStart(8, '0');
    };
    const growthAdjList = (entry) => {
      if (typeof entry === 'string') return [{ date: '', text: entry }];
      return (entry && Array.isArray(entry.adjustments)) ? entry.adjustments : [];
    };
    // 把 extras 裡 entry 沒有的紀錄補到尾端。回新物件，不動傳入的 entry。
    const growthAddExtras = (entry, extras) => {
      const list = growthAdjList(entry);
      const have = new Set(list.map(growthCanon));
      const add = (extras || []).filter(a => !have.has(growthCanon(a)));
      const base = (entry && typeof entry === 'object' && !Array.isArray(entry)) ? entry : {};
      return Object.assign({}, base, { adjustments: list.concat(add) });
    };
    // items＝新文件內容、old＝app/profit 舊欄位（可能 undefined）、seen＝legacySeen。
    //   回 { value:合併後的內容（新物件）, residue:{ 品號:{ sig, extras } } }；residue 空 ＝ 舊欄位沒有新東西。
    const growthOverlay = (items, old, seen) => {
      const value = Object.assign({}, items || {});
      const residue = {};
      const sn = seen || {};
      if (old && typeof old === 'object' && !Array.isArray(old)) {
        Object.keys(old).forEach(code => {
          const sig = growthSig(old[code]);
          if (sn[code] === sig) return;
          const cur = growthAdjList(value[code]);
          const have = new Set(cur.map(growthCanon));
          const extras = growthAdjList(old[code]).filter(a => !have.has(growthCanon(a)));
          residue[code] = { sig, extras };
          if (extras.length) value[code] = growthAddExtras(value[code], extras);
        });
      }
      return { value, residue };
    };
    // GROWTH_PURE_END
    window.__growthPure = { sig: growthSig, canon: growthCanon, overlay: growthOverlay, addExtras: growthAddExtras };
    const growthKey = (shop) => 'ec_notes|' + shop + '_growth';
    const growthParts = {};   // 通路 → { state:'loading'|'old'|'new', items, seen, raw, residue, error }
    GROWTH_SHOPS.forEach(s => { growthParts[s] = { state: 'loading', items: null, seen: null, raw: null, residue: {}, error: null }; });
    // 這把 key 是不是列管通路的商品調整；是就回通路名。測試通路等沒列管的回 null（一律走舊路徑）。
    window.__growthShopOfKey = (k) => {
      const m = /^ec_notes\|(.+)_growth$/.exec(String(k));
      return (m && GROWTH_SHOPS.includes(m[1])) ? m[1] : null;
    };
    const growthIsNewKey = (k) => { const s = window.__growthShopOfKey(k); return !!(s && growthParts[s].state === 'new'); };
    // 唯讀觀測點（刻意不以 __cloud 開頭，同 __profitArchivesReady）。'none'＝沒列管；'error'＝訂閱失敗。
    window.__growthRoute = (shop) => {
      const p = growthParts[shop];
      if (!p) return 'none';
      return (p.state === 'loading' && p.error) ? 'error' : p.state;
    };
    // 舊欄位有新東西、等下次同步補寫的 key（只回 key 名）
    window.__growthResidueKeys = () => GROWTH_SHOPS.filter(s => growthParts[s].state === 'new' && Object.keys(growthParts[s].residue).length).map(growthKey);
    window.__growthState = () => Object.fromEntries(GROWTH_SHOPS.map(s => {
      const p = growthParts[s];
      return [s, { route: window.__growthRoute(s), codes: p.items ? Object.keys(p.items).length : 0, residue: Object.keys(p.residue), error: p.error }];
    }));
    // 把新文件 + 舊欄位算成顯示內容，有變才寫 _profitMem。回 true＝變了（呼叫端負責發事件）。
    const growthSync = (shop) => {
      const p = growthParts[shop];
      if (p.state !== 'new') return false;
      const k = growthKey(shop);
      const ov = growthOverlay(p.items, profitParts.current[k], p.seen);
      p.residue = ov.residue;
      const codes = Object.keys(ov.residue);
      if (codes.length) {
        const tag = codes.map(c => c + ':' + ov.residue[c].sig).join(',');
        if (p.warned !== tag) { p.warned = tag; console.warn('[商品調整] ' + shop + '：app/profit 舊欄位有新文件沒看過的品號（可能是舊分頁寫的），已合併進顯示，下次同步會補寫進新文件：', codes); }
      }
      if (window.__profitShouldSkipCloudOverwrite && window.__profitShouldSkipCloudOverwrite(k)) return false;
      // 用 growthCanon 比：伺服器每次傳來的 map key 順序不固定（實測），順序不同不算變動
      if (Store._profitMem[k] !== undefined && growthCanon(ov.value) === growthCanon(Store._profitMem[k])) return false;
      Store._profitMem[k] = ov.value;
      return true;
    };
    // #436 ⑤：data 已是「封存 → app/profit」的合併結果。done 的 key 若 app/profit 也有，改成封存為主、逐品號補上殘留。
    const naOverlayDone = (data) => {
      const hit = [];
      Object.values(naParts).forEach(p => {
        if (p.state !== 'done') return;
        Object.keys(p.keys).forEach(k => {
          if (!Object.prototype.hasOwnProperty.call(profitParts.current || {}, k)) return;
          const ov = naOverlay(p.keys[k], profitParts.current[k]);
          data[k] = ov.value;
          hit.push(k + ':' + ov.codes.join(','));
        });
      });
      const tag = hit.join(';');
      if (tag && naMeta.warned !== tag) { naMeta.warned = tag; console.warn('[廣告調整封存] 已封存的期別在 app/profit 又出現（可能是舊分頁寫的），畫面以封存為主、只補上多出來的紀錄：', hit); }
    };
    const mergeAndNotify = () => {
      const data = {};
      Object.values(profitParts.archives).forEach(d => Object.assign(data, d));
      Object.values(naParts).forEach(p => Object.assign(data, p.keys));   // #436 ⑤ 新封存（key 跟舊兩片、彼此都不重複）
      Object.assign(data, profitParts.current);
      naOverlayDone(data);   // #436 ⑤ 已生效的封存又出現在 app/profit（舊分頁寫的）：逐品號合併，不讓 app/profit 整把蓋掉
      const oldData = Store._profitMem || {};
      const changedShops = new Set();
      // 只比對 profitDoc 自己的非報表 key（ec_notes|、ec_edits| 等）
      // ec|shop|month|half 格式是舊版遺留在 profitDoc 的報表資料，以 profits collection 為準，不比對
      Object.keys(data).forEach(k => {
        if (k.startsWith('ec|')) return; // 舊版報表殘留 key，跳過
        if (k.startsWith('ec_momo_products|')) return; // MOMO 商品主檔以 momo_products collection 為準，不在此比對（遷移過渡）
        if (growthIsNewKey(k)) return; // 已搬的商品調整以 app/growth_{通路} 為準，下方 growthSync 處理
        if (JSON.stringify(data[k]) !== JSON.stringify(oldData[k])) {
          const shop = k.split('|')[1];
          if (shop) changedShops.add(shop);
        }
      });
      // 非報表 key（notes/edits 等）直接覆蓋；報表 key（ec|shop|month|half）與 MOMO 商品主檔（ec_momo_products|）
      //   只在 collection 尚未填該 key 時才填入（collection 權威、app/profit 舊欄位只當遷移過渡的 fallback）
      Object.keys(data).forEach(k => {
        if (growthIsNewKey(k)) return;   // 已搬的商品調整：舊欄位不直接覆蓋，由 growthSync 合併
        // ec_pchome_products / ec_pchome_recon 已搬到 app/pchome_products / app/pchome_recon 獨立 doc
        //   （照 ec_momo_products 搬 collection 的先例）：新 doc 權威，app/profit 舊欄位只當【遷移過渡的 fallback】
        //   —— 只在新 doc 尚未填該 key（Store._profitMem 還沒值）時才填入，避免 app/profit echo 蓋掉新 doc 的值。
        if (k.startsWith('ec|') || k.startsWith('ec_momo_products|') || k === 'ec_pchome_products' || k === 'ec_pchome_recon') {
          if (Store._profitMem[k] === undefined) Store._profitMem[k] = data[k];
        } else {
          // 本機有未同步變更 / 剛存過 → 不讓雲端快照覆蓋，保住使用者正在編輯的內容
          //   （守衛定義在 js/profit.js，那裡才讀得到私有的 _pendingSyncKeys）
          //   對照組：本檔 momo_products / momo_reconcile / momo_s1103 三處訂閱早有同型別守衛
          if (window.__profitShouldSkipCloudOverwrite && window.__profitShouldSkipCloudOverwrite(k)) return;
          Store._profitMem[k] = data[k];
        }
      });
      // 已搬的通路：舊欄位可能剛被舊分頁寫入，重算一次。通路名維持 key 的第二段（玩樂_growth），跟搬之前發的事件相同。
      GROWTH_SHOPS.forEach(s => { if (growthSync(s)) changedShops.add(s + '_growth'); });
      window.dispatchEvent(new CustomEvent('profitDataReady', {detail:{changedShops:[...changedShops]}}));
      // 不做 App.render()（全頁重繪）：profitDoc 變動只需精準更新受影響賣場，避免好麻吉等無關賣場閃爍
      // profitDataReady listener 已處理 onMonthChange；此處不重複觸發
    };
    // ── app/profit 容量估算（#436 短期警報）──
    //   只用 app/profit【自己的】原始快照（profitParts.current）與已載入的封存片，不另外讀 Firestore。
    //   只有管理員才算：最後一個快照後 10 秒、再等瀏覽器閒置才算一次，結果快取。畫面提示在 js/app.js __profitCapCheck。
    //   ⚠ 刻意不以 __cloud 開頭（同 __profitArchivesReady）：純讀取，不被防寫防護包、不算進 TEST_NOWRITE 物件數。
    // PROFIT_DOC_MEASURE_BEGIN（node 驗證會擷取這段，改名要一起改 node 腳本）
    //   依 Firestore 文件大小規則：字串＝UTF-8 位元組＋1；欄位名同；數字／時間戳 8；布林／null 1；
    //   map＝Σ（欄位名＋值）；陣列＝Σ元素；文件＝路徑（每段 UTF-8＋1，再＋16）＋Σ頂層欄位＋32。
    //   索引（自動單欄索引，未扣豁免＝上限估計）：不是 map、不是陣列的欄位 2 筆；陣列＝不重複元素數、不往下算；map 本身 0、往下算子欄位。
    const PROFIT_DOC_LIMIT_BYTES = 1048576;
    const PROFIT_DOC_LIMIT_IDX = 40000;
    const _pdUtf8 = (s) => {
      let n = 0;
      for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c < 0x80) n += 1;
        else if (c < 0x800) n += 2;
        else if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length) { const d = s.charCodeAt(i + 1); if (d >= 0xDC00 && d <= 0xDFFF) { n += 4; i++; } else n += 3; }
        else n += 3;
      }
      return n;
    };
    const _pdIsTs = (v) => !!v && typeof v === 'object' && typeof v.toMillis === 'function' && typeof v.seconds === 'number';
    const _pdValBytes = (v) => {
      if (v === null || v === undefined) return 1;
      const t = typeof v;
      if (t === 'string') return _pdUtf8(v) + 1;
      if (t === 'number') return 8;
      if (t === 'boolean') return 1;
      if (Array.isArray(v)) { let n = 0; for (const e of v) n += _pdValBytes(e); return n; }
      if (_pdIsTs(v) || v instanceof Date) return 8;
      if (t === 'object') { let n = 0; for (const k of Object.keys(v)) n += _pdUtf8(k) + 1 + _pdValBytes(v[k]); return n; }
      return 8;
    };
    const _pdStable = (v) => {
      if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
      if (_pdIsTs(v)) return 'ts:' + v.toMillis();
      if (Array.isArray(v)) return '[' + v.map(_pdStable).join(',') + ']';
      return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + _pdStable(v[k])).join(',') + '}';
    };
    const _pdValIdx = (v) => {
      if (Array.isArray(v)) { const s = new Set(); for (const e of v) s.add(_pdStable(e)); return s.size; }
      if (v !== null && typeof v === 'object' && !_pdIsTs(v) && !(v instanceof Date)) { let n = 0; for (const k of Object.keys(v)) n += _pdValIdx(v[k]); return n; }
      return 2;
    };
    const _pdNameBytes = (path) => String(path).split('/').reduce((n, seg) => n + _pdUtf8(seg) + 1, 0) + 16;
    // data＝文件內容（plain object）；path＝'app/profit'。回 { bytes, ratio, idx, idxRatio, top:[{key,bytes,idx}]×10 }
    const profitDocMeasure = (data, path) => {
      const fields = [];
      let bytes = _pdNameBytes(path) + 32, idx = 0;
      Object.keys(data || {}).forEach(k => {
        const b = _pdUtf8(k) + 1 + _pdValBytes(data[k]);
        const x = _pdValIdx(data[k]);
        bytes += b; idx += x;
        fields.push({ key: k, bytes: b, idx: x });
      });
      fields.sort((a, b) => b.bytes - a.bytes);
      const r3 = (x) => Math.round(x * 1000) / 1000;
      return { bytes, ratio: r3(bytes / PROFIT_DOC_LIMIT_BYTES), idx, idxRatio: r3(idx / PROFIT_DOC_LIMIT_IDX), top: fields.slice(0, 10) };
    };
    // PROFIT_DOC_MEASURE_END
    let profitDocStatsCache = null;     // 最近一次計算結果
    let profitDocStatsDirty = true;     // 有新快照還沒算
    let profitDocStatsTimer = null;
    const _pdIsAdmin = () => { try { return !!(window.App && window.App.currentUser && window.App.currentUser.role === 'admin'); } catch (e) { return false; } };
    const _pdCompute = () => {
      const t0 = Date.now();
      const main = profitDocMeasure(profitParts.current || {}, 'app/profit');
      const archives = {};
      PROFIT_ARCHIVE_DOCS.forEach(n => {
        if (!Object.prototype.hasOwnProperty.call(profitParts.archives, n)) return;   // 封存組還沒載入 → 不報
        const m = profitDocMeasure(profitParts.archives[n] || {}, 'app/' + n);
        archives[n] = { bytes: m.bytes, ratio: m.ratio, idx: m.idx, idxRatio: m.idxRatio };
      });
      const growth = {};   // 商品調整獨立文件（還沒搬、還沒收到快照的通路不報）
      GROWTH_SHOPS.forEach(s => {
        const raw = growthParts[s].raw;
        if (!raw) return;
        const m = profitDocMeasure(raw, 'app/growth_' + s);
        growth[s] = { bytes: m.bytes, ratio: m.ratio, idx: m.idx, idxRatio: m.idxRatio };
      });
      const notesArchive = {};   // #436 ⑤ 新封存（還沒載入的不報）
      Object.keys(naParts).forEach(id => {
        const m = profitDocMeasure(naParts[id].raw || {}, NOTES_ARCHIVE_COL + '/' + id);
        notesArchive[id] = { bytes: m.bytes, ratio: m.ratio, idx: m.idx, idxRatio: m.idxRatio };
      });
      profitDocStatsCache = Object.assign(main, { at: Date.now(), ms: Date.now() - t0, archives, growth, notesArchive });
      profitDocStatsDirty = false;
      try { window.dispatchEvent(new CustomEvent('profitDocStatsReady')); } catch (e) {}
      return profitDocStatsCache;
    };
    const _pdSchedule = () => {
      profitDocStatsDirty = true;
      if (!_pdIsAdmin()) return;
      if (profitDocStatsTimer) clearTimeout(profitDocStatsTimer);
      profitDocStatsTimer = setTimeout(() => {
        profitDocStatsTimer = null;
        const go = () => { if (_pdIsAdmin()) _pdCompute(); };
        if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(go, { timeout: 5000 }); else setTimeout(go, 0);
      }, 10000);
    };
    // 唯讀觀測點：回快取（還沒算過＝null）。opts.compute＝快取過期時當場算一次（只限管理員；app.js 登入後的檢查用）。
    window.__profitDocStats = (opts) => {
      if (opts && opts.compute && profitDocStatsDirty && _pdIsAdmin()) { try { _pdCompute(); } catch (e) { console.warn('[profit 容量] 計算失敗', e); } }
      return profitDocStatsCache ? JSON.parse(JSON.stringify(profitDocStatsCache)) : null;
    };

    // 輕量：app/profit 立刻訂閱（小檔案，不會卡住）
    onSnapshot(profitDocRef, snap => {
      profitParts.current = snap.exists() ? (snap.data() || {}) : {};
      mergeAndNotify();
      _pdSchedule();
    }, err => { console.error('[profit subscribe] 訂閱失敗：', err); });

    // 商品調整文件的快照入口（訂閱在本檔下方 __cloudGrowth 建好之後；物件要用到 KPI_DELETE，不能放在這裡）。
    //   data＝文件內容（不存在＝null）。
    window.__growthApplySnap = (shop, data, meta) => {
      const p = growthParts[shop];
      if (!p) return;
      const fromCache = !!(meta && meta.fromCache);
      const prev = p.state;
      p.error = null;
      if (data && typeof data.migratedAt === 'number') {
        p.state = 'new';
        p.items = (data.items && typeof data.items === 'object' && !Array.isArray(data.items)) ? data.items : {};
        p.seen = (data.legacySeen && typeof data.legacySeen === 'object') ? data.legacySeen : {};
        p.raw = data;
      } else if (data) {
        // 文件在、沒有 migratedAt：不算搬完，照舊走 app/profit
        if (!p.warnedNoMark) { p.warnedNoMark = true; console.warn('[商品調整] app/growth_' + shop + ' 存在但沒有 migratedAt，照舊使用 app/profit 舊欄位'); }
        p.state = 'old'; p.items = null; p.seen = null; p.residue = {}; p.raw = data;
      } else if (!fromCache) {
        p.state = 'old'; p.items = null; p.seen = null; p.residue = {}; p.raw = null;
      } else {
        return;   // 沒有文件、資料來自快取：離線時 SDK 會送這種快照，不能當成「確定沒有」，維持原狀態
      }
      _pdSchedule();
      if (p.state === 'new') {
        if (growthSync(shop)) window.dispatchEvent(new CustomEvent('profitDataReady', { detail: { changedShops: [shop + '_growth'] } }));
      } else if (prev === 'new') {
        // 回搬（migratedAt 被移除）：把舊欄位放回顯示
        mergeAndNotify();
      }
    };
    window.__growthSubError = (shop, err) => {
      const p = growthParts[shop];
      if (p) p.error = String((err && err.message) || err);
      console.error('[商品調整] app/growth_' + shop + ' 訂閱失敗：', err);
    };

    // 重量：archive 分片（PROFIT_ARCHIVE_DOCS，見上方常數）跟 profits collection 延後訂閱
    // 等首頁渲染完成 + 使用者第一次切換到淨利表 才載入
    // 在那之前，淨利表頁面如果有人開啟，會看到 loading 狀態
    //
    // 目前的分片與各自的用途：
    //   （app/profit_2026_05：2026/05 的舊報表封存，#428 起不再載入，文件留著不刪。那 4 份報表 profits collection 都有，畫面一直用 profits 那份；
    //     封存有另一個版本，所以不是唯一副本。不能再載回來：mergeAndNotify 會在窗口外把舊版填進記憶體。兩邊的內容差異沒有比對過。）
    //   app/profit_notes_2026  2026 年舊月份的廣告調整（ec_notes|通路|月|半月）封存。
    //                          doc 名刻意帶 notes 是護欄：這片只放 ec_notes，不要把報表塞進來。
    //   app/profit_notes_2026_2 同上的第二片（2026-11-05 起）。第一片已撞 40,000 索引上限，不能再寫入；之後新封存的期別放這片。key 不可與第一片重複。
    // ⚠ 各分片的 key 命名空間【必須互不相交】。這是正確性要求，不是分類習慣——
    //   mergeAndNotify 合併 archive 用的 Object.values(profitParts.archives)，順序等於哪個
    //   onSnapshot 先回來，是【非決定性】的。兩片若出現同名 key，誰蓋掉誰每次載入都可能不同，
    //   而且不會報錯、不會有任何徵兆。新增分片前先確認它的 key 前綴與既有各片都不重疊。
    // ⚡ 進淨利表不再一次訂滿 13 collection（手機首批 ~10MB → renderer OOM 根因）→ 按平台分四組懶載。
    //   各組首次呼叫才訂閱、__loadedSubGroups 記已訂、切回同平台不重訂；四組到齊才把相容旗標 __heavyProfitSubsLoaded 設 true。
    window.__loadedSubGroups = window.__loadedSubGroups || new Set();
    window.__heavyProfitSubsLoaded = false;
    const __markSubsMaybeAllLoaded = () => { if (['shopee','archive','momo','coupang'].every(g => window.__loadedSubGroups.has(g))) window.__heavyProfitSubsLoaded = true; };
    // ══ 蝦皮舊月組：archive docs（個別蝦皮賣場看舊月 + 工作日誌讀調整備註；獨立成組→工作日誌可只載這組、不拖 profits 4.4MB）══
    window.__loadArchiveSubs = () => {
      if (window.__loadedSubGroups.has('archive')) return;
      window.__loadedSubGroups.add('archive');
      console.log('[profit] 載入 archive 組（舊月份歷史 doc）');
      // archive docs (舊月份歷史資料)
      profitArchiveRefs.forEach((ref, idx) => {
        onSnapshot(ref, snap => {
          // ⚠ 下一行對 exists()===false 仍寫入 {}：window.__profitArchivesReady 的「已到達」判準依賴這個行為（有 key＝到過）。改成 delete 會讓 ready 無聲退回 false。
          profitParts.archives[PROFIT_ARCHIVE_DOCS[idx]] = snap.exists() ? (snap.data() || {}) : {};
          profitArchiveMeta[PROFIT_ARCHIVE_DOCS[idx]] = { at: Date.now(), exists: snap.exists(), fromCache: !!(snap.metadata && snap.metadata.fromCache) };   // 嚴格版 ready 用；不 includeMetadataChanges，只記每次資料快照附帶的 metadata
          mergeAndNotify();
          _pdSchedule();   // 容量估算一併報封存片
        }, err => {
          profitArchiveErrors[PROFIT_ARCHIVE_DOCS[idx]] = { at: Date.now(), code: (err && err.code) || '', message: String((err && err.message) || err) };
          console.error('[profit archive subscribe 失敗]', PROFIT_ARCHIVE_DOCS[idx], err);
        });
      });
      naSubscribe();   // #436 ⑤ 新封存，跟舊兩片同一組、同一個時機
      __markSubsMaybeAllLoaded();
    };

    // ══════ #436 第 ⑤ 塊：廣告調整新封存 notes_archive（每通路每月一份）══════
    //   訂閱：整個 collection 一個監聽，由 __loadArchiveSubs 觸發（進蝦皮個別通路、工作日誌、洞察表調整彈窗、健檢）。
    //   🔴 includeMetadataChanges 不能拿掉：沒開 persistence，離線可能先送 fromCache 的空快照，要等翻成伺服器狀態才算 ready。
    //   不合法的文件不併進畫面，記在 naMeta.invalid ⇒ __profitArchivesReady 為 false ⇒ 寫入一律擋下（fail-closed）。
    const naSubscribe = () => {
      if (naMeta.subscribed) return;
      naMeta.subscribed = true;
      try {
        onSnapshot(collection(db, NOTES_ARCHIVE_COL), { includeMetadataChanges: true }, snap => {
          naMeta.fromCache = !!(snap && snap.metadata && snap.metadata.fromCache);
          // 只有 fromCache／待寫入狀態變了的快照：文件沒變，不用重算（第一份快照一律處理）
          if (naMeta.gotSnap && snap && typeof snap.docChanges === 'function' && !snap.docChanges().length) return;
          naMeta.gotSnap = true;
          Object.keys(naParts).forEach(id => delete naParts[id]);
          Object.keys(naMeta.invalid).forEach(id => delete naMeta.invalid[id]);
          snap.forEach(d => {
            const data = d.data() || {};
            const v = naValidate(d.id, data);
            if (!v.ok) { naMeta.invalid[d.id] = { at: Date.now(), code: 'invalid', message: v.why }; console.error('[廣告調整封存] 文件內容不合法，不採用（寫入會先擋下）：', NOTES_ARCHIVE_COL + '/' + d.id, v.why); return; }
            naParts[d.id] = { id: d.id, shop: v.shop, ym: v.ym, state: v.state, keys: v.keys, raw: data };
          });
          mergeAndNotify();
          _pdSchedule();
        }, err => {
          naMeta.error = { at: Date.now(), code: (err && err.code) || '', message: String((err && err.message) || err) };
          console.error('[廣告調整封存] 訂閱失敗：', err);
        });
      } catch (e) {
        naMeta.error = { at: Date.now(), code: 'throw', message: String((e && e.message) || e) };
        console.error('[廣告調整封存] 訂閱失敗：', e);
      }
    };
    window.__notesArchivePure = Object.assign({ measure: profitDocMeasure, sig: growthSig, canon: growthCanon }, naPure);
    // 雲端物件：讀 getDoc(shop, ym, 'server')（名字在讀取白名單）；寫 createMonth / commitDelete / restoreMonth（三支都是交易）。
    //   寫入成功回 { ok:true, … }；條件不符回 { ok:false, why, … }（什麼都沒寫）；被唯讀／本機防護擋下回 undefined → 呼叫端一律 r && r.ok。
    //   ⚠ 新增這顆後本機防護物件數 +1、寫入方法 +3（實際數字以合併時防護碼輸出為準，見 CLAUDE.md）。
    const naRef = (shop, ym) => {
      if (!NOTES_ARCHIVE_SHOPS.includes(shop)) throw new Error('不是列管的通路：' + shop);
      if (!/^\d{4}-\d{2}$/.test(String(ym))) throw new Error('月份格式不對：' + ym);
      return doc(db, NOTES_ARCHIVE_COL, naDocId(shop, ym));
    };
    // 把 app/profit 裡這個通路這個月的廣告調整撈出來（交易內用）
    const naSourceOf = (pdata, shop, ym) => naInventory(pdata, shop, ym).source;
    window.__cloudNotesArchive = {
      getDoc: (shop, ym, src) => src === 'server' ? getDocFromServer(naRef(shop, ym)) : getDoc(naRef(shop, ym)),
      // 複製：文件不存在才建立（state 'copied'）。已是 done 一律拒絕；已是 copied 要帶 opts.replaceCopied 才重建。
      createMonth: (shop, ym, data, opts) => {
        const ref = naRef(shop, ym), id = naDocId(shop, ym);
        return runTransaction(db, async (tx) => {
          const s = await tx.get(ref);
          if (s.exists()) {
            const cur = s.data() || {};
            if (cur.state === 'done') return { ok: false, why: 'done' };
            if (!(opts && opts.replaceCopied)) return { ok: false, why: 'exists', state: cur.state || '' };
          }
          const v = naValidate(id, data);
          if (!v.ok) return { ok: false, why: 'invalid', detail: v.why };
          if (data.state !== 'copied') return { ok: false, why: 'invalid', detail: 'state 要是 copied' };
          tx.set(ref, data);
          return { ok: true, replaced: s.exists() };
        });
      },
      // 刪舊欄位＋生效：同一個交易讀 app/profit 與封存文件，這個通路這個月的 key 要跟封存逐品號相同才刪，同時把封存改成 done。
      commitDelete: (shop, ym, by) => {
        const ref = naRef(shop, ym), id = naDocId(shop, ym);
        return runTransaction(db, async (tx) => {
          const as = await tx.get(ref);
          const ps = await tx.get(profitDocRef);
          if (!as.exists()) return { ok: false, why: 'no-archive' };
          const a = as.data() || {};
          const v = naValidate(id, a);
          if (!v.ok) return { ok: false, why: 'invalid', detail: v.why };
          if (a.state !== 'copied') return { ok: false, why: a.state === 'done' ? 'done' : 'state' };
          if (!ps.exists()) return { ok: false, why: 'no-profit' };
          const src = naSourceOf(ps.data() || {}, shop, ym);
          const cmp = naCompare(shop, ym, src, a.notes);
          if (!cmp.same) return { ok: false, why: 'changed', diffs: cmp.diffs.slice(0, 50), nDiffs: cmp.diffs.length };
          const keys = Object.keys(v.keys);
          const args = [];
          keys.forEach(k => { args.push(new FieldPath(k), deleteField()); });
          tx.update(profitDocRef, ...args);
          tx.update(ref, { state: 'done', doneAt: Date.now(), doneBy: by || '' });
          return { ok: true, keys };
        });
      },
      // 回搬：封存內容寫回 app/profit、刪掉封存文件。app/profit 已經有任何一把 ⇒ 不做；寫回後 app/profit 超過 90%（大小或索引）⇒ 不做。
      restoreMonth: (shop, ym) => {
        const ref = naRef(shop, ym), id = naDocId(shop, ym);
        return runTransaction(db, async (tx) => {
          const as = await tx.get(ref);
          const ps = await tx.get(profitDocRef);
          if (!as.exists()) return { ok: false, why: 'no-archive' };
          const v = naValidate(id, as.data() || {});
          if (!v.ok) return { ok: false, why: 'invalid', detail: v.why };
          if (!ps.exists()) return { ok: false, why: 'no-profit' };
          const pdata = ps.data() || {};
          const keys = Object.keys(v.keys);
          const clash = keys.filter(k => Object.prototype.hasOwnProperty.call(pdata, k));
          if (clash.length) return { ok: false, why: 'profit-has', keys: clash };
          const after = profitDocMeasure(Object.assign({}, pdata, v.keys), 'app/profit');
          if (after.ratio >= 0.9 || after.idxRatio >= 0.9) return { ok: false, why: 'capacity', ratio: after.ratio, idxRatio: after.idxRatio };
          const args = [];
          keys.forEach(k => { args.push(new FieldPath(k), v.keys[k]); });
          tx.update(profitDocRef, ...args);
          tx.delete(ref);
          return { ok: true, keys, ratio: after.ratio, idxRatio: after.idxRatio };
        });
      },
    };

    // #315：profits collection 是否已從【伺服器】收到過快照（唯讀觀測點，給 js/profit.js 的 _progHeavyLoaded 判「載入中 / 尚無報表」）。
    //   比照 __profitArchivesReady 只認 metadata.fromCache===false；空 collection 的伺服器快照也算（不能因為沒文件就永遠 false）。
    //   錯誤 callback 不設 → 維持 false（＝載入中，保守）。一旦收到過就維持 true（黏住）：本訂閱沒開 includeMetadataChanges，
    //   退回 false 之後「fromCache 轉回 false」這種純 metadata 變化不會再送快照，會卡在載入中直到下次資料變動。
    //   ⚠ 刻意不以 __cloud 開頭（同 __profitArchivesReady）：純讀取，不被 __installReadonlyCloudGuard 包、不算進 TEST_NOWRITE 物件數。
    //   #428 起語意：「所有訂閱的通路，近月都收到過伺服器快照」。窗口外的月份不算在內，要用 js/profit.js 的 _reportMonthState。
    let profitsCollectionServerSeen = false;
    window.__profitsCollectionReady = () => profitsCollectionServerSeen;
    // 只即時訂閱近 3 個月（#428 方案 A）：今天的月份往前到 M-2，上限不封頂（長開的分頁跨月也收得到新月份）。舊月份由 js/profit.js 的 _reportEnsure 按需讀。
    //   ec|filemeta|* 沒有讀取端、不載；ectest|* 進測試通路才讀（_reportTestEnsure）。
    //   ⚠ 通路清單寫死：新增蝦皮通路要加進來（同 INSIGHT_SHOPS、js/profit.js 的 SHOPS），漏了那個通路的近月就收不到。
    const PROFITS_SUB_SHOPS = ['好麻吉', '玩樂', '森之旅', '維克'];
    const PROFITS_WINDOW_MONTHS = 3;
    const profitsWindowFrom = () => {   // 'YYYY/MM'（台灣時間）
      const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
      const g = t => +(p.find(x => x.type === t) || {}).value;
      const t = g('year') * 12 + (g('month') - 1) - (PROFITS_WINDOW_MONTHS - 1);
      return Math.floor(t / 12) + '/' + String(t % 12 + 1).padStart(2, '0');
    };
    const profitsSubState = {};   // 通路 → { serverSeen, fromCache, keys, error }，只給 Console 觀測
    // Console 唯讀觀測：目前訂閱了哪些通路、哪些月份（不以 __cloud 開頭）
    window.__profitsSubState = () => ({
      from: window.__profitsWindowFrom || null,
      ready: profitsCollectionServerSeen,
      shops: Object.fromEntries(Object.entries(profitsSubState).map(([s, v]) => [s, { serverSeen: v.serverSeen, fromCache: v.fromCache, error: v.error, docs: v.keys.length, months: [...new Set(v.keys.map(k => k.split('|')[2]))].sort() }])),
    });
    // ══ 蝦皮組成員①：profits collection（每月每賣場獨立 doc）。與 aff_rpt 同屬蝦皮組，由 __loadShopeeSubs 一起呼叫。══
    const __subProfits = () => {
      // profits collection (每月每賣場獨立 doc)
      const fromDocId = id => id.replace(/__/g, '/');
      const from = profitsWindowFrom();
      window.__profitsWindowFrom = from;   // 訂閱實際用的起點：js/profit.js 的 _reportWindowFrom 讀它，長開的分頁跨月才不會跟實際訂閱對不上
      const applyProfitsSnap = (shop, snap) => {
          const st = profitsSubState[shop];
          st.fromCache = !!(snap && snap.metadata && snap.metadata.fromCache);
          if (snap && snap.metadata && snap.metadata.fromCache === false) {   // #315 唯讀旗標，不影響下方任何邏輯
            st.serverSeen = true;
            if (PROFITS_SUB_SHOPS.every(s => profitsSubState[s] && profitsSubState[s].serverSeen)) profitsCollectionServerSeen = true;
          }
          // 開了 includeMetadataChanges：只有 fromCache／待寫入狀態變了的快照，文件沒變，不用重算
          if (snap && typeof snap.docChanges === 'function' && !snap.docChanges().length) return;
          Store._profitMem = Store._profitMem || {};
          const incoming = {};
          snap.forEach(d => { incoming[fromDocId(d.id)] = d.data(); });
          st.keys = Object.keys(incoming);
          const oldMem = Store._profitMem;
          const changedShops = new Set();
          Object.keys(incoming).forEach(k => {
            if (JSON.stringify(incoming[k]) !== JSON.stringify(oldMem[k])) {
              const shop = k.split('|')[1];
              if (shop) changedShops.add(shop);
            }
          });
          // 本機有未同步變更 / 剛存過 → 不讓雲端快照覆蓋，保住使用者的報表
          //   （守衛定義在 js/profit.js，那裡才讀得到私有的 _pendingSyncKeys）
          //   ⚠ 這裡不能用 Object.assign 整批覆蓋，必須逐 key 過守衛。
          //   對照組：本檔 app/profit doc 與 momo_products / momo_reconcile / momo_s1103 都已有同型別守衛。
          const _skipped = [];
          Object.keys(incoming).forEach(k => {
            if (window.__profitShouldSkipCloudOverwrite && window.__profitShouldSkipCloudOverwrite(k)) { _skipped.push(k); return; }
            Store._profitMem[k] = incoming[k];
          });
          if (_skipped.length) console.warn('[profits collection] 本機未同步，跳過覆蓋：', _skipped);
          if (changedShops.size > 0) {
            console.log('[profits collection] 收到更新，影響賣場：', [...changedShops]);
            // 只 dispatch profitDataReady（精準更新），不呼叫 App.render()（全頁重繪）——比照上面 app/profit 訂閱的做法。
            //   profitDataReady 的監聽者已完整重繪受影響的蝦皮賣場（onMonthChange/_applyLatestPeriod + renderSummary + 修 tab），足夠。
            //   ⚠ 不要加回 App.render()：它會 viewOffice 重建整個淨利表 HTML，把使用者當前在 MOMO/酷澎 的選擇清掉、彈回蝦皮預設；
            //   快照頻繁時（多人同步）會不斷把人踢出 MOMO/酷澎（2026-07-28 實際發生）。兩條訂閱都不 render 是刻意一致，不是漏改。
            window.dispatchEvent(new CustomEvent('profitDataReady', {detail:{changedShops:[...changedShops]}}));
          }
      };
      PROFITS_SUB_SHOPS.forEach(shop => {
        profitsSubState[shop] = { serverSeen: false, fromCache: null, keys: [], error: null };
        try {
          const head = 'ec|' + shop + '|';
          const q = query(collection(db, 'profits'), where(documentId(), '>=', head + from.replace('/', '__')), where(documentId(), '<', head + '\uf8ff'));
          // 🔴 includeMetadataChanges 不能拿掉：文件已在 SDK 快取時第一個快照是 fromCache，之後翻成伺服器狀態但文件沒變，
          //    不開就不會再送快照，__profitsCollectionReady 會永遠 false，產生報表會一直被擋。
          onSnapshot(q, { includeMetadataChanges: true }, snap => applyProfitsSnap(shop, snap), err => {
            profitsSubState[shop].error = String((err && err.message) || err);
            console.error('[profits collection subscribe 失敗]', shop, err);
          });
        } catch (e) { console.warn('profits collection subscribe failed', shop, e); }
      });
    };

    // ══ MOMO 組：products/origins/reconcile/s1103/stock/e001/cost（MOMO 任一分頁含總表都要全載→總表逐 SKU 加總才完整）══
    window.__loadMomoSubs = () => {
      if (window.__loadedSubGroups.has('momo')) return;
      window.__loadedSubGroups.add('momo');
      console.log('[profit] 載入 MOMO 組（products/origins/reconcile/s1103/stock/e001/cost）');
      // momo_products collection（每賣場一 doc）→ 併回 Store._profitMem['ec_momo_products|<shop>']（維持 momoLoadProducts 讀取順序）
      try {
        onSnapshot(momoProductsColRef, snap => {
          const changed = [];
          snap.forEach(d => {
            const data = d.data() || {};
            const shop = data.shop || MOMO_DOCID_SHOP[d.id] || d.id;   // 反查優先讀 doc.shop，fallback 對照表
            const k = 'ec_momo_products|' + shop;
            const items = data.items || [];
            const ts = (data.updatedAt && data.updatedAt.toMillis) ? data.updatedAt.toMillis() : 0;   // 雲端版本戳（【2】基準）
            // ⚠ bounce-back 守衛：剛存過（echo）→ 不覆蓋（守衛邏輯在 profit.js）
            if (window.__momoShouldSkipCloudOverwrite && window.__momoShouldSkipCloudOverwrite(k)) return;
            // ⚠ dirty 守衛：真正編輯過還沒推的 key → 保護，不被雲端覆蓋（persisted，跨重整；區分「stale 舊快照 vs 我改了還沒推」）
            if (window.__momoIsProductsDirty && window.__momoIsProductsDirty(k)) return;
            if (JSON.stringify(Store._profitMem[k]) === JSON.stringify(items)) {   // 內容相同：不覆蓋、不重繪，但記錄雲端版本基準
              if (window.__momoProductsLastPushedSet) window.__momoProductsLastPushedSet(shop, items);   // 無 dirty（走到這＝212 dirty-skip 沒攔）→ bootstrap/更新 lastPushed=當下雲端；dirty 賣場在 212 已 return=baseline 凍結
              return;
            }
            // 【1】 stale 修正：not-dirty → 本機三鏡像一起跟上雲端（預覽/推送讀 _mem→localStorage，只更 _profitMem 會 stale）
            Store._profitMem[k] = items;
            try { localStorage.setItem(k, JSON.stringify(items)); } catch (e) {}
            try { if (Store._mem) Store._mem[k] = items; } catch (e) {}
            if (window.__momoProductsLastPushedSet) window.__momoProductsLastPushedSet(shop, items);   // 無 dirty（走到這＝212 dirty-skip 沒攔）→ bootstrap/更新 lastPushed=當下雲端；dirty 賣場在 212 已 return=baseline 凍結
            changed.push(shop);
          });
          if (changed.length) {
            console.log('[momo_products] 收到更新，影響賣場：', changed);
            // 精準更新（不走 App.render/renderFromCloud，避免整頁重繪踢人）：只重繪當前正在看的那個 MOMO 賣場總表
            window.dispatchEvent(new CustomEvent('momoDataReady', { detail: { changedShops: changed } }));
          }
        }, err => { console.error('[momo_products subscribe 失敗]', err); });
      } catch (e) { console.warn('momo_products subscribe failed', e); }

      // momo_reconcile collection（每 shop 每月一 doc）→ Store._profitMem['ec_momo_reconcile|<shop>|<YYYY-MM>']（momoLoadReconcile 讀取順序一致）
      try {
        onSnapshot(momoReconcileColRef, snap => {
          const changed = [];
          snap.forEach(d => {
            const data = d.data() || {};
            // docId = shopDocId + '_' + 'YYYY-MM'。月份含 '-' 不含 '_'，故最後一個 '_' 必為賣場/月份分隔。
            //   ⚠ 舊碼用 split('_')[0] 取賣場代號，對多底線代號（mo_maji / mo_senzhilu）只取到 'mo' → 反查失敗 → 整份被丟棄
            //     （MO+ 麻吉/森之旅月對帳永遠不從雲端載入）。單底線的 jia/yi 不受影響、行為完全不變。改用 lastIndexOf('_') 切。
            const idStr = String(d.id);
            const cut = idStr.lastIndexOf('_');
            const docPrefix = cut >= 0 ? idStr.slice(0, cut) : idStr;
            const shop = data.savedShop || MOMO_DOCID_SHOP[docPrefix] || null;
            const month = data.month || (cut >= 0 ? idStr.slice(cut + 1) : '');
            if (!shop || !month) return;
            const k = 'ec_momo_reconcile|' + shop + '|' + month;
            if (window.__momoShouldSkipCloudOverwrite && window.__momoShouldSkipCloudOverwrite(k)) return;   // 本機未同步/剛存 → 不覆蓋
            if (JSON.stringify(Store._profitMem[k]) === JSON.stringify(data)) return;
            Store._profitMem[k] = data;
            changed.push(k);
          });
          if (changed.length) {
            console.log('[momo_reconcile] 收到更新：', changed);
            window.dispatchEvent(new CustomEvent('momoReconcileReady', { detail: { changed } }));
          }
        }, err => { console.error('[momo_reconcile subscribe 失敗]', err); });
      } catch (e) { console.warn('momo_reconcile subscribe failed', e); }

      // momo_s1103 collection（每期別一 doc）→ Store._profitMem['ec_momo_s1103|<period>']（momoLoadS1103 讀取順序一致；搬離 app/profit）
      try {
        onSnapshot(momoS1103ColRef, snap => {
          const changed = [];
          snap.forEach(d => {
            const data = d.data() || {};
            const period = data.period || d.id;
            if (!period) return;
            const k = 'ec_momo_s1103|' + period;
            if (window.__momoShouldSkipCloudOverwrite && window.__momoShouldSkipCloudOverwrite(k)) return;   // 本機未同步/剛存 → 不覆蓋
            if (JSON.stringify(Store._profitMem[k]) === JSON.stringify(data)) return;
            Store._profitMem[k] = data;
            changed.push(period);
          });
          if (changed.length) {
            console.log('[momo_s1103] 收到更新：', changed);
            window.dispatchEvent(new CustomEvent('momoS1103Ready', { detail: { changed } }));
          }
        }, err => { console.error('[momo_s1103 subscribe 失敗]', err); });
      } catch (e) { console.warn('momo_s1103 subscribe failed', e); }

      // momo_stock collection（單一快照 doc 'current'）→ Store._profitMem['ec_momo_stock_by_origin']（總表「自家庫存」欄；獨立 collection 避 app/profit 索引爆）
      try {
        onSnapshot(momoStockColRef, snap => {
          let changed = false;
          snap.forEach(d => {
            if (d.id !== MOMO_STOCK_DOCID) return;
            const data = d.data() || {};
            const k = 'ec_momo_stock_by_origin';
            if (JSON.stringify(Store._profitMem[k]) === JSON.stringify(data)) return;
            Store._profitMem[k] = data;
            changed = true;
          });
          if (changed) { console.log('[momo_stock] 收到更新'); window.dispatchEvent(new CustomEvent('momoStockReady')); }
        }, err => { console.error('[momo_stock subscribe 失敗]', err); });
      } catch (e) { console.warn('momo_stock subscribe failed', e); }

      // momo_moplus_origins collection（MO+ 每賣場每來源月一 doc）→ Store._profitMem['ec_momo_moplus_origins|<shop>|<src>']
      //   MO+ 逐列成本用：per(SKU,期別) origin→qty + D手續費 + C代扣運費 + 每期別運費收入 B。分片到來源月＝重上傳整 doc 覆蓋(天然冪等)、大小有界。
      try {
        onSnapshot(momoMoPlusOriginsColRef, snap => {
          const changed = [];
          snap.forEach(d => {
            const data = d.data() || {};
            if (!data.shop || !data.src) return;
            const k = 'ec_momo_moplus_origins|' + data.shop + '|' + data.src;
            const ts = (data.updatedAt && data.updatedAt.toMillis) ? data.updatedAt.toMillis() : 0;   // 雲端版本戳（base 基準）
            if (window.__momoShouldSkipCloudOverwrite && window.__momoShouldSkipCloudOverwrite(k)) return;   // in-memory pending / 剛存 5 秒
            // #169 dirty 守衛：決策集中在 profit.js 的 momoOriginsCloudDecision（自癒：雲端已追上/本機不存在→清 dirty 接受；本機較新未推→跳過保護）。
            //   fallback（決策函式尚未載到）＝維持 #169 原行為（dirty 就跳過），不放寬防護。
            const _dec = window.__momoOriginsCloudDecision ? window.__momoOriginsCloudDecision(k, data)
              : ((window.__momoIsOriginsDirty && window.__momoIsOriginsDirty(k)) ? { action: 'skip' } : { action: 'accept' });
            if (_dec.action === 'skip') { if (window.__momoNotifyOriginsSkip) window.__momoNotifyOriginsSkip(k); return; }   // 本機較新未推 → 不覆蓋、通知
            if (_dec.action === 'noop') { if (window.__momoNoteOriginsCloudBase) window.__momoNoteOriginsCloudBase(k, ts); return; }   // 已等值 → 只記基準
            Store._profitMem[k] = data;   // accept（含 healed：dirty 過期已清）→ 接受雲端（stale 跟上；orphan 補回；舊 doc 無 updatedAt 也走這條）
            if (window.__momoNoteOriginsCloudBase) window.__momoNoteOriginsCloudBase(k, ts);   // 記錄基準：我現在基於這個雲端版本
            changed.push(data.shop + '|' + data.src);
          });
          if (changed.length) { console.log('[momo_moplus_origins] 收到更新：', changed); window.dispatchEvent(new CustomEvent('momoMoPlusOriginsReady', { detail: { changed } })); }
        }, err => { console.error('[momo_moplus_origins subscribe 失敗]', err); });
      } catch (e) { console.warn('momo_moplus_origins subscribe failed', e); }

      // momo_e001 collection（MO+ 每賣場每來源月一 doc）→ Store._profitMem['ec_momo_e001|<shop>|<src>']
      //   未結算銷量估算值：某期別一旦有對帳明細即被結算取代、不再顯示。分片到來源月＝重上傳整 doc 覆蓋(天然冪等)。
      try {
        onSnapshot(momoE001ColRef, snap => {
          const changed = [];
          snap.forEach(d => {
            const data = d.data() || {};
            if (!data.shop || !data.src) return;
            const k = 'ec_momo_e001|' + data.shop + '|' + data.src;
            if (window.__momoShouldSkipCloudOverwrite && window.__momoShouldSkipCloudOverwrite(k)) return;
            if (JSON.stringify(Store._profitMem[k]) === JSON.stringify(data)) return;
            Store._profitMem[k] = data;
            changed.push(data.shop + '|' + data.src);
          });
          if (changed.length) { console.log('[momo_e001] 收到更新：', changed); window.dispatchEvent(new CustomEvent('momoE001Ready', { detail: { changed } })); }
        }, err => { console.error('[momo_e001 subscribe 失敗]', err); });
      } catch (e) { console.warn('momo_e001 subscribe failed', e); }
      __subMomoCost();
      __markSubsMaybeAllLoaded();
    };

    // ══ 酷澎組：coupang_reports/msf/note ══
    window.__loadCoupangSubs = () => {
      if (window.__loadedSubGroups.has('coupang')) return;
      window.__loadedSubGroups.add('coupang');
      console.log('[profit] 載入酷澎組（coupang_reports/msf/note）');
      // PR-4：coupang_reports collection（每賣場每月一 doc）→ Store._profitMem['ec_coupang|<shop>|<month>']（cupLoadReport 讀取順序一致）
      //   ⚠ setReport 存的 doc 沒有 shop 欄位（只有 {month,rows,ts,updatedAt}）→ 賣場靠 docId 前綴反查（比照 momo_reconcile 的 lastIndexOf('_') 切法；月份 'YYYY-MM' 不含 '_'）。
      try {
        onSnapshot(coupangReportsColRef, snap => {
          const changed = [];
          snap.forEach(d => {
            const data = d.data() || {};
            const idStr = String(d.id);
            const cut = idStr.lastIndexOf('_');
            const docPrefix = cut >= 0 ? idStr.slice(0, cut) : idStr;
            const shop = COUPANG_DOCID_SHOP[docPrefix] || null;
            const month = data.month || (cut >= 0 ? idStr.slice(cut + 1) : '');
            if (!shop || !month) return;
            const k = 'ec_coupang|' + shop + '|' + month;
            if (window.__momoShouldSkipCloudOverwrite && window.__momoShouldSkipCloudOverwrite(k)) return;   // 本機未同步/剛存 → 不覆蓋
            if (JSON.stringify(Store._profitMem[k]) === JSON.stringify(data)) return;
            Store._profitMem[k] = data;
            changed.push(k);
          });
          if (changed.length) { console.log('[coupang_reports] 收到更新：', changed); window.dispatchEvent(new CustomEvent('coupangReportReady', { detail: { changed } })); }
        }, err => { console.error('[coupang_reports subscribe 失敗]', err); });
      } catch (e) { console.warn('coupang_reports subscribe failed', e); }

      // PR-4：coupang_msf collection（每賣場每來源月一 doc）→ Store._profitMem['ec_coupang_msf|<shop>|<src>']（cupLoadReturns 讀取順序一致）
      //   setSrc 存的 doc＝退貨解析結果 res（無 shop/src 欄）→ 賣場靠 docId 前綴反查、src（來源月）取 docId 後段。
      try {
        onSnapshot(coupangMsfColRef, snap => {
          const changed = [];
          snap.forEach(d => {
            const data = d.data() || {};
            const idStr = String(d.id);
            const cut = idStr.lastIndexOf('_');
            const docPrefix = cut >= 0 ? idStr.slice(0, cut) : idStr;
            const shop = COUPANG_DOCID_SHOP[docPrefix] || null;
            const src = cut >= 0 ? idStr.slice(cut + 1) : '';
            if (!shop || !src) return;
            const k = 'ec_coupang_msf|' + shop + '|' + src;
            if (window.__momoShouldSkipCloudOverwrite && window.__momoShouldSkipCloudOverwrite(k)) return;
            if (JSON.stringify(Store._profitMem[k]) === JSON.stringify(data)) return;
            Store._profitMem[k] = data;
            changed.push(k);
          });
          if (changed.length) { console.log('[coupang_msf] 收到更新：', changed); window.dispatchEvent(new CustomEvent('coupangMsfReady', { detail: { changed } })); }
        }, err => { console.error('[coupang_msf subscribe 失敗]', err); });
      } catch (e) { console.warn('coupang_msf subscribe failed', e); }

      // PR-4b：coupang_note collection（每賣場每月一 doc）→ Store 三鏡像['ec_coupang_note|<shop>|<month>']。note 從報表 doc 拆出、走 merge。
      //   本機有未推備註（持久 dirty，跨重整）→ 整月不覆蓋（推送時 syncCupNoteMerge 逐 SKU merge 才不會漏同事的）；否則接受雲端 + 回寫三鏡像（heal stale）。
      try {
        onSnapshot(coupangNoteColRef, snap => {
          const changed = [];
          snap.forEach(d => {
            const data = d.data() || {};
            const idStr = String(d.id);
            const cut = idStr.lastIndexOf('_');
            const docPrefix = cut >= 0 ? idStr.slice(0, cut) : idStr;
            const shop = COUPANG_DOCID_SHOP[docPrefix] || null;
            const month = cut >= 0 ? idStr.slice(cut + 1) : '';
            if (!shop || !month) return;
            const k = 'ec_coupang_note|' + shop + '|' + month;
            if (window.__cupNoteKeyDirty && window.__cupNoteKeyDirty(k)) return;   // 本機有未推備註（持久 dirty）→ 整月不覆蓋
            if (window.__momoShouldSkipCloudOverwrite && window.__momoShouldSkipCloudOverwrite(k)) return;   // 記憶體 pending / 剛存 5 秒
            if (JSON.stringify(Store._profitMem[k]) === JSON.stringify(data)) return;
            Store._profitMem[k] = data;
            try { Store._mem = Store._mem || {}; Store._mem[k] = data; } catch (e) {}   // 三鏡像（cupLoadNoteDoc 讀 _profitMem→_mem→localStorage；heal stale）
            try { localStorage.setItem(k, JSON.stringify(data)); } catch (e) {}
            changed.push(k);
          });
          if (changed.length) { console.log('[coupang_note] 收到更新：', changed); window.dispatchEvent(new CustomEvent('coupangNoteReady', { detail: { changed } })); }
        }, err => { console.error('[coupang_note subscribe 失敗]', err); });
      } catch (e) { console.warn('coupang_note subscribe failed', e); }
      __markSubsMaybeAllLoaded();
    };

    // ══ MOMO 組成員（成本）：momo_cost_by_origin。定義在酷澎組後、由 __loadMomoSubs 呼叫（原廠編號→成本，MO+ 毛利依賴）══
    const __subMomoCost = () => {
      // momo_cost_by_origin（帳號級單一 doc）→ Store._profitMem['ec_momo_cost_by_origin'] + '..._meta'。原廠編號→成本，MO+ 毛利依賴、需跨人跨機。
      try {
        onSnapshot(costByOriginDocRef, snap => {
          const data = (snap && snap.data && snap.data()) || null; if (!data) return;
          if (window._momoCostJustSaved && (Date.now() - window._momoCostJustSaved < 5000)) return;   // 剛本機存過 → 不被 echo 覆蓋
          let changed = false;
          // ⚠ dirty 守衛（比照 momo_products/origins 訂閱）：ec_momo_cost_dirty 裡的原廠編號＝本機補了還沒推，
          //   逐 key merge 保留本機值、其餘取雲端；不整包覆蓋（原本整包覆蓋會把本機未推的成本蓋掉＝資料遺失根因）。
          const dirtySet = (window.__momoCostDirtySet && window.__momoCostDirtySet()) || new Set();
          // ⚠ reload gap 修：dirty 非空時，本機權威值改讀 localStorage（persisted、跨重整），不依賴 Store._profitMem——
          //   reload 後訂閱可能「早於 _profitMem 從 localStorage 補水」就觸發 → _profitMem 空 → 舊碼 merge 取不到本機值
          //   → 未推成本被雲端整包覆蓋（＝Vanessa 四筆消失的主要路徑）。讀不到 localStorage（dirty 存在卻拿不到本機表）
          //   → 安全預設「不覆蓋」跳過本輪（寧可暫不同步，也不洗掉未推值）。dirty 空時維持原 fast path（_profitMem）。
          let _localMap, _localMeta;
          if (dirtySet.size > 0) {
            try {
              const _sm = localStorage.getItem('ec_momo_cost_by_origin');
              const _se = localStorage.getItem('ec_momo_cost_by_origin_meta');
              _localMap = _sm != null ? JSON.parse(_sm) : null;
              _localMeta = _se != null ? JSON.parse(_se) : {};
            } catch (e) { _localMap = null; }
            if (!_localMap) { console.warn('[momo_cost_by_origin] dirty 非空但無法取得本機權威成本表 → 跳過本輪雲端更新（不覆蓋未推）'); return; }
          } else {
            _localMap = Store._profitMem['ec_momo_cost_by_origin'] || {};
            _localMeta = Store._profitMem['ec_momo_cost_by_origin_meta'] || {};
          }
          if (data.costMap) {
            const localMap = _localMap;
            const mergedMap = Object.assign({}, data.costMap); const kept = [];
            dirtySet.forEach(o => { if (Object.prototype.hasOwnProperty.call(localMap, o)) { mergedMap[o] = localMap[o]; kept.push(o); } });
            if (JSON.stringify(localMap) !== JSON.stringify(mergedMap)) {
              Store._profitMem['ec_momo_cost_by_origin'] = mergedMap;   // 三鏡像一起更（sweep/預覽讀 localStorage/_mem，只更 _profitMem 會 stale）
              try { localStorage.setItem('ec_momo_cost_by_origin', JSON.stringify(mergedMap)); } catch (e) {}
              try { if (Store._mem) Store._mem['ec_momo_cost_by_origin'] = mergedMap; } catch (e) {}
              changed = true;
              if (kept.length) console.log('[momo_cost_by_origin] dirty 守衛：保留本機未推 ' + kept.length + ' 個原廠成本（不被雲端覆蓋）：', kept.slice(0, 10));
            }
          }
          if (data.meta) {
            const localMeta = _localMeta || {};
            const mergedMeta = Object.assign({}, data.meta);
            dirtySet.forEach(o => { if (Object.prototype.hasOwnProperty.call(localMeta, o)) mergedMeta[o] = localMeta[o]; });   // dirty 原廠的 meta 也保留本機（跟 cost 同一個 doc、同步時一起 read-merge-write）
            if (JSON.stringify(localMeta) !== JSON.stringify(mergedMeta)) {
              Store._profitMem['ec_momo_cost_by_origin_meta'] = mergedMeta;
              try { localStorage.setItem('ec_momo_cost_by_origin_meta', JSON.stringify(mergedMeta)); } catch (e) {}
              try { if (Store._mem) Store._mem['ec_momo_cost_by_origin_meta'] = mergedMeta; } catch (e) {}
              changed = true;
            }
          }
          if (changed) { console.log('[momo_cost_by_origin] 收到更新'); window.dispatchEvent(new CustomEvent('momoCostByOriginReady')); }
        }, err => { console.error('[momo_cost_by_origin subscribe 失敗]', err); });
      } catch (e) { console.warn('momo_cost_by_origin subscribe failed', e); }
    };

    // ══ 蝦皮組成員②：aff_rpt（好麻吉聯盟行銷分頁）。由 __loadShopeeSubs 呼叫。══
    const __subAff = () => {
      // aff_rpt collection（每通路一 doc）→ Store._profitMem['ec_aff_rpt|<shop>']。
      //   為什麼懶載而不是開站就訂：聯盟行銷分頁位在「淨利表 → 好麻吉賣場」內，使用者一定要先進淨利表才看得到，
      //   180KB 的 doc 不該在開站瞬間跟首頁搶頻寬。
      //   ⚠ 下面讀的 window._affJustSaved 是由 js/profit.js 的 affRptLsSave 設定的（塊 2 才會加）。
      //     在塊 2 落地之前這個守衛恆為 falsy＝永遠不跳過，這是分塊施工的中間狀態，不是漏寫。
      AFF_SHOPS.forEach(shop => {
        const k = 'ec_aff_rpt|' + shop;
        try {
          onSnapshot(affDocRef(shop), snap => {
            const data = (snap && snap.exists && snap.exists()) ? (snap.data() || null) : null; if (!data) return;
            if (window._affJustSaved && (Date.now() - window._affJustSaved < 5000)) return;   // 剛本機存過 → 不被自己寫的 echo 繞一圈回來蓋掉畫面
            if (JSON.stringify(Store._profitMem[k]) === JSON.stringify(data)) return;         // 內容沒變就不寫、不 dispatch，避免無謂重繪
            Store._profitMem[k] = data;
            console.log('[aff_rpt] 收到更新：', shop);
            window.dispatchEvent(new CustomEvent('affRptReady', { detail: { shop } }));
          }, err => { console.error('[aff_rpt subscribe 失敗]', shop, err); });
        } catch (e) { console.warn('aff_rpt subscribe failed', shop, e); }
      });
    };

    // ══ 蝦皮組：profits collection + aff_rpt（個別蝦皮賣場淨利表 / 聯盟行銷分頁；蝦皮總表只吃 boot 的 _summary_v1、不需這組）══
    window.__loadShopeeSubs = () => {
      if (window.__loadedSubGroups.has('shopee')) return;
      window.__loadedSubGroups.add('shopee');
      console.log('[profit] 載入蝦皮組（profits collection + aff_rpt）');
      __subProfits();
      __subAff();
      __markSubsMaybeAllLoaded();
    };

    // 相容 shim：舊碼/除錯若呼叫 __loadHeavyProfitSubs → 一次載滿四組（＝還原成 ~10MB，正常流程不該再走這條；保留只為相容）。
    window.__loadHeavyProfitSubs = () => { window.__loadShopeeSubs(); window.__loadArchiveSubs(); window.__loadMomoSubs(); window.__loadCoupangSubs(); };
  } catch (e) { console.warn('profit subscribe failed', e); }

  // setReport 立刻建好（寫入用），讀取（getDoc / onSnapshot）才延後
  try {
    const toDocId = k => k.replace(/\//g, '__');
    const fromDocId = id => id.replace(/__/g, '/');
    // 全部報表的目錄（key → ts）：REST 投影查詢，只拿 ts，不載報表內容（111 份約 4 萬字元）。
    //   ts 不是數字（filemeta 等）回 null。查詢失敗一律丟錯：呼叫端不能把「讀不到」當成「雲端沒有」。
    const profitsTsIndex = async () => {
      const url = 'https://firestore.googleapis.com/v1/projects/' + firebaseConfig.projectId
        + '/databases/(default)/documents:runQuery?key=' + firebaseConfig.apiKey;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'profits' }], select: { fields: [{ fieldPath: 'ts' }] } } })
      });
      if (!resp.ok) throw new Error('報表目錄讀取失敗：' + resp.status);
      const rows = await resp.json();
      const out = {};
      rows.forEach(r => {
        if (!r || !r.document) return;
        const id = decodeURIComponent(String(r.document.name).split('/').pop());
        const v = r.document.fields && r.document.fields.ts;
        const ts = v && (v.integerValue !== undefined ? Number(v.integerValue) : v.doubleValue);
        out[fromDocId(id)] = typeof ts === 'number' && !isNaN(ts) ? ts : null;
      });
      return out;
    };
    window.__cloudProfitCol = {
      // 最後一道網：頂層非物件（陣列 / null / 損毀）→ 不 throw、不寫，回 reject 讓上層收進 failed 浮上來
      setReport: (key, value) => {
        if (value === null || typeof value !== 'object' || Array.isArray(value)) {
          console.warn('[setReport] 非物件 payload，拒絕寫入：', key);
          return Promise.reject(new Error('payload 不是物件（陣列或損毀資料），已拒絕上雲'));
        }
        return setDoc(doc(db, 'profits', toDocId(key)), value);
      },
      // 刪除單份報表 doc（淨利表「🗑 清除重傳」用）。
      // ⚠ doc id 轉換必須跟 setReport 共用同一個 toDocId：自己另寫一份遲早分岔，
      //   而 deleteDoc 刪一份不存在的 doc 是【靜默成功、不報錯】的 —— 轉換一錯就變成
      //   「畫面說清掉了、雲端那份還在」，正好是這次要修的 bug 本身。
      // ⚠ 命名刻意用 remove* 前綴（對稱 __cloudTaskImage.removeImage / __cloudStore.removeFields）。
      //   【絕對不能】叫 getDoc / subscribe —— 那兩個名字在本機測試防護碼的讀取白名單(READ_OK)裡會被
      //   自動放行，本機一按「清除重傳」就會真的刪掉公司正式 Firestore 的報表。remove* 不在白名單
      //   → 會被換成 no-op，本機測試安全。
      removeReport: (key) => deleteDoc(doc(db, 'profits', toDocId(key))),
      // ── 舊月份按需讀取（#428 方案 A 第 2 塊）──
      //   🔴 兩個名字都必須在讀取白名單（READ_OK：getDoc / subscribe / getDocForShop / subscribeShop / forKey）內，
      //     本機防護與唯讀守衛才會放行；換成其他名字會被換成 no-op，呼叫端會把「沒讀」當成「沒有資料」。
      //   🔴 一律讀伺服器（FromServer）：這個專案沒開 persistence，離線時一般讀法可能回空快取，會被誤判成「雲端沒有」。
      //     讀不到就丟錯，由呼叫端顯示失敗，不回空結果。
      // 讀一份報表，回 Firestore 的 DocumentSnapshot（同其他 __cloud*.getDoc）。
      getDoc: (key) => getDocFromServer(doc(db, 'profits', toDocId(key))),
      // 讀一個通路的一段月份，回 { 報表 key: 資料 }。opts：
      //   from／to：'YYYY/MM'，都含；沒給 from＝這個通路全部，沒給 to＝不封頂。
      //   prefix：key 第一段，預設 'ec'；測試通路用 'ectest'（它的期別是日期，不看 from／to）。
      //   tsOnly：true＝全部報表的目錄（見 profitsTsIndex），shop 傳 null。
      //   ⚠ 上限用 \uf8ff，不能用 ~：通路名是中文，排序在 ~ 之後，'ectest|～ectest|~' 會查到 0 份。
      getDocForShop: async (shop, opts) => {
        const o = opts || {};
        if (o.tsOnly) return profitsTsIndex();
        if (!shop) throw new Error('getDocForShop：缺通路');
        const badMonth = m => m !== undefined && !/^\d{4}\/\d{2}$/.test(m);
        if (badMonth(o.from) || badMonth(o.to)) throw new Error('getDocForShop：月份格式不對');
        const head = (o.prefix || 'ec') + '|' + shop + '|';
        const lower = o.from ? head + toDocId(o.from) : head;
        const upper = (o.to ? head + toDocId(o.to) : head) + '\uf8ff';
        const snap = await getDocsFromServer(query(collection(db, 'profits'), where(documentId(), '>=', lower), where(documentId(), '<', upper)));
        const out = {};
        snap.forEach(d => { out[fromDocId(d.id)] = d.data(); });
        return out;
      },
    };
  } catch {}

  // ============== MOMO 商品主檔：每賣場一個獨立 doc（momo_products collection） ==============
  // 為什麼獨立 collection：商品主檔一個賣場就 500KB+，塞 app/profit 欄位會撞 1MB 上限（甲配 1300 筆推不進去）；
  //   每賣場一 doc 各自 1MB 額度，也把「整包 last-write-wins」的覆蓋範圍縮小到單一賣場。
  // doc id 用 ASCII 代號（中文/+ 在 URL/REST/Console 難查）；doc 內存 { shop:'甲配', items:[...] }（保留原名、反查用）。
  // payload 包 {items}：Firestore 一份 doc 是 map、不能頂層存陣列（同 setReport 對陣列 reject 的原因）。
  const MOMO_SHOP_DOCID = { '甲配':'jia', '乙配':'yi', 'MO+麻吉':'mo_maji', 'MO+森之旅':'mo_senzhilu', 'MO+玩樂':'mo_wanle' };
  const MOMO_DOCID_SHOP = Object.fromEntries(Object.entries(MOMO_SHOP_DOCID).map(([k,v]) => [v, k]));   // 反查 fallback
  const momoProductsColRef = collection(db, 'momo_products');
  window.__cloudMomo = {
    // 讀取方法命名成 getDoc/subscribe → 落在本機測試防護的讀取白名單(READ_OK)、自動放行（不可改名，否則會被誤 no-op）
    getDoc:    (shop) => getDoc(doc(db, 'momo_products', MOMO_SHOP_DOCID[shop] || shop)),
    setShop:   (shop, items) => setDoc(doc(db, 'momo_products', MOMO_SHOP_DOCID[shop] || shop), { shop, items: items || [], updatedAt: serverTimestamp() }),   // setDoc：整包取代；updatedAt 供推送前版本比對（【2】）
    subscribe: (cb) => onSnapshot(momoProductsColRef, cb),
  };

  // ============== MOMO 月對帳 momo_reconcile（每 shop 每月一 doc，不塞 momo_products） ==============
  // 對帳單=營收/費用權威來源。doc id = shopDocId + '_' + 'YYYY-MM'（例 jia_2026-06），每份 75KB 遠低 1MB。
  // getDoc/subscribe 命名落防護讀取白名單、自動放行；setMonth 是唯一寫入方法（整包取代，last-write-wins）。
  const momoReconcileColRef = collection(db, 'momo_reconcile');
  const momoReconDocId = (shop, month) => (MOMO_SHOP_DOCID[shop] || shop) + '_' + month;
  window.__cloudReconcile = {
    getDoc:    (shop, month) => getDoc(doc(db, 'momo_reconcile', momoReconDocId(shop, month))),
    setMonth:  (shop, month, data) => setDoc(doc(db, 'momo_reconcile', momoReconDocId(shop, month)), data || {}),
    subscribe: (cb) => onSnapshot(momoReconcileColRef, cb),
  };

  // ============== MOMO S1103 銷售排行榜 momo_s1103（每「期別」一 doc，帳號級） ==============
  // 為什麼獨立 collection：S1103 是逐 SKU 的月報表（數百筆 × 多欄），塞 app/profit 欄位會讓該 doc 的「索引項目」暴增，
  //   撞 Firestore 單文件 40000 索引項硬上限（跟 1MB 大小是兩個不同限制）→ 寫入報 too many index entries。搬出來各期別各自一 doc、額度獨立。
  // doc id = 期別字串（2026-07-FULL / 2026-01-H1…，只含數字與 '-'，可直接當 doc id）。getDoc/subscribe 命名落防護讀取白名單；setPeriod 唯一寫入（整包取代）。
  const momoS1103ColRef = collection(db, 'momo_s1103');
  window.__cloudS1103 = {
    getDoc:    (period) => getDoc(doc(db, 'momo_s1103', period)),
    setPeriod: (period, data) => setDoc(doc(db, 'momo_s1103', period), data || {}),
    subscribe: (cb) => onSnapshot(momoS1103ColRef, cb),
  };

  // ============== MOMO 自家庫存 momo_stock（帳號級單一快照 doc） ==============
  // 為什麼獨立 collection：庫存是 6500+ 原廠編號的 map，塞 app/profit 欄位會逐 key 建索引、
  //   撞 app/profit 的 40000 索引項上限（S1103 同款理由）。單一 doc 從 0 起算、額度獨立、日後不用再搬。
  // 值＝ { uploadedAt, byOrigin:{origin:qty} }（整包快照取代）。getDoc/subscribe 命名落防護讀取白名單；setSnapshot 唯一寫入。
  const momoStockColRef = collection(db, 'momo_stock');
  const MOMO_STOCK_DOCID = 'current';
  window.__cloudStock = {
    getDoc:      () => getDoc(doc(db, 'momo_stock', MOMO_STOCK_DOCID)),
    setSnapshot: (obj) => setDoc(doc(db, 'momo_stock', MOMO_STOCK_DOCID), obj || {}),
    subscribe:   (cb) => onSnapshot(momoStockColRef, cb),
  };

  // ============== MO+ 逐列成本 momo_moplus_origins（每賣場每來源月一 doc） ==============
  // 為什麼獨立 collection：per(SKU,期別,原廠編號) 的 qty 是持續成長維度（原廠編號隨商品增、期別只增不減），
  //   塞進 momo_products 的 cell 會把成長維度綁進 1MB 硬上限容器。分片到「來源月」→ 重上傳整 doc 覆蓋(天然冪等、
  //   momo 補發修正版列數變少也不留幽靈列)、單 doc 只裝一個月大小有界、成長靠增加 doc 數。比照 momo_reconcile 分片。
  // doc id = shopDocId + '_' + srcCode（例 mo_maji_2606）；doc 內 { shop, src, skus:{sku:{period:{o:{origin:qty},d,c}}}, freight:{period:{b,rows}} }。
  // getDoc/subscribe 命名落防護讀取白名單；setSrc 唯一寫入（整包取代）。
  const momoMoPlusOriginsColRef = collection(db, 'momo_moplus_origins');
  const momoMoPlusOriginsDocId = (shop, src) => (MOMO_SHOP_DOCID[shop] || shop) + '_' + src;
  window.__cloudMoPlusOrigins = {
    getDoc:  (shop, src) => getDoc(doc(db, 'momo_moplus_origins', momoMoPlusOriginsDocId(shop, src))),
    setSrc:  (shop, src, data) => { const { updatedAt: _drop, ...clean } = (data || {}); return setDoc(doc(db, 'momo_moplus_origins', momoMoPlusOriginsDocId(shop, src)), { ...clean, updatedAt: serverTimestamp() }); },   // updatedAt 供推送前版本比對（比照 momo_products）；剝掉來源舊 updatedAt、寫入伺服器時間戳
    subscribe: (cb) => onSnapshot(momoMoPlusOriginsColRef, cb),
  };

  // ============== MO+ E001 未結算銷量 momo_e001（每賣場每來源月一 doc） ==============
  // 為什麼獨立 collection：E001 是「每週更新的未結算銷量估算值」，某期別一旦有對帳明細就整段被結算取代、不再顯示。
  //   分片到「來源月」＝重上傳同一份檔案整 doc 覆蓋(天然冪等、不累加)、單 doc 只裝一個月大小有界。比照 momo_moplus_origins 分片。
  //   doc id = shopDocId + '_' + srcCode（例 mo_maji_2608）；doc 內 { shop, src, bySku, bySkuRev, skuOrigin, byPeriodSold, ... }。
  //   getDoc/subscribe 命名落防護讀取白名單；setSrc 唯一寫入（整包取代）。
  const momoE001ColRef = collection(db, 'momo_e001');
  const momoE001DocId = (shop, src) => (MOMO_SHOP_DOCID[shop] || shop) + '_' + src;
  window.__cloudE001 = {
    getDoc:  (shop, src) => getDoc(doc(db, 'momo_e001', momoE001DocId(shop, src))),
    setSrc:  (shop, src, data) => setDoc(doc(db, 'momo_e001', momoE001DocId(shop, src)), data || {}),
    subscribe: (cb) => onSnapshot(momoE001ColRef, cb),
  };

  // ============== 成本對照表 momo_cost_by_origin（帳號級單一 doc；原廠編號→成本 + meta 人工旗標/異動紀錄） ==============
  //   為什麼上雲：MO+ 毛利＝逐原廠 live 查此表；原本 local-only 導致同事開 MO+ 整片缺成本、換裝置亦然。~88KB 遠低 1MB。
  //   多人共編：呼叫端做 read-merge-write（讀雲端→只覆蓋本機 dirty 的原廠編號→寫回），避免整包覆蓋蓋掉同事剛補的成本。
  const costByOriginDocRef = doc(db, 'momo_cost_by_origin', 'account');
  window.__cloudCostByOrigin = {
    getDoc: () => getDoc(costByOriginDocRef),
    set:    (data) => setDoc(costByOriginDocRef, data || {}),
    subscribe: (cb) => onSnapshot(costByOriginDocRef, cb),
  };

  // ============== 聯盟行銷報表 aff_rpt（每通路一 doc；doc id = 通路名） ==============
  //   為什麼搬出 app/profit：`ec_aff_rpt|好麻吉` 這**單一欄位**就佔約 180KB（662 個商品），
  //   而 app/profit 已經 ~758KB / 上限 1MB 且只增不減。搬走它等於一次還回約四分之一額度。
  //   為什麼不照抄上面 __cloudCostByOrigin 的 dirty 追蹤 + 逐 key merge：那套是為了
  //   「6683 筆成本、多人各自補不同的原廠編號、不能互相覆蓋」而設計的。聯盟行銷三點都相反——
  //     (1) 整份重生：每次都是重跑兩份報表檔算出全新的 products 陣列，沒有「只改其中一列」的入口；
  //     (2) 單一寫入者：一個賣場、一顆專屬同步鈕，不存在兩人各改一列再合併的情境；
  //     (3) products 是**陣列**不是 map，momoMergeByKey 走 Object.assign 逐 key 覆蓋，套上去會壞掉。
  //   所以這裡用整包 setDoc 取代（重傳天然冪等、不留幽靈列），形狀比照 __cloudS1103 / __cloudMoPlusOrigins。
  //   doc 內容 = affRptLsSave 存進 localStorage 的那包原文 {products, totalSales, totalCost, ts}，
  //   刻意不另外包 wrapper：寫入端與訂閱端兩邊對稱，將來要比對本機/雲端差異可以直接 JSON.stringify 比；
  //   payload 自帶 ts（Date.now()）所以也不缺時間戳，不必再加 updatedAt。
  // 命名注意：讀取方法一定要叫 getDoc / subscribe。本機防護碼工具的讀取白名單是完全字串比對
  //   （同 __cloudTaskImage 下方那條註解），寫入/刪除**絕對不能**用這兩個名字，
  //   否則會被當成讀取放行、本機測試時直接寫進公司正式庫。
  const AFF_SHOPS = ['好麻吉'];   // 目前只有好麻吉有聯盟行銷分頁（js/profit.js 以 shop==='好麻吉' 硬閘住 UI）。將來加通路只要在這裡加一個字串，doc ref 與訂閱都會自動涵蓋，不會發生「加了 ref 卻忘了加訂閱」。
  const affDocRef = (shop) => doc(db, 'aff_rpt', shop);   // doc id 直接用通路名；中文 doc id 本專案已有前例（app/insight_好麻吉、profits/ec|好麻吉|2026-07|H1）
  window.__cloudAff = {
    getDoc:    (shop) => getDoc(affDocRef(shop)),
    subscribe: (shop, cb) => onSnapshot(affDocRef(shop), cb),
    set:       (shop, data) => setDoc(affDocRef(shop), data || {}),   // 整包取代：資料整份重生，不做 merge（理由見上）
    removeDoc: (shop) => deleteDoc(affDocRef(shop)),                  // 「🗑 清除」要連雲端一起刪，否則只清本機、雲端殘留
  };

  // ============== 洞察表獨立文件 app/insight（避免 app/main 撞 1MB 上限） ==============
  // 洞察表的 ec.insight_{shop}_master 資料量會隨著商品累積變大，
  // 加上 users / departments / platforms 等擠在 app/main 會很快撞 1MB 上限。
  // → 把 ec.insight_* 全部挪到 app/insight 獨立文件。
  const insightDocRef = doc(db, 'app', 'insight');
  const INSIGHT_REST_BASE = 'https://firestore.googleapis.com/v1/projects/' + firebaseConfig.projectId
    + '/databases/(default)/documents/app/insight';
  const restDeleteInsightFields = async (keys) => {
    const params = keys.map(k => 'updateMask.fieldPaths=' + encodeURIComponent('`' + k + '`')).join('&');
    const url = INSIGHT_REST_BASE + '?' + params;
    const resp = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{"fields":{}}' });
    if (!resp.ok) throw new Error('REST delete failed: ' + resp.status);
    return resp.json();
  };
  window.__cloudInsight = {
    getDoc: () => getDoc(insightDocRef),
    setField: (key, value) => safeSetField(insightDocRef, key, value),
    removeField: (key) => restDeleteInsightFields([key]),
    removeFields: (keys) => restDeleteInsightFields(keys),
    subscribe: (cb) => onSnapshot(insightDocRef, snap => cb(snap.exists() ? snap.data() : {})),
  };

  // ============== 洞察表 per-shop 拆分（避免 app/insight 撞 1MB 上限） ==============
  // 進化：從 app/insight 一個 doc 裡塞四個賣場 → 每個賣場一個 doc，
  //   app/insight_好麻吉 / app/insight_玩樂 / app/insight_森之旅 / app/insight_維克
  //   每個賣場獨立 1 MiB 額度 = 總空間 4 倍。
  //
  // Key 路由：ec.insight_{shop}_{type} → 對應 shop 的 doc
  //   例：ec.insight_好麻吉_master → app/insight_好麻吉 doc 內的 ec.insight_好麻吉_master field
  const INSIGHT_SHOPS = ['好麻吉', '玩樂', '森之旅', '維克'];
  const insightShopRefs = {};
  INSIGHT_SHOPS.forEach(s => { insightShopRefs[s] = doc(db, 'app', 'insight_' + s); });
  // 從 key 抽出 shop 名稱：ec.insight_{shop}_{master|weeks|notes|perf}
  const insightShopFromKey = (key) => {
    const m = /^ec\.insight_(.+?)_(master|weeks|notes|perf)$/.exec(key || '');
    return m ? m[1] : null;
  };
  // ⚠ 帶點的字面欄位名（例：ec.insight_玩樂_notes）用 setDoc({[k]:v},{merge:true})
  //   時 SDK 會靜默不覆蓋（Firestore v10 對這種 dotted key 的行為異常）。改用
  //   updateDoc + new FieldPath(k)：FieldPath 用單一參數建構會把整個字串視為
  //   「一個 segment（字面欄位名）」，dots 不會被拆成 nested path。
  //   updateDoc 需要 doc 存在；不存在時 fallback 用 setDoc 建立初始 doc。
  const perShopSetField = async (shop, k, v) => {
    const ref = insightShopRefs[shop];
    if (!ref) throw new Error('unknown shop: ' + shop);
    try {
      await updateDoc(ref, new FieldPath(k), v);
    } catch (e) {
      if (e && (e.code === 'not-found' || String(e).includes('No document to update'))) {
        // 賣場 doc 還沒建立過 → 用 setDoc 建立初始 doc
        //   注意：初始建立時 setDoc({[k]:v}) 對 dotted key 也有雷，因此改用 REST。
        //   實務上：Kelly 的四個 per-shop doc 都已經存在，不會走這條 fallback。
        await setDoc(ref, {}); // 先建空 doc
        await updateDoc(ref, new FieldPath(k), v); // 再用 updateDoc 塞值
      } else {
        throw e;
      }
    }
  };

  window.__cloudInsightByShop = {
    shops: INSIGHT_SHOPS,
    forKey: (key) => {
      const shop = insightShopFromKey(key);
      if (!shop || !insightShopRefs[shop]) return null;
      return {
        setField: (k, v) => perShopSetField(shop, k, v),
      };
    },
    getDocForShop: (shop) => insightShopRefs[shop] ? getDoc(insightShopRefs[shop]) : Promise.resolve({ exists: () => false, data: () => ({}) }),
    subscribeShop: (shop, cb) => {
      if (!insightShopRefs[shop]) return () => {};
      return onSnapshot(insightShopRefs[shop], snap => cb(snap.exists() ? snap.data() : {}));
    },
    // ── #269 第 2 塊：洞察表調整紀錄「逐商品交易寫入」（目前尚無呼叫端）──
    // runTransaction 讀 app/insight_{shop} 的 [ec.insight_{shop}_notes][code] → applyFn(目前內容) 算出
    //   { entry, missing, changed, already? } → 只寫回這一個商品（FieldPath 兩段：notesKey 含點，必須是單一段）。
    //   applyFn 由呼叫端傳（第 3 塊傳 (e) => _insNoteApplyOp(e, op)），本檔不依賴 marketing.js。
    // 回傳 { ok, missing, changed, already, entry, error, unknown }：
    //   ok:true  = 雲端已是期望狀態（寫入成功 / 不需要改 / already 已寫過）
    //   missing  = 要改或刪的那一筆找不到 → ok:false、不寫（可能是別人改過，也可能是自己上一輪 commit 已成功）
    //   unknown  = 逾時或網路錯誤：寫入可能已經成功、也可能沒有 → 提示不可寫成「沒有儲存」
    //   error    = 'bad-shop' | 'bad-code' | 'bad-applyFn' | 'doc-missing' | 'notes-not-map' | 'apply-error'
    //              | 'apply-bad-result' | 'invalid-value' | 'timeout' | 'tx-error:{code}'
    // ⚠ 被唯讀角色防護（app.js __installReadonlyCloudGuard）或本機測試防護擋下時會回 undefined，
    //   呼叫端一律用 r && r.ok 判斷，不可寫 r.ok。
    // ⚠ applyFn 在交易衝突時會被重跑（SDK 預設最多 5 輪），必須是純函式；結果一律取最後一輪。
    // ⚠ 文件不存在就回 doc-missing、不自己建（四份 per-shop doc 都已存在；建文件走 setDoc 帶點 key 有雷，見 perShopSetField）。
    updateNoteTx: async (shop, code, applyFn) => {
      const result = (o) => Object.assign({ ok: false, missing: false, changed: false, already: false, entry: null, error: null, unknown: false }, o);
      if (INSIGHT_SHOPS.indexOf(shop) < 0 || !insightShopRefs[shop]) return result({ error: 'bad-shop' });
      if (typeof code !== 'string' || !code) return result({ error: 'bad-code' });
      if (typeof applyFn !== 'function') return result({ error: 'bad-applyFn' });
      const ref = insightShopRefs[shop];
      const notesKey = 'ec.insight_' + shop + '_notes';
      // Firestore 存不了 undefined / 函式（getFirestore 沒開 ignoreUndefinedProperties）→ 寫前先擋，回清楚的錯誤
      const storable = (v) => {
        if (v === undefined || typeof v === 'function' || typeof v === 'symbol') return false;
        if (Array.isArray(v)) return v.every(storable);
        if (v && typeof v === 'object') return Object.keys(v).every(k => storable(v[k]));
        return true;
      };
      const TIMEOUT_MS = 15000;
      const ABORT_MSG = 'updateNoteTx: 已逾時，不再重跑';
      let aborted = false;
      const work = runTransaction(db, async (tx) => {
        // 逾時後的下一輪：丟非 FirebaseError → SDK 不重試（transaction_runner 的 isRetryableTransactionError）
        if (aborted) throw new Error(ABORT_MSG);
        const snap = await tx.get(ref);
        if (!snap.exists()) return result({ error: 'doc-missing' });
        const notes = snap.get(new FieldPath(notesKey));
        if (notes !== undefined && (!notes || typeof notes !== 'object' || Array.isArray(notes))) {
          return result({ error: 'notes-not-map' });
        }
        const cur = snap.get(new FieldPath(notesKey, code));
        if (aborted) throw new Error(ABORT_MSG);
        let r;
        try { r = applyFn(cur); }
        catch (e) { console.warn('[updateNoteTx] applyFn 丟錯', e); return result({ error: 'apply-error' }); }
        if (!r || typeof r !== 'object') return result({ error: 'apply-bad-result' });
        const out = {
          missing: !!r.missing, changed: !!r.changed, already: !!r.already,
          entry: r.entry === undefined ? null : r.entry,
        };
        if (out.missing) return result(out);
        if (!out.changed) return result(Object.assign(out, { ok: true }));   // 沒改到 / already → 不寫
        if (out.entry !== null && !storable(out.entry)) return result(Object.assign(out, { error: 'invalid-value' }));
        tx.update(ref, new FieldPath(notesKey, code), out.entry === null ? deleteField() : out.entry);
        return result(Object.assign(out, { ok: true }));
      }).catch(e => {
        if (e && e.message === ABORT_MSG) return result({ error: 'timeout', unknown: true });
        console.warn('[updateNoteTx] 交易失敗', e);
        // 網路類錯誤（SDK 視為非永久性）可能發生在 commit 已送出之後 → 標 unknown
        const code2 = (e && e.code) || 'unknown';
        const transient = ['unavailable', 'deadline-exceeded', 'unknown', 'cancelled', 'internal', 'resource-exhausted', 'unauthenticated'];
        return result({ error: 'tx-error:' + code2, unknown: transient.indexOf(code2) >= 0 });
      });
      let timer = null;
      const timeout = new Promise(res => {
        timer = setTimeout(() => { aborted = true; res(result({ error: 'timeout', unknown: true })); }, TIMEOUT_MS);
      });
      try { return await Promise.race([work, timeout]); }
      finally { clearTimeout(timer); }
    },
  };

  // ============== 任務附圖獨立 collection task_images（避免 app/main 撞 1MB 上限） ==============
  // 一張圖一個 doc（task_images/{imgId}）。base64 截圖動輒數百 KB，
  // 塞進 app/main 會直接撐爆 1MB，連帶 users / departments / platforms 全部寫不進去。
  // doc 內容：{ taskId, data(base64), mime, bytes, createdAt, createdBy }
  //   taskId 是反向索引，將來要清查沒有任務指向的孤兒圖片時用得到。
  // 命名注意：讀取方法一定要叫 getDoc。本機防護碼工具的讀取白名單是完全字串比對，
  //   改叫 getImage 之類會被當成寫入換成 no-op，本機測試時圖片讀不出來而且不會報錯。
  window.__cloudTaskImage = {
    getDoc:      (imgId) => getDoc(doc(db, 'task_images', imgId)),
    setImage:    (imgId, data) => setDoc(doc(db, 'task_images', imgId), data || {}),
    removeImage: (imgId) => deleteDoc(doc(db, 'task_images', imgId)),
  };

  // ============== 問題追蹤 collection issues（一筆問題一份 doc，不擠 app/main 的 1MB） ==============
  // doc 內容：{ id, title, area, priority, desc, status, resolution, createdAt, createdBy,
  //             updatedAt, updatedBy, resolvedAt, resolvedBy, deleted }
  // 命名注意：讀取方法只能叫 subscribe / getDoc（防護碼讀取白名單是完全字串比對）；寫入只有 create / update。
  //   沒有真刪：刪除＝update({ deleted:true })。update 只送有變的欄位（updateDoc），兩人同時改不同欄位不互蓋。
  //   寫入成功回 { ok:true }；被唯讀守衛 / 本機防護換成 no-op 時回 undefined → 呼叫端一律 r && r.ok。
  window.__cloudIssues = {
    subscribe: (cb, onErr) => onSnapshot(collection(db, 'issues'), cb, onErr),
    getDoc:    (id) => getDoc(doc(db, 'issues', id)),
    create:    (id, data) => setDoc(doc(db, 'issues', id), data || {}).then(() => ({ ok: true })),
    update:    (id, fields) => updateDoc(doc(db, 'issues', id), fields || {}).then(() => ({ ok: true })),
  };

  // ============== 問題照片 collection issue_images（一張圖一份 doc） ==============
  // 為什麼不放 task_images：老闆任務的 __taskImageAudit 把 task_images 裡「不在 ec.bossTasks[].images」的圖都算孤兒，
  //   問題照片放進去會被 __taskImageCleanup 整批刪掉；分開放，老闆任務那組完全不用改。
  // doc 內容：{ issueId, data(base64 dataURL), mime, bytes, createdAt, createdBy }；issueId 是反向索引（之後時間軸放紀錄所屬的問題 id）。
  // 命名注意：讀取只能叫 getDoc（防護碼讀取白名單完全字串比對）；寫入 setImage / removeImage 成功回 { ok:true }，
  //   被唯讀守衛 / 本機防護換成 no-op 時回 undefined → 呼叫端一律 r && r.ok。
  window.__cloudIssueImage = {
    getDoc:      (imgId) => getDoc(doc(db, 'issue_images', imgId)),
    setImage:    (imgId, data) => setDoc(doc(db, 'issue_images', imgId), data || {}).then(() => ({ ok: true })),
    removeImage: (imgId) => deleteDoc(doc(db, 'issue_images', imgId)).then(() => ({ ok: true })),
  };

  // ============== 問題後續處理紀錄 collection issue_notes（一則一份 doc） ==============
  // 為什麼不放在問題文件的陣列裡：陣列元素不能單獨軟刪除（只能整個陣列重寫）、每則帶縮圖會讓問題文件逼近 1MB、
  //   每加一則就把整份問題文件重送給所有人；一則一份 doc 這三個問題都沒有，兩人同時寫也各寫各的。
  // doc 內容：{ id, issueId, text, images:[圖片 id…], thumbs:{ id: 小縮圖 }, createdAt, createdBy, deleted, deletedAt?, deletedBy? }
  //   照片存 issue_images（__cloudIssueImage），照片文件多帶 noteId。
  // 命名注意：讀取只能叫 subscribe / getDoc（防護碼讀取白名單完全字串比對）；寫入 create / update 成功回 { ok:true }，
  //   被唯讀守衛 / 本機防護換成 no-op 時回 undefined → 呼叫端一律 r && r.ok。刪除＝update({ deleted:true })，沒有真刪。
  window.__cloudIssueNotes = {
    subscribe: (cb, onErr) => onSnapshot(collection(db, 'issue_notes'), cb, onErr),
    getDoc:    (id) => getDoc(doc(db, 'issue_notes', id)),
    create:    (id, data) => setDoc(doc(db, 'issue_notes', id), data || {}).then(() => ({ ok: true })),
    update:    (id, fields) => updateDoc(doc(db, 'issue_notes', id), fields || {}).then(() => ({ ok: true })),
  };

  // ============== 酷澎重建 PR-2 ── 報表 coupang_reports（每賣場每月一 doc，比照 momo_reconcile）＋ 退貨 coupang_msf（每份 MSF 一 doc，比照 momo_e001） ==============
  //   ⚠ 內部賣場 key 用 '麻吉'/'露營館'（顯示名 '好麻吉'/'露營館' 由 cupShopDisplay 處理，PR-3）；doc id 用 maji/luying，與 MOMO 的 mo_maji 天然不同命名空間 → 跨平台可分。
  //   report doc id = shopDocId + '_' + 'YYYY-MM'（例 maji_2026-07）；doc 內 { shop, month, skus:{code:{qty,rev,cost,...費用}}, orderNos:[訂單編號…], updatedAt }。
  //     orderNos 存本月全部訂單編號（Option A：退貨 MSF.訂單編號→下單月 讀取端解析用；跟報表同生共死、不留孤兒索引；~15KB/月/賣場、A1 每月一 doc 有界）。
  //   msf doc id = shopDocId + '_' + msfSrc；doc 內 { shop, src, byOrder:{oid:{returnAmt,confirmDate,hasDeliveryFee}}, returnTotal }。
  //   getDoc/subscribe 命名【必須】保留（落本機防護讀取白名單、自動放行）；setReport/setSrc 唯一寫入。report 帶 updatedAt serverTimestamp 供推送前版本比對（比照 momo_products/origins）；msf 整包取代冪等（重傳同檔覆蓋、不累加，比照 s1103）。
  //   ⚠ 各同步枚舉點要處理【三個】key 前綴：ec_coupang|（報表）＋ ec_coupang_msf|（退貨）＋ ec_coupang_note|（備註，PR-4b 從報表拆出）。本機測試防護掃到的雲端物件數為 17（其後加 __cloudKpi 變 18，見下方 app/kpi 段）。
  const COUPANG_SHOP_DOCID = { '麻吉':'maji', '露營館':'luying' };
  const COUPANG_DOCID_SHOP = Object.fromEntries(Object.entries(COUPANG_SHOP_DOCID).map(([k,v]) => [v, k]));   // 反查 docId 前綴→賣場（setReport/setSrc 存的 doc 沒有 shop 欄，onSnapshot 靠這個還原 key）
  const coupangReportsColRef = collection(db, 'coupang_reports');
  const coupangReportDocId = (shop, month) => (COUPANG_SHOP_DOCID[shop] || shop) + '_' + month;
  window.__cloudCoupang = {
    getDoc:    (shop, month) => getDoc(doc(db, 'coupang_reports', coupangReportDocId(shop, month))),
    setReport: (shop, month, data) => { const { updatedAt:_drop, ...clean } = (data || {}); return setDoc(doc(db, 'coupang_reports', coupangReportDocId(shop, month)), { ...clean, updatedAt: serverTimestamp() }); },
    subscribe: (cb) => onSnapshot(coupangReportsColRef, cb),
  };
  const coupangMsfColRef = collection(db, 'coupang_msf');
  const coupangMsfDocId = (shop, src) => (COUPANG_SHOP_DOCID[shop] || shop) + '_' + src;
  window.__cloudCoupangMsf = {
    getDoc: (shop, src) => getDoc(doc(db, 'coupang_msf', coupangMsfDocId(shop, src))),
    setSrc: (shop, src, data) => setDoc(doc(db, 'coupang_msf', coupangMsfDocId(shop, src)), data || {}),
    subscribe: (cb) => onSnapshot(coupangMsfColRef, cb),
  };
  // PR-4b：coupang_note collection（每賣場每月一 doc）→ note 從報表 doc 拆出（不再折進報表、不再進 app/profit）。
  //   doc id = shopDocId + '_' + 'YYYY-MM'；doc 內 { SKU原廠編號: note字串 }（＋ subscribe 還原 key 靠 docId 前綴反查，同 report）。
  //   走 dirty-scoped merge（syncCupNoteMerge 逐 SKU、只覆蓋改過的、不刪同事的）→ setNote 寫的是 merge 後整份、無 updatedAt（比照 msf、移出 delete guard）。
  const coupangNoteColRef = collection(db, 'coupang_note');
  const coupangNoteDocId = (shop, month) => (COUPANG_SHOP_DOCID[shop] || shop) + '_' + month;
  window.__cloudCoupangNote = {
    getDoc:  (shop, month) => getDoc(doc(db, 'coupang_note', coupangNoteDocId(shop, month))),
    setNote: (shop, month, data) => setDoc(doc(db, 'coupang_note', coupangNoteDocId(shop, month)), data || {}),
    subscribe: (cb) => onSnapshot(coupangNoteColRef, cb),
  };

  // ============== KPI 月結表獨立文件 app/kpi（每格一條 FieldPath 寫入，多人同時填不互蓋） ==============
  //   舊版把整個 _kpi_v1 陣列（所有月份）整包 setField 進 app/profit → 最後存的人蓋掉所有人。
  //   結構：months.{YYYY-MM}.{與舊 _kpi_v1 row 相同的巢狀路徑}（{group}.{shop}.{field}、*Formula、
  //         kpiFieldNotes.{key}、kpiFieldMerges.{key}、{group}Common）
  //         meta.{YYYY-MM}.{同一條路徑} = { by, at }；搬移完成後頂層有 migratedAt。
  //   writePaths(pairs)：pairs = [[segments[], value], …]，一次 updateDoc 原子寫入多格。
  //     每條路徑都是 new FieldPath(...segments)：店名含 + ( ) 中文、備註 key 含 : 都不必跳脫。
  //     value === DELETE → deleteField()；物件值裡（任意層）=== TS → serverTimestamp()。
  //   ⚠ getDoc/subscribe 命名【必須】保留：本機防護碼與唯讀角色的讀取白名單是字串比對。writePaths 是唯一寫入。
  //   ⚠ 新增這顆後本機防護掃到的雲端物件數為 18、寫入方法 27（writePaths + smokeWritePaths；見 CLAUDE.md TEST_NOWRITE 段）。
  //   回滾：profit.js 的讀寫改回 _kpi_v1 即可，app/profit._kpi_v1 搬移時保留不刪。
  const kpiDocRef = doc(db, 'app', 'kpi');
  const KPI_DELETE = Symbol('kpiDelete');
  const KPI_TS = Symbol('kpiServerTimestamp');
  const kpiVal = (v) => {
    if (v === KPI_DELETE) return deleteField();
    if (v === KPI_TS) return serverTimestamp();
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const o = {};
      Object.keys(v).forEach(k => { o[k] = kpiVal(v[k]); });
      return o;
    }
    return v;
  };
  const kpiUpdate = (ref, pairs) => {
    const args = [];
    pairs.forEach(([segs, v]) => { args.push(new FieldPath(...segs), kpiVal(v)); });
    return updateDoc(ref, ...args);
  };
  // 文件不存在的處理比照 safeSetField，但建空文件用 merge:true —— 兩個人同時第一次寫入時，
  //   後建的那個 setDoc({}) 不帶 merge 會把先寫進去的格子整份清掉。
  const kpiWriteTo = async (ref, pairs) => {
    if (!Array.isArray(pairs) || !pairs.length) return;
    try {
      await kpiUpdate(ref, pairs);
    } catch (e) {
      if (e && (e.code === 'not-found' || String(e).includes('No document to update'))) {
        await setDoc(ref, {}, { merge: true });
        await kpiUpdate(ref, pairs);
      } else {
        throw e;
      }
    }
  };
  // app/kpi_smoke：只給 __kpiSmokeTest（js/profit.js）驗「真的寫進 Firestore」那一段用，跟 app/kpi 同一支 kpiWriteTo。
  //   ⚠ smokeWritePaths【寫死】這份文件、不收文件參數 ⇒ 它不可能寫到 app/kpi 或任何正式資料。
  //   ⚠ 本機 TEST_NOWRITE 會照樣把它 no-op（它不在讀取白名單）；要真跑 smoke test，本機另貼「只放行這一支」的放行碼，
  //     放行碼【不進 repo】。getDoc('smoke') 讀這份文件（getDoc 在讀取白名單內，防護碼開著也讀得到）。
  const kpiSmokeRef = doc(db, 'app', 'kpi_smoke');
  window.__cloudKpi = {
    DELETE: KPI_DELETE,
    TS: KPI_TS,
    getDoc: (which) => getDoc(which === 'smoke' ? kpiSmokeRef : kpiDocRef),
    subscribe: (cb, onErr) => onSnapshot(kpiDocRef, snap => cb(snap.exists() ? (snap.data() || {}) : null), onErr),
    writePaths: (pairs) => kpiWriteTo(kpiDocRef, pairs),
    smokeWritePaths: (pairs) => kpiWriteTo(kpiSmokeRef, pairs),
  };

  // ============== 庫存 app/inventory（每月一筆，逐格 FieldPath 寫入，多人同時改不同格不互蓋） ==============
  //   結構：{ schema:1, months:{ 'YYYY-MM':{ companyWh, inTransit, momoWh, countNoteShopee, countNoteMomo,
  //           orderAmount, note, createdAt, createdBy, updatedAt, updatedBy } } }；總計、較上月不存（js/pages/inventory.js 即時算）。
  //   不放 app/main：Store.set 整把覆蓋會互蓋，而且財務儀表板之後只需讀這一份、不必碰含帳號資料的 app/main。
  //   writePaths 共用上面的 kpiWriteTo（文件不存在時 merge:true 建空文件再寫）；值 === TS → serverTimestamp()。
  //   ⚠ 讀取名稱只能叫 getDoc / subscribe（防護碼與唯讀守衛的讀取白名單是字串比對）；寫入只有 writePaths。
  //   寫入成功回 { ok:true }；被唯讀守衛 / 本機防護換成 no-op 時回 undefined → 呼叫端一律 r && r.ok，再讀回比對。
  //   ⚠ 新增這顆後本機防護物件數 26 → 27、寫入方法 +1（見 CLAUDE.md TEST_NOWRITE 段）。
  const invDocRef = doc(db, 'app', 'inventory');
  window.__cloudInventory = {
    TS: KPI_TS,
    getDoc: () => getDoc(invDocRef),
    subscribe: (cb, onErr) => onSnapshot(invDocRef, snap => cb(snap.exists() ? (snap.data() || {}) : null), onErr),
    writePaths: (pairs) => kpiWriteTo(invDocRef, pairs).then(() => ({ ok: true })),
  };

  // ============== 通路健檢評分標準 app/health_rules（依月份適用的版本清單，逐格 FieldPath 寫入） ==============
  //   結構：{ schema:1, versions:{ 'YYYY-MM':{ from:'YYYY-MM', items:{…}, note, by, byName, at } } }（js/pages/health.js healthRulesForMonth 讀）。
  //   不放 app/main：理由同 app/inventory。這裡只建物件、不訂閱：進健檢頁才訂閱（health.js _hlRulesEnsureSub）。
  //   ⚠ 讀取名稱只能叫 getDoc / subscribe（防護碼與唯讀守衛的讀取白名單是字串比對）；寫入只有 writePaths，只給設定頁用（只限管理員）。
  //   subscribe 跟 __cloudInventory 差兩點：開 includeMetadataChanges、cb 多傳第二個參數 { fromCache }。
  //     健檢頁要等「伺服器來的快照」才算分：本專案沒開 IndexedDB persistence，離線可能先送 fromCache 的空快照；
  //     不開 includeMetadataChanges 的話，之後轉成伺服器快照但內容沒變時 SDK 不會再通知（見上面 #315 的註解），會卡到逾時、誤報讀取失敗。
  //   寫入成功回 { ok:true }；被唯讀守衛 / 本機防護換成 no-op 時回 undefined → 呼叫端一律 r && r.ok，再讀回比對。
  //   ⚠ 新增這顆後本機防護物件數 +1、寫入方法 +1（見 CLAUDE.md「本機測試前」那段）。
  const healthRulesDocRef = doc(db, 'app', 'health_rules');
  window.__cloudHealthRules = {
    TS: KPI_TS,
    getDoc: () => getDoc(healthRulesDocRef),
    subscribe: (cb, onErr) => onSnapshot(healthRulesDocRef, { includeMetadataChanges: true },
      snap => cb(snap.exists() ? (snap.data() || {}) : null, { fromCache: !!(snap.metadata && snap.metadata.fromCache) }), onErr),
    writePaths: (pairs) => kpiWriteTo(healthRulesDocRef, pairs).then(() => ({ ok: true })),
  };

  // ============== 蝦皮整月商品表現 shopee_perf_month/{通路}__{YYYY-MM}（通路健檢算動銷率用；一通路一月一份，同月重傳整份覆蓋） ==============
  //   結構：{ schema:1, shop, month, from, to, fileName, items:{ 商品ID:[狀態碼, 數量] }, counts, uploadedAt, uploadedBy, uploadedByName, prev }（js/pages/marketing.js insPerfMonthUpload 寫）。
  //   doc id 用中文通路名沒問題：Firestore 只禁 /、整串 . 或 ..、整串 __x__（這裡開頭是通路名），app/insight_{通路} 與 profits 也是中文。
  //   這裡只建物件、不訂閱。⚠ 讀取名稱只能叫 getDoc（防護碼與唯讀守衛的讀取白名單是字串比對）；寫入只有 setMonth。
  //   寫入成功回 { ok:true }；被唯讀守衛 / 本機防護換成 no-op 時回 undefined → 呼叫端一律 r && r.ok，再讀回比對。
  //   ⚠ 新增這顆後本機防護物件數 +1、寫入方法 +1（見 CLAUDE.md「本機測試前」那段）。
  const shopeePerfDocRef = (shop, month) => doc(db, 'shopee_perf_month', shop + '__' + month);
  window.__cloudShopeePerf = {
    getDoc: (shop, month) => getDoc(shopeePerfDocRef(shop, month)),
    setMonth: (shop, month, data) => setDoc(shopeePerfDocRef(shop, month), data || {}).then(() => ({ ok: true })),
  };

  // ══════════ PChome 獨立雲端 doc（三份，成長速率不同→各自一 doc，不擠 app/profit 的 1MB）══════════
  //   照 __cloudProfit 慣例：單 doc + getDoc/setField/removeFields/subscribe，per-field 寫入
  //   （setField 走 safeSetField＝updateDoc+FieldPath，逐格寫、不整包覆蓋、多人各改各欄不互蓋）。
  //   訂閱層把雲端資料交給 js/profit.js 的 __pchomeApplyCloud*（那裡才讀得到 pchomeLoadOrders/pchomeDirtyGet
  //   ＝bounce-back 守衛的依據）；沒定義就 no-op ＝ 該功能（optlog/history 表單）未上線時 infra 先就位。
  //   🔴 寫入端一律走既有 syncToCloud task 迴圈（不另開寫入路徑）；本層只提供雲端存取物件與訂閱。
  const pchomeOrdersRef  = doc(db, 'app', 'pchome_orders');
  const pchomeOptlogRef  = doc(db, 'app', 'pchome_optlog');
  const pchomeHistoryRef = doc(db, 'app', 'pchome_history');
  const pchomeProductsRef= doc(db, 'app', 'pchome_products');   // 商品主檔（整包 list 一欄）：從 app/profit 搬出、避開 1MB
  const pchomeReconRef   = doc(db, 'app', 'pchome_recon');      // 對帳資料（整包 data 一欄＝帳務月 map）：同上
  const pchomeRestDelete = (docPath) => async (keys) => {
    const params = keys.map(k => 'updateMask.fieldPaths=' + encodeURIComponent('`' + k + '`')).join('&');
    const url = 'https://firestore.googleapis.com/v1/projects/' + firebaseConfig.projectId + '/databases/(default)/documents/' + docPath + '?' + params;
    const resp = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{"fields":{}}' });
    if (!resp.ok) throw new Error('REST delete failed: ' + resp.status);
    return resp.json();
  };
  window.__cloudPchomeOrders = {
    getDoc:      () => getDoc(pchomeOrdersRef),
    setField:    (key, value) => safeSetField(pchomeOrdersRef, key, value),
    removeFields:(keys) => pchomeRestDelete('app/pchome_orders')(keys),
    subscribe:   (cb) => onSnapshot(pchomeOrdersRef, snap => cb(snap.exists() ? (snap.data() || {}) : {})),
  };
  window.__cloudPchomeOptlog = {
    getDoc:      () => getDoc(pchomeOptlogRef),
    setField:    (key, value) => safeSetField(pchomeOptlogRef, key, value),
    removeFields:(keys) => pchomeRestDelete('app/pchome_optlog')(keys),
    subscribe:   (cb) => onSnapshot(pchomeOptlogRef, snap => cb(snap.exists() ? (snap.data() || {}) : {})),
  };
  window.__cloudPchomeHistory = {
    getDoc:      () => getDoc(pchomeHistoryRef),
    setField:    (key, value) => safeSetField(pchomeHistoryRef, key, value),
    removeFields:(keys) => pchomeRestDelete('app/pchome_history')(keys),
    subscribe:   (cb) => onSnapshot(pchomeHistoryRef, snap => cb(snap.exists() ? (snap.data() || {}) : {})),
  };
  // 商品主檔 / 對帳資料：各一份獨立 doc、整包寫一個欄位（products→`list` 陣列、recon→`data` 帳務月 map）。
  //   語意與搬出前的 app/profit 泛用欄位一致（整份覆蓋）；只是改放獨立 doc、各自吃自己的 1MB。
  window.__cloudPchomeProducts = {
    getDoc:      () => getDoc(pchomeProductsRef),
    setField:    (key, value) => safeSetField(pchomeProductsRef, key, value),
    removeFields:(keys) => pchomeRestDelete('app/pchome_products')(keys),
    subscribe:   (cb) => onSnapshot(pchomeProductsRef, snap => cb(snap.exists() ? (snap.data() || {}) : {})),
  };
  window.__cloudPchomeRecon = {
    getDoc:      () => getDoc(pchomeReconRef),
    setField:    (key, value) => safeSetField(pchomeReconRef, key, value),
    removeFields:(keys) => pchomeRestDelete('app/pchome_recon')(keys),
    subscribe:   (cb) => onSnapshot(pchomeReconRef, snap => cb(snap.exists() ? (snap.data() || {}) : {})),
  };
  // 訂閱：把雲端資料交給 profit.js 的套用函式（bounce-back 守衛在那裡）。
  //   🔴 profit.js 是【動態載入】（進淨利表才 import，見 main.js）→ boot 時本訂閱先於 profit.js 就緒，
  //   首個快照觸發時 __pchomeApplyCloud* 還不存在（會漏掉初次 hydrate）。所以【一律先把最新快照緩存到 window】，
  //   profit.js 載入時從緩存 drain（見 profit.js `__pchomeOrdersCloudLatest`），保證換機/清快取後初次讀回不漏。
  //   沒定義套用函式（optlog/history 表單未上線）＝只緩存、不套用，infra 先就位。
  try {
    window.__cloudPchomeOrders.subscribe(data => { window.__pchomeOrdersCloudLatest = data; if (typeof window.__pchomeApplyCloudOrders === 'function') window.__pchomeApplyCloudOrders(data); });
    window.__cloudPchomeOptlog.subscribe(data => { window.__pchomeOptlogCloudLatest = data; if (typeof window.__pchomeApplyCloudOptlog === 'function') window.__pchomeApplyCloudOptlog(data); });
    window.__cloudPchomeHistory.subscribe(data => { window.__pchomeHistoryCloudLatest = data; if (typeof window.__pchomeApplyCloudHistory === 'function') window.__pchomeApplyCloudHistory(data); });
    window.__cloudPchomeProducts.subscribe(data => { window.__pchomeProductsCloudLatest = data; if (typeof window.__pchomeApplyCloudProducts === 'function') window.__pchomeApplyCloudProducts(data); });
    window.__cloudPchomeRecon.subscribe(data => { window.__pchomeReconCloudLatest = data; if (typeof window.__pchomeApplyCloudRecon === 'function') window.__pchomeApplyCloudRecon(data); });
  } catch (e) { console.error('[pchome cloud] 訂閱失敗：', e); }

  // ============== 博客來對帳資料 app/books_recon（2026-11-04；KPI 博客來「從報表帶入」用，之後淨利表博客來沿用） ==============
  //   結構：{ schema:1, months:{ 'YYYY-MM'(結算帳月):{ sales:{…}, rebate:{…}, fee:{…} } } }；三塊各自整塊覆蓋（同月重傳覆蓋、絕不累加）。
  //   寫入只有 writePaths（共用 kpiWriteTo，FieldPath 逐段 → ['months','2026-09','sales'] 只蓋那一塊）；成功回 { ok:true }，
  //   被唯讀守衛 / 本機防護 no-op 時回 undefined → 呼叫端一律 r && r.ok，再讀回比對。
  //   ⚠ 讀取名稱只能叫 getDoc / subscribe（防護碼與唯讀守衛的讀取白名單是字串比對）。
  //   ⚠ 新增這顆後本機防護物件數 28 → 29、寫入方法 +1（見 CLAUDE.md「本機測試前」那段）。
  //   訂閱照 PChome：profit.js 動態載入 → 先把最新快照緩存到 window.__booksReconCloudLatest，profit.js 載入後 drain。
  const booksReconRef = doc(db, 'app', 'books_recon');
  window.__cloudBooksRecon = {
    TS: KPI_TS,
    getDoc: () => getDoc(booksReconRef),
    subscribe: (cb, onErr) => onSnapshot(booksReconRef, snap => cb(snap.exists() ? (snap.data() || {}) : {}), onErr),
    writePaths: (pairs) => kpiWriteTo(booksReconRef, pairs).then(() => ({ ok: true })),
  };
  try {
    window.__cloudBooksRecon.subscribe(data => { window.__booksReconCloudLatest = data; if (typeof window.__booksApplyCloudRecon === 'function') window.__booksApplyCloudRecon(data); },
      e => console.error('[books_recon] 訂閱失敗：', e));
  } catch (e) { console.error('[books_recon] 訂閱失敗：', e); }

  // ============== FriDay 主站對帳資料 app/friday_recon（2026-11-04；KPI FriDay「從報表帶入」用，入口與架構照 app/books_recon） ==============
  //   結構：{ schema:1, months:{ 'YYYY-MM':{ 主站:{ orders:{…SCM 解析結果}, promo:{ 交易編號:{負擔,活動名稱,出貨日期} } } } } }。
  //   寫入只有 writePaths（共用 kpiWriteTo）：orders 整塊覆蓋；promo 逐交易編號 FieldPath（同交易編號覆蓋＝冪等）。成功回 { ok:true }。
  //   ⚠ 讀取名稱只能叫 getDoc / subscribe。⚠ 新增這顆後本機防護物件數 30 → 31、寫入方法 +1（見 CLAUDE.md）。
  //   訂閱照博客來：先緩存 window.__fridayReconCloudLatest，profit.js 載入後 drain。
  const fridayReconRef = doc(db, 'app', 'friday_recon');
  window.__cloudFridayRecon = {
    TS: KPI_TS,
    getDoc: () => getDoc(fridayReconRef),
    subscribe: (cb, onErr) => onSnapshot(fridayReconRef, snap => cb(snap.exists() ? (snap.data() || {}) : {}), onErr),
    writePaths: (pairs) => kpiWriteTo(fridayReconRef, pairs).then(() => ({ ok: true })),
  };
  try {
    window.__cloudFridayRecon.subscribe(data => { window.__fridayReconCloudLatest = data; if (typeof window.__fridayApplyCloudRecon === 'function') window.__fridayApplyCloudRecon(data); },
      e => console.error('[friday_recon] 訂閱失敗：', e));
  } catch (e) { console.error('[friday_recon] 訂閱失敗：', e); }

  // ============== 商品調整 app/growth_{通路}（#436 第 ③ 塊；從 app/profit 的 ec_notes|{通路}_growth 搬出） ==============
  //   結構：{ items:{ 品號:{adjustments:[…]} }, migratedAt:數字, migratedBy, legacySeen:{ 品號:指紋 } }。
  //   文件只由搬家腳本建立；沒有 migratedAt 就不算搬完，讀寫都照舊走 app/profit（切換判斷見上方 __growthRoute）。
  //   寫入只有 writePaths：FieldPath 逐品號寫。🔴 刻意不走 kpiWriteTo（它遇到文件不存在會自動建空文件；
  //     自動建的文件沒有 migratedAt，那個通路會被靜默切回舊路徑）。這裡文件不存在就失敗。
  //   成功回 { ok:true }；被唯讀 / 本機防護擋下回 undefined → 呼叫端一律 r && r.ok。
  //   ⚠ 讀取名稱只能叫 getDoc / subscribe。⚠ 新增這顆後本機防護物件數 31 → 32、寫入方法 +1（見 CLAUDE.md）。
  const growthRef = (shop) => {
    if (!GROWTH_SHOPS.includes(shop)) throw new Error('不是列管的通路：' + shop);
    return doc(db, 'app', 'growth_' + shop);
  };
  window.__cloudGrowth = {
    DELETE: KPI_DELETE,
    // getDoc(shop, 'server')：強制讀伺服器現值（離線會丟錯，不吃快取）。同步一律用這個決定路徑。
    getDoc: (shop, src) => src === 'server' ? getDocFromServer(growthRef(shop)) : getDoc(growthRef(shop)),
    // 🔴 includeMetadataChanges 不能拿掉：沒開 persistence，離線可能先送 fromCache 的空快照，要等翻成伺服器狀態才知道文件真的不存在。
    subscribe: (shop, cb, onErr) => onSnapshot(growthRef(shop), { includeMetadataChanges: true },
      snap => cb(snap.exists() ? (snap.data() || {}) : null, { fromCache: !!(snap.metadata && snap.metadata.fromCache) }), onErr),
    writePaths: (shop, pairs) => kpiUpdate(growthRef(shop), pairs).then(() => ({ ok: true })),
  };
  GROWTH_SHOPS.forEach(shop => {
    try {
      window.__cloudGrowth.subscribe(shop, (data, meta) => { if (window.__growthApplySnap) window.__growthApplySnap(shop, data, meta); },
        e => { if (window.__growthSubError) window.__growthSubError(shop, e); });
    } catch (e) { console.error('[商品調整] 訂閱失敗：', shop, e); }
  });
  // 本機測試：把某通路換成「已搬」的假文件（只在 localhost、資料只在記憶體，不碰雲端）。
  //   __growthMock('維克')＝用目前畫面內容當新文件；__growthMock('維克', { residueCode:'品號' })＝假裝舊欄位那個品號被舊分頁動過，且最後一筆新文件沒有；
  //   __growthMock('維克', false)＝收掉（重新整理才會回到真實狀態）；__growthMock('維克', 'doc')＝看假文件內容。
  window.__growthMock = (() => {
    const H = location.hostname;
    if (H !== 'localhost' && H !== '127.0.0.1') return () => { console.warn('__growthMock 只在 localhost 可用'); };
    const docs = {};
    let real = null;
    const snapOf = (d) => ({ exists: () => !!d, data: () => (d ? JSON.parse(JSON.stringify(d)) : undefined) });
    const install = () => {
      if (real) return;
      const cg = window.__cloudGrowth;
      real = { getDoc: cg.getDoc, writePaths: cg.writePaths };
      cg.getDoc = (shop, src) => docs[shop] ? Promise.resolve(snapOf(docs[shop])) : real.getDoc(shop, src);
      cg.writePaths = (shop, pairs) => {
        if (!docs[shop]) return real.writePaths(shop, pairs);
        pairs.forEach(([segs, v]) => {
          let o = docs[shop];
          segs.slice(0, -1).forEach(s => { o = o[s] = o[s] || {}; });
          if (v === cg.DELETE) delete o[segs[segs.length - 1]]; else o[segs[segs.length - 1]] = JSON.parse(JSON.stringify(v));
        });
        console.log('%c[growth mock] 假寫入（只在記憶體）', 'color:#2563eb', shop, pairs.map(p => p[0].join('.')));
        window.__growthApplySnap(shop, JSON.parse(JSON.stringify(docs[shop])), { fromCache: false });
        return Promise.resolve({ ok: true });
      };
    };
    return (shop, opt) => {
      if (opt === 'doc') return docs[shop] ? JSON.parse(JSON.stringify(docs[shop])) : null;
      if (opt === false) { delete docs[shop]; console.log('[growth mock] 已收掉 ' + shop + '，重新整理才會回到真實狀態'); return; }
      install();
      const pure = window.__growthPure;
      const cur = JSON.parse(JSON.stringify((Store._profitMem || {})['ec_notes|' + shop + '_growth'] || {}));
      const seen = {};
      Object.keys(cur).forEach(c => { seen[c] = pure.sig(cur[c]); });
      const d = { items: cur, migratedAt: Date.now(), migratedBy: 'mock', legacySeen: seen };
      if (opt && opt.residueCode) {
        const c = opt.residueCode;
        if (d.items[c] && Array.isArray(d.items[c].adjustments) && d.items[c].adjustments.length) { d.items[c].adjustments.pop(); d.legacySeen[c] = 'mock0000'; }
        else console.warn('[growth mock] 這個品號沒有紀錄：', c);
      }
      docs[shop] = d;
      window.__growthApplySnap(shop, JSON.parse(JSON.stringify(d)), { fromCache: false });
      console.log('%c[growth mock] ' + shop + ' 已切到假文件（' + Object.keys(cur).length + ' 個品號）', 'color:#2563eb;font-weight:700');
      return d;
    };
  })();

  window.dispatchEvent(new Event('cloudStoreReady'));

  // ⚡ 重量級訂閱（profits + momo_products/origins/… 全部訂完初次快照約 10MB）：
  //   【不再】開站後無條件預抓（那會讓每個人 boot 就拉 10MB → 桌機 channel congest 卡 boot timeout、手機分頁記憶體爆），
  //   而且【不再一次訂滿 13 個】（那是手機進淨利表 renderer OOM 的根因）。改成【按平台分四組懶載】，各組的 loader 在本檔上方定義：
  //     __loadShopeeSubs  ── profits collection + aff_rpt。觸發：setShop 到個別蝦皮賣場、工作日誌。
  //     __loadArchiveSubs ── profits archive docs（舊月）。觸發：setShop 到蝦皮賣場（看舊月）、工作日誌。
  //     __loadMomoSubs    ── momo_products/origins/reconcile/s1103/stock/e001/cost。觸發：setMomoShop（含總表→逐 SKU 加總全賣場）、工作日誌點 MOMO chip 明細。
  //     __loadCoupangSubs ── coupang_reports/msf/note。觸發：setCoupangShop。
  //   各組 __loadedSubGroups(Set) 守衛：只訂一次、切頁/切回不重訂；四組到齊才把相容旗標 __heavyProfitSubsLoaded 設 true。
  //   保留 __loadHeavyProfitSubs shim（一次載滿四組）僅為相容/除錯，正常流程不再呼叫。
  //   ⚠ 洞察/首頁/蝦皮總表/KPI月結不需任何重量級組：洞察讀 app/profit（本檔 boot 立即訂的當月 doc）ec_notes、
  //     首頁 dashboard 讀 app/main platforms、蝦皮總表讀 boot 的 _summary_v1、KPI月結讀 getKpiRows——皆 boot 已載。
} catch (e) {
  console.error('Firebase init failed:', e);
}
