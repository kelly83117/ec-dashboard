# 元創數位 AI 戰情室 — 唯讀營收 API 部署步驟

第一版端點：`GET /revenue` → 回昨日（TW）全通路總營收。

照著做大約 10 分鐘。跟 `yc-line-notify` 同個 Cloudflare 帳號、同套流程。

---

## Part 1 — Cloudflare Worker 部署

### 1. 進 Cloudflare

https://dash.cloudflare.com/ → 左側 **Workers & Pages**

### 2. 建新 Worker

1. **Create** → **Create Worker**
2. Worker name 填：**`yc-warroom-readonly`**
3. 點 **Deploy**（建一個預設 hello world）

### 3. 貼上 worker 程式碼

1. Worker 主頁點 **Edit code**
2. 編輯器內容全部刪掉
3. 把 repo 根目錄的 `warroom-revenue-worker.js` **整個檔案內容**貼進去
4. 右上 **Save and deploy**

### 4. 設定 Secrets / 環境變數

回 Worker 主頁 → **Settings** → **Variables and Secrets**：

| 名稱 | 類型 | 值 |
|---|---|---|
| `WARROOM_API_KEY` | **Secret** | 自己想一串長一點的亂碼，**記下**（戰情室呼叫時要附） |
| `FIREBASE_PROJECT_ID` | Plain text | `yc-dashboard-9aa6c` |
| `ALLOWED_ORIGIN` | Plain text（選填） | `*`（允許全部）；之後戰情室上線後可改成該網域 |

> **產 API Key 小撇步**：Chrome Console 執行
> `crypto.randomUUID().replace(/-/g,'') + crypto.randomUUID().replace(/-/g,'')`
> → 一串 64 字元的亂碼，貼進 WARROOM_API_KEY。

填完 → 回 Worker 主頁 → **Save and deploy** 一次讓環境變數生效。

### 5. 拿 Worker URL

Worker 主頁上方顯示：
```
https://yc-warroom-readonly.<你的 Cloudflare 帳號>.workers.dev
```
複製記下。戰情室要呼叫的完整端點是：
```
https://yc-warroom-readonly.<你的帳號>.workers.dev/revenue
```

---

## Part 2 — 把網址 / API Key / 範例貼給戰情室

複製下面這段訊息給戰情室負責人：

```
元創 AI 戰情室唯讀 API 第一版上線 ✓（含營收 + 廣告費）

端點：
  GET https://yc-warroom-readonly.<你的帳號>.workers.dev/revenue

驗證方式：
  HTTP Header: X-API-Key: <你產的那串 WARROOM_API_KEY>

成功回傳範例 (HTTP 200)：
{
  "asOf": "2026-11-12T23:59:59+08:00",
  "metrics": {
    "revenue": 1795734,
    "adSpend": 52630
  }
}

說明：
- asOf 是資料對應的台灣時間營業日（23:59:59 代表「該日全日」）。
- metrics.revenue 是新台幣元整數（NT$），不含退貨扣抵。
  資料來源與辦公室儀表板「昨日全通路總營收」同口徑（7 個通路：
  生活好麻吉 / 玩樂盒子 / 森之旅 / 維克生活 / MOMO / MO+ / 酷澎），
  退貨由月對帳 / 淨利表另算。
- metrics.adSpend 是新台幣元整數（NT$），只含 4 個蝦皮賣場的廣告費
  （生活好麻吉 / 玩樂盒子 / 森之旅 / 維克生活）；
  MOMO / 酷澎 的廣告費不在此系統追蹤，不計入。
  當日尚未填廣告費 → adSpend = 0（不會因此改變營業日判斷）。
- 若昨日營收尚未回填（例如早上行銷還沒輸入），自動往回掃最多 7 天取第一個
  有營收的日期，asOf 會對應那一天，不是昨天。

資料範圍 (API 刻意收窄)：
- 只包含「行銷類」指標（營收、廣告費、資料日期）。
- 不包含 淨利 / 成本 / 退貨淨額 / 帳號密碼 / 員工資料 / 薪資 / 內部備註。
- Worker 只讀 Firestore app/main 的 ec.platforms 欄位；完全不碰 app/profit、
  ec.users、ec.employees 等財務或員工相關 key。

錯誤回傳：
  401 { "error": "Unauthorized" }           ← X-API-Key 錯 / 沒帶
  404 { "error": "No revenue data..." }      ← 7 天內都沒有營收資料
  500 { "error": "Internal error", ... }     ← Worker 或 Firestore 異常

請自行 fetch 呼叫；若需要加其他指標（通路明細、ROAS、退貨率等）請回覆
我排進下一版。X-API-Key 與金鑰請用 1 對 1 私訊取得，不要貼在群組。
```

---

## Part 3 — 自己測一次

拿到 URL + API Key 後，在任何終端機（或 Chrome Console）跑：

```bash
curl -H "X-API-Key: <你的 WARROOM_API_KEY>" \
  https://yc-warroom-readonly.<你的帳號>.workers.dev/revenue
```

預期看到（兩個數字）：
```json
{"asOf":"2026-11-12T23:59:59+08:00","metrics":{"revenue":1795734,"adSpend":52630}}
```

**兩個驗收點**：
1. `metrics.revenue` 應該**等於**辦公室儀表板首頁「昨日全通路總營收」卡片的數字。
2. `metrics.adSpend` 應該**等於**蝦皮 4 賣場（生活好麻吉 / 玩樂盒子 / 森之旅 / 維克生活）
   當日廣告費加總。MOMO / 酷澎 的數字**不應該**出現在裡面。

對不上就回來找我，大機率是某個通路沒被納入、或行銷還沒回填完整。

---

## 常見問題

**Q：為什麼不用 Firebase 服務帳號 JSON？**
目前 Worker 以匿名身份讀 Firestore（跟 `yc-line-notify` 相同 pattern），讀取受 Firestore
Security Rules 約束。這樣符合 Kelly「服務帳號 JSON 留在原系統」的要求。
之後若把 rules 收緊到需要驗證，再把 Worker 改成帶服務帳號。

**Q：Firestore 有費用問題嗎？**
Worker 每次呼叫讀一次 `app/main`（約 1-2 MB）。Firebase 免費方案每日 50k 讀取、
10 GB 下載。戰情室每分鐘呼叫一次 = 每天約 1,440 次讀取，遠低於額度。

**Q：Worker 的 CPU 用量？**
整個 API 處理時間 < 50ms（主要是 Firestore round trip）。Cloudflare 免費 100k req/day 綽綽有餘。

**Q：之後要加新指標（例如每個通路明細）怎麼辦？**
告訴我要加的欄位（例如 `metrics.byPlatform.momo.revenue`）→ 我改 `warroom-revenue-worker.js`
→ 你一樣 edit code → 貼上 → Save and deploy。URL 跟 API Key 不變，戰情室不用改任何東西，
只需要讀新欄位。

**Q：API Key 要換怎麼辦？**
Cloudflare → Worker → Settings → Variables and Secrets → 編輯 `WARROOM_API_KEY` →
存檔 → Save and deploy。然後把新 key 貼給戰情室。舊 key 立即失效。
