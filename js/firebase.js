/* ===================== Firebase Firestore 雲端同步層 ===================== */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import { getFirestore, doc, collection, getDoc, setDoc, deleteDoc, updateDoc, deleteField, onSnapshot, FieldPath } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

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
            // ⚠ bounce-back 守衛：本機有未同步變更（pending）或剛存過 → 不覆蓋，保住本機版本（守衛邏輯在 profit.js，避免讀私有 _pendingSyncKeys）
            if (window.__momoShouldSkipCloudOverwrite && window.__momoShouldSkipCloudOverwrite(k)) return;
            if (JSON.stringify(Store._profitMem[k]) === JSON.stringify(items)) return;   // 無變化不動、不觸發重繪
            Store._profitMem[k] = items;
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
    setShop:   (shop, items) => setDoc(doc(db, 'momo_products', MOMO_SHOP_DOCID[shop] || shop), { shop, items: items || [] }),   // setDoc：整包取代
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
