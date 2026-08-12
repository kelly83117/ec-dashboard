/* ===================== Firebase Firestore 雲端同步層 ===================== */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import { getFirestore, doc, collection, getDoc, setDoc, deleteDoc, updateDoc, deleteField, onSnapshot, FieldPath, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

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
    getDoc: () => getDoc(docRef),
    setField: (key, value) => safeSetField(docRef, key, value),
    removeField: (key) => restDeleteFields([key]),
    removeFields: (keys) => restDeleteFields(keys),
    subscribe: (cb) => onSnapshot(docRef, snap => cb(snap.exists() ? snap.data() : {})),
  };

  // ============== 淨利表獨立文件 app/profit（避免 app/main 撞 1MB 上限） ==============
  // app/profit 只放「當期」資料；舊月份各自獨立 doc（app/profit_YYYY_MM）避免單檔過大
  const profitDocRef = doc(db, 'app', 'profit');
  const PROFIT_ARCHIVE_DOCS = ['profit_2026_05'];
  const profitArchiveRefs = PROFIT_ARCHIVE_DOCS.map(name => doc(db, 'app', name));
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
    getDoc: () => getDoc(profitDocRef),
    setField: (key, value) => safeSetField(profitDocRef, key, value),
    removeFields: (keys) => restDeleteProfitFields(keys),
    subscribe: (cb) => onSnapshot(profitDocRef, snap => cb(snap.exists() ? snap.data() : {})),
  };
  // 訂閱 profit doc + archive docs → 合併寫入 Store._profitMem
  // 每個 doc 各自記下自己的最新資料，merge 時用 archive + current 順序（current 優先）
  try {
    Store._profitMem = Store._profitMem || {};
    const profitParts = { current: {}, archives: {} };
    const mergeAndNotify = () => {
      const data = {};
      Object.values(profitParts.archives).forEach(d => Object.assign(data, d));
      Object.assign(data, profitParts.current);
      const oldData = Store._profitMem || {};
      const changedShops = new Set();
      // 只比對 profitDoc 自己的非報表 key（ec_notes|、ec_edits| 等）
      // ec|shop|month|half 格式是舊版遺留在 profitDoc 的報表資料，以 profits collection 為準，不比對
      Object.keys(data).forEach(k => {
        if (k.startsWith('ec|')) return; // 舊版報表殘留 key，跳過
        if (k.startsWith('ec_momo_products|')) return; // MOMO 商品主檔以 momo_products collection 為準，不在此比對（遷移過渡）
        if (JSON.stringify(data[k]) !== JSON.stringify(oldData[k])) {
          const shop = k.split('|')[1];
          if (shop) changedShops.add(shop);
        }
      });
      // 非報表 key（notes/edits 等）直接覆蓋；報表 key（ec|shop|month|half）與 MOMO 商品主檔（ec_momo_products|）
      //   只在 collection 尚未填該 key 時才填入（collection 權威、app/profit 舊欄位只當遷移過渡的 fallback）
      Object.keys(data).forEach(k => {
        if (k.startsWith('ec|') || k.startsWith('ec_momo_products|')) {
          if (Store._profitMem[k] === undefined) Store._profitMem[k] = data[k];
        } else {
          // 本機有未同步變更 / 剛存過 → 不讓雲端快照覆蓋，保住使用者正在編輯的內容
          //   （守衛定義在 js/profit.js，那裡才讀得到私有的 _pendingSyncKeys）
          //   對照組：本檔 momo_products / momo_reconcile / momo_s1103 三處訂閱早有同型別守衛
          if (window.__profitShouldSkipCloudOverwrite && window.__profitShouldSkipCloudOverwrite(k)) return;
          Store._profitMem[k] = data[k];
        }
      });
      window.dispatchEvent(new CustomEvent('profitDataReady', {detail:{changedShops:[...changedShops]}}));
      // 不做 App.render()（全頁重繪）：profitDoc 變動只需精準更新受影響賣場，避免好麻吉等無關賣場閃爍
      // profitDataReady listener 已處理 onMonthChange；此處不重複觸發
    };
    // 輕量：app/profit 立刻訂閱（小檔案，不會卡住）
    onSnapshot(profitDocRef, snap => {
      profitParts.current = snap.exists() ? (snap.data() || {}) : {};
      mergeAndNotify();
    }, err => { console.error('[profit subscribe] 訂閱失敗：', err); });

    // 重量：app/profit_2026_05 (2.4MB) 跟 profits collection 延後訂閱
    // 等首頁渲染完成 + 使用者第一次切換到淨利表 才載入
    // 在那之前，淨利表頁面如果有人開啟，會看到 loading 狀態
    window.__heavyProfitSubsLoaded = false;
    window.__loadHeavyProfitSubs = () => {
      if (window.__heavyProfitSubsLoaded) return;
      window.__heavyProfitSubsLoaded = true;
      console.log('[profit] 開始載入 archive doc + profits collection');
      // archive docs (舊月份歷史資料)
      profitArchiveRefs.forEach((ref, idx) => {
        onSnapshot(ref, snap => {
          profitParts.archives[PROFIT_ARCHIVE_DOCS[idx]] = snap.exists() ? (snap.data() || {}) : {};
          mergeAndNotify();
        }, err => { console.error('[profit archive subscribe 失敗]', PROFIT_ARCHIVE_DOCS[idx], err); });
      });
      // profits collection (每月每賣場獨立 doc)
      try {
        const profitsColRef = collection(db, 'profits');
        const fromDocId = id => id.replace(/__/g, '/');
        onSnapshot(profitsColRef, snap => {
          Store._profitMem = Store._profitMem || {};
          const incoming = {};
          snap.forEach(d => { incoming[fromDocId(d.id)] = d.data(); });
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
        }, err => { console.error('[profits collection subscribe 失敗]', err); });
      } catch (e) { console.warn('profits collection subscribe failed', e); }

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
              if (ts && window.__momoNoteCloudBase) window.__momoNoteCloudBase(k, ts);
              return;
            }
            // 【1】 stale 修正：not-dirty → 本機三鏡像一起跟上雲端（預覽/推送讀 _mem→localStorage，只更 _profitMem 會 stale）
            Store._profitMem[k] = items;
            try { localStorage.setItem(k, JSON.stringify(items)); } catch (e) {}
            try { if (Store._mem) Store._mem[k] = items; } catch (e) {}
            if (ts && window.__momoNoteCloudBase) window.__momoNoteCloudBase(k, ts);
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
            const shop = data.savedShop || MOMO_DOCID_SHOP[String(d.id).split('_')[0]] || null;
            const month = data.month || String(d.id).split('_').slice(1).join('_');
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
            if (window.__momoShouldSkipCloudOverwrite && window.__momoShouldSkipCloudOverwrite(k)) return;
            if (JSON.stringify(Store._profitMem[k]) === JSON.stringify(data)) return;
            Store._profitMem[k] = data;
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

      // momo_cost_by_origin（帳號級單一 doc）→ Store._profitMem['ec_momo_cost_by_origin'] + '..._meta'。原廠編號→成本，MO+ 毛利依賴、需跨人跨機。
      try {
        onSnapshot(costByOriginDocRef, snap => {
          const data = (snap && snap.data && snap.data()) || null; if (!data) return;
          if (window._momoCostJustSaved && (Date.now() - window._momoCostJustSaved < 5000)) return;   // 剛本機存過 → 不被 echo 覆蓋
          let changed = false;
          if (data.costMap && JSON.stringify(Store._profitMem['ec_momo_cost_by_origin']) !== JSON.stringify(data.costMap)) { Store._profitMem['ec_momo_cost_by_origin'] = data.costMap; changed = true; }
          if (data.meta && JSON.stringify(Store._profitMem['ec_momo_cost_by_origin_meta']) !== JSON.stringify(data.meta)) { Store._profitMem['ec_momo_cost_by_origin_meta'] = data.meta; changed = true; }
          if (changed) { console.log('[momo_cost_by_origin] 收到更新'); window.dispatchEvent(new CustomEvent('momoCostByOriginReady')); }
        }, err => { console.error('[momo_cost_by_origin subscribe 失敗]', err); });
      } catch (e) { console.warn('momo_cost_by_origin subscribe failed', e); }

      // aff_rpt collection（每通路一 doc）→ Store._profitMem['ec_aff_rpt|<shop>']。
      //   為什麼掛在 __loadHeavyProfitSubs 裡而不是開站就訂：聯盟行銷分頁位在「淨利表 → 好麻吉賣場」內，
      //   使用者一定要先進淨利表才看得到，180KB 的 doc 不該在開站瞬間跟首頁搶頻寬。
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
  } catch (e) { console.warn('profit subscribe failed', e); }

  // setReport 立刻建好（寫入用），讀取（getDoc / onSnapshot）才延後
  try {
    const toDocId = k => k.replace(/\//g, '__');
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
    };
  } catch {}

  // ============== MOMO 商品主檔：每賣場一個獨立 doc（momo_products collection） ==============
  // 為什麼獨立 collection：商品主檔一個賣場就 500KB+，塞 app/profit 欄位會撞 1MB 上限（甲配 1300 筆推不進去）；
  //   每賣場一 doc 各自 1MB 額度，也把「整包 last-write-wins」的覆蓋範圍縮小到單一賣場。
  // doc id 用 ASCII 代號（中文/+ 在 URL/REST/Console 難查）；doc 內存 { shop:'甲配', items:[...] }（保留原名、反查用）。
  // payload 包 {items}：Firestore 一份 doc 是 map、不能頂層存陣列（同 setReport 對陣列 reject 的原因）。
  const MOMO_SHOP_DOCID = { '甲配':'jia', '乙配':'yi', 'MO+麻吉':'mo_maji', 'MO+森之旅':'mo_senzhilu' };
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
    setSrc:  (shop, src, data) => setDoc(doc(db, 'momo_moplus_origins', momoMoPlusOriginsDocId(shop, src)), data || {}),
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

  window.dispatchEvent(new Event('cloudStoreReady'));

  // 首頁渲染完後 1.5 秒（給 dashboard / 圖表時間），背景把重量級訂閱接上
  // 進淨利表如果還沒接上，會主動觸發
  setTimeout(() => {
    if (typeof window.__loadHeavyProfitSubs === 'function') window.__loadHeavyProfitSubs();
  }, 1500);
} catch (e) {
  console.error('Firebase init failed:', e);
}
