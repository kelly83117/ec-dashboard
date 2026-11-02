# MOMO 本機資料壓縮方案

勘查基準：`main` @ `3081757`（含 v815、v816）。這次沒改程式、沒 commit、沒讀 Firestore。量測用的是 node 加 repo 內的 `js/vendor/lz-string-1.5.0.min.js`，再從 `js/profit.js` 抽出 `_momoStableStr` / `momoEncodeSources` / `_momoProductsBuildSig`，產生同形狀的假資料。腳本在 `/tmp/claude-0/-home-user-ec-dashboard/56a03350-bd55-5966-9d43-6cd851b29d66/scratchpad/measure.js`。

---

## 0. 結論

1. **範圍只做兩類 key**：`ec_momo_products|<通路>` 和 `ec_momo_products_lastpushed|<通路>`。兩者佔 MOMO 本機用量的大宗，假資料量到可省約 87～89%。Kelly 的電腦約 2.5MB，預估剩 0.3MB 左右。
2. **`ec_momo_cost_by_origin`（含 `_meta`）這次不壓**，理由有三：
   - firebase.js:512-513 會直接 `JSON.parse` localStorage 讀它。
   - 解碼一旦失敗，會直接踩到 #175 的 `cloudEmpty` 地雷，再加上 `momoMergeByKey` 的 `delete` 分支，可能刪掉雲端的成本資料。
   - 它本身只有約 150K 字元，省下的不多。
3. **分三塊做**：
   - 第 1 塊只改讀取端（所有讀點都看得懂 LZ1，並補上「解不開就停手」的防呆），寫入維持 JSON。
   - 第 2 塊改寫入端、延後壓縮、開站就地壓縮。
   - 第 3 塊（可選）才動 firebase.js:291。
   - 第 1、2 塊**都不碰 firebase.js**，所以本機防寫基準不受影響。
4. **格式沿用 LZ1，但共用的只是底層**：從報表那套抽出「只處理字串、不管資料形狀」的解碼／編碼層。資料形狀由各呼叫端自己檢查：報表要求物件且含 `built` 陣列；products 要求陣列；lastpushed 要求「值全是字串」的物件。
5. **比對結果為什麼能逐字相同**：解壓出來的字串就是原本的 JSON 字串，`JSON.parse` 後是同一個值，所以 `momoProductsDirtySkus`、`momoProductsPlanMerge`、預覽、推送 payload 的輸入完全一樣，結果也一樣。真正要防的是「解不開」這條路，這是 §6 的重點。

---

## 1. 讀寫點清單

### 1-A 這次要動的兩類 key

**`ec_momo_products|<通路>`（商品主檔，每通路一把）**

| 位置 | 讀/寫 | 用途 |
|---|---|---|
| `js/profit.js:13920` | 寫 | `momoSaveProducts`：`localStorage.setItem(k,_json)`，失敗被 `catch{}` 吞掉、沒有任何提示。13921-13922 同步更新 `_profitMem` / `_mem`，13924 `_markPending`，13925 `_momoDirtyAdd`。全檔 22 處呼叫，多數是逐格或逐筆的編輯 commit（例：`momoCommitSupplierEdit` 19553、`momoMoPlusClearPrice` 19731） |
| `js/profit.js:13902` | 讀 | `momoLoadProducts`：讀取順序 `_profitMem → _mem → localStorage`，localStorage 是第三順位，壞掉時回 `[]` |
| `js/profit.js:13931` | 讀 | `momoPendingProducts`：讀取順序 `_mem → localStorage → _profitMem`。**推送（14025）、預覽（16609）、dirty 計算（13983）都從這裡拿值**，所以預覽看到的就是推上去的 |
| `js/profit.js:1707` | 讀 | `_sweepAllLocalReportsIntoPending`：dirty 且 `_mem` 沒值時，用 `JSON.parse(localStorage.getItem(k))` 補回 `_mem` |
| `js/firebase.js:291` | 寫 | `momo_products` 訂閱：不是 dirty、內容又跟 `_profitMem` 不同時，用 `JSON.stringify(items)` 寫回本機。280 行只比對 `_profitMem`，所以**每次開站（`_profitMem` 還是空的）每個通路都會整份重寫一次 JSON** |
| 只看 key 名、不讀內容 | — | 1701（sweep）、16471（`_momoSyncPendingCount`）、2080（推送分派）、16653 / 16753（預覽）、firebase.js:149 / 161（那裡比的是 app/profit 的雲端資料，不是 localStorage） |

**`ec_momo_products_lastpushed|<通路>`（上次成功推送的比對基準，格式 `{sku: _momoStableStr(p)}`）**

| 位置 | 讀/寫 | 用途 |
|---|---|---|
| `js/profit.js:13971-13976` | 讀 | `_momoProductsLastPushedGet`，**全專案唯一的讀取點**。沒有這把 key 或 JSON 壞掉都回 `null`，進 bootstrap 模式（壞掉時印 console.error） |
| 間接使用者 | 讀 | `momoProductsDirtySkus`（13985）、`momoSyncProductsMerge`（14027）、預覽（16754，透過 `window.__momoProductsLastPushedGet`） |
| `js/profit.js:13977` | 寫 | `_momoProductsLastPushedSet`，失敗只印 console.error |
| 寫入時機 | 寫 | ① 推送成功（14042）；② firebase.js:286 / 293 透過 `window.__momoProductsLastPushedSet`（13979）。②在**內容沒變時也會整份重寫**，每次收到 snapshot、每個不是 dirty 的通路都寫一次 |

⚠ 同一筆資料的 lastpushed 字串**比 products 還大**（量到約 1.2 倍）。原因是值是「JSON 裡面再包一層 JSON 字串」，所有引號都多了跳脫字元。

### 1-B 列出來但這次不動的

| key | 讀 / 寫行號 | 不動的理由 |
|---|---|---|
| `ec_momo_cost_by_origin` | 讀 22137-22140（`momoLoadCostByOrigin`）、1812-1813（sweep 用 `JSON.parse` 補回 `_mem` 和 `_profitMem`）、**firebase.js:512**；寫 22142、firebase.js:528；同步 22165-22180 | 見 §2-B（#175） |
| `ec_momo_cost_by_origin_meta` | 讀 22152-22155、firebase.js:513；寫 22158、firebase.js:540 | 跟 cost 同一份 doc、同一次合併推送 |
| `ec_momo_products_dirty` / `ec_momo_origins_dirty` / `ec_momo_origins_base` / `ec_momo_cost_dirty` / `ec_momo_rf_dirty` | 13952-13957、14053-14059、22216-22219、14948-14963 | 都很小，而且都是「判斷要不要推」的註冊表，壓縮沒好處只有風險 |
| `ec_momo_reconcile\|店\|月` | 14642-14653；另有多處逐 key 掃描並直接 `JSON.parse`：14361、14384、15507、19312、19423 | 讀點分散在 6 處以上，等 census（§5-C）證明它夠大再另案處理 |
| `ec_momo_freight\|` / `rent\|` / `f1102\|` / `s1103\|` / `e001\|` / `moplus_origins\|` / `optlog\|` / `optlog_del\|` / `c1105_ship\|` / `moplus_orders\|` / `moplus_unreg\|` / `stock_by_origin` | 14932-14940（freight，另有掃描 19432）、15010-15016、15022-15028、14679-14685、15518-15527（另有 15539、15544、15560）、15889-15898（另有 15913；14075 是 origins 的決策點）、17756-17762、17773-17784、17827、20203-20209、20815-20823、20831-20846、22487-22493 | 同上。另外泛用 field 推送的 fallback（2102、2226）、預覽（16616）、差異比對（1916）都是 `JSON.parse(raw)`；LZ1 字串會讓 parse 丟錯、值變 null、不會被推，但功能會壞 |
| `momo_cols\|店`、`ec_momo_price_hint`、`ec_momo_moplus_otherfee`、`momo_misscost_expand\|店`、`ec_momo_hint_colw` | 17033 / 17061、17715 / 17744、19933、22310、17124 | 只是 UI 偏好設定，量很小 |

