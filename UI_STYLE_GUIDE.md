# UI 設計規範 (UI Style Guide)

本規範摘自現行 `css/main.css`（特別是 `:root` 變數）與 `index.html` 版面，
作為新增 / 擴充畫面時的視覺對齊依據，確保整站風格一致。

整體風格為**乾淨的淺色 SaaS 儀表板**：淺灰底、白色卡片、深色側欄、靛藍主色，
搭配細緻的圓角與微弱陰影。**不是**深色 / 霓虹風，新畫面請勿引入濃重特效。

---

## 1. 設計變數 (Design Tokens)

所有顏色、圓角、陰影都集中在 `css/main.css` 的 `:root`。**請一律用變數**，
不要在各處硬寫色碼。

### 1.1 色彩
| 用途 | 變數 | 值 |
|---|---|---|
| 主背景 | `--bg` | `#f8fafc`（淺灰）|
| 卡片 / 表面 | `--surface` | `#ffffff` |
| 側欄底 / 深色面 | `--sidebar` / `--sidebar-2` | `#0f172a` / `#1e293b` |
| 側欄文字 | `--sidebar-text` / `--sidebar-muted` | `#e2e8f0` / `#94a3b8` |
| **主色 (Primary)** | `--primary` | `#4f46e5`（靛藍）|
| 主色淺底 / 深 | `--primary-soft` / `--primary-dark` | `#eef2ff` / `#4338ca` |
| 邊框 | `--border` | `#e5e7eb` |
| 主文字 / 次要文字 | `--text` / `--text-muted` | `#111827` / `#6b7280` |
| 成功 | `--success` / `--success-soft` | `#10b981` / `#d1fae5` |
| 警告 | `--warn` / `--warn-soft` | `#f59e0b` / `#fef3c7` |
| 危險 | `--danger` / `--danger-soft` | `#ef4444` / `#fee2e2` |
| 資訊 | `--info` / `--info-soft` | `#3b82f6` / `#dbeafe` |

> 狀態色都有對應 `-soft` 淺底版，用於標籤 / badge 背景；前景文字用主色版。

### 1.2 圓角與陰影
- `--radius: 12px`（卡片 / Modal）、`--radius-sm: 8px`（輸入框 / 小元件）。
- `--shadow-sm` / `--shadow` / `--shadow-lg`：皆為低透明度的冷灰陰影
  (`rgba(15,23,42,…)`)，維持輕盈感，**避免**大範圍重陰影或彩色光暈。

### 1.3 字體
- 一般文字：`font-family: inherit`（沿用瀏覽器系統字體堆疊）。
- **數字 / 程式碼**：`ui-monospace, "SF Mono", Menlo, monospace`，並對齊用
  `font-variant-numeric: tabular-nums`（KPI、金額、表格數字務必對齊）。

---

## 2. 版面骨架 (Layout)

定義於 `index.html`，由 `app.js` 在 `#main-content` 注入頁面內容。

- **側欄 (`.sidebar`)**：深色 (`--sidebar`)，含品牌 logo、分組導覽
  （`.sidebar-group` 標題 + `.nav-item`，可收合的 `.nav-parent` / `.nav-sub`）、
  底部使用者資訊與登出鈕。可用 `#sidebar-toggle-btn` **收合**（`body.sidebar-collapsed`、存 `localStorage['ec.sidebarCollapsed']`）。
  - **寬度可拖曳調整**（`#sidebar-resizer` 右緣把手 → `app.js` 的 `bindSidebarResize`）：寬度存 **CSS 變數 `--sidebar-w`**（`.sidebar{width:var(--sidebar-w,240px)}`、`.sidebar-toggle{left:calc(var(--sidebar-w,240px)-14px)}`），範圍 **min 200 / max 360**，持久化 `localStorage['ec.sidebarWidth']`（per-browser、**不上雲**、與收合同慣例）。
  - 🔴 **拖曳只更新 `--sidebar-w`，絕不寫 `.sidebar` 的 inline width**——inline 會贏過 `body.sidebar-collapsed .sidebar{width:0}` 導致**收合失效**（最易踩的地雷；改動側欄寬邏輯必測「拉寬→收合→展開」序列）。收合態/手機抽屜（≤768）把手隱藏、不可拖。
  - ⚠ **與既有 RWD 的互動**：`@media(max-width:900px) .sidebar{width:200px}` 仍在 → 拖曳寬只在**視窗 >900px** 生效，≤900 側欄固定 200（var 保留、回到 >900 還原）。
  - ⚠ **平台分頁列（淨利表）風險採 (c) cap max 處理**：側欄變寬→`.main`（flex 自動 reflow）變窄→平台列 `.pf-tabrow`（已 `nowrap`+`overflow-x:auto`）**只會提早橫向捲動、不會換行破版**（實測 1440/1280＋側欄 360 皆單排橫捲）。故 **cap max=360** 讓最壞情況 `.main` 只少 120px、既有 overflow-x 吞得掉，**不動已硬化的平台列 @media**。**升級路徑**（若日後嫌 360 太窄）：走 **(b) ResizeObserver 依 `.main` 實際寬降級平台列**，**不要**改回 (a) container query（為邊際效益改寫已驗收 CSS＋賭瀏覽器支援，投報不對等）。
