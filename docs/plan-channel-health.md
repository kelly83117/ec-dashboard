# 通路健診：實作方案（第一版，塊 A／B／C）

> 基準：分支 `feat/channel-health`，從 `main` `19c532b` 開出（v818，含 MOMO 壓縮第 1 塊）。
> 這次**只寫方案**：沒改任何程式、沒 commit、沒讀正式 Firestore。行號都是 `19c532b` 的行號。
> 背景：[health-survey-2026-11-02.md](health-survey-2026-11-02.md)（下稱「盤點」）、[health-sellthrough-2026-11-02.md](health-sellthrough-2026-11-02.md)（下稱「動銷」）。
> 本文一律稱「通路」；引用程式識別字（`SHOPS`、`setShop`…）照原字。

## 0. 先講結論

1. **三塊的寫入性質**：
   - **塊 A、B 完全不寫雲端，也不新增雲端物件**。TEST_NOWRITE 基準維持 **27 / 45**。
   - **塊 C** 建議新開一個 collection，**會新增 1 個雲端物件**，基準變 **28 / 46（推算）**。
2. **健診頁是純讀取頁**：
   - 只讀 KPI 月結、淨利表報表、MOMO 商品主檔、PChome 對帳／商品清單。
   - 所有分數當場用固定規則重算，不存檔。
3. **profit.js 只「加」不「改」**：
   - 塊 A 加 1 支唯讀轉接函式 `__healthKpiSnapshot`。
   - 塊 B 再加 2 支：`__healthProductSnapshot`、`__profitOpenAt`。
   - 既有函式一行都不動。驗收時 `git diff -U0 js/profit.js` 不能有任何 `-` 行。
4. **動銷率「1 個商品」**：建議分數用**公司商品**（原廠編號／料號去掉規格碼）來算，「通路商品頁」口徑並列顯示當參考（§3，待你決定）。
5. **「有點擊沒成交」改成「廣告致虧」**，定義是「不投廣告會賺、投了變賠」的商品，所花的廣告費占比。
   - 只用報表列現有的欄位就能算，跟淨利表「賠錢中」標籤同源。
   - 另外兩種候選規則一起放進回測比較（§2-4）。
6. **首頁摘要卡：建議第一版不做**（§4-6）。
   - 首頁要顯示分數，就得載入 1.9MB 的 profit.js，加上約 10MB 的商品層訂閱，手機開首頁會被拖垮。
   - 側欄放入口就好。等之後有「鎖定本月分數」的小文件，首頁直接讀那份再做。

---

## 1. 三塊的範圍、檔案、函式、影響、快照

### 1-0. 三塊共同的地基

| 項目 | 做法 | 依據 |
|---|---|---|
| 路由 | `health`，**不走 `office-`、不是部門**，不碰 `ec.departments`、`canAccessOffice`、`OFFICE_FEATURES` | 比照 `inventory`（`js/app.js:1053`、`:1283`） |
| 權限 | 所有登入者都能看（老闆已確認不鎖），`_isRouteAllowed` 直接 `return true` | 同上 |
| 雲端推播重畫 | **不加進 `CLOUD_RENDER_ROUTES`**（`js/app.js:1295`）。白名單設計，新路由預設不重畫。健診頁自己顯示「資料時間」和「↻ 重新計算」按鈕 | 該處註解：「新增 route 預設不重繪（安全）」 |
| profit.js | 進頁時 `await window.__ensureProfit()`（`js/app.js:24`），**resolve 之後**才叫任何 `__load*Subs`（風險 3：守衛沒掛好就訂閱，雲端可能蓋掉本機） | `js/pages/daily.js:60-71`、`js/pages/offices.js:32-43` 的同一套寫法 |
| 樣式 | 放進 `css/main.css` 檔尾新段 `/* ===== 通路健診 hl-* ===== */`，顏色一律用 `:root` 變數（`--success/-soft`、`--warn/-soft`、`--danger/-soft`、`--border`、`--text-muted`），**不動 `--bg`**、不新增 CSS 檔 | UI_STYLE_GUIDE §1；新 CSS 檔會讓 index.html 的 `?v=` 從 5 處變 6 處 |
| 計分函式 | **不直接沿用** `scoreCalcMetric`（`js/profit.js:13045`）：它對 `null` 回 0，健診規定「沒資料不得算 0」。在 health.js 寫一支 `_hlLinear(v, zero, full)`：`v==null` 回 `null`，「越低越好」用 `zero > full` 表示，同一支處理 | 盤點 §4-1 |
| 燈號 | ≥80 綠、50–79 黃、<50 紅、沒資料灰。顯示分數用 `Math.floor`（理由同 `scoreFmt`（`js/profit.js:13075`）上方註解：顯示值不可高於實際值，免得 79.6 顯示成 80 卻是黃燈）。**不沿用 `scoreColor` 的寫死色碼**（`:13090`） | — |
| 雲端物件 | 塊 A、B：**0 個新物件**。只讀的觀測點一律**不以 `__cloud` 開頭**（`__healthBacktest`、`__healthKpiSnapshot`…），不被防護碼包、不影響 27 / 45 | CLAUDE.md TEST_NOWRITE 段 |

### 1-1. 塊 A：路由＋全通路「獲利、成長」（不寫雲端）

**範圍**
- 新頁面：
  - 全通路總覽表：15 個營運中通路（蝦皮 4、MOMO 5、酷澎 3、PChome、FriDay、博客來；盤點寫的 14 是少算），加上官網灰色一列、業外列出但不排名。
  - 單一通路卡片（點總覽某列展開）。
- 兩個面向（全通路）：**獲利**、**成長**，資料只用 KPI 月結（`app/kpi`，開站就訂閱，`js/profit.js:9705` `_kpiV2Install`）。
- 資料完整度標章：KPI 填寫 X/Y，這一塊只做 KPI 這一項。
- 近 12 個月分數走勢：當場重算。
- `__healthBacktest()`：Console 唯讀回測。
- 本機假資料：`__healthMock('demo' | 'empty' | false)`，只在 localhost 生效、資料只放記憶體。寫法照 `js/pages/inventory.js` 檔尾的 `__inventoryMock`。

**要改的檔案**

| 檔案 | 位置 | 改什麼 |
|---|---|---|
| `index.html` | `:85-88`（「總覽」群組，績效管理之後） | 加一行 `<button class="nav-item" data-route="health"><span class="icon">🩺</span><span>通路健診</span></button>`（骨架 HTML，不含邏輯） |
| `js/main.js` | `:15` 之後 | 加 `import './pages/health.js?v=…';` |
| `bump-version.js` | `:29` `EXPECT` 與 `:3`、`:11`、`:13` 註解 | `main: 12 → 13`，合計 17 → 18 處。**不改版號本身**，版號由合併端 bump |
| `CLAUDE.md` | 目錄結構、版號「17 處」段 | 加 `health`、改成 18 處 |
| `js/app.js` | `:1053` 之後 | `if (route === 'health') return true;`（附註解：所有登入者可看、不是部門） |
| `js/app.js` | `:1283` 之後 | `case 'health': main.innerHTML = this.viewHealth(); this.bindHealth(); break;` |
| `js/profit.js` | `:26934` 那段 `Object.assign(window, {…})` 之後，**新增一段**，不改既有段 | `window.__healthKpiSnapshot = function(months){…}`（下述） |
| `js/pages/health.js` | 新檔 | 見下 |
| `css/main.css` | 檔尾新段 | `hl-*` 樣式 |

**`__healthKpiSnapshot(months)`**（profit.js 新增的唯讀轉接，約 40 行）
- 用途：health.js 碰不到 profit.js 模組內的私有函式，由這支把 KPI 轉成「純資料」交出去。
- 回傳形狀：

  ```
  {
    ready,
    months: {
      'YYYY-MM': {
        [groupKey]: {
          [shop]: { rev, cost, pure, pureRate, ads?, qty, fill:{filled,total}, closed, since },
          _group: { totalRev, totalPure }
        }
      }
    }
  }
  ```

- 欄位怎麼來（一律走既有函式，口徑跟 KPI 頁一模一樣）：
  - `ready` ＝ `_kpiReady()`（`:9604`）。
  - 每店數字 ＝ `_kpiShopCalc`（`:10285`），裡面已經套 `_kpiRawForCalc`（`:12498`），處理合併欄、不適用欄、autoFill、關站歸 0。
  - `rev` 一律用 `_kpiRealRev`（`:10775`）：MOMO 取 `actualRev`，其他通路取 `rev`。
  - PChome 只有一家店，**純利改用 `_kpiCommonColTotals`**（`:10786`），也就是已扣物流運費的整組數字，跟 KPI 頁單店列一致。
  - `fill` 是 `_kpiFillSlots`（`:10324`）裡，`shops` 含這家店的格子的已填數／總數。
  - `closed` ＝ `_kpiGroupClosed`（`:12496`）。
  - `since` 取 `group.since` 或 `group.shopSince[shop]`。
- 不寫入、不訂閱、不碰 DOM，失敗回 `{ready:false}`。
- ⚠ 蝦皮各店的純利**不含**整組共同運費（`shopeeCommon`，`KPI_GROUPS` 蝦皮 `pure` 的 desc 有寫），所以各店純利率會比小計高。卡片 ⓘ 要寫明這點，不要另外攤。

**`js/pages/health.js` 結構**

檔頭寫法照其他頁面：`const App = window.App`，然後 `Object.assign(App, { viewHealth, bindHealth, … })`。

1. **純函式區**（不碰 window、Store、DOM、Date.now，node 可以直接載入測試）：
   - `HEALTH_RULES`（§2，`Object.freeze` 深凍結）
   - `HEALTH_CHANNELS`：對照表，盤點 §1-0。每列 `{id, label, type, kpi:{group, shop}, platform, ranked}`
   - `_hlLinear(v, zero, full)`
   - `_hlDim(subs)`：面向內按權重重新正規化，回 `{score|null, status, subs}`
   - `computeChannelHealth(channel, month, src, rules)`：回傳

     ```
     {
       score, light, isReference, ranked,
       dimsUsed: N, dimsTotal: M,
       dims: { [key]: { score, status, reason, subs: [ {key, raw, zero, full, score, status, trace} ] } },
       topReason
     }
     ```

   - `computeHealthTrend(channel, months, src, rules)`：走勢圖用，就是對每個月呼叫一次上面那支。
   - `status` 只有五種值：`ok`、`na`（不適用）、`insufficient`（資料不足）、`pending`（尚未上傳）、`smallRev`（營收過小）、`closed`（已關站），**沒有任何一種會被算成 0 分**。
   - `trace`：可追溯資訊，例如 `{src:'app/kpi 2026-10 shopee.玩樂.rev', num, den}`。
2. **資料收集區**：
   - `_hlCollect(months)` 呼叫 `window.__healthKpiSnapshot`；塊 B 再加商品層。
   - 只有這一區碰 window。
3. **畫面區**：`viewHealth`、`bindHealth`。
   - 事件用 `data-hl-*` 加上 `#main-content` 上**只綁一次**的具名委派，照 inventory.js 的寫法。
   - 所以 health.js 的函式不必掛 window，也不會有 inline handler 漏掛、點了 `ReferenceError` 的問題。
4. **Console 區**：`__healthBacktest`、`__healthMock`，掛在 window。

**評分月份**
- 預設月份：台灣時間的上個月。這個月全部通路 KPI 填寫率低於 90% 時，再往前推一個月。
- 某個通路自己那個月 KPI 沒填完時，獲利、成長標「尚未上傳：2026/10 KPI 已填 5/8」，不算分。
- 月份下拉可以任選 2026-01 以後的月份。

**對既有功能的影響**
- 側欄多一顆按鈕；`main.js` 多 import 一個小檔，登入前就會下載，大約 30–40KB。
- 其他頁面行為零變化：
  - profit.js 只多一支沒有人呼叫的函式，健診頁以外不會用到。
  - 不加進 `CLOUD_RENDER_ROUTES`，所以 app/main 推播不會重畫健診頁，健診頁也不會影響別頁。
- 進健診頁會觸發 profit.js 動態載入，跟進 KPI 頁一樣，沒有新增下載量。**塊 A 不叫任何 `__load*Subs`**。

**快照／指紋（動手前拍）**

1. **程式快照**：
   - 存一份動手前的原檔：
     `git show 19c532b:js/profit.js > <scratchpad>/before/profit.js`
     `app.js`、`main.js`、`index.html`、`css/main.css`、`bump-version.js` 同樣各存一份。
   - 記下不該動的檔案的雜湊值：`git ls-files js css | xargs sha256sum > <scratchpad>/before/sha.txt`。
     收尾時除了上表列出的檔案，其他雜湊必須全部相同。
2. **profit.js 只能是新增**：
   - 執行 `git diff -U0 19c532b -- js/profit.js | grep -E '^-[^-]'`，必須零行。
   - 而且 `+` 行只能落在 `:26934` 那段之後的一個 hunk。
3. **畫面指紋**：
   - 在你的 localhost（防護下），開 KPI 月結 → 2026-09、2026-10 總覽。
   - 截圖「通路表」各店的營收、純利、純利率（`_kpiChannelTableHtml` 那張表）。
   - 改完後同月份再截一次，必須逐字相同。
   - 健診卡上的「獲利」原始值也必須跟這張表逐店相同，這就是驗收的對帳。

### 1-2. 塊 B：蝦皮廣告效率、商品結構、拖累前 10；MOMO／PChome 動銷率（不寫雲端）

**範圍**
- 蝦皮四店：
  - 廣告效率（§2-4）。
  - 商品結構：虧損占比、低利占比、長期虧損占比。蝦皮的動銷率要等塊 C 有資料，之前標「尚未上傳」。
  - 拖累前 10 名。
- MOMO 甲配、乙配、MO+ ×3：商品結構裡的**動銷率**、虧損占比、長期虧損占比，以及拖累前 10（沒有廣告類原因）。
- PChome：商品結構裡的**動銷率**、虧損占比，以及拖累前 10。
- 點擊拖累商品跳到淨利表（§4-5）。
- 資料完整度標章補上各平台的資料時間：
  - 蝦皮：報表 `ts`。
  - MOMO：當月有沒有對帳單（`momoLoadReconcile`）。
  - PChome：最新匯出時間（`pchomeLatestExport`）。

**現有口徑函式能不能「不依賴畫面狀態」直接呼叫**（已逐一讀過）

| 函式 | 行號 | 依賴 | 結論 |
|---|---|---|---|
| `momoPeriodTotals(shop, 'YYYY-MM-FULL')` | `:17581` | 只依賴 `momoLoadProducts`（`:14151`，讀 `_profitMem` → `_mem` → localStorage，經 `_momoLsReadNote`）和 `momoAggregatePeriods`（`:14757`）。在 `:14757-14908` 裡用 grep 找 `momoState` / `state.` / `document.`，**零命中**。用到的是對帳、運費、E001、成本對照，這些都是資料鏡像，不是畫面選擇 | ✅ 可以直接呼叫。前提是 `__loadMomoSubs` 已載完；判斷條件照抄 `_kpiEnsureMomoData`（`:11375`）。`lean:true` 時 MO+ 每次約 40ms（`:17592` 註解） |
| `pchomeCalendarCalc(calMonth, '轉單'\|'寄倉')` | `:29505` | 讀 `pchomeLoadProducts`、`pchomeLoadOrders`、`pchomeLoadRecon`，三者都由 boot 訂閱緩存在 `window.__pchome*CloudLatest`，profit.js 載入時接手（`js/firebase.js:1080-1086`）。轉單會 `console.log` 一行運費摘要（`:29624`），只是記錄、沒有寫入 | ✅ 可以直接呼叫，而且**已經在 window 上**（`:30010`）。判斷就緒照抄 `_kpiEnsurePchomeData`（`:11993`） |
| `pchomeBaseCount(shop, calc)` | `:29697` | 純函式，吃 `calc` 和 `pchomeLoadProducts()` | ✅ 但它只回「在架商品頁數」，**沒有分子**，健診要另外算（見 §3） |
| 蝦皮報表 `lsLoad(shop,'YYYY/MM',half)` | `:2626` | 讀 `_profitMem` → `_mem` → `_reportCacheParse(localStorage)`（`:2618`，LZ1 也解得開）。**已經在 window 上** | ✅ 但要先叫 `__loadShopeeSubs` 和 `__loadArchiveSubs`，並等 `__profitsCollectionReady()`、`__profitArchivesReady()`（`js/firebase.js:224`、`:129`），否則「還沒載到」會被誤判成「沒資料」 |
| `momoAggregatePeriods` 逐商品 | `:14757` | 同第一列 | ✅ 拖累清單和長期虧損要逐商品，不經 momoPeriodTotals |