另外確認過：`Store.get` / `Store.set` 沒有任何地方碰 `ec_momo_*`；backfill v3 的 `PREFIXES`（3273 行）不含 `ec_momo_`；`js/pages/*`、`app.js` 也沒有讀這兩類 key。

---

## 2. lastpushed 的比對機制與 #175

### 2-A lastpushed 怎麼當比對基準

- **dirty 的算法**：`dirty = diff(本機 pending, lastpushed)`。
  - changed＝簽名不同、added＝基準裡沒有、removed＝基準有但本機沒有。
  - 基準是 `null` 時（bootstrap）改以當下雲端為準，而且 **removed 一律為空**，不會刪雲端獨有的 SKU。
- **推送時**：`getDoc` 取雲端 → `momoProductsPlanMerge(雲端, 本機, lastpushed)` → `setShop(momoFsSanitizeDeep(plan.merged))` → **推成功才** `_momoProductsLastPushedSet(plan.merged)`。
- **預覽**（16754）用同一支 `momoProductsPlanMerge`，status 由 `pushSkus` / `deleteSkus` 決定。

**壓縮後為什麼逐字相同**：
- `_momoProductsLastPushedGet` 改成「LZ1 → 解壓得到原 JSON 字串 → `JSON.parse`」，結果跟今天 `JSON.parse(raw)` 是同一個物件。
- 本機那份每次都即時用 `_momoProductsBuildSig(local)` 重算，不經過壓縮。
- 所以 changed / added / removed / conflictSkus / merged 全部相同。
- 只有一條路會不一樣：**LZ1 解不開**。我建議讓它走跟今天「JSON 損毀」一樣的路：回 `null` → bootstrap → removed 為空，不會刪任何東西，同時 console.error。這是現有的保守語意，不是新行為。

**順帶發現（現有風險，壓縮能緩解）**：13977 寫入失敗時只印 console，**舊的基準會留著**。基準過期最壞的影響是重推一些值相同的 SKU，或對已經刪掉的 SKU 再刪一次（no-op），不會誤刪。但 13920 存 products 失敗是完全無聲的，重整後 edits 會消失。這正是空間滿了會出事的地方，壓縮直接處理了根因。

### 2-B #175（`momoSyncCostByOrigin` 的 cloudEmpty 地雷）會不會被影響

- **只壓 products / lastpushed 時：完全不影響。** 它的輸入是雲端 doc、`momoLoadCostByOrigin`、`momoLoadCostMeta`、`momoCostDirtyGet`，沒有一個會碰到被壓縮的 key。
- **如果哪天要壓 cost，會變得更危險**。解碼失敗時 `localMap={}`：
  - 雲端非空：`momoMergeByKey` 遇到 dirty 卻不在本機的 key 會執行 `delete out[k]`（22222 行）→ **把那些原廠編號從雲端刪掉**。
  - 雲端讀成空（`cloudEmpty` 為 true，包含 doc 不存在、讀取失敗）：推一份 `{costMap:{}, meta:{}}` 上去。
  - 另外 firebase.js:512 的 `JSON.parse` 會失敗；dirty 期間每一輪都跳過雲端更新（這是安全的方向，但會一直不同步）。
- **前置條件**：要壓 cost，得先修 #175（雲端讀不到就中止；本機讀取狀態是「壞」就中止），並且同時改 firebase.js:512-513。因此本案明確排除 cost。

---

## 3. 沿用 LZ1 格式、抽共用層

格式維持 `LZ1:<原始字元數>:<compressToUTF16(JSON)>`，好處是同一套檢查邏輯、同一套 console 觀測方式。

**不能直接用 `_reportCacheParse`**：它在 LZ1 路徑上要求「物件且含 `built` 陣列」，products 是陣列、lastpushed 是物件但沒有 `built`，兩者都會被它判成 null。

**建議抽出只處理字串的底層，形狀檢查交給呼叫端**：

```
_lz1Unwrap(raw) → { kind:'none'|'json'|'lz'|'bad', json:string|null }
   // 'none'＝null 或空字串；'json'＝沒有前綴、原樣交回；'lz'＝解壓成功且長度相符；'bad'＝有前綴但解不開、長度不符或 lz-string 不在
_lz1Encode(json) → string|null   // 壓縮後在記憶體內解回比對，不一致就回 null；開關檢查移到呼叫端
```

- `_reportCacheParse` / `_reportCacheEncode` 改成薄包裝（**行為逐字不變**）。用一組測試向量證明，包含舊 JSON、正常 LZ1、截斷、長度不符、長度欄位不是數字、沒有 lz-string、解出來是陣列。
- MOMO 這邊新增 `_momoLsRead(k, shape)` → `{state:'absent'|'ok'|'bad', value}`，shape 只有 `'array'`（products）和 `'sigmap'`（lastpushed，值全是字串的物件）兩種。
- **為什麼不另寫一套 MOMO 專用的**：「只認 `LZ1:` 前綴、長度欄位只准數字、解不開絕不回字串」這幾條規則有兩份就會漂移。報表那份已經上線驗證過，共用底層最穩。
- **為什麼不做全形狀通用的 parse**：「解不開」在兩種資料上語意相反。報表解不開＝當作沒快取、改讀雲端；products 解不開＝可能有沒推的 edits，必須停手。所以後續處理一定要由呼叫端決定。
- 寫入開關分開：新增 `_LS_COMPRESS_MOMO_WRITE` / `_LS_COMPRESS_MOMO_MIGRATE`，跟報表的開關各自回滾。

---

## 4. 分塊方式與 firebase.js

報表那種「先上讀取端、再上寫入」的做法**適用，而且是必要的**。如果寫入先上、讀取端沒跟上（或回滾回舊碼），舊碼讀到 LZ1 會 `JSON.parse` 失敗，`momoLoadProducts` 回 `[]`，接著走到 §6 那條最危險的路。

### 第 1 塊：讀取端＋防呆（還不寫 LZ1）

1. 抽 `_lz1Unwrap` / `_lz1Encode`，報表改成薄包裝。
2. 改四個讀點：13902、13931、1707、13971-13976。
3. 新增本 session 內的「讀壞」紀錄 `_momoLsBad`（只放記憶體）。`state==='bad'` 時：
   - `momoLoadProducts` / `momoPendingProducts`：維持今天的回傳形狀（`[]` 或退回 `_profitMem`），但**記下這把 key**，並跳一次紅字提示。
   - `momoSaveProducts`：若這把 key 讀壞，而且 `_profitMem` / `_mem` 都沒有值（代表手上這份資料是從 `[]` 長出來的），**拒絕存檔**並提示。
   - `syncToCloud` 分派到 2080 時：這把 key 讀壞 → 列進 `skippedProblem`、不推。
   - lastpushed 讀壞 → `null`（bootstrap）＋ console.error，跟今天的 JSON 損毀相同。
