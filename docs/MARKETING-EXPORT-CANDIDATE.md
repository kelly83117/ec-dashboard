# 行銷出口候選：資料邊界與上線關卡

## 狀態與範圍

2026-11-13 原始碼檢視，基準是 `kelly83117/ec-dashboard` 的 `main`：
[`37d6b0a594608c18d9cf08ef94b312a035d665a4`](https://github.com/kelly83117/ec-dashboard/commit/37d6b0a594608c18d9cf08ef94b312a035d665a4)。

本次僅新增 `scripts/marketing-export/` 與本文件，供離線驗證與草稿 PR 審查。沒有修改 SPA、舊 Worker、部署設定、正式站、Firebase IAM/Rules、既有資料或任何 credential。
沒有新增服務、付費承諾、服務帳號、token 或 secret。此候選**不是已部署或已驗證的安全來源**。

原始碼與 repo metadata 透過 GitHub connector 讀取。未呼叫 Firebase、匿名 Firestore、正式 Worker、試算表 URL 或任何實際資料端點；未讀取真實 CSV。
目前 Firebase 權限**未核實**，這不是一次 IAM 拒絕測試的結果，也沒有宣稱缺少哪個角色。

## 目前原始碼可證明的事

1. 舊 Worker 的對外回覆雖只含營收和廣告費，但 `firestoreGetFields` 匿名 GET 整份 `app/main`，之後才取 `ec.platforms`。這不是真正的欄位讀取隔離。參考 [Worker 原始碼](https://github.com/kelly83117/ec-dashboard/blob/37d6b0a594608c18d9cf08ef94b312a035d665a4/warroom-revenue-worker.js)。
2. `app/main` 使用含點的字面欄位名稱，還容納帳號、員工等內容；這份混合文件不是 consumer 的合法輸入。參考 [Store keys](https://github.com/kelly83117/ec-dashboard/blob/37d6b0a594608c18d9cf08ef94b312a035d665a4/js/app.js#L34-L43)、[雲端資料介面](https://github.com/kelly83117/ec-dashboard/blob/37d6b0a594608c18d9cf08ef94b312a035d665a4/js/firebase.js#L48-L71)。
3. 現有 UI 列十個營收通路、四個廣告通路，且註明新增三通路的常數不等於正式資料已存在；舊 Worker 只算七個營收通路。不能將常數當實際覆蓋驗證。參考 [通路定義](https://github.com/kelly83117/ec-dashboard/blob/37d6b0a594608c18d9cf08ef94b312a035d665a4/js/app.js#L381-L450)、[Sheet 欄位對應](https://github.com/kelly83117/ec-dashboard/blob/37d6b0a594608c18d9cf08ef94b312a035d665a4/js/pages/sheetsync.js#L21-L39)。
4. 每日填報允許零；空白是刪除欄位；營收和廣告費共用 `dailyBy`。因此歷史缺值不能補零，也不能將編輯署名時間當成每個指標的更新時間。參考 [填報邏輯](https://github.com/kelly83117/ec-dashboard/blob/37d6b0a594608c18d9cf08ef94b312a035d665a4/js/pages/dashboard.js#L2493-L2518)。
5. 舊 Worker 將缺廣告費當零、遇到任何正營收就採用該日，且最多往前找七天；候選刻意不沿用這些行為。

原始碼審閱遵守 `CLAUDE.md`、`PROJECT_MAP.md`、`UI_STYLE_GUIDE.md`。基準 tree 沒有 `AGENTS.md`、`.agents/skills`、Firebase Rules、Firebase 部署設定或 Wrangler 設定。
沒有啟動 SPA，因 repo 明確警告本機啟動也可能寫正式資料；本次只用隔離 Node 測試載入新增模組。

## 選定的最小架構

```text
既有、已授權的來源端行銷填報／匯出流程
  只交出 name/daily/dailyAdSpend 行銷陣列，不交出完整平台物件或混合文件
    → projectMarketingDate / buildWritePlan（純函式，無 I/O）
    → 待批准的受控發布者（本 PR 沒有這個寫入 adapter）
    → 專用 marketing-only 快照儲存空間
    → 單獨 HTTP 出口 Worker（沒有 Firestore 連線或 credential）
    → 已驗證的 server-side consumer（只能 GET 指定日期）
```

publisher 與 consumer 是不同角色。來源發布者只能由已有授權的流程提供窄資料，優先在既有行銷填報提交或正式匯出邊界取得，不能讓出口 Worker 拉整份 `app/main`。
進入投影函式前，來源輸入必須已合法限定為 `name/daily/dailyAdSpend`；`dailyBy` 或任何額外欄位都會拒絕。縮減資料形狀本身不是讀取授權，不能反過來作為先讀整份來源的理由。
本 PR 不新增對舊資料的讀取權、不修改舊系統安全設定，也不假裝修好了既有匿名來源問題。

### 真正的隔離與程式防護要分開

| 層次 | 候選可以驗證 | 正式環境另須驗證 |
| --- | --- | --- |
| 純投影 | 只輸出明列欄位，不讀其他屬性；格式／數值錯誤會拒絕 | 來源流程是否真的有權提供這些欄位，以及資料內容是否正確 |
| 出口 HTTP | 先鑑權；只允許一個 GET route；固定鍵；拒絕多餘欄位和錯日期 | 實際綁定、憑證來源與存放、部署 route、保護設定和實際拒絕測試 |
| 專用 KV | 範例程式只呼叫 `get`，不含 `put/list/delete` | namespace 只能有行銷快照，不能綁混合資料；所有 writer 和發布權限需盤點 |
| consumer | 合約與既有 consumer 正規化函式相容 | 只給 HTTP 讀取能力，不給儲存管理、publisher 或原 Firestore 權限；精確 endpoint allowlist 須另案核准 |

**KV binding 自身有讀寫能力，不能稱為 storage-level 唯讀。** HTTP 的唯讀限制來自這份程式與受控部署；獨立 namespace 加上沒有原始來源權限才是資料隔離的重要部分。不得讓部署者／runtime 隱含帶入全資料庫 credential。
即使出口 Worker 被誤改，所綁 namespace 也不應含財務或員工資料；但它仍能更動該 namespace 的行銷資料，完整性風險需要受控發布／部署和權限盤點處理。

另建 Firestore collection 不是自動安全：

- Firebase client ID token 路線需要實際 Firebase Auth 身份與 Rules 拒絕原混合文件、拒絕寫入，並做具體正反驗收。
- Admin SDK／Google OAuth IAM 路線不能假設 collection Security Rules 生效，不能用仍有全 database 讀權的 service account 宣稱 collection 隔離。
- 如果匿名原始文件仍可讀，不能聲稱 consumer 的整體網路能力無法取得它。候選只是**完全不使用該路徑**；原系統安全狀態仍由管理者另行處理。
- CORS、field mask、投影函式、`approved=true`、資料夾名稱或「唯讀」標籤都不能代替這些邊界。

## 合約與缺值

相容的輸出為 `ec-marketing/v1`，一個日期一個完整 JSON object，儲存鍵固定為 `marketing.daily.v1/YYYY-MM-DD.json`。
Worker 不接受來源網址、文件路徑、欄位、商店範圍或日期範圍；不允許 list、POST、PATCH、PUT、DELETE、HEAD 或 OPTIONS。
嚴格驗證頂層和每個通路的欄位，額外欄位會拒絕整份資料，不會在 HTTP 邊界先轉送再過濾。

- 台灣日界線；日期必須有效且不能晚於台灣今天。今天可以查，但不等於完整營業日。
- 每店 `revenue`：非負整數新台幣（上限 1e12）或 `null`；實際 `0` 保留。
- 四個廣告店 `adSpend`：相同數值規則；其他店只能 `null`。新增廣告店需重新審查範圍。
- 未出現的店仍有對應 `id`，值為 `null`；不能讓七家資料冒充十家完整數字。
- 歷史稀疏資料維持缺值，沒有以零填補、數字字串轉型或歷史日期回溯。
- 收入標為 `reported_revenue_unverified`；含稅、退貨、折扣、運費、訂單／結算口徑未核實。
- `adAttributedRevenue`、`attribution` 固定 `null`。總營收不是廣告歸因營收，這個出口不計算 ROAS。
- `sourceUpdatedAt` 固定 `null`；不接 `dailyBy`、不輸出人名，也不把讀取時間當更新時間。
- 在公開 repo 的測試數值全部是自行產生，沒有公司資料或真實匯出檔。

目前輸出刻意不附額外 coverage 欄位，因現有 consumer 嚴格拒絕未知欄位；consumer 依 `null` 計算完整／部分覆蓋，不能把部分小計當總額。
正式門店成員和報表口徑仍須外部確認；合約測試通過不能證明這些商業事實。

## 快照的完整性與更新限制

KV 最終一致，不是跨地區即時一致。即使 publisher 已成功寫入，consumer 仍可能短暫看到同日舊快照或查無快照。
每次發布應先驗證全部欄位，再**整份替換同一日期的快照**；不得逐店多次寫入造成半份資料。
單鍵整份替換不等於所有 edge 立即更新，也不提供多日交易或來源版本比較。
consumer 回覆 `no-store` 不會消除 KV 自身快取的一致性限制。

目前沒有可信的 source revision、產生時間或 publisher 同步排程，不能宣稱最新資料；所有來源更新時間維持未知。
多發布者同時寫入會有後寫覆蓋風險，正式流程必須限制單一發布者或另設版本／併發控制。這個 PR 沒有實作來源交易、發布重試或背景排程。
程式對 KV.get 與串流整段讀取設 3 秒 deadline，逾時一般化 503，對卡住的取消操作不做無限等待；KV.get 沒有 abort API，因此不能保證平台內部工作已取消，遲到結果只丟棄。
沒有 Worker 平台負載／rate limit／平台超時設定驗證，正式部署前需一併確認；不因合成測試通過就解除上線關卡。

## 分支／PR 的部署風險檢查

在基準 commit 的可見證據：

- [update-products.yml](https://github.com/kelly83117/ec-dashboard/blob/37d6b0a594608c18d9cf08ef94b312a035d665a4/.github/workflows/update-products.yml) 和 [update-trends.yml](https://github.com/kelly83117/ec-dashboard/blob/37d6b0a594608c18d9cf08ef94b312a035d665a4/.github/workflows/update-trends.yml) 只有 schedule 與 workflow_dispatch，沒有 push／pull_request 觸發。
- repo 使用 GitHub Pages；[目前 commit 的 Pages run](https://github.com/kelly83117/ec-dashboard/actions/runs/43361606928) 與最近可見紀錄都在 `main`，事件是 dynamic。
- `CLAUDE.md` 也明記合併進 main 後 Pages 會部署。因此只允許**獨立分支＋draft PR**，不修改 default branch、不合併、不要求 review、不改部署 workflow／設定、不觸發任何 deployment。
- 候選沒有部署指令、scheduler、CI workflow、真實資料、secret 或可自行套用的雲端設定。

這是依可見 repo 設定與執行紀錄判斷，不宣稱全面盤點了所有第三方整合。送出前應重新核對 main head，避免以過期基準覆寫。

## 真正上線前的最小下一步

由目前管理者完成／核准下列具體事項，不要求一般使用者申請全 Firebase 管理員權限：

1. 確認窄資料發布者：由哪個**已授權來源流程**提供 `name`、`daily[日期]`、`dailyAdSpend[日期]`，明確十個營收店／四個廣告店、台灣日期、幣別、營收口徑與允許歷史範圍。只交這些欄位，不交員工、帳號或整份文件。
2. 在正式配置前，確認專用快照儲存位置、讀取出口與發布者各自的實際身份／權限。出口 runtime 不附原 Firestore credential；consumer 不拿 KV 管理 API 或發布權限。任何新持續 credential、服務或權限變更需另行核准，本 PR 不執行。
3. 管理者提供已配置且受保護的 marketing-only 出口後，再驗收：未驗證請求為 401、有效身份只能精確單日 GET、寫入及任意路徑拒絕、不會回傳或存放非行銷欄位、來源路徑無混合文件 fallback。無權／無資料／格式錯誤要分別可識別。
4. 用經授權的最小樣本驗證零、缺值、稀疏歷史、10/4 覆蓋、真實來源日期與發布延遲。不要測整份公司混合文件。明記來源更新時間若仍未知就保持未知。
5. 另案審查出口部署與 consumer 精確 endpoint allowlist，並保留 owner-only 網頁對話限制與財務排除；不接通用模型／Telegram／任務執行入口。正式站目前不改。

如果不能提供經授權的窄來源或真正隔離的儲存／讀取能力，維持未連線狀態。不得退回舊匿名 Worker、field mask 或 `approved` flag。

## 本次驗證

Node v24.22.1；44 項離線測試通過（含本機 consumer 模組相容測試）。預設獨立執行是 43 項通過、1 項相容測試略過。
涵蓋 zero/null、稀疏歷史、錯店／重複店、無效金額、未支援廣告店、台灣午夜、精確日期、不回溯、欄位與歸因拒絕、鑑權先於 storage、方法／路徑／query 限制、串流大小、無效 UTF-8、失敗訊息不洩漏、無 network/storage write，以及卡住的 KV.get、stream read、cancel 和逾時後才到達的結果。

🟡 未實測 browser／Cloudflare runtime／正式來源；已實跑 Node 離線 Request/Response/stream 假綁定與純函式測試。沒有部署、沒有正式資料存取，也沒有安全認證宣告。