**要改的檔案**

| 檔案 | 位置 | 改什麼 |
|---|---|---|
| `js/profit.js` | 塊 A 那段之後再新增 | `window.__healthProductSnapshot(platform, shop, month)`：唯讀，回逐商品精簡列 `{key, groupKey, name, rev, profit, margin, adsFee?, roi?, clicks?, gross?, platFee?, sold, active, cost?}`，以及口徑相同的 `soldActive / activeTotal`（MOMO 直接轉交 `momoPeriodTotals` 的結果，保證跟畫面一致） |
| `js/profit.js` | 同上 | `window.__profitOpenAt({platform, shop, month, half, code})`：跳轉用（§4-5） |
| `js/pages/health.js` | 純函式區 | 加結構、廣告、拖累的規則；`_hlSellThrough(rows, mode:'page'\|'company')`；`_hlCompanyKey(code)`（`/^[A-Za-z]+\d+-\d+$/` 去尾段，不符格式就退回用商品頁 key，並計入「備援數」） |
| `js/pages/health.js` | 資料收集區 | 進單一通路卡片時才載該平台的訂閱組（§4-6 效能） |
| `css/main.css` | `hl-*` 段 | 拖累清單、原因標章 |

**對既有功能的影響**
- 健診頁打開蝦皮或 MOMO 卡片時，會載入該平台的訂閱組。這跟使用者自己點進淨利表的蝦皮或 MOMO 一樣，各組有 `__loadedSubGroups` 守衛，只會訂一次。
- 唯一的新風險是**手機記憶體**（盤點 §8 風險 5），所以手機寬度（≤768px）不自動載，改顯示「載入商品層資料」按鈕。
- `__profitOpenAt` 切淨利表期間時**不寫持久狀態**。做法照 `tagFxJump`（`:5554-5569`）：先存 `ec_lastHalf_{shop}`，叫完 `onHalfChange(…, false)` 再還原。
  - 寫入 `ec_profitView` 只是本機 localStorage，不上雲，跟使用者自己點通路一樣。

**快照／指紋**

1. 程式：同塊 A，profit.js 仍然只能是新增。
2. **MOMO 對帳**（最重要）：
   - 健診卡上「商品頁口徑」的動銷率（分子／分母），必須跟 MOMO 總覽右側淨利率／動銷率比較圖（`:23467-23471`，也是 `momoPeriodTotals`）的同一家、同一個月**完全一致**。
   - 動手前先記下 2026-09、2026-10 五家的數字。
3. **PChome 對帳**：健診的「料號口徑」分子／分母，必須等於 PChome 總覽 KPI 卡的動銷率（`:29917`，`calc.bizCount ÷ skus.filter(!disc||hasBiz)`），同一個日曆月、轉單＋寄倉分別比。
4. **蝦皮對帳**：健診「虧損商品數」必須等於淨利表同月整月篩「賠錢中」標籤的筆數加上沒投廣告但虧損的筆數（`calcAnalysisAll` `:5100` 的 D>0&&P<0 只涵蓋有廣告的）。動手前用淨利表篩選數記下來。
5. 效能：在 Console 記錄 `performance.now()`，看一次重算 17 通路 × 12 月花多久，寫進驗收紀錄。
6. 三段對帳程式（MOMO、PChome、蝦皮）寫在 §5-2-1，只讀。

**實作紀錄（2026-11-02，塊 B，規則升 `v3-2026-11`）**

- profit.js（只加不改，接在 `__healthKpiSnapshot` 後面）：
  - `window.__healthLoadProducts(平台)`：叫對應的訂閱組，等資料到齊，最多 15 秒。蝦皮另外回 `archivesReady`。
  - `window.__healthProductSnapshot(平台, 通路, 月)`：同步、只讀。蝦皮回各期報表列；MOMO 回逐商品；PChome 回轉單＋寄倉逐料號和料號口徑分子分母。「已調整」只回日期。
  - `window.__profitOpenAt({platform, shop, month, code})`：跳淨利表。
    - 蝦皮用 `onMonthChange(byUser=false)`，先存後還原 `ec_lastMonth_{通路}`；搜尋直接改 `state[shop].search`＋`applyFilters`，不走會存 `ec_filterstate` 的 `setSearch`。
    - MOMO／PChome 只改記憶體變數。
    - 唯一寫的是 `ec_profitView`／`ec_curShop`，跟使用者自己點通路一樣。
    - 有整月報表切整月，沒有就切上半月。
- health.js：
  - 純函式：`_hlProdNormalize`、`_hlShopeeMerge`、`_hlSellThrough`、`_hlAdsDim`、`_hlStructureDim`、`healthDragList`、`healthAdsRuleCompare`。
  - 載入與排隊：`_hlEnsurePlatform`、`_hlWantProd`、`_hlRunQueue`。
  - 畫面：`_hlProdBadges`、`_hlProdBarHtml`、`_hlDragHtml`、`_hlProdNoteHtml`。
- **跟方案原文不同的地方**：
  1. **低利商品**：§2-5 原寫蝦皮用「毛利率 < 15%」。改成三個平台一律用「商品純利率介於 0 到 5%、營收 ≥ 3,000」。理由：毛利率已經不計分（§2-3），而且三個平台用同一把尺才能比。拖累清單的「📉 低利」也一樣。
  2. **酷澎商城的商品結構**：第一版標「不適用」（手續費是估算、成本可能缺，§1-4）。之後要做再升版本。
  3. **長期虧損**：用「同一個品號／料號（PChome 再加轉單／寄倉）上個月也虧」判斷。上個月沒有商品資料時標「資料不足」，不當成沒虧。
  4. **走勢圖**：商品層面向只在展開的那個通路補算 12 個月，其他通路只算評分月份、上個月、上上個月。所以總覽的「比上月」可以含商品層，走勢只有展開的那家有完整商品層。
  5. **「✓ 已調整」**：只顯示評分月份上個月 1 號以後的調整日期，更早的不算。
  6. ~~商品層沒載入前，總分只含已經有的面向~~ → 2026-11-02 驗收後改掉，見下面「驗收後修正」1。

**驗收後修正（2026-11-02，localhost 真實資料驗收發現）**

1. **分數不得因有沒有展開卡片而改變**：
   - 電腦寬度打開健診頁，就在背景**依序**載入蝦皮 → MOMO → PChome（`_hlAutoLoad`，一次一個平台），載完自動重算整頁。
   - 載入中、未載入、逾時的蝦皮／MOMO／PChome 通路**不給總分、不排名**（`computeChannelHealth` 回 `prodLoading`／`prodIdle`／`prodTimeout`），總分欄顯示「載入中」「未載入」「逾時」。
   - 手機寬度維持卡片裡的「載入商品資料」按鈕。展開卡片不再觸發載入。
   - 商品結構的「上個月」還在算時，整個面向是「載入中」，不先用少一個子指標的分數。
2. **等待上限 15 秒 → 60 秒**：實測蝦皮在辦公室電腦約 39 秒才 ready。逾時顯示「商品資料載入逾時，請先進淨利表再回來，再按「↻ 重新計算」」，不顯示成無資料。
3. **MOMO 就緒判斷太早**（實測甲配 2026-09 先算出 264/563，幾秒後才變 273/563）：
   - 原因：`momoLoadProducts` 會退回讀 localStorage 的舊資料，「商品數 > 0」在雲端快照還沒到時就成立。
   - 改成：等雲端快照真的寫進 `Store._profitMem`（甲配、乙配商品主檔＋至少一份月對帳），而且最後一次資料更新事件之後**安靜 3 秒**才算 ready。
   - 蝦皮另外等 profits 與舊月份分片的伺服器快照；PChome 另外等訂單快照。
   - 載好之後，聽各平台的資料更新事件（`window.__healthProductEvents`：`profitDataReady`、`momoDataReady`、`momoReconcileReady`…），1.5 秒防抖後重算已經算過的快照。舊數字留到新的算好才換，不會閃成「載入中」。PChome 的商品清單／對帳沒有事件，每 3 秒比一次快照是不是換了。
4. **回測**：
   - `__healthBacktest()` 沒開 `products` 時只算 KPI（商品層面向「不適用」），不會因為商品層沒載入就沒有總分。開了 `products` 時，沒載入的平台也當成只算 KPI。
   - 報表沒有 ROI 的月份，候選規則 (b)(c) 不比。
   - 新增 `__healthCalibrate()`（§2-7-2）。
5. **頁尾說明**改由規則產生（`_hlFootText`：計分面向、各自涵蓋哪些通路與資料來源、之後加入的面向）。

**第二輪驗收後修正（2026-11-02，規則升 `v4-2026-11`）**

1. **載入期間主執行緒卡住、60 秒誤判逾時**（實測桌機 renderer 超過 45 秒沒回應；蝦皮 60 秒被判逾時，約 2 分鐘後資料其實已 ready）：
   - **載入期間不重算**：任何平台還在載入時，資料更新事件只把平台記成「待重算」（`_hlScheduleRefresh` → `_hlDirty`），不排計算。平台到齊（或逾時）才在 `_hlEnsurePlatform` 結尾 `_hlFlushDirty()`，每個平台到齊各算一次。
   - **重算分段讓出主執行緒**：`_hlRunQueue` 一次算一份快照，中間用 `requestIdleCallback`（沒有就 `setTimeout` 16ms，`_hlNextTick`）讓出。
   - **Console 印耗時**：每批印 `[health] 商品層重算 N 筆，計算 X ms（經過 Y ms），最慢 …`；單份超過 200ms 另外印；整頁印 `[health] 整頁重算 X ms（KPI 快照 a ms、評分 b ms）`；每個平台印 `[health] 商品層 X 到齊，等了 N 秒`。
   - 「已調整」日期（解析蝦皮備註＋洞察表調整紀錄）每個通路快取 20 秒（profit.js `_healthAdjCache`），同一批重算不會每個月重解析一次。
   - ⚠ 這些都是依讀碼判斷的卡頓來源，**真實環境卡在哪裡要看 Console 的耗時紀錄確認**。
2. **不放棄**：
   - `__healthLoadProducts` 預設上限 60 秒 → 5 分鐘；健診頁傳 30 分鐘（等於一直等）。
   - 60 秒起，畫面寫「仍在載入（已等 N 秒）」，資料一到自動重算。5 分鐘起再加「請先進淨利表點一下這個平台再回來」，**照樣繼續等**。
   - 秒數每 5 秒更新一次（`_hlStartTicker`），只改頁頂「商品層資料」那一列，不整頁重算；跨過 60 秒、5 分鐘時才整頁重畫一次換提示字。排隊還沒開始的平台寫「排隊中」。
3. **MOMO 逐商品利潤＝MOMO 總表「淨利貢獻」欄**（驗收：只用 `momoAggregatePeriods` 時，甲配 2026-09 有 254／262 個商品金額跟畫面不同，整家合計相同）：
   - 原因：總表 render（`:17762`）在逐商品彙總之後，還會跑 `momoStage4Redistribute`。甲配／乙配依各商品的出貨型態重分運費，乙配倉租用 C1212 的逐商品實際值。整家合計不變，逐列會變。
   - 改成：`__healthProductSnapshot('momo', …)` 跟總表走同一條：`momoClearFeeRateCache()` → 逐商品 `momoAggregatePeriods(…, {lean:true})` → `momoStage4Redistribute(通路, 'YYYY-MM-FULL', rows)`。回傳多一個 `freightMode`（precise／proportional／none／error）。重分失敗不 throw，退回彙總值。
   - **逐列加總跟總表合計為什麼會不同**：健診只算「本月有銷售、有成本」的商品。沒賣出的商品不算進來，乙配會掛倉租、淨利是負的；缺成本的商品也不算。卡片「商品結構」三個占比的 ⓘ、拖累清單標題的 ⓘ 都寫了這段口徑（`_hlMomoProfitNote`）。
   - 這段是讀碼推論，沒有用真實資料比過合計。§5-2-1 ④ 可以照樣用來比逐列金額。
4. **門檻 v4**：見 §2-5、§2-6、§2-7-2。

### 1-3. 塊 C：洞察表上傳商品表現時，多存「當月快照」（會新增寫入）

**範圍**

洞察表「商品表現（蝦皮）」上傳時，**現有流程一個字都不改**，另外多存一份按月的精簡快照。內容是**商品層**，每個商品 ID 一筆：
- 商品當前狀態（正常、未上架、已違規、已刪除…，存原字）
- 銷量（「數量-全部訂單」那一欄）
- 加入購物車件數
- 商品頁訪客數（加入購物車）
- 商品頁訪客數。這欄是加購率的分母，表頭名稱要用真實檔案確認，見下方⚠

用途：
- 蝦皮動銷率：分子＝銷量 > 0；分母＝正常 ∪ 銷量 > 0。
- 加購率：之後放進「流量」面向（不在這一版的分數裡）。

**檔案實際格式（動銷 §追記 17:00，Kelly 的維克 10 月檔）**
- 主表「最佳表現商品」：437 個商品列、1275 個規格列。
- 商品列有「商品 ID」「商品當前狀態」；規格列有「商品選項貨號」「規格當前狀態」。
- 包含零銷商品。
- 22 個貨號尾巴夾著 Tab 字元。
- ⚠ 現有 `parseInsightPerfExcel`（`js/pages/marketing.js:795-850`）的做法：
  - 用 `rows[0]` 當表頭。
  - 「曝光＝0 且點擊＝0」的列直接丟掉（`:830-833`）。
  - 規格列的商品 ID 可能是空的。
  - 所以**不能從它的輸出推**，要另外解析。
- ⚠ 上面五欄的確切表頭字樣，我手上只有「動銷」追記裡的描述，**實作前要用真實檔案逐字確認**（檔案不進 repo，我只讀表頭）。

**存在哪裡：比較**

| | (甲) 塞進現有 `app/insight_{通路}` | (乙) 新 collection `shopee_perf_months`，一通路一月一份 doc（**建議**） |
|---|---|---|
| 大小 | 每月約 437～1,200 個商品 × 每筆約 45～60 bytes（商品 ID 當 key，值是 `[狀態碼,銷量,加購件數,加購訪客,訪客]` 短陣列）≈ **25～70KB／月**。12 個月 ≈ 0.3～0.85MB，**加在既有的 master／weeks／notes／perf 上面，好麻吉一年內就可能撞 1MB** | 一份 doc 只有 25～70KB，離 1MB 很遠，永遠不會長大 |
| 對既有功能 | 要改 `firebase.js` `insightShopFromKey` 的 regex（`:754-757`，只認 `master\|weeks\|notes\|perf`）、`app.js` `_dropInsightKeys`（`:3102`）、`_insClearPiecePlan`（`marketing.js:2432`）、`__lsTidy` 的洞察表副本規則（`profit.js:1532`）。洞察表訂閱每次推播都會多帶整年快照，**每個打開洞察表的人都要多下載** | 不碰任何既有 key 和訂閱；健診頁需要時才 `getDoc` 該月 |
| 雲端物件 | 不增加物件，但 `__cloudInsightByShop` 要加方法 → 方法數 +1 | **新增 1 個物件** `__cloudShopeePerf` → **28 / 46（推算）** |
| 本機 | 會經 `Store.set` 進 localStorage，占本機空間（現在已經有快滿的預警） | **不經 Store、不進 localStorage**（照 `__cloudInventory`／`__cloudIssues` 的寫法） |

**建議 (乙)**。設計如下：

- **doc**：`shopee_perf_months/{通路}_{YYYY-MM}`，例如 `維克_2026-10`。內容：

  ```
  {
    schema: 1,
    shop, month,
    cols: ['st', 'qty', 'cartQty', 'cartVisitors', 'visitors'],
    stMap: { '正常': 1, '未上架': 2, … },     // 狀態原字對照，遇到新字就加
    items: { [商品ID]: [st, qty, cartQty, cartVisitors, visitors] },
    counts: { products, sold, byStatus: {…} },
    sheet: '最佳表現商品',
    fileName,
    uploadedAt, uploadedBy
  }
  ```

  - 規格列不存。歸組直接用商品 ID，這就符合「雨衣四色算 1 個」。
  - 商品名不存，畫面需要時從 `_master` 對。