4. 本機裡全是 JSON 時，這一塊對畫面、預覽、推送的影響是**零**，§7 會證明。

### 第 2 塊：寫入端＋就地壓縮

1. **products（13920）**：維持今天的同步寫 JSON，資料可靠度跟現在完全一樣。
   - 寫入如果撞到 QuotaExceeded，**當場**改寫 LZ1（這種情況多等約 0.5～1 秒），再失敗才走原本的路，並把 `catch{}` 改成會提示。
   - 寫成功的話，停手 1.5 秒（用 `requestIdleCallback`，timeout 3 秒）後就地壓縮。
   - 就地壓縮直接沿用 `_reportCacheMigrate` 單把處理的流程：重讀比對 → 覆寫 → 讀回驗證 → 不一致就寫回原值。
   - 這樣分頁被直接關掉也不會掉資料，因為 JSON 早已同步寫入。
2. **lastpushed（13977）**：先比對再寫。
   - 記憶體快取 `_momoLpJsonCache[shop]` 存上次寫出的 JSON。內容一樣就**不寫**，這能消掉 firebase.js:286 每個 snapshot 都整份重寫的浪費。
   - 第一次沒有快取時，先比 LZ1 標頭的長度欄位；長度一樣才解壓比對。
   - 需要寫的時候，推送成功那次直接寫 LZ1（同步期間本來就有轉圈），snapshot 觸發的那次走延後寫入。
3. **開站就地壓縮**：比照 `_reportCacheMigrate`。
   - key 只認 `^ec_momo_products\|[^|]+$` 和 `^ec_momo_products_lastpushed\|[^|]+$`；形狀檢查依 §3。
   - 先處理最大的、每把之間讓出主執行緒；不登記 pending、不動 `_profitMem`、不推雲端。
   - 結果放在 `window.__momoLsMigrateReport`（只讀觀測點，名稱**不以 `__cloud` 開頭**）。
4. **firebase.js:291 回寫的 JSON**：profit.js 監聽既有的 `momoDataReady` 事件，對 `changedShops` 排一次延後就地壓縮（用同一支單把處理流程）。這個事件剛好只在 291 行真的寫入時才發出（`changed.push`）。
5. 補寫（flush）時機：pagehide、`visibilitychange` 變成 hidden、sweep 前。這只是讓 localStorage 早點變小，不影響資料正確性。

### 第 3 塊（可選）：firebase.js:291 改走 hook

- 現況：每次開站，每個通路都會先寫一份完整 JSON 進本機，再由第 2 塊壓回去。在空間快滿的機器上，這 1.5 秒內可能擠掉別的寫入。
- 改法：291 行改成 `window.__momoProductsLocalWrite ? window.__momoProductsLocalWrite(k, items) : localStorage.setItem(k, JSON.stringify(items))`，profit.js 沒載入時退回原行為。
- **對本機防寫基準的影響**：防護碼掃的是 `__cloud*` 物件和它們的寫入方法。hook 的名字不以 `__cloud` 開頭，而且只寫 localStorage、不碰 Firestore，所以**物件數 27、方法 45 預期不變**。我剛用 CLAUDE.md 的 grep 數過，目前 `main` 是 27。
- 但 CLAUDE.md 規定動 firebase.js 就要當場重數：得跑一次 grep（必須還是 27），並實際貼上防護碼，確認 Console 印出「27 個物件 / 45 個寫入方法」。
- 我的建議：先上第 1、2 塊，觀察一週，確認開站那 1.5 秒的空間尖峰真的造成問題，再做第 3 塊。

---

## 5. 省多少、要多久

### 5-A 壓縮率（假資料：中文品名、history 1～3 筆、20 期 periods 約 45% 有值、10% 下架）

| key（筆數） | 原本 | 壓縮後 | 省下 | 壓縮＋驗證 | 解壓 | JSON.parse |
|---|---|---|---|---|---|---|
| products\|甲配（1300） | 792K 字元 | 103K | 87.0% | 635ms | 72ms | 8ms |
| lastpushed\|甲配 | 945K | 110K | 88.4% | 968ms | 79ms | 2ms |
| products\|乙配（2600） | 1584K | 194K | 87.8% | 1548ms | 132ms | 19ms |
| lastpushed\|乙配 | 1892K | 205K | 89.2% | 1886ms | 141ms | 5ms |
| products\|MO+麻吉（500） | 305K | 43K | 85.9% | 339ms | 23ms | 3ms |
| lastpushed\|MO+麻吉 | 364K | 46K | 87.4% | 309ms | 24ms | 1ms |
| products\|MO+森之旅（300） | 183K | 27K | 85.2% | 146ms | 14ms | 2ms |
| （參考，不在範圍）cost_by_origin（6683） | 118K | 25K | 78.7% | 111ms | 12ms | 7ms |

- 假資料刻意做得比 Kelly 的實際值大（每把最大約 630KB）。比較的基準是壓縮率：**約 85～89%**。
- 套到 Kelly 的 2.5MB → 約 **0.28～0.38MB**，**大約騰出 2.1～2.2MB**。
- 實際資料重複度更高（品名、note 很多相同字樣），壓縮率可能更好，但沒有用真實資料驗證過。

### 5-B 寫入耗時與延後寫入

- 壓縮大約 **0.8～1ms／每 K 字元**（node 量測；辦公室筆電估 1.5～2 倍）。630K 的 products 每存一次大約卡 **0.5～1.2 秒**。
- `momoSaveProducts` 是逐格 commit 就觸發 → **一定要延後**，用第 2 塊的「同步寫 JSON、閒置後再壓」。
- lastpushed 在 snapshot 那條路一定要「內容沒變就不寫」，否則開站時 5 個通路會連續卡好幾秒。
- 解壓約 0.08ms／每 K 字元，630K 大約 70ms。只有在 `_profitMem` 和 `_mem` 都空（雲端還沒回來或離線）時才會走到。
  - 建議加一個小快取：raw 字串 → 解壓出來的 JSON 字串，**每次仍然重新 `JSON.parse` 一份新物件**。這樣保留今天「每次讀都拿到新物件」的語意，呼叫端修改到一半取消也不會汙染快取。

### 5-C 先在 Kelly 的電腦跑一次 census（只讀，不寫任何東西）

```js
(()=>{const r=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i),v=localStorage.getItem(k)||'';r.push({k,K字元:Math.round((k.length+v.length)/1024),lz:v.startsWith('LZ1:')});}r.sort((a,b)=>b.K字元-a.K字元);console.table(r.slice(0,40));console.log('合計',r.reduce((s,x)=>s+x.K字元,0),'K 字元');})()
```

用它確認 reconcile / origins / e001 這些有沒有大到值得做下一案，同時當作改前改後的對照數字。

---

## 6. 降級設計

