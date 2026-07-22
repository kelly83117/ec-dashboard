/* ===================== Firebase Firestore 雲端同步層 ===================== */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import { getFirestore, doc, collection, getDoc, setDoc, updateDoc, deleteField, onSnapshot, FieldPath } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

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
        if (JSON.stringify(data[k]) !== JSON.stringify(oldData[k])) {
          const shop = k.split('|')[1];
          if (shop) changedShops.add(shop);
        }
      });
      // 非報表 key（notes/edits 等）直接覆蓋；報表 key（ec|shop|month|half）只在 profits collection 尚未有該 key 時才填入（新資料優先）
      Object.keys(data).forEach(k => {
        if (k.startsWith('ec|')) {
          if (Store._profitMem[k] === undefined) Store._profitMem[k] = data[k];
        } else {
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
          Object.assign(Store._profitMem, incoming);
          if (changedShops.size > 0) {
            console.log('[profits collection] 收到更新，影響賣場：', [...changedShops]);
            window.dispatchEvent(new CustomEvent('profitDataReady', {detail:{changedShops:[...changedShops]}}));
            const _justSaved = (window._shopJustSaved && (Date.now() - window._shopJustSaved < 5000));
            if (!_justSaved && window.App && App.currentUser && typeof App.render === 'function') {
              try { App.render(); } catch {}
            }
          }
        }, err => { console.error('[profits collection subscribe 失敗]', err); });
      } catch (e) { console.warn('profits collection subscribe failed', e); }
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

  window.dispatchEvent(new Event('cloudStoreReady'));

  // 首頁渲染完後 1.5 秒（給 dashboard / 圖表時間），背景把重量級訂閱接上
  // 進淨利表如果還沒接上，會主動觸發
  setTimeout(() => {
    if (typeof window.__loadHeavyProfitSubs === 'function') window.__loadHeavyProfitSubs();
  }, 1500);
} catch (e) {
  console.error('Firebase init failed:', e);
}