- **firebase.js 新物件**（照 `__cloudInventory` `:1019` 的寫法）：

  ```
  window.__cloudShopeePerf = {
    getDoc: (shop, month) => …,       // 命名必須是 getDoc：讀取白名單是字串比對（app.js:2958 READ_OK）
    setMonth: (shop, month, data) => setDoc(…),   // 整份覆蓋：同月重傳＝以最新一份為準
  };
  ```

  - 成功回 `{ok:true}`；被唯讀或本機防護擋下回 `undefined`，呼叫端一律 `r && r.ok`。
- **寫入時機**（`marketing.js:1092-1097` 之後）：
  1. 既有的 `Store.set(sKey('perf'), …)` **先照舊跑完**。
  2. 再解析月快照，跳一個小確認窗：
     - 月份預設＝台灣時間的上個月，可以改。
     - 確認窗顯示「437 個商品、有賣 276、正常 370…」。
     - 那個月已經有快照時，顯示「已有 11/03 Kelly 上傳的版本，要覆蓋嗎」。
  3. 按確認才呼叫 `setMonth`，寫完讀回比對 `counts`。
  - 月快照失敗**不影響**既有 perf，各自用各自的 toast。
- **狀態時效**：檔案裡的狀態是**匯出當下**的狀態。
  - 上傳時間晚於該月結束後 10 天，就在快照加 `stLate:true`。
  - 健診卡片顯示「狀態為 11/15 匯出，可能不代表 10 月底」。
- **本機測試**：`__shopeePerfMock(true)`，只在 localhost 生效、只放記憶體，照 `__inventoryMock`。
- **CLAUDE.md 要同步改**：「資料與後端」加一段 `shopee_perf_months`；TEST_NOWRITE 物件數 27 → 28；MUST 清單加 `['__cloudShopeePerf', 'setMonth']`；物件下限改 28。
  - ⚠ 防護碼不在 repo 裡，**你本機的防護碼 MUST 清單和下限要你自己更新**，否則新物件沒有 fail-loud 保護。

**舊資料怎麼處理**
- 現有的 `ec.insight_{通路}_perf` 沒有期間、沒有狀態、零曝光的商品還被丟掉了，**沒辦法回填**。原封不動，洞察表照舊讀它。
- 蝦皮動銷率從「第一個用新版上傳的月份」開始算。
- 建議塊 C 上線後，請 Kelly **立刻**補傳四家的 10 月商品表現檔（11 月初匯出，狀態最接近 10 月底）。這樣 10 月就有第一個點。
- 之前的月份一律標「尚未上傳」。
- 動銷建議「累積 2 個月以上才計分」，所以蝦皮動銷率最早從 **2026-11 那一期**開始進分數，2026-10 只顯示、標「參考」。

**對既有功能的影響**
- 洞察表上傳多一個確認窗、多一次雲端寫入；**perf 的內容和形狀完全不變**。
- 舊分頁（部署前開著的）不會寫月快照。這不危險，只是少一筆，因為 setMonth 是整份覆蓋自己那份 doc，不會蓋到別人的資料。

**快照／指紋**
1. **perf 不變**：
   - 動手前，在 localhost 防護下，用同一個檔案在 Console 跑 `await App.parseInsightPerfExcel(file)`，用 `JSON.stringify` 存下結果。
   - 改完再跑一次，**逐字相同**。
   - 取得 `file` 的方法：在 Console 建一個 `<input type=file>`，自己選檔。程式碼附在 §5-3。
2. **新解析器對真實檔**：維克 10 月必須是 437 個商品；正常 370、未上架 65、已違規 1、已刪除 1；有賣 276、零銷 161。這些是動銷追記的數字。
3. 雲端物件：`grep -nE "^\s*(window\.)?__cloud[A-Za-z0-9_]*\s*=" js/firebase.js` 必須從 27 行變 28 行，多出來的是 `__cloudShopeePerf`。

---

## 2. 評分面向、子指標、公式、門檻、權重

> 起點：盤點 §4、動銷 §5。**我建議調整的地方標 ✏️，附理由。** 門檻全部是起始值，要用 `__healthBacktest()` 校準後才定版（§2-7）。

### 2-1. 面向權重

| 面向 | 盤點原權重 | 動銷調整後 | 本方案 | 第一版有沒有做 |
|---|---|---|---|---|
| 獲利 | 30 | 30 | 30 | ✅ 塊 A，全通路 |
| 成長 | 20 | 20 | 20 | ✅ 塊 A，全通路 |
| 廣告效率 | 15 | 15 | 15 | ✅ 塊 B，蝦皮 |
| 商品結構 | 15 | 20 | 20 | ✅ 塊 B：蝦皮、MOMO、PChome |
| 營運執行 | 10 | 10 | 10 | ❌ 下一版 |
| 流量 | 10 | 5 | 5 | ❌ 下一版（塊 C 先存資料） |

✏️ **M（「依 N/M 個面向」的分母）＝這個規則版本對這個通路「已實作而且適用」的面向數**。
- 「下一版」的面向不算進 M，卡片底部灰字列「下一版加入：營運執行、流量」。
- 理由：沒實作的面向如果算進 M，每張卡都會永遠顯示「4/6」，讀起來像資料有缺，其實是功能還沒做。

各通路第一版的 M：
- 蝦皮：4（獲利、成長、廣告、結構）
- MOMO 五家、PChome：3（獲利、成長、結構）
- 酷澎商城、酷澎買斷、FriDay、博客來、業外：2（獲利、成長）
- 官網：不評分
- 塊 B 實作：商品層「尚未載入」「載入中」的面向**算進 M、不算進 N**（例：蝦皮還沒展開時是「依 3/4」，廣告佔比讀 KPI 所以有分數），「不適用」才不算進 M。

### 2-2. 共同規則（✏️ 有兩處調整）

- **總分**＝Σ(面向分 × 權重) ÷ Σ(有分數的面向的權重)；只要有一個面向有分數就算總分。
- ✏️ **參考分規則**：
  - 盤點寫「權重合計 < 50%（例如只有獲利＋成長）」改參考分，但 30＋20 剛好是 50，不小於 50，例子和規則自相矛盾。
  - 如果改成 ≤ 50，酷澎、FriDay、博客來等 5 個通路會永遠是參考分、不排名，跟老闆要的「每個通路都有分數」衝突。
  - **建議**：**有「獲利」分數，而且至少還有 1 個其他面向有分數，才算正式分**；否則是灰色參考分，不排名。
  - 例：PChome 在 2026-12 之前成長是「資料不足」。只有獲利時是參考分；塊 B 加了動銷率之後就變正式分。
- **最低營收門檻**：某通路某月 KPI 實際營收 < 30,000（`KPI_ANOMALY_RULES.minRev`，`:10793`），那個月的**比率類子指標**一律標 `smallRev`、不評分。金額類不受影響（目前沒有金額類子指標）。
- **子指標缺資料**：在面向內重新正規化；整個面向都沒資料，就是面向狀態。
- **關站**：`_kpiGroupClosed` 為真的月份，整張卡灰色「已關站（2026/05 起）」，不算分、不排名、不進平均；走勢只畫到 2026-04。
- **業外**：照算，但 `ranked:false`，排在表格最後、官網之前。
- **排名**：只在同一個通路類型裡排（§2-6）；全通路總覽照分數排序，表頭寫「跨類型比較僅供參考」。

### 2-3. 獲利（30）與成長（20）：全通路，來源都是 KPI

> **v2-2026-11（2026-11-02 用真實 KPI 校準後定版，見 §2-7-1）**。下表是現行規則；v1 起始值保留在括號裡備查。

| 子指標 | 權重 | 公式（`__healthKpiSnapshot` 的欄位） | 零分線 → 滿分線 |
|---|---|---|---|
| 純利率 | **100%**（v1：70%） | `pure ÷ rev`（rev＝實際營收；MOMO 是 `actualRev`） | 依類型，見 §2-6 |
| 毛利率 | **參考，不計分**（v1：30%） | `(rev − cost) ÷ rev` | 不計分，卡片只顯示原始值 |
| ✏️ 純利率變化 | 50% | 近 2 個月合計純利率 − 前 2 個月合計純利率（**百分點**，分子分母都用合計，不是平均率） | **−4.0pp → +2.5pp**（v1：−5pp → +2pp），全通路共用 |
| 營收成長 | 50% | 近 2 個月營收合計 ÷ 前 2 個月營收合計 − 1 | **−20.5% → +19.0%**（v1：−15% → +10%），全通路共用 |

- **毛利率為什麼不計分（2026-11-02 決定）**：真實資料各通路毛利率幾乎不動，而且由平台價格結構決定：
  - MOMO 甲配 9 個月 68.9%～70.4%
  - MOMO 寄倉 68.4%～74.9%
  - MO+ 55.7%～61.9%
  - 酷澎 46.7%～49.2%

  拿來打分數，分數只反映門檻畫在哪裡，不反映經營好壞。所以第一版「獲利」只用純利率；毛利率留在卡片上，標「參考，不計分」。
  - 程式：`HEALTH_RULES.profit.subs` 的毛利率 `scored:false`、`w:0`。不進面向分數、不進主要扣分原因、不進回測百分位。
  - 卡片：毛利率那一列寫「毛利率（參考，不計分）」，**名稱旁多一顆 ⓘ** 說明為什麼不計分。文字在 `HEALTH_RULES.profit.subs[毛利率].why`，「📖 怎麼看這頁」用的是同一段：
    > 毛利率由各平台的價格結構決定（例如 MOMO 甲配長期約 69～70%），月與月幾乎不動，拿來評分只會反映門檻畫在哪裡，所以第一版只顯示供參考；獲利面向以純利率評分。

    最右邊那顆 ⓘ 照舊放公式、分子分母、來源。

- ✏️ **純利成長改成「純利率變化（pp）」**。原公式是「近 2 月平均純利 ÷ 前 2 月平均純利 − 1」，前期純利 ≤ 0 或很小時會爆掉或變號：前期 −1 萬、本期 +1 萬會算成 −200%。改用百分點就沒有這個問題，而且不受規模影響。
- **成長的資料要求**：前後 4 個月都要有 KPI，而且都不在 `since`／`shopSince` 之前，否則是「資料不足」。
  - PChome（since 2026-09）：**2026-12** 起才有成長。
  - FriDay、博客來（since 2026-08）：**2026-11** 起。
  - MO+玩樂（shopSince 2026-10）：2027-01 起。
- **蝦皮沒有口徑變更（已更正 2026-11-02）**：2026-10-16（v791／v792）已把蝦皮 2026-01～09 全部改用對帳單算法重算，並回補寫入 `app/kpi`。營收＝進帳報表買家支付 ÷ 1.05（未稅），1～9 月與之後是同一口徑，蝦皮成長照一般規則算。
  - ⚠ **蝦皮營收照撥款日入帳，月份之間會跳動**：例如 2 月農曆年撥款延後、3 月補回。這不是經營變化。
  - ⓘ 說明要寫明這一點。回測（§2-7）時特別看 2～3 月：2 月營收成長偏低、3 月偏高，屬於入帳時間造成的。
  - 2～3 月要是被打成紅燈或綠燈，就考慮把成長窗口從 2 個月拉長到 3 個月，改的話要升規則版本。
- **去年同月比**：盤點建議蝦皮、MOMO 改用去年同月比。但 KPI 只從 2026-01 開始；`data/revenue-history.json` 的 2022–2025 是首頁營收口徑，未稅含稅不明、MOMO 甲乙配又合併。**第一版不用**，等 KPI 累積到 2027 年再加。

### 2-4. 廣告效率（15）：蝦皮四店

| 子指標 | 權重 | 公式 | 零分線 → 滿分線 |
|---|---|---|---|
| 廣告佔比（越低越好） | 40% | KPI `ads ÷ rev` | 18% → 8% |
| 廣告合格率 | 30% | 有投廣告的商品裡，報表 `pureRate ≥ 20%` 的廣告費 ÷ 總廣告費（按花費加權） | 40% → 70% |
| ✏️ **廣告致虧占比**（越低越好） | 30% | 符合「`adsFee > 0` 且 `pureProfit < 0` 且 `pureProfit + adsFee > 0`」的商品廣告費合計 ÷ 總廣告費 | 30% → 5% |

- 子指標 2、3 用報表整月；沒有整月報表時，上下半月合併。
- **為什麼換掉「有點擊沒成交」**：
  - 2026/09 三家實測「點擊 ≥ 100 且轉換＝0」都是 **0 個**，照寫會永遠滿分。
  - 報表列沒存轉換數，只有 `roi`、`directROI`、`clicks`、`pureProfit`、`gross`、`platFee`（`buildShop` `:5014-5043`）。
- **新規則的意思**：「不投廣告這個商品是賺的、投了變賠」，代表廣告費直接吃掉利潤，正好是要抓的「燒錢沒換到成交」。
  - 它是淨利表「賠錢中」（`D>0 && P<0`，`:5115`）的子集，大家已經認得這個標籤。
  - 本來就賠（不投也賠）的商品歸到商品結構的「虧損」，不在這裡重複扣分。
- **回測要一起比的兩個候選**（`__healthBacktest({adsRules:true})` 會逐通路逐月印出命中筆數和花費占比）：
  - (b) **ROI 低於損益兩平**：`adsFee > 0`、`roi > 0`、`roi < rev ÷ (gross − platFee)`（廣告前毛利 ≤ 0 的商品不算）。
  - (c) **廣告沒帶來任何成交**：`adsFee ≥ 300` 且 `roi == 0`。這是盤點原規則去掉點擊門檻的版本，預期命中很少。
  - **挑選標準**：歷史中位數的花費占比落在 5%～25%（太低等於不觸發、太高等於罰全部）。對照森之旅 2026-05～07 純利下滑，那段期間要明顯偏高。
  - (a) 沒過這兩個標準時改用 (b)，升規則版本。
- 精確版（轉換數、加購）要等廣告 CSV 多存欄位，不在這三塊裡（盤點 P3）。

### 2-5. 商品結構（20）（✏️ `v4-2026-11` 已校準，2026-11-02 審查決定）

| 子指標 | 權重 | 公式 | 零分線 → 滿分線 | 適用 |
|---|---|---|---|---|
| **動銷率** | 30% | 有銷售商品數 ÷（期末在架 ∪ 本期有銷售），**以公司商品計**（§3） | 依類型，見 §2-6 | MOMO ×5、PChome（塊 B）；蝦皮（塊 C 之後） |
| 虧損商品營收占比（越低越好） | **40%**（v3：30%） | Σ(商品利潤 < 0 的營收) ÷ Σ營收 | **5.5% → 0.5%**（v3：25% → 5%），全通路共用一套 | 蝦皮、MOMO、PChome |
| 低利商品營收占比 | **參考，不計分**（v3：20%） | 商品利潤率在 0 到門檻之間、而且營收 ≥ 3,000 的營收 ÷ Σ營收 | —（v3：30% → 10%） | 同上，只顯示 |
| 長期虧損商品數占比（越低越好） | **30%**（v3：20%） | 連續 2 個整月利潤 < 0 的商品數 ÷ 本月有銷售的商品數 | **4.0% → 0.0%**（v3：15% → 3%），全通路共用一套 | 同上；PChome 從 2026-10 才有 2 個整月 |

- 低利占比不計分的理由：真實資料蝦皮 P75 才 0.4%，幾乎恆為 0、分數恆為 100（§2-7-2）。卡片照樣顯示數字，ⓘ 寫不計分的理由；拖累清單的「📉 低利」原因保留。
- 虧損、長期虧損三通路共用同一套門檻（審查決定，不依類型分）。

