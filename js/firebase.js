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

  window.__cloudStore = {
    getDoc: () => getDoc(docRef),
    setField: (key, value) => setDoc(docRef, { [key]: value }, { merge: true }),
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
    setField: (key, value) => setDoc(profitDocRef, { [key]: value }, { merge: true }),
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
      setReport: (key, value) => setDoc(doc(db, 'profits', toDocId(key)), value),
    };
  } catch {}

  window.dispatchEvent(new Event('cloudStoreReady'));

  // 首頁渲染完後 1.5 秒（給 dashboard / 圖表時間），背景把重量級訂閱接上
  // 進淨利表如果還沒接上，會主動觸發
  setTimeout(() => {
    if (typeof window.__loadHeavyProfitSubs === 'function') window.__loadHeavyProfitSubs();
  }, 1500);
} catch (e) {
  console.error('Firebase init failed:', e);
}
