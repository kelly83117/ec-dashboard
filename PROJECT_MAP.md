# 專案架構與目錄職責 (Project Map)

本文件定義「元創數位 · 內部管理系統」的目錄結構與檔案職責。這是一個
**純前端、無建置流程 (no-build) 的單頁應用 (SPA)**，部署在 GitHub Pages
（`https://kelly83117.github.io/ec-dashboard/`），後端走 Firebase Firestore。

所有開發者與 AI 代理在新增功能或重構時，**必須遵守此目錄樹規範**。

---

## 📁 目錄結構與職責

```
ec-dashboard/
├─ index.html          ← 應用骨架（HTML 版面 + 載入標籤），不放邏輯
├─ css/
│  ├─ main.css         ← 全站主樣式（登入 / 側欄 / 卡片 / Modal / 表格）
│  └─ profit.css       ← 淨利表專用樣式
├─ js/
│  ├─ version.js       ← 版本檢查 + 自動清快取（classic script，head 早載）
│  ├─ app.js           ← 主程式核心：Store、工具、設定、App 核心（boot/路由/render/登入）
│  ├─ pages/           ← 各頁面方法（以 Object.assign 合併回 App）
│  │  ├─ dashboard.js  ← 儀表板首頁
│  │  ├─ marketing.js  ← 行銷：工作日誌 / 洞察表 / 本月明細 / 卡片輸入
│  │  ├─ employees.js  ← 績效管理
│  │  ├─ daily.js      ← 每日工作進度
│  │  ├─ offices.js    ← 各辦公室（採購 / 商開 / 設計）
│  │  ├─ users.js      ← 帳號管理
│  │  └─ modal.js      ← 通用 Modal
│  ├─ profit.js        ← 淨利表功能（蝦皮多店 / 上傳 / 匯出 / 雲端）
│  ├─ firebase.js      ← Firestore 雲端同步層
│  └─ main.js          ← ES Module 進入點（app → pages/* → profit → firebase）
├─ assets/
│  ├─ logo.png         ← 品牌 logo
│  └─ logos/           ← 電商平台 icon（shopee / momo / coupang）
├─ apps-script.gs      ← 舊版 Google Apps Script 同步腳本（已停用，僅保留）
├─ CLAUDE.md           ← AI / 開發規範（先讀這份）
├─ PROJECT_MAP.md      ← 本文件
└─ UI_STYLE_GUIDE.md   ← 視覺設計規範
```

### `index.html` — 應用骨架
**職責：** 只放靜態 HTML 版面與資源載入標籤。
**內容：** `<head>` 的 meta / 版本號 / favicon、CSS `<link>`、xlsx CDN、
`version.js`、ES Module 進入點 `main.js`；`<body>` 的啟動遮罩、登入頁、
主框架（側欄 + `#main-content`）、Modal、Toast。
**禁止：** 在此檔內寫任何 `<style>` 或 `<script>` 邏輯。所有頁面內容由
`app.js` 在 `#main-content` 動態 render。

### `css/` — 樣式
**職責：** 全站樣式。`main.css` 為主樣式；`profit.css` 為淨利表獨立樣式。
**規範：** 載入順序 `main.css → profit.css`（等同拆檔前的 cascade 順序，
勿調換）。新樣式依歸屬寫入對應檔案，不要塞回 `index.html`。

### `js/app.js` — 主程式核心
**職責：** 應用核心。包含資料層 `Store`、純函式工具（雜湊 / 日期 / 計分 /
escapeHtml…）、全站設定常數（`OFFICE_CONFIG`、`PLATFORMS`…），以及 `App`
物件的**核心方法**——boot、登入、路由、render 派發、側欄、views 骨架。
各頁面的實際 render 方法已拆到 `js/pages/`。
**注意：** 本檔為 ES module，結尾以 `Object.assign(window, {…})` 把工具、
設定與 `App` 掛回全域（供 inline handler、`pages/*`、profit、firebase 使用，
見 CLAUDE.md）。

### `js/pages/` — 各頁面方法
**職責：** 把 `App` 物件依功能拆成每頁一檔，降低單檔體積、好維護。
**做法：** 每個檔以 `const App = window.App` 取得 App、從 window 匯流排解構
所需工具，再用 `Object.assign(App, { …該頁方法… })` 把方法掛回 App。方法內
以 `this` 互相呼叫（不論方法在哪個檔，執行期都在同一個 App 上）。
**注意：** 必須在 `app.js` 之後載入（要讀 `window.App` 與工具）；由
`main.js` 依原始順序 import。新增頁面就新增一個 `pages/xxx.js` 並在
`main.js` 排序 import。

### `js/profit.js` — 淨利表
**職責：** 「行銷 → 淨利表」子頁的完整功能：蝦皮多店分頁、Excel 上傳 /
解析 / 匯出、雲端同步、廣告對帳、分析與成長標籤規則、摘要列、備註。
**注意：** 開頭以 `const Store = window.Store` 取得共享資料層，故必須在
`app.js` 之後載入。

### `js/firebase.js` — 雲端同步層
**職責：** 連線 Firebase Firestore，提供 `window.__cloudStore`（`app/main`
文件）與 `window.__cloudProfit` / `window.__cloudProfitCol`（淨利表的
`app/profit` 文件、`profits` collection、archive docs），訂閱快照並寫入
`Store._profitMem`，就緒後 dispatch `cloudStoreReady` 事件。
**注意：** 唯一含第三方 `import` 的檔，必須最後載入（觸發 `app.js` 啟動）。

### `js/version.js` — 版本檢查
**職責：** 比對 `<meta app-version>` 與 localStorage，清除 Service Worker /
Cache API，必要時自動重載，確保所有人拿到最新版。
**注意：** 須最早執行，故在 `<head>` 以一般 `<script>`（非 module）同步載入。

### `js/main.js` — ES Module 進入點
**職責：** 唯一的 `type="module"` 進入點，依序 `import` app → profit →
firebase，固定載入順序。

### `assets/` — 靜態資源
**職責：** 圖檔。引用路徑一律 `assets/...`。

### `apps-script.gs` — 已停用後端腳本
**職責：** 保留歷史。行銷團隊現直接在 dashboard 填營收，不再從 Sheet 推送。
新功能不要往這裡加。

---

## 📐 執行規則 (Execution Rules)

1. **嚴守目錄職責**：新檔案放入符合其定義的目錄；不要把樣式或邏輯塞回
   `index.html`。
2. **無建置流程**：純靜態檔案，直接被瀏覽器載入。不要引入需要編譯 /
   打包的語法或工具（無 npm build、無 TypeScript、無 JSX）。
3. **資料層單一來源**：所有資料存取走 `Store`（localStorage）+ Firestore
   同步層。新的持久化需求接到既有 `Store` / `window.__cloudStore`，不要
   各頁自己呼叫 Firestore。
4. **載入順序神聖不可侵犯**：`version.js`（head）→ `main.js`（app → profit
   → firebase）。新增 JS 模組請在 `main.js` 明確排序，並說明依賴。
5. **跨檔共享走 window 匯流排**：模組間共享的符號統一掛 `window`（見
   CLAUDE.md），不要在頁面 HTML 字串裡硬寫只有某檔才有的裸函式而不掛全域。