各通路「商品利潤」用哪個欄位（都是各頁畫面現有的口徑）：
- **蝦皮**：利潤＝`pureProfit`。~~低利門檻用毛利率 `gross ÷ rev` < 15%~~ → 實作改成一律「商品純利率 0～5%」（見 §1-2 實作紀錄 1）。
- **MOMO**：利潤＝MOMO 總表「淨利貢獻」欄（`momoAggregatePeriods` 彙總後再跑 `momoStage4Redistribute`，§1-2 第二輪驗收後修正 3）；低利一律用「商品純利 ÷ 商品營收」介於 0～5%。
- **PChome**：利潤＝`淨利`；`淨利 == null`（成本未知）的商品**不進分子也不進分母**，卡片顯示「成本涵蓋 92%」。
- ✏️ **低利占比改成只算 0 到門檻之間**：原本「毛利率 < 門檻」會把虧損商品重複算進去，同一個商品在兩個子指標各扣一次。
- **樣本太小**：本月有銷售的商品少於 20 個時，這個面向標「資料不足」。

### 2-6. 通路類型與依類型的門檻（純利率 v2-2026-11 已校準；動銷率 v4-2026-11 已校準，蝦皮除外）

| 類型 | 成員 | 純利率（v2） | 校準依據（2026-01～10） | 毛利率 | 動銷率（v4；括號是 v3 起始值） |
|---|---|---|---|---|---|
| 蝦皮自營 | 好麻吉、玩樂、森之旅、維克 | **0% → 24%**（v1：15%） | 樣本 36，P10 13.3%／P50 20.3%／P75 23.7% | 參考，不計分 | 30% → 65%（**待校準**，等塊 C） |
| MOMO 自出貨 | 甲配 | **0% → 39%**（v1：12%） | P50 37.8% | 參考，不計分 | **49.5% → 59.5%**（25% → 60%） |
| MOMO 寄倉 | 乙配 | **0% → 26%**（v1：10%） | P50 24.3% | 參考，不計分 | **72.5% → 81.0%**（40% → 75%） |
| MO+ | MO+ ×3 | **0% → 29%**（v1：12%） | P50 28.1% | 參考，不計分 | **8.0% → 31.5%**（25% → 60%） |
| 酷澎商城 | 商城-好麻吉、商城-露營館 | **0% → 34%**（v1：12%） | 樣本 6，P50 26.8% | 參考，不計分 | （不適用） |
| 買斷／小通路 | 酷澎買斷、PChome、FriDay、博客來 | 0% → 10%（維持） | 沒有樣本 | 參考，不計分 | PChome：**10.0% → 18.0%**（**樣本少**，20% → 55%） |
| 業外 | 業外 | 0% → 10%（維持） | 沒有樣本（不排名，不列入） | 參考，不計分 | — |

- 純利率零分線一律從「損益兩平」起算（0%）；滿分線＝同類型歷史 P75 四捨五入到整數 %（§2-7-1）。
- 滿分線高的類型（甲配 39%）不代表標準比較嚴，只是「跟同類型的好月份比」。跨類型分數只供參考。
- 「買斷／小通路」沒有樣本，是因為成員多半營收未滿 3 萬或期數不夠。等有樣本後依同一套規則重算，要升版本。
- ~~⚠ 動銷率門檻原本是照「商品頁口徑」猜的，塊 B 一定要用回測重定~~ → v4 已用公司商品口徑回測重定（§2-7-2）。蝦皮的動銷率要等塊 C 有上架資料才算得出來，門檻維持起始值、畫面標「待校準」。

### 2-7. 校準與定版

1. `__healthBacktest({from:'2026-01', to:'2026-10', products:true})` 逐通路逐月印出原始值。
2. 同一類型每個子指標看 P10／P50／P75。**不直接套 P10／P75**，改用 §2-7-1 的規則（獲利用絕對錨點；成長用最小間距＋中位數 65 分）。
3. 對照已知的好壞月份：
   - 森之旅 2026-05～07 應該是黃或紅；好麻吉應該大多是綠。
   - MOMO 動銷率要跟現有比較圖一致。
   - 蝦皮 2～3 月：營收照撥款日入帳，2 月農曆年撥款延後、3 月補回。成長分在這兩個月的跳動要單獨看，不能拿來定門檻。
4. 定版寫進 `HEALTH_RULES`，`version` 改成 `v1-2026-11`。之後改任何一個門檻都要升版本。卡片顯示版本號。
5. 健診**凍結自己的一份門檻**，不讀 `getAnaThresh()`、`getGrowthThresh()`。淨利表門檻被改時，健診分數不能悄悄跟著變。ⓘ 裡寫明兩者的關係。

### 2-7-1. 第一次門檻校準（已完成 2026-11-02，套用為 `v2-2026-11`）

**實跑結果與決定（2026-11-02，localhost 真實 KPI 2026-01～10）**

| 項目 | 結果 | 決定 |
|---|---|---|
| 純利率 | 零分線 0%；滿分線：蝦皮自營 24%（樣本 36，P10 13.3／P50 20.3／P75 23.7，建議中位分 84、滿分比例 22%）、MOMO 自出貨 39%（P50 37.8）、MOMO 寄倉 26%（P50 24.3）、MO+ 29%（P50 28.1）、酷澎商城 34%（樣本 6，P50 26.8）；買斷／小通路、業外沒有樣本 | **採用**；沒有樣本的兩類維持 0% → 10% |
| 成長（全通路共用） | 純利率變化樣本 33 筆：P10 −3.6pp／P50 +0.4pp／P75 +1.6pp ⇒ S＝max(4pp, 5.2pp × 1.25＝6.5pp)＝6.5pp ⇒ **−4.0pp → +2.5pp**<br>營收成長：P10 −15.4%／P50 +5.3%／P75 +16.2% ⇒ S＝max(20%, 31.6% × 1.25＝39.5%)＝39.5% ⇒ **−20.5% → +19.0%**<br>蝦皮成長排除 12 筆（窗口含 2026-02／03） | **採用** |
| 毛利率 | MOMO 甲配 9 個月 68.9%～70.4%、MOMO 寄倉 68.4%～74.9%、MO+ 55.7%～61.9%、酷澎 46.7%～49.2%：幾乎不動，由平台價格結構決定 | **改為只顯示、不計分**。「獲利」只用純利率（100%），毛利率在卡片上標「參考，不計分」 |

- 成長的零分線 / 滿分線是用校準程式的公式從上面 P10／P50／P75 重算的。node 測試也重算一次，跟 `HEALTH_RULES` 逐一相同。
- 程式已改：`js/pages/health.js` `HEALTH_RULES` 升 `v2-2026-11`；頁首加「📖 怎麼看這頁」，內容由 `_hlGuideBlocks(HEALTH_RULES)` 產生，門檻數字不寫死。
- 下面保留的是校準當時的規則說明與 Console 程式（程式裡的「現行」＝v1）。之後要重新校準時沿用同一套規則；只要把程式裡的 `CUR`／`CUR_G` 換成當時的現值，**毛利率那兩列現在只供參考**。

以下是校準當時的紀錄：

**為什麼要改**：塊 A 在 localhost 用真實資料回測，現行門檻 `v1-2026-11` 失準。
- 蝦皮純利率：實際分布 P10 13.3%、P75 23.7%，滿分線卻只有 15%，四家幾乎都滿分。
- MOMO 甲配：純利率 35.9%～39.2%、毛利率約 70%，遠高於滿分線 12%／40%，**永遠滿分**。

**校準規則（已決定 2026-11-02）**

| 面向 | 子指標 | 零分線 | 滿分線 | 最小間距 | 零分線為負 | 分類方式 |
|---|---|---|---|---|---|---|
| 獲利 | 純利率 | **固定 0%**（損益兩平） | 該類型 **P75 四捨五入到整數 %** | 8pp：P75 不到 8% 就用 8% | 不會發生（固定 0%） | 依類型 |
| 獲利 | 毛利率 | 該類型 **P10 往下取到 5% 的倍數** | 該類型 **P75 往上取到 5% 的倍數** | 8pp：不足時滿分線再往上取到「零分線＋8pp」以上的 5% 倍數 | **固定 0%** | 依類型 |
| 成長 | 純利率變化 | P50 − 0.65 × S | 零分線 ＋ S | 4pp | **照計算值**（成長本來就可以是負的） | **全通路共用一套** |
| 成長 | 營收成長 | 同上 | 同上 | 20pp | 照計算值 | 全通路共用一套 |

- 成長的 S：樣本 < 6 筆 ⇒ S＝最小間距；否則 S＝max(最小間距, (P75 − P10) × 1.25)。中位數落在 65 分，捨入到 0.5pp。
- **為什麼獲利改用絕對錨點、不追求中位數 65 分**：「獲利」要回答的是「賺不賺錢」，「跟自己比」交給成長面向。
  - 這樣可以避免甲配某月純利率 33%（仍是全公司最賺的通路）卻亮紅燈。
  - 用 v1 的「中位數 65 分」算法，甲配 33% 是 6 分；新規則下滿分線約 38～39%，33% 約 85 分。
  - 代價：獲利面向的歷史中位分不一定落在 60～70（分布高的類型會偏高），這是刻意的。
- **樣本**：2026-01 到上個月、所有**會排名**的通路的月份。業外、官網不列入；營收過小、資料不足、尚未上傳的月份不列入（口徑同健診頁）。
  - 業外沒有樣本 ⇒ 維持現值。
- **蝦皮 2026-02、03 排除（只排除成長的校準樣本，照常評分）**：
  - 成長要前後各 2 個月，最早從 2026-04 起才算得出來，所以「2 月、3 月本身」沒有成長樣本，照字面排除等於什麼都沒排除。
  - 實作改成：**蝦皮的成長樣本，只要 4 個月窗口裡包含 2026-02 或 2026-03 就排除**，也就是 2026-04、05、06 這三個月，四家共 12 筆。
  - 獲利樣本不受影響。
  - 排除的月份寫在程式的 `GROWTH_EXCLUDE`，輸出會列出排除了哪幾筆。
- 套用後升規則版本，建議 `v2-2026-11`。

**實跑前的試算**（已被上面的實跑結果取代，留作紀錄）：

| 類型 | 子指標 | 現值（零→滿） | 已知分布 | 新規則（零→滿） | 對照 |
|---|---|---|---|---|---|
| 蝦皮自營 | 純利率 | 0% → 15% | P10 13.3%、P75 23.7% | **0% → 24%** | P10 13.3% → 55 分（現行 89）；P75 以上滿分 |
| MOMO 自出貨（甲配） | 純利率 | 0% → 12% | 35.9%～39.2% | **0% → 約 38～39%**（估） | 33% → 約 85 分（v1 中位數算法是 6 分） |
| MOMO 自出貨（甲配） | 毛利率 | 25% → 40% | 約 70% | **約 65%（或 70%）→ 75%**（估） | P10 往下取 5%、P75 往上取 5% |
| 其他類型 × 子指標、成長兩列 | | | 待跑 | 待跑 | |

**請在 localhost Console 跑（只讀）**：
1. 登入後先進「通路健診」頁，讓 profit.js 載入、KPI 就緒。
2. 貼上下面整段。

它會印出：
- 校準表：每個類型 × 子指標的筆數、現值、P10／P50／P75、建議零分線／滿分線、理由、現行與建議的中位分和滿分比例。
- 成長樣本排除清單。
- 2026-09 各通路分數預覽：現行 vs 建議。
- 一段 Markdown：整段複製貼回給我，我把它填進這一節，取代上面的試算表。

自我檢查：預覽表的「**現行總分**」必須等於健診頁 2026-09 的分數。對不上，代表這段程式跟 health.js 算法不一致，先別信「建議」欄。

node 驗證（假資料，`__healthMock('demo')`，15 項全過）：
- 17 個通路的「現行總分」都等於 health.js。
- 獲利錨點：純利率零分線 0%、滿分線為整數 %；毛利率是 5% 的倍數；最小間距 8pp。
- 零分線為負：獲利固定 0%、成長照計算值。
- 蝦皮排除：只排除 2026-04～06 共 12 筆，只影響成長樣本，這些月份照常評分。
- 成長中位數落在 60～70。
- 程式裡沒有任何寫入呼叫。
- **還沒在真實資料上跑過。**