| 失敗狀況 | 收斂結果 |
|---|---|
| lz-string 沒載入、壓縮丟錯、在記憶體內解不回原字串 | `_lz1Encode` 回 null → 寫未壓縮 JSON（＝現狀） |
| 寫 LZ1 後讀回不一致 | 寫回 JSON；JSON 也寫不進去 → 刪掉剛寫壞的那把，並提示（比照 `_reportCacheWrite`） |
| 就地壓縮途中被別的分頁搶寫 | 重讀比對不符 → 跳過（比照報表） |
| products 讀到壞掉的 LZ1 | 記進 `_momoLsBad`、紅字提示；**不准存檔**（避免從 `[]` 長出一份小清單），**同步時列為問題、不推**；那把 key 不刪不改，下次 lz-string 正常就讀得回來 |
| lastpushed 讀到壞掉的 LZ1 | `null` → bootstrap（removed 一律空，不刪雲端），跟今天 JSON 損毀的處理相同 |
| 回滾 | 只把 `_LS_COMPRESS_MOMO_WRITE` / `_MIGRATE` 改成 false 再部署。🔴 **第 1 塊的讀取碼永遠不回滾**（舊碼讀 LZ1 的 products 會得到 `[]`） |

**絕不把壓縮字串推上雲端，靠四道保護**：

1. 解碼層只回傳物件、陣列或 null，永遠不回字串。
2. `momoSyncProductsMerge` 推之前加 `Array.isArray(local)` 守衛，不是陣列就 throw。
3. lastpushed 不在任何推送路徑上。
4. 泛用 field 分支用 `JSON.parse` 讀 LZ1 會丟錯，值變 null，不會推（現有行為，保留）。

**建議另加一道保護（行為會變，需要 Kelly 決定）**：今天 `momoSyncProductsMerge` 只擋「本機是空的、雲端有資料」。如果本機只剩幾筆（例：讀壞之後從 `[]` 新增了一筆），`deleteSkus` 可能高達上千筆，而這個狀況今天擋不住。建議加門檻：`deleteSkus > max(20, 雲端筆數的 10%)` 就中止並提示。正常的下架是打旗標、不是刪除，大量刪除本來就很少見；但要確認沒有合法的批次刪除流程會被誤擋。

---

## 7. 測試計畫與回歸保護

### 7-A 逐字相同的證明方法

1. **node 對照測試**（放 scratchpad，不進 repo）：從 profit.js 抽出 `_momoStableStr`、`_momoProductsBuildSig`、`momoProductsDirtySkus`、`momoProductsPlanMerge`、`momoFsSanitizeDeep` 和新的解碼層。
   - 隨機產生雲端、本機、lastpushed，再隨機改、增、刪 SKU，跑 1000 組。
   - lastpushed 和本機各用「JSON」與「LZ1」兩種形式餵進去，比對 `JSON.stringify(dirtySkus)`、`JSON.stringify(plan)`、`JSON.stringify(momoFsSanitizeDeep(plan.merged))` 是否全部相等。
   - 另跑報表薄包裝的測試向量（§3）。
2. **Console 自檢 `__momoLsCompressSelfTest()`**（只讀）：在真實資料上，於記憶體內 encode → decode → 比對；並用「JSON 版」與「解碼版」的 lastpushed 各跑一次 `momoProductsPlanMerge(雲端快照, pending, lp)`，比對輸出。
   - 雲端值用 `_profitMem` 現值，**不另外 getDoc**。
   - 不寫任何 key，尤其不能寫任何 `ec_` / `ec_momo_` 開頭的暫存 key，否則會被 sweep 撿進待推清單。
3. **瀏覽器 A/B 抓推送 payload**（localhost，先確認 TEST_NOWRITE 印出 27 / 45）：
   - 把 `__cloudMomo.getDoc` 換成回傳固定 fixture、`setShop` 換成只記錄參數的函式（都不碰網路）。
   - A 組：本機全是 JSON，開預覽、記下 `_momoCollectPending` 結果，按同步、記下 payload 的 hash。
   - 跑就地壓縮 → 硬重整 → B 組：做同樣的步驟。
   - 兩組的預覽和 payload hash 必須相等，`__momoLastMergePlan` 也要相等。

### 7-B 回歸與故障注入

- 讀壞注入：手動把 LZ1 截斷 → products 要不准存檔、同步列為問題；lastpushed 要走 bootstrap。
- 移除 `window.LZString` 後存檔 → 要寫 JSON。
- 塞滿空間：用 `zz_fill` 這種不以 `ec` 開頭的 key 塞滿 → 存檔要能當場改寫 LZ1；兩種都失敗要有提示。
- 開兩個分頁同時編輯 → 就地壓縮要跳過被搶寫的那把。
- 回滾開關改 false → 讀得懂已存在的 LZ1、新寫入是 JSON。
- snapshot 內容沒變 → lastpushed 不寫（在 setItem 前加 console 計數驗證）。
- CLAUDE.md 規定的路徑：登入 → 首頁 → 淨利表（賣場分頁出現）→ MOMO 甲／乙／MO+ 總表、批次維護、商品同步預覽 → 洞察表 → 帳號管理；改 JS 後要 Ctrl+F5。

### 7-C 風險與不確定

1. **部署空窗**：`version.js` 只在開頁時比版號。第 2 塊部署時，仍開著的第 1 塊以前的舊分頁讀 LZ1 會得到 `[]`。第 1 塊上線後**至少隔幾天、請大家重新整理**，再上第 2 塊。
2. LZ 沒有校驗碼，擋不住「長度相同但內容被換」的損壞（跟報表相同的已知限制）。寫入時有讀回驗證，所以只剩儲存媒體本身壞掉的可能。
3. 時間是 node 量的，瀏覽器（尤其舊筆電）可能更慢。
4. 壓縮率是用假資料量的，Kelly 的真實資料沒有驗證過；§5-C 的 census 可以補上。
5. localStorage 的配額怎麼計算（字元數或位元組）各瀏覽器不同。這裡一律用字元數比較；`compressToUTF16` 每個字元裝 15 bit，用字元數比較才公平。
6. 第 2 塊沒動 firebase.js，所以每次開站仍會短暫寫入完整 JSON，在快滿的機器上可能擠掉別的寫入；第 3 塊才能根治。
7. §6 的大量刪除門檻需要 Kelly 決定，可能誤擋合法的批次刪除。

---

🟡 未實測 browser，只做程式碼驗證和 node 量測。我讀了 `js/profit.js` / `js/firebase.js` 列出所有讀寫點，用 CLAUDE.md 的 grep 確認雲端物件數是 27，壓縮率和耗時是在 node 上用 repo 內的 lz-string 加 repo 內的函式、跑同形狀假資料量出來的。
   沒有實測：真實資料的壓縮率、瀏覽器裡的耗時、任何畫面行為。方案裡的函式名（`_lz1Unwrap`、`_momoLsRead` 等）都還沒實作。
   驗證路徑：先在 Kelly 的電腦 F12 跑 §5-C 的 census 取得真實數字，再依第 1 塊動工。

---

## 8. 第 1 塊實作細節（本機重新勘查）

勘查基準：`main` @ `a229a47`（含 v815、v816、v817 空間預警），分支 `feat/momo-compress-1`。這次只讀程式碼，沒改程式，也沒讀 Firestore。
前面各節的行號是依 `3081757` 算的。v817 之後，profit.js 整體往後移了約 130～150 行，**行號以本節為準**。

### 8-1 範圍（照已決定的）

