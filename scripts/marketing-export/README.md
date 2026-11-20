# 行銷唯讀出口候選（未部署）

這是一份獨立、預設關閉的來源端候選，不會取代現有 `warroom-revenue-worker.js`，也不會載入 SPA。
沒有部署設定、網域、KV namespace ID、真實資料、付費服務呼叫或憑證。不要直接複製到正式 Worker。

## 內容

- `contract.mjs`：純函式，把**已獲授權的行銷來源流程**提供、僅含 `name/daily/dailyAdSpend` 的陣列投影成單日快照；額外欄位一律拒絕，不接受完整 `ec.platforms` 物件或混合文件。產生寫入計畫但不執行寫入。
- `worker.mjs`：只讀專用行銷快照的 HTTP 範例。缺少實際綁定或讀取憑證時回 503；沒有任何來源端讀取／寫入或發布功能。
- `test/`：全合成資料測試。測試程序的 `fetch` 被封鎖，沒有呼叫 Firebase、既有 Worker、廣告 API 或公司試算表。
- [邊界、證據與上線關卡](../../docs/MARKETING-EXPORT-CANDIDATE.md)。

## 離線執行

Node 22 以上，無 npm 安裝或 build：

```sh
node --test scripts/marketing-export/test/*.test.mjs
```

預設會略過一項選用的 consumer 相容性測試。若已具有數位總部原始碼，可對其本機純函式模組執行：

```sh
MARKETING_CONSUMER_MODULE=/absolute/local/path/worker/marketing-readonly.mjs \
  node --test scripts/marketing-export/test/*.test.mjs
```

這個環境變數只指定離線測試模組位置，不是安全核准旗標，也不能啟用正式來源。

## 輸出語意

- `ec-marketing/v1`；`Asia/Taipei`；`TWD`；精確指定單日。
- 固定十個程式已知通路、四個廣告通路；**實際來源成員與商業口徑仍待管理者核實**。
- 數值 `0` 是已填零；不存在或 `null` 的單格維持 `null`。非法值整份拒絕，沒有字串轉數字或缺值補零。
- 無資料的日期維持該日缺值，不往前找最近有值的日期。
- 非廣告通路的廣告費為 `null`；若來源提供該日新廣告費，拒絕為範圍變更，先審查。
- 不匯出人名、帳號、`dailyBy`、員工、成本、淨利、薪資、備註、原始文件或任意欄位。
- 歸因營收與歸因規格永遠 `null`，沒有 ROAS 或總營收／廣告費的冒名替代值。
- `sourceUpdatedAt` 永遠 `null`。HTTP 成功、KV 寫入時間和日末時間都不是來源更新時間。

## 未來 HTTP 介面草案

僅 `GET /marketing/daily?date=YYYY-MM-DD`。憑證由 server-side `X-API-Key` 傳遞，不出現在網址、前端、聊天、測試輸出或 GitHub。此候選沒有設定任何真實憑證。

未來的 `MARKETING_SNAPSHOTS` 必須是**獨立且只存行銷快照**的 KV namespace，絕不能綁公司其他資料的 namespace。
`MARKETING_READ_KEY` 需要另外獲准的安全配置流程，不能使用測試字串當正式憑證。
檔案名稱和設定名稱本身不授予任何權限。

Worker 只有固定鍵的 `get` 呼叫，拒絕寫入方法、列舉、任意路徑／網址／日期範圍，回覆不帶 CORS 許可且禁止快取。
KV 取得與串流讀取合計最多等待 3 秒，逾時回一般化 503；取消是 best effort，不會等無回應的取消 promise。逾時後才到達的 KV 結果會丟棄並嘗試取消。
**KV binding 本身不是 storage-level 唯讀權限**：HTTP 唯讀是程式行為；資料隔離依賴實際部署的獨立 namespace、無原 Firestore 權限，以及正確身份與綁定。

目前不提供 publisher 的網路／雲端寫入實作。之後只能在原本已授權的行銷填報或匯出邊界拿到窄輸入，驗證後由受控發布流程寫快照。不得匿名讀 `app/main`，也沒有先讀整份再過濾的 fallback。

## 驗證限制

Node 離線邏輯測試不等於 Cloudflare 部署、KV 權限、Firebase IAM/Rules 或正式資料驗收。
未打開 SPA 或正式資料源，避免啟動既有會寫入正式資料的前端。

🟡 未實測 browser／Cloudflare runtime／正式來源；已實跑 Node 純函式與 Request/Response/stream 假綁定測試。