```js
(() => {
  // 通路健診門檻校準（只讀）：讀 window.__healthKpiSnapshot（記憶體裡的 KPI 月結），不寫任何資料、不連網。
  // 先進「通路健診」頁（讓 profit.js 載入、KPI 就緒）再貼。印三張表，最後一段 Markdown 可以整段複製貼回。
  if (typeof window.__healthKpiSnapshot !== 'function') { console.warn('先進「通路健診」頁再跑'); return; }
  const ym = ms => new Date(ms + 8 * 3600e3).toISOString().slice(0, 7);
  const add = (m, n) => { const y = +m.slice(0, 4), k = +m.slice(5, 7) - 1 + n; return (y + Math.floor(k / 12)) + '-' + String(((k % 12) + 12) % 12 + 1).padStart(2, '0'); };
  const FROM = '2026-01', TO = add(ym(Date.now()), -1), PREVIEW = '2026-09';
  const MIN_REV = 30000, N = 2;
  // 校準參數（決定 2026-11-02）
  //   獲利（純利率、毛利率）用絕對錨點：純利率零分線固定 0%、滿分線＝該類型 P75 四捨五入到整數 %；
  //     毛利率零分線＝P10 往下取 5% 的倍數、滿分線＝P75 往上取 5% 的倍數；兩者最小間距 8pp；零分線為負一律固定 0%。
  //   成長（純利率變化、營收成長）：全通路共用一套；樣本 < MIN_N 用最小間距，否則 max(最小間距, (P75−P10)×1.25)；
  //     中位數落在 65 分（TARGET）；捨入 0.5pp（STEP）；零分線為負照計算值。
  //   GROWTH_EXCLUDE：成長樣本排除——窗口（前後各 N 個月）含這些月份的樣本不列入校準（只影響門檻，照常評分）。
  const MIN_GAP = { pureRate: 0.08, grossRate: 0.08, purePp: 0.04, revGrowth: 0.20 };
  const MIN_N = 6, STRETCH = 1.25, TARGET = 0.65, STEP = 0.005;
  const GROWTH_EXCLUDE = { shopee: ['2026-02', '2026-03'] };   // 蝦皮營收照撥款日入帳：2 月農曆年延後、3 月補回
  // 現行規則（照抄 js/pages/health.js HEALTH_RULES v1-2026-11）
  const CUR = {
    shopee: { pureRate: [0, 0.15], grossRate: [0.35, 0.55] }, momoJia: { pureRate: [0, 0.12], grossRate: [0.25, 0.40] },
    momoYi: { pureRate: [0, 0.10], grossRate: [0.25, 0.40] }, moplus: { pureRate: [0, 0.12], grossRate: [0.25, 0.40] },
    coupang: { pureRate: [0, 0.12], grossRate: [0.25, 0.40] }, small: { pureRate: [0, 0.10], grossRate: [0.20, 0.35] },
    other: { pureRate: [0, 0.10], grossRate: [0.20, 0.35] },
  };
  const CUR_G = { purePp: [-0.05, 0.02], revGrowth: [-0.15, 0.10] };
  const TL = { shopee: '蝦皮自營', momoJia: 'MOMO 自出貨', momoYi: 'MOMO 寄倉', moplus: 'MO+', coupang: '酷澎商城', small: '買斷／小通路', other: '業外' };
  const SL = { pureRate: '純利率', grossRate: '毛利率', purePp: '純利率變化', revGrowth: '營收成長' };
  const CH = [
    ['好麻吉', 'shopee', 'shopee', '好麻吉'], ['玩樂', 'shopee', 'shopee', '玩樂'], ['森之旅', 'shopee', 'shopee', '森之旅'], ['維克', 'shopee', 'shopee', '維克'],
    ['MOMO 甲配', 'momoJia', 'momo', 'MOMO-甲配'], ['MOMO 乙配（寄倉）', 'momoYi', 'momo', 'MOMO-寄倉'],
    ['MO+ 麻吉', 'moplus', 'momo', 'mo+0號店(好麻吉)'], ['MO+ 森之旅', 'moplus', 'momo', 'mo+1號店(森之旅)'], ['MO+ 玩樂', 'moplus', 'momo', 'mo+2號店(玩樂)'],
    ['酷澎 商城-好麻吉', 'coupang', 'coupang', '商城-好麻吉'], ['酷澎 商城-露營館', 'coupang', 'coupang', '商城-露營館'],
    ['酷澎買斷', 'small', 'coupang', '酷澎買斷'], ['PChome', 'small', 'pchome', 'PChome'], ['FriDay', 'small', 'friday', 'FriDay'], ['博客來', 'small', 'books', '博客來'],
    ['業外', 'other', 'other', '業外', false], ['官網', 'small', 'website', '官網', false],
  ].map(([label, type, group, shop, ranked]) => ({ label, type, group, shop, ranked: ranked !== false }));
  const months = []; for (let m = FROM; m <= TO; m = add(m, 1)) months.push(m);
  const snap = window.__healthKpiSnapshot(months);
  if (!snap.ready) console.warn('雲端 KPI 還沒就緒，以下用本機鏡像');
  const cell = (m, c) => (((snap.months[m] || {}).groups || {})[c.group] || {})[c.shop] || null;
  const usable = c => !!c && !c.beforeSince && !c.closed && c.fill && c.fill.total > 0 && c.fill.filled >= c.fill.total;
  const fin = v => typeof v === 'number' && isFinite(v);
  // 原始值（口徑同 health.js：獲利要本月 KPI 填完且營收 ≥ 3 萬；成長要前後各 2 個月都填完、各 2 個月合計 ≥ 6 萬、窗口不早於 2026-01）
  const raw = (c, m) => {
    const o = {}, x = cell(m, c);
    if (usable(x) && x.rev >= MIN_REV) { o.pureRate = x.pure / x.rev; o.grossRate = (x.rev - x.cost) / x.rev; }
    const W = []; for (let i = 2 * N - 1; i >= 0; i--) W.push(add(m, -i));
    const cs = W.map(w => cell(w, c));
    if (W[0] >= FROM && cs.every(usable)) {
      const s = (a, k) => a.reduce((t, y) => t + (Number(y[k]) || 0), 0);
      const pr = s(cs.slice(0, N), 'rev'), rr = s(cs.slice(N), 'rev');
      if (pr >= MIN_REV * N && rr >= MIN_REV * N) {
        o.purePp = s(cs.slice(N), 'pure') / rr - s(cs.slice(0, N), 'pure') / pr;
        o.revGrowth = rr / pr - 1;
      }
    }
    return o;
  };
  const lin = (v, z, f) => !fin(v) ? null : Math.max(0, Math.min(1, (v - z) / (f - z))) * 100;
  const pct = xs => { const a = xs.filter(fin).sort((p, q) => p - q), p = q => a.length ? a[Math.min(a.length - 1, Math.max(0, Math.ceil(q * a.length) - 1))] : null; return { n: a.length, p10: p(.1), p50: p(.5), p75: p(.75) }; };
  const med = xs => pct(xs).p50;
  const rnd = v => Math.round(v / STEP) * STEP;
  const fix = v => Math.round(v * 10000) / 10000;   // 去掉浮點尾巴（0.15000000000000002）
  const floor5 = v => Math.floor(v * 20 + 1e-9) / 20, ceil5 = v => Math.ceil(v * 20 - 1e-9) / 20;
  // 獲利・純利率：零分線固定 0%；滿分線＝P75 四捨五入到整數 %，至少 8%（＝零分線 + 8pp）
  const proposePure = (xs, cur) => {
    const q = pct(xs), g = MIN_GAP.pureRate;
    if (!q.n) return { q, zero: cur[0], full: cur[1], why: '沒有樣本，維持現值' };
    const r = Math.round(q.p75 * 100) / 100;
    const full = Math.max(r, g);
    return { q, zero: 0, full: fix(full), why: '零分線固定 0%（損益兩平）；滿分線＝P75 四捨五入到整數 %' + (r < g ? `（P75 ${(r * 100).toFixed(0)}% 不足 8pp → 8%）` : '') };
  };
  // 獲利・毛利率：零分線＝P10 往下取 5% 的倍數（為負 → 0%）、滿分線＝P75 往上取 5% 的倍數；間距不足 8pp ⇒ 滿分線再往上取到「零分線 + 8pp」以上的 5% 倍數
  const proposeGross = (xs, cur) => {
    const q = pct(xs), g = MIN_GAP.grossRate;
    if (!q.n) return { q, zero: cur[0], full: cur[1], why: '沒有樣本，維持現值' };
    const notes = ['零分線＝P10 往下取 5% 倍數、滿分線＝P75 往上取 5% 倍數'];
    let zero = floor5(q.p10);
    if (zero < 0) { zero = 0; notes.push('零分線為負 → 0%'); }
    let full = ceil5(q.p75);
    if (full - zero < g - 1e-9) { full = ceil5(zero + g); notes.push('間距不足 8pp → 滿分線放寬'); }
    return { q, zero: fix(zero), full: fix(full), why: notes.join('；') };
  };
  // 成長：中位數 65 分，最小間距，零分線為負照計算值
  const proposeGrowth = (xs, sub, cur) => {
    const q = pct(xs), g = MIN_GAP[sub];
    if (!q.n) return { q, zero: cur[0], full: cur[1], why: '沒有樣本，維持現值' };
    const spread = STRETCH * (q.p75 - q.p10);
    const S = q.n < MIN_N ? g : Math.max(g, spread);
    const why = q.n < MIN_N ? `樣本少（${q.n} 筆 < ${MIN_N}）→ 最小間距` : (spread <= g ? '分布窄 → 最小間距' : '(P75 − P10) × 1.25');
    const zero = fix(rnd(q.p50 - TARGET * S)), full = fix(zero + Math.max(g, rnd(S)));
    return { q, zero, full, why: why + '；中位數 65 分' };
  };
  const propose = (xs, sub, cur) => sub === 'pureRate' ? proposePure(xs, cur) : sub === 'grossRate' ? proposeGross(xs, cur) : proposeGrowth(xs, sub, cur);
  // 收樣本（ranked 的通路、FROM～TO 每個月）。成長：窗口含 GROWTH_EXCLUDE 月份的樣本不列入（照常評分，只是不拿來定門檻）
  const samp = {}, excluded = [];
  CH.filter(c => c.ranked).forEach(c => months.forEach(m => {
    const o = raw(c, m);
    ['pureRate', 'grossRate'].forEach(k => { if (fin(o[k])) (samp[c.type + '|' + k] = samp[c.type + '|' + k] || []).push(o[k]); });
    if (!fin(o.purePp) && !fin(o.revGrowth)) return;
    const W = []; for (let i = 2 * N - 1; i >= 0; i--) W.push(add(m, -i));
    const ex = (GROWTH_EXCLUDE[c.type] || []).filter(x => W.includes(x));
    if (ex.length) { excluded.push({ 通路: c.label, 月: m, 窗口: W[0] + '～' + W[W.length - 1], 原因: '窗口含 ' + ex.join('、') }); return; }
    ['purePp', 'revGrowth'].forEach(k => { if (fin(o[k])) (samp['all|' + k] = samp['all|' + k] || []).push(o[k]); });
  }));
  const P = v => fin(v) ? (v * 100).toFixed(1) + '%' : '—', PP = v => fin(v) ? (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(1) + 'pp' : '—';
  const fmt = (k, v) => k === 'purePp' ? PP(v) : (k === 'revGrowth' ? (fin(v) ? (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(1) + '%' : '—') : P(v));
  const NEW = {}; Object.keys(CUR).forEach(t => { NEW[t] = {}; });
  const NEW_G = {};
  const table = [];
  Object.keys(CUR).forEach(t => ['pureRate', 'grossRate'].forEach(k => {
    const xs = samp[t + '|' + k] || [], cur = CUR[t][k], p = propose(xs, k, cur);
    NEW[t][k] = [p.zero, p.full];
    table.push({ 類型: TL[t], 子指標: SL[k], 筆數: p.q.n, 現值: fmt(k, cur[0]) + ' → ' + fmt(k, cur[1]), P10: fmt(k, p.q.p10), P50: fmt(k, p.q.p50), P75: fmt(k, p.q.p75),
      建議零分線: fmt(k, p.zero), 建議滿分線: fmt(k, p.full), 理由: p.why,
      現行中位分: xs.length ? Math.floor(med(xs.map(v => lin(v, cur[0], cur[1])))) : '—',
      現行滿分比例: xs.length ? Math.round(xs.filter(v => lin(v, cur[0], cur[1]) >= 100).length / xs.length * 100) + '%' : '—',
      建議中位分: xs.length ? Math.floor(med(xs.map(v => lin(v, p.zero, p.full)))) : '—',
      建議滿分比例: xs.length ? Math.round(xs.filter(v => lin(v, p.zero, p.full) >= 100).length / xs.length * 100) + '%' : '—' });
  }));
  ['purePp', 'revGrowth'].forEach(k => {
    const xs = samp['all|' + k] || [], cur = CUR_G[k], p = propose(xs, k, cur);
    NEW_G[k] = [p.zero, p.full];
    table.push({ 類型: '全通路（成長共用一套）', 子指標: SL[k], 筆數: p.q.n, 現值: fmt(k, cur[0]) + ' → ' + fmt(k, cur[1]), P10: fmt(k, p.q.p10), P50: fmt(k, p.q.p50), P75: fmt(k, p.q.p75),
      建議零分線: fmt(k, p.zero), 建議滿分線: fmt(k, p.full), 理由: p.why,
      現行中位分: xs.length ? Math.floor(med(xs.map(v => lin(v, cur[0], cur[1])))) : '—',
      現行滿分比例: xs.length ? Math.round(xs.filter(v => lin(v, cur[0], cur[1]) >= 100).length / xs.length * 100) + '%' : '—',
      建議中位分: xs.length ? Math.floor(med(xs.map(v => lin(v, p.zero, p.full)))) : '—',
      建議滿分比例: xs.length ? Math.round(xs.filter(v => lin(v, p.zero, p.full) >= 100).length / xs.length * 100) + '%' : '—' });
  });
  // 預覽：PREVIEW 月各通路分數（現行 vs 建議）。計分同 health.js：獲利＝純利率 70%＋毛利率 30%；成長＝各 50%；總分＝(獲利×30＋成長×20)÷有分數的權重；
  //   有獲利＋成長兩個面向才是正式分，否則「參考」。「現行」欄應該要等於健診頁該月的分數（對不上＝這段程式寫錯，先別信建議欄）。
  const score = (o, th, thg) => {
    const dim = (subs) => { const ok = subs.filter(s => fin(s[0])); if (!ok.length) return null; return ok.reduce((a, s) => a + s[0] * s[1], 0) / ok.reduce((a, s) => a + s[1], 0); };
    const pf = dim([[lin(o.pureRate, th.pureRate[0], th.pureRate[1]), 0.7], [lin(o.grossRate, th.grossRate[0], th.grossRate[1]), 0.3]]);
    const gr = dim([[lin(o.purePp, thg.purePp[0], thg.purePp[1]), 0.5], [lin(o.revGrowth, thg.revGrowth[0], thg.revGrowth[1]), 0.5]]);
    const ds = [[pf, 30], [gr, 20]].filter(d => d[0] != null);
    const tot = ds.length ? ds.reduce((a, d) => a + d[0] * d[1], 0) / ds.reduce((a, d) => a + d[1], 0) : null;
    const f = v => v == null ? '—' : String(Math.floor(v));
    return { 獲利: f(pf), 成長: f(gr), 總分: tot == null ? '—' : f(tot) + (pf != null && gr != null ? '' : '（參考）') };
  };
  const preview = CH.map(c => {
    const x = cell(PREVIEW, c), o = raw(c, PREVIEW);
    if (x && x.closed) return { 通路: c.label, 狀態: '已關站' };
    const a = score(o, CUR[c.type], CUR_G), b = score(o, NEW[c.type], NEW_G);
    return { 通路: c.label, 類型: TL[c.type], 純利率: P(o.pureRate), 毛利率: P(o.grossRate), 純利率變化: PP(o.purePp), 營收成長: fmt('revGrowth', o.revGrowth),
      現行獲利: a.獲利, 現行成長: a.成長, 現行總分: a.總分, 建議獲利: b.獲利, 建議成長: b.成長, 建議總分: b.總分, 排名: c.ranked ? '' : '不排名' };
  });
  console.log(`[health 校準] 樣本 ${FROM}～${TO}（業外、官網不列入樣本），只讀`);
  console.table(table);
  console.log(`[health 校準] 成長樣本排除 ${excluded.length} 筆（窗口含 ${JSON.stringify(GROWTH_EXCLUDE)}；這些月份照常評分）`);
  if (excluded.length) console.table(excluded);
  console.log(`[health 校準] ${PREVIEW} 預覽（「現行總分」應等於健診頁 ${PREVIEW} 的分數）`);
  console.table(preview);
  const md = rows => { const ks = Object.keys(rows.reduce((a, r) => Object.assign(a, r), {})); return ['| ' + ks.join(' | ') + ' |', '|' + ks.map(() => '---').join('|') + '|'].concat(rows.map(r => '| ' + ks.map(k => r[k] == null ? '' : String(r[k])).join(' | ') + ' |')).join('\n'); };
  const text = '### 門檻校準\n\n' + md(table) + '\n\n### 成長樣本排除（' + excluded.length + ' 筆）\n\n' + (excluded.length ? md(excluded) : '（無）')
    + '\n\n### ' + PREVIEW + ' 預覽\n\n' + md(preview);
  console.log(text);
  return { table, preview, excluded, text, NEW, NEW_G, samp, fns: { proposePure, proposeGross, proposeGrowth } };
})();
```

**2026-09 各通路分數預覽**：實跑時的預覽表沒有貼回 repo。v2 套用後的分數直接看健診頁（選 2026/09），不另存。


### 2-7-2. 塊 B 門檻校準（2026-11-02 審查決定，**已套用為 `v4-2026-11`**）

**審查決定（2026-11-02）**

| 項目 | 決定 | v3 → v4 |
|---|---|---|
| 廣告佔比（越低越好） | 採用提案 | 18% → 8% ⇒ **18.5% → 4.5%** |
| 廣告合格率 | 採用提案 | 40% → 70% ⇒ **22.5% → 62.0%** |
| 廣告致虧占比（越低越好） | 採用提案 | 30% → 5% ⇒ **17.0% → 2.5%** |
| 小占比的最小間距 | 4pp（虧損、低利、長期虧損） | — |
| 低利商品營收占比 | 選 1：**只顯示、不計分** | 權重 20% ⇒ 0 |
| 商品結構權重 | 動銷率 30%／虧損 40%／長期虧損 30% | 30／30／20／20 ⇒ 30／40／—／30 |
| 虧損商品營收占比 | **全通路共用一套**（不依類型） | 25% → 5% ⇒ **5.5% → 0.5%** |
| 長期虧損商品占比 | 全通路共用一套 | 15% → 3% ⇒ **4.0% → 0.0%** |
| 動銷率 | **依類型**，用 `__healthCalibrate` 對實測值算的建議值 | 見下表 |
| 蝦皮動銷率 | 等塊 C 有資料再校準 | 維持 30% → 65%，畫面標「待校準」 |

動銷率（公司商品口徑，`healthCalibrate` 同一套方法；node 用下表 P10／P50／P75 重跑過，結果相同）：

| 類型 | P10 / P50 / P75 | 理由 | v4 零分線 → 滿分線 |
|---|---|---|---|
| MOMO 自出貨（甲配） | 50.2 / 56.0 / 58.3% | (P75 − P10) × 1.25 ＝ 10.1pp | **49.5% → 59.5%** |
| MOMO 寄倉（乙配） | 74.4 / 78.3 / 81.3% | (P75 − P10) × 1.25 ＝ 8.6pp | **72.5% → 81.0%** |
| MO+ | 15.2 / 23.2 / 34.0% | (P75 − P10) × 1.25 ＝ 23.5pp | **8.0% → 31.5%** |
| 買斷／小通路（PChome） | 15.0 / 15.0 / 15.6% | **樣本只有 2 筆**（< 6）→ 最小間距 8pp | **10.0% → 18.0%**（畫面標「樣本少」） |

- 樣本少於 6 筆的類型一律用最小間距，畫面在動銷率子指標旁標「樣本少」，ⓘ 寫「校準時只有 N 筆資料，門檻先用最小間距 8pp，資料累積後再重定」（`types[*].stFlag:'few'`、`stN`）。
- 蝦皮自營 `stFlag:'uncal'`：動銷率標「待校準」。現在蝦皮沒有上架清單，這一格本來就是「尚未上傳」。
- 「📖 怎麼看這頁」的門檻數字從 `HEALTH_RULES` 產生，會自動顯示這些值和「樣本少」「待校準」。
- ⚠ 「全部類型合併」那一列（P50 56%）只是參考：各類型動銷率差很多（MO+ 23%、乙配 78%），所以動銷率依類型、不共用。