- 只動 `js/profit.js`，另加 `css/profit.css` 一小段確認視窗樣式（見 8-6）。**不動 firebase.js、不動版號、不寫任何 LZ1。**
- 只處理 `ec_momo_products|<通路>` 和 `ec_momo_products_lastpushed|<通路>`。`ec_momo_cost_by_origin`（含 `_meta`）不動。
- 另外確認了三件事：
  - 全專案沒有任何程式用 `startsWith('ec_momo_')` 這類寬前綴掃 localStorage 再 `JSON.parse`。
  - `_LS_TIDY_DENY_PREFIX` 已經包含 `'ec_momo'`，而且 key 名含 `lastpushed` 的也一律跳過，所以「一鍵釋出空間」不會碰這兩類 key。
  - backfill v3（3476 行）只對 `ec|` 開頭的 key 走 `_reportCacheParse`，不含 MOMO。

### 8-2 重新對過的行號（`a229a47`）

| 位置 | 內容 | 第 1 塊動不動 |
|---|---|---|
| profit.js:12-13 | `_LS_COMPRESS_WRITE` / `_LS_COMPRESS_MIGRATE` | 不動。MOMO 自己的寫入開關到第 2 塊才加 |
| profit.js:1348-1357 | `_reportCacheEncode` | 改成薄包裝 |
| profit.js:2574-2592 | `_reportCacheParse` | 改成薄包裝 |
| profit.js:1363 / 1369 / 1456 / 1466 / 2009 / 2598 / 3476 / 4575 | 報表 encode / parse 的呼叫端 | 不動（函式簽名和回傳值都不變） |
| profit.js:1856-1864 | sweep：dirty 且 `_mem` 沒值時，執行 `Store._mem[k]=JSON.parse(localStorage.getItem(k))`（1862） | 改讀點 |
| profit.js:2238-2244 | `syncToCloud` 裡 products 的分派 | 加「讀壞就不推」 |
| profit.js:2391-2404 | allowKeys 過濾，以及 `_momoFullPushDeleteGuard` | 在這段之後插入「刪除防線預檢」（8-5） |
| profit.js:2410-2425 | `tasks.length===0` 的提前結束分支。skippedProblem 的文案寫死成「讀不到…請重新產生報表」 | 文案依 label 分流（8-5-4） |
| profit.js:2452-2480 | 逐筆 await 的推送迴圈。**每筆有 30 秒逾時**，一旦逾時，剩下的就不再嘗試 | 不動。但這正是確認視窗不能開在 task 裡的原因（見 8-5-2） |
| profit.js:2528 | 收尾彈窗把 `skippedProblem` 一律標成「［讀不到］」 | 改成 `p.label||'讀不到'` |
| profit.js:14054-14062 | `momoLoadProducts`（讀 localStorage 在 14061） | 改讀點 |
| profit.js:14064-14084 | `momoSaveProducts`（`setItem` 在 14078） | 加「讀壞就拒存」 |
| profit.js:14087-14092 | `momoPendingProducts`（讀 localStorage 在 14089） | 改讀點 |
| profit.js:14129-14134 | `_momoProductsLastPushedGet` | 改讀點 |
| profit.js:14135 | `_momoProductsLastPushedSet` | 不動（照樣寫 JSON） |
| profit.js:14141-14152 | `momoProductsDirtySkus` | 不動 |
| profit.js:14156-14177 | `momoProductsPlanMerge`（純函式） | 不動 |
| profit.js:14181-14202 | `momoSyncProductsMerge`（本機空的防呆在 14198、`setShop` 在 14199、更新 lastpushed 在 14200） | 加 `Array.isArray` 守衛和刪除防線 |
| profit.js:15968-15981 | `momoMoPlusCleanDirty`（Console 工具，**直接 `setShop` 整包推上雲端**，見 8-5-6） | 不動 |
| profit.js:16717 起、16767、16904-16916 | 同步預覽：用 `momoPendingProducts` 取本機值、用 `momoProductsPlanMerge` 算 `delN` | 不動，確保預覽逐字相同 |
| profit.js:18096-18106 | `momoDeleteProduct`（單筆刪除） | 不動 |
| firebase.js:272-296 | `momo_products` 訂閱：不是 dirty 的話，把雲端內容寫回本機 JSON，並寫 lastpushed | 不動 |

### 8-3 共用底層 `_lz1Unwrap` / `_lz1Encode`，報表那兩支改成薄包裝

新函式放在 `_reportCacheEncode` 正上方。function 宣告會 hoist；前綴照舊寫字面值、不抽成 const，理由同 2565 行的註解。

```js
// 回 { kind, json }：'none'＝非字串或空字串；'json'＝沒有 LZ1: 前綴（原樣交回）；'lz'＝解壓成功且長度相符；'bad'＝有前綴但不認／解不開／lz-string 不在
function _lz1Unwrap(raw){
  if(typeof raw!=='string'||raw==='') return {kind:'none',json:null};
  if(!raw.startsWith('LZ1:')) return {kind:'json',json:raw};
  const sep=raw.indexOf(':',4);
  const lenStr=sep>4?raw.slice(4,sep):'';
  if(!/^(0|[1-9]\d{0,8})$/.test(lenStr)) return {kind:'bad',json:null};
  let json=null;
  try{ const LZ=window.LZString; if(!LZ||typeof LZ.decompressFromUTF16!=='function') return {kind:'bad',json:null}; json=LZ.decompressFromUTF16(raw.slice(sep+1)); }
  catch(e){ return {kind:'bad',json:null}; }
  if(typeof json!=='string'||json===''||json.length!==Number(lenStr)) return {kind:'bad',json:null};
  return {kind:'lz',json};
}
// 回 LZ1 字串或 null（沒有 lz-string／壓縮丟錯／記憶體內解不回原字串）。開關由呼叫端判斷。
function _lz1Encode(json){ /* 今天的 _reportCacheEncode 拿掉 _LS_COMPRESS_WRITE 那一個條件，其餘逐字搬過來 */ }

function _reportCacheEncode(json){ return _LS_COMPRESS_WRITE?_lz1Encode(json):null; }
function _reportCacheParse(raw){
  const u=_lz1Unwrap(raw);
  if(u.kind==='none'||u.kind==='bad') return null;
  let v=null;
  try{ v=JSON.parse(u.json); }catch(e){ return null; }
  if(u.kind==='json') return v;                       // 舊格式刻意不檢查形狀（同今天）
  return (v!==null&&typeof v==='object'&&!Array.isArray(v)&&Array.isArray(v.built))?v:null;
}
```

2565-2573 行那段長註解（格式、為什麼只認前綴、長度欄位規則、已知限制）搬到 `_lz1Unwrap` 上方。`_reportCacheParse` 只留形狀檢查那兩行的說明。

**怎麼證明行為逐字不變**（node 測試，放 scratchpad、不進 repo）：用 `git show a229a47:js/profit.js` 抽出舊版的兩支函式，跟新版逐一比對 `JSON.stringify(輸出)`。

