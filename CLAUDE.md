# 元創數位 · 內部管理系統 — 開發規範

純前端、無建置流程的單頁應用 (SPA)，部署於 GitHub Pages，後端為 Firebase
Firestore。動工前請先讀完本檔與 [PROJECT_MAP.md](PROJECT_MAP.md)、
[UI_STYLE_GUIDE.md](UI_STYLE_GUIDE.md)。

## 目錄結構

- `index.html` — 應用骨架（HTML 版面 + 資源載入標籤），不放邏輯或樣式
- `css/main.css` — 全站主樣式　`css/profit.css` — 淨利表樣式
- `js/version.js` — 版本檢查 + 清快取（head 早載，classic script）
- `js/app.js` — 主程式核心：Store、工具、設定、`App` 核心（boot/路由/render/登入）
- `js/pages/*.js` — 各頁面方法（dashboard / marketing / employees / daily /
  offices / users / modal），以 `Object.assign(App, …)` 合併回 App
- `js/profit.js` — 淨利表功能（蝦皮多店 / 上傳 / 匯出 / 雲端 / 對帳）
- `js/firebase.js` — Firestore 雲端同步層（唯一含第三方 import）
- `js/main.js` — ES Module 進入點，依序載入 app → pages/* → profit → firebase
- `assets/` — logo 與電商平台 icon
- `apps-script.gs` — 舊版同步腳本（已停用，勿擴充）

## 開發紀律

1. **嚴守目錄職責** — 樣式進 `css/`、邏輯進 `js/`、圖檔進 `assets/`。
   **永遠不要**把 `<style>` / `<script>` 邏輯寫回 `index.html`。它就是骨架。
2. **無建置流程** — 檔案直接被瀏覽器載入。不要引入需要編譯 / 打包的東西
   （無 TypeScript、無 JSX、無 npm build）。寫瀏覽器原生跑得動的 JS。
3. **資料層單一來源** — 所有持久化走 `Store`（localStorage）與 Firestore
   同步層。新需求接既有 `Store` API / `window.__cloudStore`，不要在各頁
   自己 new Firestore 連線。
4. **寫完功能必須實測，不能只靠讀碼 / Edit 就宣稱完成** — 這是無建置的
   純前端 + 後端在雲端的專案，靜態檢查抓不到 runtime 問題：
   - 用本機靜態伺服器起站（見下方「本機開發 / 驗證」），實際在瀏覽器點過
   - 至少驗：**登入 → 首頁 render → 切到淨利表（賣場分頁出現）→ 切到洞察表
     → 帳號管理**，每條路徑都要正確 render
   - 改 JS 後做硬重整 (Ctrl+F5) 清快取再測；資料載入競態最常出現在這裡
   - 無法跑瀏覽器時，**主動說「未實測 browser」**，別讓使用者誤以為已驗過

### ⚠ 回報前 self-check（每次要送「完成」「修好了」「OK」前都跑一遍）

提交回報文字前，**自問三題**，並在回報結尾附**驗證狀態行**：

1. 我是否有**實際開瀏覽器 / 跑 server / 用 curl 驗過**？  → 寫 `🟢 已實測 (XX)`
2. 我只**讀程式碼 / 跑 grep / sed 處理**，沒有跑 runtime？ → 寫 `🟡 未實測 browser，只程式碼驗證 (XX)`
3. 我**只改了文字 / md / 規則，沒動 runtime 邏輯**？ → 寫 `⚪ 無需測試 (純文件 / 設定)`

範例（每次回報結尾都要有）：
```
🟡 未實測 browser — 已用 curl 確認 server 200 + 各檔大小、grep 確認無重複宣告。
   未實測：點任何按鈕的行為、Console 是否有 runtime error。
   驗證路徑：你打開 http://localhost:8765/ + F12。
```

漏寫驗證狀態 = 等同我宣稱「全部測過」，會誤導你。**永遠不要省略這行**。

## 模組與全域匯流排（本專案最重要的一條）

本專案原本是單一肥大 `index.html`，已拆成上述模組並改用 **ES Modules**。
ESM 有個致命陷阱必須牢記：

> **module 頂層的 `function` / `const` 是「私有」的，不是全域。**

但本專案有兩種寫法重度依賴全域：
- **約 80 個 inline handler**：`onclick="setShop('好麻吉')"`、
  `onclick="App.login()"` 等（多半寫在 render 出來的 HTML 字串裡）
- **跨檔裸呼叫**：`app.js` 進入淨利表時直接呼叫 `profit.js` 的
  `SHOPS` / `shopHTML` / `initShopUI` / `initProfitPeriodControls` /
  `setShop` / `renderSummary`

因此採「**真 ESM 檔案結構 + window 共享匯流排**」：

- 每個模組**結尾**用 `Object.assign(window, { … })`，把「會被 inline handler
  觸發」或「會被其他模組引用」的符號掛回 `window`。語義等同拆檔前的
  classic 全域，行為零差異。
- 跨檔讀取一律走 `window.`：`profit.js` 以 `const Store = window.Store` 取得
  資料層；`firebase.js` 用 `window.Store` / `window.App`；`app.js` 呼叫淨利表
  時用 `window.SHOPS` / `window.setShop` 等。

**新增 / 修改規則：**
- 在頁面 HTML 字串裡寫 `onclick="foo()"` 時，`foo` **必須**在其所在模組的
  `Object.assign(window, …)` 名單內，否則點擊時 `ReferenceError`、按鈕靜默失效。
- 在某模組呼叫另一模組定義的函式時，用 `window.foo(...)`，**不要**裸寫
  `foo(...)`（裸寫只在同檔有效）。
- 新增模組請在 `main.js` 明確排序 import，並維持 app → pages/* → profit →
  firebase 的依賴方向。
- **頁面模組 (`js/pages/*.js`)**：`App` 已拆成每頁一檔。每檔開頭
  `const App = window.App` + 從 window 解構所需工具，再
  `Object.assign(App, { …方法… })`。方法間一律用 `this.x()` 互相呼叫
  （不分檔，執行期都在同一個 App）。新增頁面 = 新增 `pages/xxx.js` 並在
  `main.js` 排序 import；若用到 app.js 的新工具，記得該工具也要在 app.js
  結尾掛上 window，否則解構會拿到 undefined。

## 啟動流程（順序敏感，勿亂動）

1. `<head>` 的 `version.js` 先跑：清 Service Worker / Cache，必要時重載。
2. `main.js`（deferred module）依序 import：
   - `app.js` 執行完，掛好 `window.App` / `window.Store` 等，最後註冊
     `cloudStoreReady` 監聽 + 5 秒 fallback（雲端沒就緒就先用 localStorage 開）。
   - `profit.js` 執行（此時 `window.Store` 已就緒）。
   - `firebase.js` 連 Firestore，設好 `window.__cloudStore` 後 dispatch
     `cloudStoreReady` → 觸發 `app.js` 的 `__setupCloud()` 啟動雲端。
3. 改動啟動相關程式時，務必保住「事件驅動 + fallback」這個結構，不要假設
   雲端一定先就緒，也不要假設 App 一定先 render 完。

## 資料與後端

### Firebase Firestore 結構
- `app/main` — 主資料文件（帳號、部門、員工、平台營收、洞察表…）。
  透過 `window.__cloudStore`（`getDoc` / `setField` / `removeField(s)` /
  `subscribe`）存取。
- `app/profit` — 淨利表「當期」資料（避免單檔撞 Firestore 1MB 上限）。
- `app/profit_YYYY_MM`（archive docs）— 舊月份歷史資料，延後訂閱。
- `profits` collection — 每月每賣場一份獨立 doc（doc id 用 `__` 取代 `/`）。
- 含 `.` 的字面欄位用 Firestore **REST API + backtick escape** 刪除
  （SDK 的 `updateDoc` 搭 `FieldPath` 不一定刪得掉），見 `firebase.js`
  的 `restDeleteFields`。

### 同步的眉角（避免覆蓋使用者輸入）
- 雲端快照回來時，若使用者正在輸入卡片（`.card-rev` / `.card-ads` 等）或有
  未儲存更動，**不重繪**，以免把打到一半的數字蓋掉。
- 首批快照 (`__firstCloudSnapshot`) 一律強制重繪，否則手機開頁會卡在空資料。
- 本機剛存過 (`_platformJustSaved` 等 2 秒內) 跳過雲端 bounce-back 重複重繪。
- `session` 是本機獨有、**不上雲**的 key（避免一人登入別人也跟著登入）。

### localStorage / `Store`
- `Store` 是 localStorage 包裝層（含 `_mem` / `_profitMem` 記憶體鏡像）。
- 版本號 `<meta app-version>` 每次部署都要更新，`version.js` 才會清舊快取。

### 舊版 Apps Script
- `apps-script.gs` 的自動同步已停用，僅保留空函式避免殘留觸發報錯。新功能
  不要往這裡加；營收由行銷團隊直接在 dashboard 填寫。

## 本機開發 / 驗證

無建置流程，但 ES Module + `fetch` 不能用 `file://` 直接開（CORS / module
限制），請用靜態伺服器：

```bash
# 任一即可（在專案根目錄執行）
python -m http.server 8000
# 或
npx serve .
```

然後開 `http://localhost:8000`，硬重整 (Ctrl+F5) 後依「開發紀律」第 4 點
逐條路徑實測。Firestore 連線需要網路；離線時會走 5 秒 fallback 用
localStorage 啟動。