以下是審查前的提案原文，留著當紀錄。

**（提案原文）**

**為什麼要改**：塊 B 在 localhost 用真實資料回測（蝦皮 2026-01～09），目前的起始門檻讓「商品結構」幾乎全部 100 分：

| 子指標 | P10 | P50 | P75 | 起始門檻（零→滿） | 問題 |
|---|---|---|---|---|---|
| 廣告佔比（越低越好） | 0.0% | 9.4% | 11.1% | 18% → 8% | 中位數 86 分，偏高 |
| 廣告合格率 | 29.0% | 48.1% | 60.6% | 40% → 70% | 中位數 26 分，偏低 |
| 廣告致虧占比（越低越好） | 2.7% | 7.6% | 14.3% | 30% → 5% | 中位數 89 分，偏高 |
| 虧損商品營收占比（越低越好） | 0.6% | 1.8% | 4.9% | 25% → 5% | **幾乎全部滿分** |
| 低利商品營收占比（越低越好） | 0.0% | 0.0% | 0.4% | 30% → 10% | **幾乎恆為 0**，全部滿分 |
| 長期虧損商品占比（越低越好） | 0.0% | 1.5% | 2.8% | 15% → 3% | **幾乎全部滿分** |

**方法**：跟塊 A 的成長面向同一套（§2-7-1），只是多處理「越低越好」與 0% 邊界。
- 間距 S：樣本少於 6 筆用最小間距；否則用 max(最小間距, (P75 − P10) × 1.25)。
- 讓中位數落在 65 分：
  - 越高越好：零分線＝P50 − 0.65 × S，滿分線＝零分線＋S。
  - 越低越好：零分線＝P50 ＋ 0.65 × S，滿分線＝零分線 − S。
- 捨入到 0.5pp。比率不得小於 0% 或大於 100%：碰到邊界就夾在邊界，另一端保持至少最小間距。
- ✏️ **最小間距（請審）**：
  - 廣告佔比、廣告合格率、廣告致虧占比、動銷率：用塊 A 比率類的 **8pp**。
  - 虧損、低利、長期虧損這三個「本來就很小的占比」：用塊 A pp 類的 **4pp**。理由：P75 只有 3～5%。間距 8pp 時，零分線會被推到 7～8%，中位數又回到 75 分以上，失去鑑別力。
- 程式：純函式 `healthCalibrate`，參數在 `HEALTH_CALIB`。Console 跑 `__healthCalibrate()` 就會用**已載入的平台**算出整張表（含 MOMO、PChome），最後印一段 Markdown 可以貼回。**它只出提案，不改 `HEALTH_RULES`。**

**蝦皮自營：照上面方法算出的提案**（用你給的 P10／P50／P75 跑同一支 `healthCalibrate`，node 驗過）：

| 子指標 | 方向 | 現值（零→滿） | P10 / P50 / P75 | 建議零分線 → 滿分線 | 理由 | 中位分 現行 → 建議 | 建議下的 P10／P75 得分 |
|---|---|---|---|---|---|---|---|
| 廣告佔比 | 越低越好 | 18% → 8% | 0.0 / 9.4 / 11.1% | **18.5% → 4.5%** | (P75 − P10) × 1.25 ＝ 13.9pp | 86 → 64 | 100 ／ 53 |
| 廣告合格率 | 越高越好 | 40% → 70% | 29.0 / 48.1 / 60.6% | **22.5% → 62.0%** | (P75 − P10) × 1.25 ＝ 39.5pp | 26 → 64 | 16 ／ 96 |
| 廣告致虧占比 | 越低越好 | 30% → 5% | 2.7 / 7.6 / 14.3% | **17.0% → 2.5%** | (P75 − P10) × 1.25 ＝ 14.5pp | 89 → 64 | 99 ／ 19 |
| 虧損商品營收占比 | 越低越好 | 25% → 5% | 0.6 / 1.8 / 4.9% | **5.5% → 0.0%** | (P75 − P10) × 1.25 ＝ 5.4pp ≥ 4pp | 100 → 67 | 89 ／ 11 |
| 長期虧損商品占比 | 越低越好 | 15% → 3% | 0.0 / 1.5 / 2.8% | **4.0% → 0.0%** | 分布窄 → 最小間距 4pp | 100 → 62 | 100 ／ 30 |
| 低利商品營收占比 | 越低越好 | 30% → 10% | 0.0 / 0.0 / 0.4% | （建議不計分，見下） | 分布窄、滿分線夾在 0% | 100 → 100 | — |

- 「中位分」＝原始值 P50 那一點的分數。
- ⚠ 這些門檻是**蝦皮自營**的。商品結構的三個占比現在全通路共用同一套門檻；蝦皮、MOMO、PChome 的分布很可能不同（MOMO 甲配 2026-09 虧損占比是 0%，見下面 ④）。建議跟純利率一樣**改成依類型**，要等 `__healthCalibrate()` 跑出 MOMO、PChome 的分布再定。

**「低利商品營收占比」：建議移出計分，改成「參考，不計分」**
- 現況：低利＝商品純利率介於 0～5%、營收 ≥ 3,000。真實資料蝦皮 P75 才 0.4%，幾乎恆為 0，分數恆為 100，只是把商品結構分數往上推。
- 三個選項：
  1. **移出計分（建議）**：子指標改 `scored:false`、留在卡片當參考；權重重新分配成動銷率 30%／虧損 40%／長期虧損 30%。
     - 拖累清單的「📉 低利」原因保留：它列的是個別商品，不受占比幾乎是 0 影響。
  2. **把低利線拉高到 10%**：要先看分布才知道會不會跟「健康商品」混在一起。MOMO 甲配平均純利率接近 37%，低利線 10% 的意義跟蝦皮差很多，又會回到要依類型分的問題。
  3. **改成「低於這個通路純利率一半的商品營收占比」**（相對門檻，各通路自動適應）：比較合理，但新定義要再回測一輪，第一版來不及驗。
- 選 1 的理由：最小改動、不引入沒驗過的新定義；低利商品照樣會在拖累清單被點名。
- 拍板前可以先跑 §5-2-1 ⑤，看 5%、10%、15% 三條線下各平台的分布。

**MOMO、PChome 的商品結構與動銷率回測**
- 你上次跑的回測只有蝦皮，因為那時只有蝦皮的商品層載入。現在電腦打開健診頁會自動依序載入三個平台。
- 載完後在 Console 跑：
  ```js
  __healthCalibrate({ from: '2026-01', to: '2026-10' })
  ```
- 它會印出每個「類型 × 子指標」的 P10／P50／P75、建議門檻，以及「全部類型合併」那一列。整段 Markdown 貼回後，我把 MOMO（甲配、乙配、MO+）、PChome 的列補進上表。
- ⚠ 動銷率目前只有 MOMO、PChome 算得出來（蝦皮要等塊 C），而且分母用的是**今天**的上下架狀態，回頭算舊月份會有落差（§3）。

**廣告致虧候選規則 (b)(c)：排除報表沒有 ROI 的月份**
- 2026-01、02 的蝦皮報表沒有存 roi，所有有廣告費的商品 ROI 都是 0。規則 (c)「有花費沒成交」會誤判 99%，(b) 也算不出來。
- 程式已改：`healthAdsRuleCompare` 遇到「有廣告費的商品全部沒有 ROI」就回 `roiMissing`，(b)(c) 不比。`__healthBacktest({adsRules:true})` 那兩欄顯示「報表沒有 ROI（不比）」。採用的 (a) 不靠 ROI，照算。
- 回測要比 (a)(b)(c) 的時候，請只看 2026-03 以後。

**審完要拍板的事**：
1. 上表蝦皮自營的 5 個門檻。
2. 「小占比」用 4pp 最小間距。
3. 低利商品營收占比要選 1、2、3 哪一個。
4. 商品結構三個占比要不要改成依類型。

~~拍板後我改 `HEALTH_RULES`、拿掉 `calibrated:false`，升 `v4-2026-11`。~~ → 已改（見本節開頭「審查決定」）。

---

## 3. 動銷率「1 個商品」：通路商品頁 vs 公司商品

### 3-1. 兩種算法

| | 按通路商品頁 | 按公司商品（原廠編號／料號去掉最後一段規格碼） |
|---|---|---|
| 蝦皮 | 商品 ID | 商品 ID（`_master` 對公司商品近乎 1:1，**兩法幾乎相同**；動銷 §追記 17:20） |
| MOMO | MOMO 商品編號 `sku`（**就是現有畫面口徑**，`momoPeriodTotals`） | `origin` 符合 `^[A-Za-z]+\d+-\d+$` 就去尾段；不符合就退回 `sku` |
| PChome | 商品編號去最後一段（`pchomeBaseCount` 的做法） | 料號去尾段；不符合就退回料號 |
| 現有結構差距（動銷 §追記 17:20 實跑） | — | **甲配**：在架 346 個公司商品裡，112 個對到多個商品頁 ⇒ 商品頁至少多 112 頁（+32%）<br>MO+麻吉：+53 頁（569 個裡）；MO+森之旅：+13；乙配：+7；MO+玩樂：+4<br>**PChome**：商品頁 248 對公司商品 167（+49%），52 個前綴對到多頁 |

一個公司商品對到多頁時，兩種算法的差別：
- 有任何一頁有賣，按公司商品算就是「動」，其他沒賣的頁被藏起來。
- 按商品頁算，每一頁各算各的。

所以通常**公司商品口徑的動銷率比較高**。實際差幾個百分點，要跑 §3-3 的程式碼才知道。

### 3-2. 建議：分數用「公司商品」，「商品頁」並列顯示

理由：
1. **符合老闆的定義**：「以商品數計，不以規格數計，雨衣四色算 1 個」。
   - MOMO 甲配、PChome 被拆成多頁的，多半就是同一件商品的不同規格或組合。按頁算等於把四色算成四個，正好是老闆說不要的。
2. **跨通路同一個單位**：蝦皮的商品 ID 本來就約等於公司商品。MOMO、PChome 也用公司商品，三家才能用同一把尺比。
3. **不懲罰上架策略**：多開頁是為了曝光，按頁算會讓「多開頁」直接拉低動銷率，扣分的原因跟經營好壞無關。

代價和補救：
- 公司商品口徑會**藏住「多頁商品裡沒賣的那幾頁」**。補救：
  - 卡片上並列「商品頁口徑：xx%（現有畫面同口徑）」。
  - 加一行「多頁商品中零動銷的頁：N 頁」。
  - 拖累清單加資訊類原因「⏸ 重複頁零動銷」，不算拖累金額。
- 不符格式的編號走「退回用商品頁」，卡片顯示「備援 N 個」。備援超過分母 10% 時，標「口徑混合」。
- MOMO 驗收對帳（§1-2 快照 2）用的是**商品頁口徑**那個數字，所以兩種口徑都要算。

### 3-3. 請你在 Console 跑的只讀程式碼：兩種口徑差多少

> 只讀瀏覽器記憶體，不寫入、不連網、不印商品名。**我沒有實際跑過。**
> MOMO 那段是**近似值**：直接讀商品主檔的半月格子，沒有套 E001 未結算估算。
> 所以請挑**已結算的月份**（例如 2026-09）。先看「商品頁」那欄跟 MOMO 總覽比較圖的動銷率對不對得上：對得上，才能相信「公司商品」那欄。

**① MOMO（先進淨利表 → MOMO，五家都點過，讓商品資料載進記憶體）**

```js
(() => {
  const M = '2026-09';   // 要比的整月
  const keys = [M + '-H1', M + '-H2'];
  const std = s => /^[A-Za-z]+\d+-\d+$/.test(s);
  const pct = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '-';
  // 半月格子：新格式 c.s = "2603:812:255310|..."（來源月:數量:未稅營收）；舊格式 c.qty
  const qr = c => {
    if (!c || typeof c !== 'object') return [0, 0];
    if (c.s != null) return String(c.s).split('|').reduce((a, seg) => { const p = seg.split(':'); return [a[0] + (Number(p[1]) || 0), a[1] + (Number(p[2]) || 0)]; }, [0, 0]);
    return [Number(c.qty) || 0, 0];
  };
  const out = [];
  for (const shop of ['甲配', '乙配', 'MO+麻吉', 'MO+森之旅', 'MO+玩樂']) {
    const k = 'ec_momo_products|' + shop;
    const v = (Store._profitMem && Store._profitMem[k]) || (Store._mem && Store._mem[k]);
    const items = Array.isArray(v) ? v : ((v && v.items) || []);
    if (!items.length) { out.push({ 通路: shop, 說明: '記憶體沒有商品資料，先在 MOMO 頁點這家' }); continue; }
    let pNum = 0, pDen = 0; const g = {};
    items.forEach(p => {
      let q = 0, r = 0;
      keys.forEach(kk => { const x = qr((p.periods || {})[kk]); q += x[0]; r += x[1]; });
      const sold = q > 0 || Math.abs(r) > 0.5, act = p.discontinued !== true;
      if (act || sold) { pDen++; if (sold) pNum++; }
      const o = String(p.origin || '').trim(), fb = !std(o);
      const gk = fb ? 'sku:' + p.sku : o.split('-')[0];
      const e = g[gk] || (g[gk] = { fb, pages: 0, den: false, sold: false, deadPages: 0 });
      if (act || sold) { e.pages++; e.den = true; if (sold) e.sold = true; else e.deadPages++; }
    });
    const gs = Object.values(g).filter(e => e.den), cNum = gs.filter(e => e.sold).length;
    out.push({
      通路: shop, 月份: M,
      商品頁: pNum + '/' + pDen, 商品頁動銷率: pct(pNum, pDen),
      公司商品: cNum + '/' + gs.length, 公司商品動銷率: pct(cNum, gs.length),
      差_pp: pDen && gs.length ? ((cNum / gs.length - pNum / pDen) * 100).toFixed(1) : '-',
      多頁公司商品: gs.filter(e => e.pages > 1).length,
      多頁裡零動銷的頁: gs.filter(e => e.pages > 1 && e.sold).reduce((a, e) => a + e.deadPages, 0),
      退回用商品編號: gs.filter(e => e.fb).length,
    });
  }
  console.table(out);
})();
```

**② PChome（先進淨利表 → PChome，讓 profit.js 和 PChome 資料就緒）**

```js
(() => {
  const M = '2026-10';   // 日曆月
  const std = s => /^[A-Za-z]+\d+-\d+$/.test(s);
  const pct = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '-';
  if (typeof window.pchomeCalendarCalc !== 'function') { console.warn('profit.js 還沒載入，先進淨利表 PChome'); return; }
  const pn = {};   // 料號 → [商品頁 key]
  (window.pchomeLoadProducts() || []).forEach(p => {
    const code = String(p.料號 || '').trim(); if (!code) return;
    const arr = Array.isArray(p.商品編號) ? p.商品編號 : (p.商品編號 == null ? [] : [p.商品編號]);
    pn[code] = arr.map(v => String(v || '').trim()).filter(Boolean).map(v => { const s = v.split('-'); return s.length > 1 ? s.slice(0, -1).join('-') : v; });
  });
  const out = [];
  for (const sub of ['轉單', '寄倉']) {
    const calc = window.pchomeCalendarCalc(M, sub), skus = (calc && calc.skus) || [];
    const den = skus.filter(x => !x.discontinued || x.hasBiz);
    const page = {}, comp = {}; let fb = 0;
    den.forEach(x => {
      const code = String(x.料號 || '').trim();
      const pages = (pn[code] && pn[code].length) ? pn[code] : ['code:' + code];
      pages.forEach(k => { page[k] = page[k] || x.hasBiz; });
      const ck = std(code) ? code.split('-')[0] : (fb++, 'code:' + code);
      comp[ck] = comp[ck] || x.hasBiz;
    });
    const pv = Object.values(page), cv = Object.values(comp);
    out.push({
      子通路: sub, 月份: M,
      料號_現有畫面: (calc.bizCount || 0) + '/' + den.length, 料號動銷率: pct(calc.bizCount || 0, den.length),
      商品頁: pv.filter(Boolean).length + '/' + pv.length, 商品頁動銷率: pct(pv.filter(Boolean).length, pv.length),
      公司商品: cv.filter(Boolean).length + '/' + cv.length, 公司商品動銷率: pct(cv.filter(Boolean).length, cv.length),
      料號退回: fb,
    });
  }
  console.table(out);
})();
```

