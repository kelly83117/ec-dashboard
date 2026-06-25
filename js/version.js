/* ===== 版本檢查 + 清快取（classic script，head 早載）===== */
(function autoRefreshOnVersionChange(){
  try {
    const META_VERSION = document.querySelector('meta[name="app-version"]')?.content || '';
    if (!META_VERSION) return;

    // 0) 修正卡在舊 ?v=... URL 的情況
    //    瀏覽器會把 ?v=A 和 ?v=B 視為不同網址、分別快取
    //    使用者書籤的 ?v= 跟 HTML 內 meta 版本不符時，直接把網址換成新版號
    //    這會強迫瀏覽器以新 URL 去 server 重抓，跳出舊 HTML 快取
    try {
      const urlParams = new URLSearchParams(location.search);
      const urlVer = urlParams.get('v');
      if (urlVer && urlVer !== META_VERSION) {
        console.warn('[version] URL ?v=', urlVer, '與 HTML 版本', META_VERSION, '不符，導向新 URL');
        urlParams.set('v', META_VERSION);
        location.replace(location.pathname + '?' + urlParams.toString() + location.hash);
        return; // 等下次 page load 再跑後續
      }
    } catch (e) { console.warn('[version] URL 同步失敗', e); }

    // 1) 清掉所有可能阻擋更新的 Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
      }).catch(()=>{});
    }

    // 2) 比對版本：localStorage 優先，沒有就 fallback 到 sessionStorage
    //    （某些瀏覽器設定下 localStorage 會抓不到，這時用 sessionStorage 至少能在同個會話內偵測升級）
    let lastVer = '';
    try { lastVer = localStorage.getItem('__app_version') || ''; } catch {}
    if (!lastVer) {
      try { lastVer = sessionStorage.getItem('__app_version') || ''; } catch {}
    }
    if (lastVer === META_VERSION) {
      console.log('[version] 目前已是最新版', META_VERSION);
      return;
    }

    console.warn('[version] 偵測到新版！舊:', lastVer || '(無)', '→ 新:', META_VERSION);

    // 寫入兩處：localStorage 跟 sessionStorage 都試一遍，總有一個會成功
    const persistVer = () => {
      try { localStorage.setItem('__app_version', META_VERSION); } catch {}
      try { sessionStorage.setItem('__app_version', META_VERSION); } catch {}
    };

    // 3) 清掉 Cache API 裡所有舊資源
    if ('caches' in window) {
      caches.keys().then(names => {
        return Promise.all(names.map(n => {
          console.warn('[version] 清掉舊 cache:', n);
          return caches.delete(n);
        }));
      }).then(() => {
        persistVer();
        // 第一次部署時 lastVer 是空的，避免無限重載
        if (lastVer && lastVer !== META_VERSION) {
          console.warn('[version] 即將自動重載...');
          location.reload();
        }
      }).catch(err => {
        console.warn('[version] 清 cache 失敗：', err);
        persistVer();
      });
    } else {
      persistVer();
    }
  } catch (e) { console.warn('[version] 檢測例外', e); }
})();