- 固定向量：
  - 非字串與空值：`null`、`undefined`、`''`、數字。
  - 舊 JSON：物件、陣列、`null`、字串、壞掉的 JSON。
  - LZ1 內容：正常的報表形狀、解出來是陣列、解出來是沒有 `built` 的物件。
  - 截斷與長度：截斷一半、截斷到只剩前綴、長度少 1、長度多 1。
  - 長度欄位格式：空的、前導 0、10 位數、含字母、負號、沒有第二個 `:`。
  - lz-string 異常：拿掉 `window.LZString`、`decompressFromUTF16` 丟錯、`decompressFromUTF16` 回 `''` 或 `null`。
- 隨機測試：
  - 1000 組隨機報表物件：兩版 encode 的結果要相同，兩版 parse 的結果也要相同。
  - 對 LZ1 字串做 1000 組隨機截斷或隨機換字：兩版輸出要相同。
- `_LS_COMPRESS_WRITE` 開、關各跑一次。關的時候兩版都必須回 null。

### 8-4 MOMO 讀取層 `_momoLsRead` 與四個讀點

```js
// 回 { state:'absent'|'ok'|'bad', value, why }。shape：'array'（products）／'sigmap'（lastpushed）
function _momoLsRead(k, shape){
  let raw=null; try{ raw=localStorage.getItem(k); }catch(e){ return {state:'absent',value:undefined,why:'getItem 丟錯'}; }   // 同今天：讀不到＝沒有
  const u=_lz1Unwrap(raw);
  if(u.kind==='none') return {state:'absent',value:undefined};
  if(u.kind==='bad')  return {state:'bad',value:undefined,why:'LZ1 解不開'};
  let v; try{ v=JSON.parse(u.json); }catch(e){ return {state:'bad',value:undefined,why:(u.kind==='lz'?'LZ1 解出來不是 JSON':'JSON 壞掉')}; }
  if(u.kind==='json') return {state:'ok',value:v};    // 舊格式不檢查形狀 → 跟今天 JSON.parse 的結果逐字相同
  const okShape = shape==='array' ? Array.isArray(v)
    : (v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.values(v).every(x=>typeof x==='string'));
  return okShape?{state:'ok',value:v}:{state:'bad',value:undefined,why:'LZ1 形狀不對'};
}
```

`_momoLsNoteBad(k, r)` 負責記錄讀壞：

- 記進 `_momoLsBad`（`Map`，只放記憶體）。
- console.error **只印 key、why、字元數，不印內容**。
- products 另外跳一次紅字 toast：同一把 key 在一個分頁只跳一次，而且登入後才跳（比照 `_momoLoggedIn` / `_momoOSkipShown`）。
- 讀到 `ok` 或 `absent` 時，就把該 key 從 `_momoLsBad` 刪掉。也就是每次讀都重算狀態，不會一直卡在「壞」。

為什麼只有 dirty 的通路會一直壞：不是 dirty 的通路讀壞時，firebase.js:289 的訂閱會用雲端 JSON 把本機整份蓋回去，自己就好了。會一直壞的只有 dirty 的通路，而那正是「裡面有沒推的修改」的情況。

| 讀點 | 改法 | 本機全是 JSON 時，跟今天比 |
|---|---|---|
| `momoLoadProducts` 14061 | `ok` → 回 value；`bad` → 記錄後回 `[]`；`absent` → 回 `[]` | 相同。今天是 `if(local) return JSON.parse(local)`：空字串不會進去，`'null'` 回 null，新版兩種情況結果一樣 |
| `momoPendingProducts` 14089 | `ok` → 回 value；`bad` → 記錄後往下退回 `_profitMem`；`absent` → 往下 | 相同 |
| sweep 1862 | 改成 `const r=_momoLsRead(k,'array'); if(r.state==='ok') Store._mem[k]=r.value; else if(r.state==='bad') _momoLsNoteBad(k,r);` | 相同。今天 parse 失敗就不設值。迴圈拿到的 k 一定存在，所以 `absent` 只可能是空字串；今天 `JSON.parse('')` 也會丟錯、不設值 |
| `_momoProductsLastPushedGet` 14129 | `absent` → null；`bad` → console.error 後回 null；`ok` 時照今天再檢查一次「是物件而且不是陣列」，不符就回 null（不印錯，同今天） | 相同。JSON 壞掉時一樣印 console.error、回 null，唯一差別是不再把整段 raw 印進 console |

**⚠ 待你確認 A：「JSON 壞掉」要不要也算 `bad`（會觸發拒存，同步時列為問題）？**
我建議要算。理由：

- 它跟「LZ1 解不開」是同一種風險：如果那個通路是 dirty，裡面可能有沒推的修改；從 `[]` 長出一份小清單一存檔，就會把那些修改蓋掉。
- 回傳值不變（一樣是 `[]`，或退回 `_profitMem`），只是多一層保護。
- 本機全是合法 JSON 時完全不會走到這條路，不影響 §7-A 的逐字相同。

### 8-5 讀壞時的保護，以及大量刪除防線

#### 8-5-1 讀壞時的保護

1. **`momoSaveProducts` 拒存**
   - 判斷時機是存檔當下重新判斷。條件：`Store._profitMem[k]` 與 `Store._mem[k]` 都沒有值，**而且** `_momoLsRead(k,'array').state==='bad'`。
   - 符合時：不寫 localStorage、不改鏡像、不標 pending / dirty，並跳 `App.showAlertModal`（error）：
     「{通路} 的本機商品資料讀不到（可能損毀），為了不覆蓋還沒同步的修改，這次的修改沒有存。請不要再編輯這個通路，並通知 Keani。」
   - 拒存回傳 `false`，正常存檔回傳 `true`。22 個呼叫端今天都沒用到回傳值，所以不受影響。
   - ⚠ 已知小瑕疵：呼叫端之後可能照樣跳綠色的「已更新 N 筆」toast（例如 `_momoSyncAfterApply`），紅色彈窗會蓋在它上面。第 1 塊不逐一修改這 22 個呼叫端。
   - 為什麼「鏡像有值就放行」是安全的：載入 → 修改 → 存檔都在同一個同步 handler 裡。鏡像有值，代表手上那份是從鏡像來的，不是從 `[]` 長出來的。
2. **`syncToCloud` 的分派（2238）**
   - 條件：`Store._mem[pk]===undefined`，而且 `_momoLsRead(pk,'array').state==='bad'`。
   - 符合時：`skippedProblem.push({key:pk, label:'本機讀不到', reason:'本機商品主檔解不開，這次不推（避免用不完整的資料刪掉雲端）；請通知 Keani'})`。
   - 判斷順序跟 `momoPendingProducts` 一樣：`_mem` 有值就不看 localStorage，所以不會誤擋 `_mem` 裡有正確值的情況。
3. **`momoSyncProductsMerge`**
   - 一樣做第 2 點的判斷，讀壞就 throw。因為 Console 的 `__momoMergeEnforce` 不經過分派，這裡要自己擋。
   - `local` 不是陣列就 throw（方案 §6 的保護 2）。今天寫的是 `momoPendingProducts(pk)||[]`，非陣列會被 PlanMerge 當成 `[]`；合法的 JSON 陣列不受影響。
   - 14198 原本的「本機空、雲端有 → 中止」保留不動。

#### 8-5-2 刪除防線放哪裡：不能在 task 裡跳視窗

推送迴圈（2452-2480）每筆 task 有 **30 秒逾時**，而且逾時之後**剩下的 task 一律不再嘗試**。
如果確認視窗開在 `momoSyncProductsMerge` 裡（也就是 task 執行中），使用者考慮超過 30 秒就會出三個問題：