怎麼看結果：
- 「料號_現有畫面」要等於 PChome 總覽 KPI 卡的動銷率。對不上，就是這段程式寫錯了。
- 「商品頁」與「公司商品」兩欄差幾個百分點，就是 §6-1 要拍板的差距。
- ⚠ PChome 的「有賣」用 `hasBiz`，是**淨值為正**（`:29088-29089`，只有退貨不算有賣）。MOMO 用 `grossQty`，賣出後全退也算有賣。
  兩家口徑不同，健診照各自既有的口徑，不另外統一，ⓘ 裡寫明。

---

## 4. 畫面設計

### 4-1. 頁首

- 標題「通路健診」。
- 月份下拉，加上「評分月份：2026/10（整月）」。
- 規則版本 `v1-2026-11`。
- 「資料時間：KPI 11/02 14:05」，取 KPI meta 最新的 `at`。
- 「↻ 重新計算」按鈕。
- 一行灰字：「分數依固定規則計算，同樣的資料一定得到同樣的分數；沒有資料的面向不計分、不算 0 分。」
- 右上「📖 怎麼看這頁」（`App.openGuide`，同庫存頁、對帳說明的樣式）。內容由 `_hlGuideBlocks(HEALTH_RULES)` 產生，門檻、權重、燈號、營收門檻、版本都不寫死。
- **「⚠ KPI 尚未填完」提示列**（2026-11-02 加，塊 A，不寫雲端）：
  - 範圍：評分月份與往前 `HEALTH_RULES.pendingLookback`（3）個月內，KPI 月結沒填完的通路與月份。不含已關站、since 之前的月份，最早到 2026-01。
  - 格式：「⚠ KPI 尚未填完：酷澎 商城-好麻吉 2026/07～09（0/7）、PChome 2026/09（4/7）」。括號是「已填格數／應填格數」，用的是 KPI 填寫進度同一支 `_kpiFillSlots`。
  - 同一通路連續幾個月、格數一樣的合併成一項；格數不同就分開。**不顯示人名**。
  - 全部填完時這一列不出現。這一列只是提醒，不影響分數（沒填完的月份照「尚未上傳」處理）。
  - **點一項**：跳到 KPI 月結表那一段的第一個月。
    - 做法：先 `setKpiViewMode('month')`＋`setKpiYM(月)`，只改 profit.js 記憶體裡月結表選的月份，不持久化；再 `App.navigate('office-d1-kpi')`。
    - 帳號開不了 `office-d1-kpi`（`App._isRouteAllowed`），或 profit.js 的 `setKpiYM` 不在時，只顯示文字、不能點。
  - 程式：純函式 `healthPendingKpi(snap, month)`、畫面 `_hlPendingHtml`、跳轉 `_hlGoKpi`；樣式 `.hl-pending*`。

### 4-2. 全通路總覽（表格，依通路類型分組）

| 欄位 | 內容 |
|---|---|
| 通路 | 名稱，加上類型小標 |
| 總分 | 大數字，燈號底色用 `--success-soft`、`--warn-soft`、`--danger-soft`；參考分是灰色斜體，加「參考」小標 |
| 依 N/M | 例如「依 3/4 面向」 |
| 面向色塊 | 6 格小方塊，依權重順序。有分數的上色；`na` 灰斜線；`insufficient`、`pending` 灰點；第一版沒做的面向不畫 |
| 比上月 | ±分數；上個月沒分數時顯示「—」 |
| 主要扣分原因 | 由規則產生的一句話：取「(滿分 − 得分) × 權重」最大的子指標，例如「廣告致虧占比 22%（目標 ≤ 5%）」 |

- 排序：類型內依分數；參考分排在同類型最後。業外在倒數第二列（不排名），官網在最後一列（已關站）。
- 手機（≤768px）：改成每通路一張小卡，只顯示總分、N/M、主要原因。

### 4-3. 單一通路卡片（點列展開，同頁）

1. **頭部**：
   - 總分圈和燈號、「依 N/M 個面向評分」。
   - 資料完整度標章：例如「KPI 8/8 ✓」「報表 10/31 上傳」「商品表現 11/03」。這是灰底小 chip，**不算分**。
2. **面向列表**：每個面向一條分數條，右邊是權重。點開看子指標小表：

   | 子指標 | 原始值 | 零分線 | 滿分線 | 得分 | ⓘ |

   ⓘ 的內容：
   - 公式
   - 分子分母實際數字，例如「3,215 ÷ 41,820」
   - 來源，例如「app/kpi 2026-10 shopee.玩樂.ads／rev」「淨利表 玩樂 2026/10 整月，812 列」
   - 資料時間
3. **走勢**：近 12 個月總分折線，加上各面向小折線。用 Chart.js 4.4.0（`index.html:28` 已載入）。
   - 參考分的點畫空心。
   - 動銷率是「用今天的上下架狀態回推」的月份，點旁邊標「※」（MOMO、PChome 只有目前的上下架狀態，動銷 §2-1）。
4. **拖累商品前 10 名**（§4-4）。
5. 底部灰字：「下一版加入：營運執行、流量」。

### 4-4. 無資料怎麼呈現（一律灰底 `--bg`／`--border`，文字 `--text-muted`，不顯示分數）

| 狀態 | 畫面文字例 |
|---|---|
| `na` 不適用 | 「不適用：酷澎沒有逐商品廣告資料」 |
| `insufficient` 資料不足 | 「資料不足：成長需要前後各 2 個月，PChome 從 2026-09 起才有資料（2026-12 起評分）」 |
| `pending` 尚未上傳 | 「尚未上傳：2026/10 KPI 已填 5/8」「尚未上傳：2026/10 商品表現（洞察表）」 |
| `smallRev` | 「營收過小（< 3 萬），本月比率類指標不評分」 |
| `loading` | 「載入中…」，**跟「沒資料」分開**。訂閱組還沒到之前一律是這個狀態，不能先畫成「無資料」 |
| `closed` | 整張卡灰：「已關站（2026/05 起）」 |

註（不是狀態，只是說明）：蝦皮成長的 ⓘ 固定加一句「蝦皮營收照撥款日入帳，月份間會跳動（例：2 月農曆年撥款延後、3 月補回）」。

### 4-5. 拖累商品清單與跳轉

- 每個商品可以中多個原因，依「拖累金額」由大到小，取前 10 名：

  | 原因 | 條件 | 拖累金額 | 適用 |
  |---|---|---|---|
  | 💸 賠錢 | 利潤 < 0 | −利潤 | 全部 |
  | 📉 低利 | 利潤率介於 0 到門檻、營收 ≥ 3,000 | (門檻 − 利潤率) × 營收 | 全部 |
  | ⏳ 長期虧損 | 連續 2 個整月利潤 < 0 | 兩月累計虧損 | 全部 |
  | 🎯 廣告致虧 | §2-4 (a) | `adsFee` | 蝦皮 |
  | 🔥 廣告燒錢 | 廣告費在本通路前 20%，而且 `roiDiff < 0` | `adsFee × (1 − directROI ÷ targetROI)` | 蝦皮 |
  | ⏸ 連續零動銷 | 在架、連續 2 個整月沒賣 | 不算金額，只列 | MOMO、PChome（現有 `dead_long` 同概念，`:19153`、`:29260`）；蝦皮在塊 C 之後 |
  | ⏸ 重複頁零動銷 | 多頁公司商品裡沒賣的頁 | 不算金額，只列 | MOMO、PChome |

  「不算金額」的原因另外列在前 10 名下面的「另有 N 項需留意」摺疊區，不擠進排名。

- 每列顯示：品號、商品名、原因標章、營收、利潤、廣告費（蝦皮），以及調整紀錄：
  - 蝦皮讀 `ec.insight_{通路}_notes`，有最近一筆就顯示「✓ 10/28 已調整」。
  - MOMO、PChome 第一版不顯示。
  - **不顯示調整人**。
- **點一列 → `__profitOpenAt({platform, shop, month, half:'full', code})`**：
  1. 先把 `ec_profitView` 設成該平台、該通路。這只寫本機，跟使用者自己點一樣。
  2. 叫 `App.navigate('office-d1-profit')`。淨利表重建時，`restoreProfitView`（`:13720`）會切到該通路。
  3. 等 `profitDataReady`（或最多 3 秒），再切到該月整月。蝦皮照 `tagFxJump` 的「只切不記」，先存再還原 `ec_lastHalf_{shop}`；MOMO 用 `momoSetPeriod`（`:17538`，只寫記憶體 `_momoPeriodSel`），PChome 用 `pchomeSetCalMonth`。
  4. 有搜尋框的頁面填入品號，沒有就捲到那一列並閃一下底色。
  - 任何一步失敗，至少停在該通路，並 toast「請在表中搜尋 A123」。
  - ⚠ 實作時要逐平台確認上面的期間 setter 是不是 `byUser:false` 也不寫持久化 key；有寫的話照 `tagFxJump` 先存後還原。
- 獲利或成長面向沒有商品可列（例如 FriDay），就不顯示拖累區塊，改顯示「這個通路只有月合計資料，沒有商品層明細」。

### 4-6. 效能與首頁摘要卡

- **塊 A**：只用 KPI。17 通路 × 12 月重算是純記憶體運算，預估 < 50ms。
- **塊 B**：
  - **進頁時不自動載任何商品層訂閱組**。
  - 總覽先畫出 KPI 面向；商品層面向顯示「點通路載入商品層資料」。
  - 展開蝦皮卡片才叫 `__loadShopeeSubs` + `__loadArchiveSubs`；展開 MOMO 卡片才叫 `__loadMomoSubs`；PChome 不用另外載。
  - 桌機另外有一個「載入全部商品層資料」按鈕，總覽才會有完整分數。手機不提供這個按鈕。
  - 逐月重算用 `setTimeout` 分批跑，不卡畫面。
  - 結果在記憶體快取，key ＝ `(通路, 月, rules.version, 資料指紋)`。資料指紋取報表 `ts`、`momo_products` 的長度與最後修改時間這類便宜的值。
- **首頁摘要卡，建議第一版不做**：
  - `dashboard` 在 `CLOUD_RENDER_ROUTES.main` 裡，每次推播都會重畫。
  - 首頁要有分數，就得在首頁載入 profit.js（1.9MB）。商品層再加約 10MB。這正好是 v690 為了手機登入、首頁才拆掉的負擔。
  - 只放一個不帶分數的連結卡，價值不大；側欄已經有入口了。
  - **之後**有「鎖定本月分數」（`app/health`，一份小文件）時，首頁直接讀那份顯示「🟢 5 🟡 6 🔴 2 → 查看」，不用載 profit.js。到時再做。

---

## 5. 驗證計畫

### 5-1. node 測試（放 scratchpad，不進 repo）

- 用 `vm.runInNewContext` 載入 `js/pages/health.js`。
  - stub：`window = { App: {} }`、`document = undefined`。
  - 檔案沒有 import／export，可以直接跑；純函式區不碰 window 以外的東西。
- 固定向量：
  1. `_hlLinear`：
     - 越高越好、越低越好、剛好在零分線和滿分線上。
     - `null`、`NaN`、`Infinity` 都要回 `null`，**不能是 0**。
  2. 面向內重新正規化：3 個子指標缺 1 個；全部缺 → 面向 `status` 不是 `ok`、分數 `null`。
  3. 總分：
     - 有分數的面向重新加權、N/M 正確。
     - 參考分規則：只有獲利 → 參考分；獲利＋成長 → 正式分；只有成長 → 參考分。
  4. 關站：官網 2026-05 以後 `closed`；2026-04 正常。
  5. `smallRev`：營收 29,999 → 比率類不評分；30,000 → 評分。
  6. 成長窗口：
     - `since` 前資料不足（PChome 2026-11 → insufficient，2026-12 → ok）。
     - 蝦皮橫跨 2026-08／09 照一般規則算，沒有口徑變更（已更正 2026-11-02）。
     - 純利率變化在前期純利為負時不會爆掉。
  7. 動銷率：
     - 商品頁口徑 vs 公司商品口徑，用手造的「1 公司商品 3 頁、只有 1 頁有賣」。
     - 不符格式就退回、計入備援數。
     - 貨號尾巴有 Tab 要 trim。
     - PChome 一個料號對多個商品編號。
  8. 拖累排序：同金額時用品號排序，結果穩定；不算金額的原因不進前 10。
  9. 廣告致虧 (a)、(b)、(c) 三條規則的邊界：`pureProfit + adsFee == 0`、`gross − platFee ≤ 0`。
  10. 凍結：`HEALTH_RULES` 改不動（`Object.isFrozen` 深層都是 true）。
- 塊 C：
  - 新的商品表現月快照解析器抽成純函式 `_insPerfMonthFromRows(sheets)`，吃 `sheet_to_json(header:1)` 的二維陣列。
  - 用手造的二維陣列測：商品列＋規格列、狀態統計、零銷列有收、Tab trim、表頭找不到時丟出清楚的錯誤。
  - **不用真實檔案**。真實檔案只在瀏覽器裡由你自己選檔。

### 5-2. 你在 localhost 怎麼驗

每一塊都照這個順序做：

1. PowerShell `ec-nowrite-on`，確認插入 **106 行**。
2. `ec-serve`。
3. 開 `http://localhost:8765/`，Ctrl+F5，F12 Console 要看到紅字 **「TEST_NOWRITE v2 已啟用：27 個物件 / 45 個寫入方法已停用」**。
   - 塊 C 上線後是 28 / 46，要先更新你本機防護碼的 MUST 清單和下限；**物件數不對就關分頁**。
4. 逐條驗：
   - **共同路徑**：登入 → 首頁 render → 淨利表（通路分頁出現）→ 洞察表 → 帳號管理 → **通路健診**。每條都要正確 render，Console 沒有紅字錯誤。
   - **塊 A**：
     1. 健診總覽 17 列（15 個營運中通路＋業外＋官網）。官網灰色「已關站」。
     2. 選 2026-10：每通路「獲利」原始值跟 KPI 月結通路表**逐店相同**（§1-1 指紋）。
     3. PChome 成長顯示「資料不足」，不是 0。
     4. 切到 2026-04：官網有分數。
     5. 走勢圖 12 個點。
     6. Console `__healthBacktest()` 印出表格，`Network` 分頁沒有任何寫入請求。
     7. `__healthMock('empty')`：全部通路顯示「尚未上傳」，沒有任何 0 分。
     8. view 帳號登入也看得到。
   - **塊 B**：
     1. 展開好麻吉：「載入中」→ 出現廣告效率、商品結構、拖累前 10。
     2. 點一列 → 跳到淨利表好麻吉 2026/10 整月，並定位到該品號。回到健診 → 再開淨利表：期別還是你原本選的（沒被跳轉改掉）。
     3. 展開甲配：商品頁口徑動銷率等於 MOMO 總覽比較圖（§1-2 指紋 2）。
     4. PChome 料號口徑等於 PChome KPI 卡（指紋 3）。
     5. 手機寬度（DevTools 375px）：不自動載商品層，按鈕可以載。
   - **塊 C**：
     1. `__shopeePerfMock(true)`。
     2. 洞察表維克上傳 10 月商品表現 → 確認窗顯示 437／正常 370／有賣 276。
     3. 按確認 → mock 收到 1 筆 `setMonth`。
     4. `ec.insight_維克_perf` 內容跟改版前逐字相同（§1-3 指紋 1）。
     5. 健診維克卡出現動銷率「74%（參考）」。
     6. 關掉 mock 再傳一次：防護攔下 `setMonth`，畫面顯示「沒有寫入」，不能顯示「已存」。
5. 測完，順序不能顛倒：先關分頁 → 停 server → `ec-nowrite-off`。
6. `git diff js/firebase.js` **必須空白**（塊 A、B）。
   - 塊 C 的 diff 只能有 `__cloudShopeePerf` 那一段，而且 `grep -c "TEST_NOWRITE" js/firebase.js` 必須是 0。

#### 5-2-1. 塊 B 對帳用的 Console 程式（只讀）