- **主內容 (`.main` / `#main-content`)**：白底卡片式內容，由路由動態 render。
- **卡片**：白底 (`--surface`) + `--border` 細框 + `--radius` 圓角 +
  `--shadow`；內距常用 16–24px。

---

## 3. 元件規範

### 3.1 啟動遮罩 (`#view-boot`)
全屏置中的 `.spinner` + 「載入中」文字，App 啟動完成才隱藏。

### 3.2 登入頁 (`#view-login`)
置中 `.login-card`：品牌 logo、帳號 / 密碼 `.field`、`.btn-primary` 登入鈕、
`.login-error` 錯誤區、`.login-hint` 提示（含 `#js-status` 系統就緒訊息）。

### 3.3 Modal (`#modal-backdrop` / `#modal`)
全站共用一個 backdrop + 容器，內容由 `App` 動態填入；點背景關閉
（`App.closeModalOnBackdrop`）。卡片用 `--radius` 圓角、`--shadow-lg`。

### 3.4 Toast (`#toast`)
輕量浮層提示，透過 `showToast(message, type)` 呼叫，`type` 對應狀態色
（`success` / `warn` / `danger` / `info`）。

### 3.5 按鈕
- 主要動作：`.btn-primary`（`--primary` 底、白字）。
- 次要 / 危險動作沿用狀態色變數，維持一致圓角 (`--radius-sm`)。

---

## 4. 新畫面落地原則

1. **先用變數**：色彩 / 圓角 / 陰影一律引用 `:root` token，缺的才在
   `main.css` 補定義，不要散落硬碼。
2. **歸位樣式**：通用樣式寫 `css/main.css`；淨利表相關寫 `css/profit.css`。
   render 出的元件靠既有 class（如卡片、`.btn-primary`），不要在 JS 字串裡
   塞大量 inline style 重造輪子。
3. **數字對齊**：所有金額 / KPI / 表格數字用 monospace + `tabular-nums`。
4. **克制特效**：維持淺色、輕陰影、細圓角的 SaaS 質感；避免霓虹光暈、
   濃重漸層與過度動畫。

---

## 5. 技術債清單 (Known Tech Debt)

改到相關區塊時順手還債；還不了也要知道它為什麼在那。

- **平台分頁列字級用 `!important`（`css/profit.css` 的 `.pf-tabrow` 降級 @media）**
  平台列（蝦皮 / MOMO / 酷澎 / PChome…）每顆按鈕的字級是 **inline 寫死**在
  `js/profit.js` 的 `__profitTabHtml` 模板字串裡（18 顆 `.stab`，`style="font-size:15px"`）。
  RWD 降級要在窄螢幕縮字級，@media 規則得蓋過 inline，只能用 `!important`
  （author `!important` > inline normal）。
  - **為什麼沒直接還**：`__profitTabHtml` 是一大段模板字串，為了搬 18 處 inline 去動它，
    風險與收益不對等（易誤傷平台按鈕、且會跟其他人的平台程式碼混在一起）。
  - **要還的話**：先把那 18 顆按鈕的 inline `font-size` 移進 `.stab`（CSS base），
    再把 @media 裡的 `!important` 拿掉即可。**在還清之前，改平台列字級一律改
    @media 的 `!important` 值，不要去動 js 的 inline**（兩邊不同步只會更難查）。