- 這筆被判逾時。
- 後面的通路全部不推。
- 使用者之後按「確定」，那筆照樣晚到寫入（逾時取消不了）。

所以拆成兩段：

**第一段：預檢**（新增，插在 2404 之後、2405 的 log 之前）

對 `tasks` 裡每個 `ec_momo_products|` 的 key：`getDoc` 取雲端 → `momoProductsPlanMerge` → 算出防線等級（見 8-5-3）。依等級處理：

- 「正常」：不動。
- 「要確認」：`await` 確認視窗（不受 30 秒限制），按鈕文字改成「等待確認刪除…」。
  - 按取消：從 `tasks` 拿掉，並 `skippedProblem.push({label:'已取消', reason:'要刪除雲端 N 筆，你按了取消，這個通路這次沒有推'})`。
  - 按確定：記下核准清單 `approved[shop]=Set(這次要刪的 SKU)`。
- 「中止」：從 `tasks` 拿掉，並 `skippedProblem.push({label:'已停止', reason:'刪除數量異常（N 筆，雲端共 M 筆），已停止同步，請通知 Keani'})`。
- 預檢的 `getDoc` 失敗：不擋。留給 task 本身照今天的方式失敗、進 failed。

**第二段：task 本身**（`momoSyncProductsMerge(shop, {approvedDeletes})`）

照今天的流程重新 `getDoc` → plan，**寫入前再算一次等級**：

- 「正常」→ 推。
- 「要確認」→ 這次實際要刪的 SKU 全都在 `approvedDeletes` 裡才推；否則 throw「確認後雲端內容變了，這次沒推，請重按同步」（進 failed）。
- 「中止」→ throw，訊息同預檢。
- 沒帶 `approvedDeletes`（Console 直接呼叫）而等級是「要確認」→ 在函式裡直接跳確認視窗。Console 呼叫不走推送迴圈，沒有逾時問題。
- `shadow` 模式只算、不擋、不跳視窗，只在 log 多印一行等級。

代價：每個要推的 products 通路多一次 `getDoc`。同步預覽本來就會讀同一份，用的是既有的讀取方法。

#### 8-5-3 門檻（常數，放在 `momoSyncProductsMerge` 上方）

```js
const MOMO_DEL_GUARD_MIN=20;              // 刪除筆數在這以下一律放行
const MOMO_DEL_GUARD_CONFIRM_RATIO=0.10;  // 超過 max(MIN, 雲端筆數 × 10%) → 要確認
const MOMO_DEL_GUARD_ABORT_RATIO=0.50;    // 超過 雲端筆數 × 50% → 直接中止
const MOMO_DEL_GUARD_SHOW=10;             // 確認視窗列出前幾個 SKU
```

另寫純函式 `_momoDelGuardLevel(plan, cloudItems)` → `{level:'ok'|'confirm'|'abort', n, m, skus}`，node 測試可以直接測。

**⚠ 待你確認 B：N 要算「deleteSkus 全部」，還是只算「deleteSkus 裡雲端真的還有的」？**
我建議只算後者，也就是實際會被刪掉的筆數。理由：

- `deleteSkus` 來自 lastpushed 基準，會包含「雲端早就沒有了」的 SKU：可能是同事已經刪過，或是 8-5-6 的 Console 清理工具已經直接推過雲端。這些刪了等於沒刪。
- 如果算全部，`momoMoPlusCleanDirty` 清掉 30 筆之後的下一次正常同步，會被要求確認一批其實已經不在雲端的刪除，甚至被中止。

M 是雲端裡有 `sku` 的筆數（`cloudMap.size`）。M＝0 時 N 一定是 0，不會觸發防線。

**⚠ 待你確認 C：小通路的邊界怎麼處理？**
照字面「N > M × 50% 就中止」，小通路會出問題：

- 雲端只有 30 筆的通路，刪 16 筆就會被中止；3 筆刪 2 筆也會被中止。
- M < 40 時，50% 比 20 筆還小，「要確認」那一層根本不存在。

我建議「中止」也套最低值：`N > max(MIN, M × 50%)` 才中止。現有四個通路（甲配約 1300、乙配約 2600、MO+ 約 300～500）不受影響，只影響未來的小通路或測試通路。

最後的判斷順序（依我對 B、C 的建議）：
```
N ≤ 20                      → ok
N > max(20, M × 50%)        → abort
N > max(20, M × 10%)        → confirm
其餘                         → ok
```

#### 8-5-4 確認視窗與訊息

**不能用現成的兩種做法：**

- 原生 `confirm()`：預設按鈕是「確定」，做不到「預設是取消」。
- `App.openModal`：用的是共用的 `#modal`。點背景時 `closeModalOnBackdrop` 會直接關窗、不呼叫 `onCancel`，Promise 就永遠不會 resolve。

**做法：** profit.js 新增 `_momoDelGuardConfirm({shop,n,m,skus})` → `Promise<boolean>`，自建一個 overlay（比照 17036 `momo-sync-overlay` 的做法）。

- 內容：
  「{通路顯示名} 這次同步會從雲端刪除 N 筆商品（雲端共 M 筆）。前 10 個：SKU…（還有 X 個）。正常下架是打旗標、不會刪除；如果你沒有刻意刪這些商品，請按取消並通知 Keani。」
- 按鈕：「取消」是主色、設 `autofocus`，放右邊；「確定刪除並同步」是紅框的次要按鈕，放左邊。
- Esc、點背景、按 ✕ 一律等於取消。同一時間只開一個。
- 樣式放 `css/profit.css`（新 class `mm-delg-*`），不在 JS 裡寫大段 inline style。

**收尾訊息：**

- 2528 改成 `'［'+(p.label||'讀不到')+'］'`。
- 提前結束分支（2410-2425 處理 `skippedProblem` 的那段）：只要有任何一筆帶 `label`，標題改成「同步未完成」，內文改成「有 N 項沒有推上去」，detail 照樣逐筆列出。
- 沒有 label 時，文案完全不變。

#### 8-5-5 程式裡有沒有「合法的一次大量刪除商品」流程

22 個 `momoSaveProducts` 呼叫點，以及所有 `splice` / `filter` 都看過了：

| 流程 | 會不會一次刪很多 | 這兩層會不會誤擋 |
|---|---|---|
| `momoDeleteProduct`（18096，批次維護的「刪除商品」鈕） | 一次一筆，而且有交易資料的商品不能刪 | 只有「連刪超過 20 筆才按同步」時會要求確認，這本來就該確認 |
| MO+ 商品主檔匯入（15870 一帶） | **不刪**，主檔裡沒有的只標 `discontinued=true` | 不會 |
| 商品資料同步的「標下架 / 復架 / 新增 / 改價 / 改名 / 改成本」（22735-22785） | **不刪**，只改欄位或新增 | 不會 |
| 改品號（19705 / 19867） | 一次一筆：舊 SKU 算刪除 1 筆、新 SKU 算新增 1 筆 | 不會 |
| `momoMoPlusCleanDirty`（15968，**Console 工具**，清掉 MO+ 裡沒有期別資料的重複、空名稱、TEMP 等筆） | **會，可能一次幾十筆** | 見 8-5-6 |
| PChome `pchomeDeleteProduct`（28227） | 不是 MOMO，不經 `momoSyncProductsMerge` | 無關 |