三段都只呼叫 profit.js 的唯讀轉接 `window.__healthProductSnapshot`（塊 B 新增）和既有的唯讀函式，不寫任何資料、不連網。**我沒有在真實資料上跑過**，跑出錯誤請把訊息貼回來。

**① MOMO：健診「商品頁口徑」動銷率 vs MOMO 總覽的比較圖**

在哪裡跑：淨利表 → MOMO → 總表（總覽），期間切到「M 整月」，等右邊的「淨利率／動銷率」比較圖畫出來再貼。

```js
(() => {
  const M = '2026-09';   // 要對的整月；MOMO 總覽的期間也要切到同一個月的「整月」
  if (typeof window.__healthProductSnapshot !== 'function') { console.warn('先進淨利表 MOMO（讓 profit.js 載入、MOMO 資料到齊）'); return; }
  const shops = ['甲配', '乙配', 'MO+麻吉', 'MO+森之旅', 'MO+玩樂'];
  const rows = shops.map(s => {
    const r = window.__healthProductSnapshot('momo', s, M);
    if (r.error) return { 通路: s, 錯誤: r.error, rev: 0 };
    const it = r.rows || [];
    const sold = it.filter(x => x.sold).length, total = it.filter(x => x.active || x.sold).length;
    const rev = it.filter(x => x.sold).reduce((a, x) => a + x.rev, 0);
    return { 通路: s, 健診分子: sold, 健診分母: total, 健診動銷率: total ? +(sold / total * 100).toFixed(1) : null, rev };
  });
  const ch = window.Chart && Chart.getChart && Chart.getChart(document.getElementById('momo-ov-cmp'));
  const ds = ch && ch.data.datasets.find(d => /動銷率/.test(d.label));
  // 比較圖只畫「有營收」的通路，順序同 _MOMO_OV_SHOPS（甲配、乙配、MO+麻吉、MO+森之旅、MO+玩樂）
  rows.filter(r => r.rev > 0.5).forEach((r, i) => {
    r.圖上標籤 = ch ? ch.data.labels[i] : '（沒找到比較圖）';
    r.圖上動銷率 = ds ? ds.data[i] : null;
    r.一致 = ds ? (r.健診動銷率 === ds.data[i] ? '✓' : '✗') : '—';
  });
  console.table(rows.map(({ rev, ...x }) => x));
})();
```

看法：每一列「一致」都要是 ✓，而且「圖上標籤」要對到同一家。比較圖跟健診都四捨五入到小數 1 位。

**② PChome：健診「料號口徑」vs PChome 總覽 KPI 卡的動銷率**

在哪裡跑：淨利表 → PChome → 轉單（再切寄倉各看一次），總表切「日曆月」並選同一個月。

```js
(() => {
  const M = '2026-10';   // 日曆月；PChome 總表切到「日曆月」並選同一個月
  if (typeof window.__healthProductSnapshot !== 'function') { console.warn('先進淨利表 PChome（讓 profit.js 載入）'); return; }
  const r = window.__healthProductSnapshot('pchome', 'PChome', M);
  if (r.error) { console.warn(r.error); return; }
  if (!(r.months || []).includes(M)) console.warn(M + ' 不在 PChome 日曆月清單裡（還沒有訂單／對帳資料），健診會當成「尚未上傳」');
  const out = ['轉單', '寄倉'].map(sub => {
    const t = (r.subTotals || {})[sub] || { sold: 0, total: 0 };
    const c = window.pchomeCalendarCalc(M, sub);   // PChome 總覽 KPI 卡用的同一支
    const den = c.skus.filter(x => !x.discontinued || x.hasBiz).length;
    return { 子通路: sub, 健診分子: t.sold, 健診分母: t.total,
      健診動銷率: t.total ? (t.sold / t.total * 100).toFixed(1) + '%' : '—',
      總覽卡分子: c.bizCount || 0, 總覽卡分母: den,
      一致: (t.sold === (c.bizCount || 0) && t.total === den) ? '✓' : '✗' };
  });
  console.table(out);
  console.log('再看一次畫面：PChome 總覽 KPI 卡「動銷率」的百分比，要等於上表的「健診動銷率」（轉單、寄倉各自）。');
})();
```

**③ 蝦皮：健診「虧損商品數」vs 淨利表篩「賠錢中」**

在哪裡跑：淨利表 → 蝦皮某一家，切到要對的月份。

```js
(() => {
  const M = '2026-09', SHOP = '好麻吉';   // 改成要對的月份與通路
  if (typeof window.__healthProductSnapshot !== 'function') { console.warn('先進淨利表（讓 profit.js 載入、蝦皮報表到齊）'); return; }
  const r = window.__healthProductSnapshot('shopee', SHOP, M);
  if (r.error) { console.warn(r.error); return; }
  const name = { full: '整月', first: '上半月', second: '下半月' };
  console.table((r.halves || []).map(h => ({
    期別: name[h.half], 商品列數: h.rows.length,
    '純利<0（健診的虧損）': h.rows.filter(x => x.pureProfit < 0).length,
    '其中有廣告費（＝淨利表「賠錢中」）': h.rows.filter(x => x.pureProfit < 0 && x.adsFee > 0).length,
    '其中沒廣告費': h.rows.filter(x => x.pureProfit < 0 && !(x.adsFee > 0)).length,
  })));
  console.log('對法：淨利表切到同一期別、標籤篩「賠錢中」，筆數要等於「其中有廣告費」。健診的虧損數＝有廣告費＋沒廣告費。');
  console.log('健診用整月；沒有整月報表時把上下半月合併，合併後的數字不會等於任何一個半月，請逐半月對。');
  console.log('⚠ 若淨利表「賠錢中」標籤被停用，或有人手動改過格子（畫面數字跟報表存檔不同），會對不上；健診用的是報表存檔的值。');
})();
```

**④ MOMO：健診的逐商品利潤 vs MOMO 淨利表的「淨利貢獻」欄（查甲配 2026-09「虧損占比 0%」是真的還是欄位取錯）**

在哪裡跑：淨利表 → MOMO → 甲配 → 總表，期間切「2026/9 整月」。先清掉搜尋框和篩選，打開「顯示已下架」，讓表格列出全部商品；「淨利貢獻」欄不要隱藏。

健診這邊用的是 `__healthProductSnapshot`，它逐商品呼叫 `momoAggregatePeriods(…, {lean:true})`。畫面那邊直接讀表格。

```js
(() => {
  const M = '2026-09', SHOP = '甲配';   // 要查的月份、MOMO 通路（甲配／乙配／MO+麻吉…）
  if (typeof window.__healthProductSnapshot !== 'function') { console.warn('先進淨利表 MOMO（讓 profit.js 載入、MOMO 資料到齊）'); return; }
  const snap = window.__healthProductSnapshot('momo', SHOP, M);
  if (snap.error) { console.warn(snap.error); return; }
  const tbl = document.getElementById('momo-tbl-' + SHOP);
  if (!tbl) { console.warn('畫面上找不到 MOMO ' + SHOP + ' 的總表，先切到那家的總表'); return; }
  const ths = [...tbl.querySelectorAll('thead th')].map(th => th.innerText.replace(/\s+/g, ''));
  const iP = ths.findIndex(t => /^淨利貢獻/.test(t)), iR = ths.findIndex(t => /^營收/.test(t));
  if (iP < 0) { console.warn('表頭找不到「淨利貢獻」欄（被隱藏了？）表頭：', ths); return; }
  const num = s => { s = String(s || '').replace(/[−–]/g, '-').replace(/[^\d.\-]/g, ''); return (s === '' || s === '-') ? null : Number(s); };
  const page = {};
  tbl.querySelectorAll('tbody tr').forEach(tr => {
    const sub = tr.querySelector('.mm-sub-line'), m = sub && /品號\s*(\S+)/.exec(sub.innerText);
    if (!m) return;
    page[m[1]] = { profit: num(tr.children[iP] && tr.children[iP].innerText), rev: iR >= 0 ? num(tr.children[iR] && tr.children[iR].innerText) : null };
  });
  const sold = (snap.rows || []).filter(r => r.sold);
  const diff = [];
  let both = 0, pageLossBoth = 0;
  sold.forEach(r => {
    const p = page[r.key]; if (!p) return; both++;
    if (p.profit != null && p.profit < 0) pageLossBoth++;
    if (p.profit != null && Math.abs(p.profit - r.profit) > 1) diff.push({ 品號: r.key, 畫面淨利貢獻: p.profit, 健診利潤: Math.round(r.profit), 畫面營收: p.rev, 健診營收: Math.round(r.rev), 健診算有成本: r.costKnown });
  });
  console.table([{
    月份: M, 通路: SHOP, 健診有銷售商品: sold.length, 畫面列數: Object.keys(page).length, 兩邊對到: both,
    '健診 利潤<0（全部）': sold.filter(r => r.profit < 0).length,
    '健診 利潤<0 且有成本（＝算進虧損占比）': sold.filter(r => r.profit < 0 && r.costKnown).length,
    '畫面 淨利貢獻<0（全部列）': Object.values(page).filter(p => p.profit != null && p.profit < 0).length,
    '對到的列裡 畫面<0': pageLossBoth, 金額對不上的列: diff.length,
  }]);
  if (diff.length) console.table(diff.slice(0, 20));
  console.log('看法：①「金額對不上的列」是 0，而且兩邊 <0 的數量一樣 ⇒ 健診取的欄位沒錯，虧損占比 0% 是真的。');
  console.log('②「畫面 <0」比「健診 <0 且有成本」多 ⇒ 看多出來的是不是「健診算有成本＝false」（缺成本的商品健診不算進虧損，畫面照樣顯示）。');
  console.log('③「金額對不上的列」不是 0 ⇒ 欄位取錯或口徑不同，把上表貼回來。');
})();
```

**⑤ 低利線要畫在哪：各平台商品純利率的分布（給 §2-7-2「低利商品營收占比」拍板用）**

在哪裡跑：健診頁，三個平台的商品層都載好之後（頁頂「商品層資料」那一列消失）。

```js
(() => {
  const M = '2026-09';   // 要看的月份
  if (typeof window.__healthProductSnapshot !== 'function') { console.warn('先進通路健診頁，等商品層載好'); return; }
  const list = [['shopee', '好麻吉'], ['shopee', '玩樂'], ['shopee', '森之旅'], ['shopee', '維克'], ['momo', '甲配'], ['momo', '乙配'],
    ['momo', 'MO+麻吉'], ['momo', 'MO+森之旅'], ['momo', 'MO+玩樂'], ['pchome', 'PChome']];
  const out = list.map(([p, s]) => {
    const r = window.__healthProductSnapshot(p, s, M);
    if (r.error) return { 平台: p, 通路: s, 錯誤: r.error };
    let rows;
    if (p === 'shopee') {   // 有整月用整月，沒有就上下半月相加（同健診）
      const hs = r.halves || [], full = hs.find(h => h.half === 'full'), use = full ? [full] : hs, by = {};
      use.forEach(h => h.rows.forEach(x => { const e = by[x.code] || (by[x.code] = { rev: 0, profit: 0, qty: 0 }); e.rev += x.rev; e.profit += x.pureProfit; e.qty += x.qty; }));
      rows = Object.values(by).filter(x => x.qty > 0).map(x => ({ rev: x.rev, profit: x.profit, costKnown: true }));
    } else rows = (r.rows || []).filter(x => x.sold).map(x => ({ rev: x.rev, profit: x.profit, costKnown: x.costKnown && x.profit != null }));
    const base = rows.filter(x => x.costKnown && x.rev > 0), tot = base.reduce((a, x) => a + x.rev, 0);
    const share = line => tot ? (base.filter(x => x.profit >= 0 && x.profit / x.rev < line && x.rev >= 3000).reduce((a, x) => a + x.rev, 0) / tot * 100).toFixed(1) + '%' : '—';
    const rates = base.map(x => x.profit / x.rev).sort((a, b) => a - b), q = f => rates.length ? (rates[Math.min(rates.length - 1, Math.ceil(f * rates.length) - 1)] * 100).toFixed(1) + '%' : '—';
    return { 平台: p, 通路: s, 有成本的有銷售商品: base.length, '商品純利率 P10': q(0.1), P50: q(0.5), P75: q(0.75),
      '低利占比（線 5%）': share(0.05), '線 10%': share(0.10), '線 15%': share(0.15) };
  });
  console.table(out);
})();
```

兩段都只讀瀏覽器記憶體和畫面，不寫任何資料。**我沒有在真實資料上跑過。**

### 5-3. 塊 C 指紋用的 Console 選檔程式碼（只讀）

```js
(async () => {
  const f = await new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.xlsx'; i.onchange = () => res(i.files[0]); i.click(); });
  const r = await App.parseInsightPerfExcel(f);
  const s = JSON.stringify(r.byShopeeId);
  const h = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map(b => b.toString(16).padStart(2, '0')).join('');
  console.log('筆數', Object.keys(r.byShopeeId).length, 'rawRows', r.rawRows, 'sha256', h);
})();
```

改版前、改版後各跑一次，用同一個檔案，`sha256` 必須相同。這段只解析，不呼叫 `Store.set`，不會寫任何東西。

---

## 6. 需要你決定的事（3 項）——已決定 2026-11-02

| # | 項目 | 決定（已決定 2026-11-02） |
|---|---|---|
| 1 | 動銷率「1 個商品」 | **分數用公司商品口徑**；商品頁口徑並列顯示，加上「多頁商品中零動銷的頁」。§3-3 的 Console 量測留到**塊 B 驗收時**再跑 |
| 2 | 蝦皮成長在 2026-09 口徑變更 | **已更正 2026-11-02：無口徑變更**。2026-10-16（v791／v792）已把蝦皮 2026-01～09 全部改用對帳單算法（營收＝進帳報表買家支付 ÷ 1.05，未稅）重算並回補寫入 `app/kpi`，1～9 月與之後同一口徑，蝦皮成長照一般規則算。改成在 ⓘ 和回測註明：蝦皮營收照撥款日入帳，月份間會跳動（例：2 月農曆年撥款延後、3 月補回），回測時特別看 2～3 月 |
| 3 | 塊 C 存放 | **新 collection `shopee_perf_months`**。物件數 27 → 28 到塊 C 時再處理 |

以下是決定前的原始建議，保留備查：

1. **動銷率「1 個商品」的口徑**
   - 建議：**分數用公司商品**（原廠編號／料號去掉規格碼），商品頁口徑並列顯示，另外列「多頁商品中零動銷的頁數」。
   - 理由：符合老闆「雨衣四色算 1 個」，三家用同一把尺，也不懲罰多開頁。
   - 拍板前先跑 §3-3 的兩段程式碼，看實際差幾個百分點。差 < 3pp 的話，兩種口徑其實等價。
2. **蝦皮成長在 2026-09 口徑變更的處理**（⚠ 前提有誤，已更正，見上表；以下僅留紀錄）
   - 建議：**先暫不評分**，蝦皮成長從 2026-12 那期開始算。
   - 另一個選項：08 月以前的 KPI 營收如果確認是含稅手填，可以 ÷1.05 換算後接上，蝦皮 2026-10 就有成長分。
   - 要你或財務先確認 07、08 月 KPI 營收的填法。確認之前換算等於猜，會造成假波動。
3. **塊 C 的存放位置**
   - 建議：**新 collection `shopee_perf_months`**（一通路一月一份 doc）。
   - 代價：TEST_NOWRITE 物件數 27 → 28、方法 45 → 46（推算，以防護碼實際輸出為準），你本機的防護碼要跟著更新。
   - 換來的是：不會撞到洞察表文件的 1MB 上限、不增加每個人打開洞察表的下載量、不占本機空間。
   - 塞進現有 insight 文件不用新增物件，但好麻吉一年內就可能撞 1MB，而且要改 4 個地方的 key 規則。

---

⚪ 無需測試（純文件）：這次只新增本檔，沒改任何程式，也沒有 commit 或 push。
🟡 方案內容只靠讀程式碼。行號是 `19c532b` 的行號，用 grep 核對過；雲端物件數用 CLAUDE.md 的 grep 核對過，是 27 個。
§3-3、§5-3 的 Console 程式碼**我沒有實際跑過**，跑出錯誤請把訊息貼給我。
動銷率門檻和 §2-6 的門檻都是起始值，一定要經過 §2-7 的回測才能定版。