結論：**畫面上沒有任何「批次刪除」或「重新匯入覆蓋」商品的流程**。唯一能一次刪很多的是 Console 工具 `momoMoPlusCleanDirty`。

#### 8-5-6 `momoMoPlusCleanDirty` 跟防線的互動

這支工具的流程：先 `momoSaveProducts`（本機刪掉並標 dirty），**再直接用 `__cloudMomo.setShop` 整包推上雲端**。這一步沒有 await、不經 merge、不更新 lastpushed，也不經過這道防線。

- 照建議 B（只算雲端真的還有的）：它推成功後，雲端已經沒有那些 SKU，下一次正常同步 N＝0，**不會誤擋**。
- 如果它那次直接推失敗（因為沒有 await，失敗只會變成 unhandled rejection），雲端仍有那些 SKU，下一次正常同步會依數量要求確認或中止。這是正確的行為，因為那時才是真的要刪。
- 如果照字面算 deleteSkus 全部：它之後的第一次同步會被誤要求確認，甚至被中止。這是我建議 B 的主要理由。
- 這支工具本身繞過防線的問題，第 1 塊不處理：它是 Console 專用、要手打 idx，而且只要有一筆掛著期別資料就整批擋下。你要的話，可以另案改成走 merge。

### 8-6 會改的檔案

- `js/profit.js`：8-3、8-4、8-5 全部。
  - 新增的函式都只在模組內部用，唯一的例外是唯讀觀測點 `window.__momoLsState()`：列出這兩類 key 的格式、字元數、讀取狀態；不回傳內容、不寫任何東西、名稱不以 `__cloud` 開頭。
  - 不新增 inline handler（確認視窗的按鈕用 `addEventListener`），所以 `Object.assign(window, …)` 的名單不用改。
- `css/profit.css`：確認視窗的幾條 `mm-delg-*` 規則。
- 不動：`js/firebase.js`、`index.html`、`js/main.js`、版號，以及 `docs/` 以外的文件。
- CLAUDE.md 的「資料與後端」等段落，等這塊驗收後再補（`_lz1Unwrap`、讀壞的語意、刪除防線常數）。

### 8-7 回歸保護與測試

1. **動手前快照**：`git show a229a47:js/profit.js > scratchpad/profit.before.js`，另外存一份 `css/profit.css`。node 測試的「舊版」一律從這份快照抽，不從工作區抽。
2. **報表薄包裝**：8-3 的固定向量，加上隨機測試各 1000 組。
3. **MOMO 逐字相同（§7-A，1000 組以上隨機）**
   - 抽出舊版與新版的這些函式：`momoLoadProducts`、`momoPendingProducts`、`_momoProductsLastPushedGet`、`momoProductsDirtySkus`、`momoProductsPlanMerge`、`momoFsSanitizeDeep`、`_momoStableStr`、`_momoProductsBuildSig`、`momoSyncProductsMerge`。
   - `localStorage`、`Store`、`__cloudMomo` 都用假物件，`setShop` 只記錄參數。
   - 每組隨機產生：雲端；本機（`_mem` 有 / 沒有 × localStorage 有 / 沒有）；lastpushed（有 / 沒有 / null）。再隨機改、增、刪 SKU。本機一律是 JSON。
   - 比對兩版的這些輸出，全部 `JSON.stringify` 後要相等：`momoLoadProducts`、`momoPendingProducts`、`DirtySkus`、`PlanMerge`、`setShop` 收到的 payload、之後寫入的 lastpushed 字串、`__momoLastMergePlan`。
   - 刪除筆數超過門檻的組別**另外統計**：新版本來就該擋，不算進「逐字相同」，改驗三件事：等級判斷正確、沒有呼叫 setShop、沒有寫 lastpushed。
4. **防呆與防線的單元測試**
   - `_momoLsRead` 的各種壞法：截斷的 LZ1、長度不符、形狀不對、壞掉的 JSON、拿掉 `LZString`。
   - 拒存的四種組合：鏡像有 / 沒有 × 讀取 ok / bad。
   - `_momoDelGuardLevel` 的邊界：N＝20 與 21；剛好等於 M×10%、M×50% 與各多 1；M＝0；M＝30；只算雲端還有的。
   - 預檢核准之後，task 重新計算時清單變多 → 要 throw。
5. **瀏覽器**：⚠ **待你確認 D**。本機開站一定會連正式 Firestore 讀資料（訂閱、getDoc），這跟「不要讀正式 Firestore」衝突。兩個選項：
   - (a) 只做 node 測試，加上一個放在 scratchpad 的小頁面：只載 lz-string、抽出來的函式、確認視窗和 CSS，不載 firebase.js；用它實測確認視窗的鍵盤操作、點背景、預設按鈕。回報會標 🟡，整站路徑由你自己開來驗。
   - (b) 你允許這一次本機開站讀正式資料（寫入仍靠本機防護碼擋），我照 CLAUDE.md 跑完整路徑。

   我建議 (a)。

### 8-8 待你確認的事（整理）

- **A**：壞掉的 JSON 也算「讀壞」（拒存，同步時列為問題）嗎？建議：是。
- **B**：刪除筆數 N 只算「雲端真的還有的」嗎？建議：是（避免 `momoMoPlusCleanDirty` 之後被誤擋）。
- **C**：「中止」也套 20 筆的最低值嗎？建議：是（只影響未來的小通路）。
- **D**：瀏覽器驗證走 (a) 還是 (b)？建議：(a)。

⚪ 本節只補文件，沒動 runtime 程式。

### 8-9 實作結果（2026-11-02，未 commit）

A～D 全部照建議做。跟上面設計不同的地方只有三個：

- 讀壞登記用 `_momoLsReadNote`（讀＋登記一起做），沒有另外一支 `_momoLsNoteBad`。
- 多一個唯讀示範 `window.__momoDelGuardDemo()`：只用假資料開確認視窗，不讀不寫。
- 「不到 40 筆的小通路」：刪 20 筆以內一律放行；但刪超過 20 筆又超過一半仍會中止（例：36 筆刪 24 筆）。

驗證（node，scratchpad，不進 repo）：

- 報表快取快照：改前改後同一批輸入（5 種情境：正常 / 沒有 lz-string / 開關關閉 / 寫 LZ1 失敗 / 全部寫入失敗；含 4277 個 LZ1 字串、舊 JSON、1000 組隨機毀損），輸出 48,955,776 bytes **逐位元組相同**。
- MOMO 舊版 vs 新版 1500 組隨機：防線放行的 1320 組全部逐字相同（其中 1019 組真的有推送、1053 組含刪除）；防線擋下的 180 組全部「沒推、沒改 lastpushed、讀取與預覽輸入跟舊版相同」。
- 指定情境 75 項全過（讀壞拒存、同步列為問題、只算雲端還有的、兩層門檻邊界、預檢、確認視窗各種取消方式）。
- 確認視窗在真瀏覽器（不載 firebase.js 的測試頁）用真實鍵盤 / 滑鼠測過：Esc、點背景、✕、預設焦點按 Enter 都是取消；只有「確定刪除並同步」是確定。

整站（登入 → 淨利表 → MOMO 同步）**還沒在瀏覽器實測**。