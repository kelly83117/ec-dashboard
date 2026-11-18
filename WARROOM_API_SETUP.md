# 元創數位 AI 戰情室 — 唯讀營收 / 廣告費 API 部署步驟（v2 候選）

兩支端點：
- `GET /revenue` — 最近完整營業日的「全通路總營收 + 蝦皮廣告費」
- `GET /daily?date=YYYY-MM-DD` — 指定日期的「逐賣場」明細（v2 新增，供戰情室對帳）

Cloudflare Worker 方式部署，跟 `yc-line-notify` 同帳號、同套流程。
現狀：`yc-warroom-readonly` 已於 2026-11-13 上線（v1.1），
本文件更新流程為 **「編輯現有 Worker → 貼新 code → Redeploy」**（不需重建）。

---

## Part 1 — 更新 Worker code（約 5 分鐘）

### 1. 進 Cloudflare 現有 Worker

https://dash.cloudflare.com/ → 左側 **Workers & Pages** → 點 **`yc-warroom-readonly`**

### 2. 貼新 code

1. 右上 **Edit code**
2. 編輯器內容全部刪掉
3. 把 repo 根目錄的 `warroom-revenue-worker.js`（這個分支的版本）**整檔內容**貼進去
4. 右上 **Deploy**（按鈕可能叫 Save and deploy）
5. 等版本 dropdown 更新（會出現新的 hash，舊的保留在歷史可回滾）

### 3. 環境變數（**不需動**）

舊的 `WARROOM_API_KEY` / `FIREBASE_PROJECT_ID` / `ALLOWED_ORIGIN` 都沿用。
v2 沒有新增任何必要 env。

### 4. 驗收

**/revenue**（v1.1 行為不變，用舊 key 直接測）：
```bash
curl -H "X-API-Key: <KEY>" \
  https://yc-warroom-readonly.kelly-fc6.workers.dev/revenue
```
應回：
```json
{ "asOf": "...", "metrics": { "revenue": ..., "adSpend": ... } }
```

**/daily**（v2 新增）：
```bash
curl -H "X-API-Key: <KEY>" \
  "https://yc-warroom-readonly.kelly-fc6.workers.dev/daily?date=2026-11-15"
```
應回 `{ date, docUpdatedAt, shops:[…], coverage:{…} }`（結構見下）。

---

## Part 2 — 給戰情室的訊息（含欄位說明）

複製下面這段訊息給戰情室負責人（**金鑰另外私訊**）：

```
元創 AI 戰情室唯讀 API v2 上線 ✓

【端點 1：最近完整營業日匯總】
GET https://yc-warroom-readonly.kelly-fc6.workers.dev/revenue

回傳範例：
{
  "asOf": "2026-11-17T23:59:59+08:00",
  "metrics": { "revenue": 1795734, "adSpend": 52630 }
}

【端點 2：指定日期逐賣場明細（戰情室用這個）】
GET https://yc-warroom-readonly.kelly-fc6.workers.dev/daily?date=YYYY-MM-DD

date 必填，格式嚴格 YYYY-MM-DD；不接受未來日期。

回傳範例：
{
  "date": "2026-11-15",
  "docUpdatedAt": "2026-11-18T05:12:34.567Z",
  "shops": [
    {
      "channel": "shopee",
      "channelName": "蝦皮",
      "shop": "shopee-ohmg",
      "shopName": "生活好麻吉",
      "revenue": 253114,
      "filled": true,
      "filledBy": "jessica"
    },
    {
      "channel": "shopee",
      "channelName": "蝦皮",
      "shop": "shopee-wanle",
      "shopName": "玩樂盒子",
      "revenue": 0,
      "filled": true,
      "filledBy": "vanessa"
    },
    {
      "channel": "momo",
      "channelName": "MOMO",
      "shop": "momo-main",
      "shopName": "MOMO",
      "revenue": 0,
      "filled": false,
      "filledBy": null
    },
    …
  ],
  "coverage": {
    "included": [
      { "channel": "shopee",  "channelName": "蝦皮",
        "shops": ["生活好麻吉","玩樂盒子","森之旅","維克生活"] },
      { "channel": "momo",    "channelName": "MOMO",
        "shops": ["MOMO","MO+"] },
      { "channel": "coupang", "channelName": "酷澎",
        "shops": ["酷澎"] }
    ],
    "notIncluded": {
      "pchome": "目前無日級營收欄位；資料採月對帳機制儲存於 app/pchome_orders",
      "books":  "目前無日級營收欄位；資料採月對帳儲存於 app/books_recon",
      "friday": "目前無日級營收欄位；資料採月對帳儲存於 app/friday_recon"
    }
  }
}

【欄位定義】
- date：查詢的台灣日期（YYYY-MM-DD）
- docUpdatedAt：Firestore app/main 文件最後修改時間（ISO 8601）
  ⚠ 這是整份 app/main 的 updateTime，不是「這格」。可當作「最新資料何時更新」的保守參考
- shops[]：7 家行銷團隊每日手動回填的賣場（固定順序）
  - channel / channelName：通路代碼（shopee / momo / coupang）與中文名
  - shop：賣場穩定代碼（kebab-case 英文 slug，供程式引用）
  - shopName：賣場中文名稱（供顯示）
  - revenue：新台幣整數、毛額、不扣退貨
  - filled：true = 當日有回填（即便回填 0 也算）；false = 當日未回填
  - filledBy：填報者 username（有時為 null）
- coverage.included：涵蓋的通路與賣場清單
- coverage.notIncluded：PChome / 博客來 / FriDay 說明為何未納入

【「filled」怎麼解讀】
- filled=true  + revenue>0  → 正常當日營收
- filled=true  + revenue=0  → 當日真的零營收（店休、無單等）
- filled=false + revenue=0  → 當日尚未由行銷回填（視為資料未到位，非零營收）
→ 戰情室對帳時應以 filled 判斷「是否已結算」，勿把 false 的 0 當成「真 0」。

【驗證】
HTTP Header: X-API-Key: <金鑰私訊給你>

【錯誤回傳】
400 { "error": "Missing required query param: date (format: YYYY-MM-DD)" }
400 { "error": "Invalid date format \"...\"; expected YYYY-MM-DD" }
400 { "error": "Invalid calendar date \"...\"" }               // 例如 2026-02-30
400 { "error": "date \"...\" is in the future (today in TW is ...)" }
401 { "error": "Unauthorized" }                               // 沒帶 / 錯 X-API-Key
404 { "error": "No revenue data in the past 7 days" }         // /revenue 專屬
500 { "error": "Internal error", "detail": "..." }

【資料更新頻率】
- Firestore app/main 內的 ec.platforms.daily 由行銷團隊每日次日早上回填。
- Worker 以匿名讀 Firestore，無快取，每次呼叫都讀最新快照。
- 建議戰情室呼叫頻率：每 1 分鐘 1 次即可（更高頻無意義）。

【資料範圍（API 刻意收窄）】
只包含「行銷類」指標：營收、廣告費、資料日期、填報者 username。
不包含：淨利、成本、退貨淨額、帳號密碼、員工資料、薪資、內部備註。

【PChome / 博客來 / FriDay 的日級營收】
目前無。這 3 家採月對帳機制（儲存在 app/pchome_orders / app/books_recon /
app/friday_recon 等文件，皆為月級彙總），非行銷每日手動回填。
若戰情室需要日級，需另案 v3：從月檔的原始列拆分到日。
在此之前，/daily 僅回 7 家（蝦皮 4 + MOMO 2 + 酷澎 1）。

【呼叫範例】
curl -H "X-API-Key: <KEY>" \
  "https://yc-warroom-readonly.kelly-fc6.workers.dev/daily?date=2026-11-15"

fetch(
  'https://yc-warroom-readonly.kelly-fc6.workers.dev/daily?date=2026-11-15',
  { headers: { 'X-API-Key': process.env.YC_WARROOM_API_KEY } }
).then(r => r.json())

【外部呼叫限制】
- Cloudflare Workers 免費方案 100,000 requests/day、CPU 10ms/request。
  戰情室 1 分鐘 1 次 = 1,440 req/day，遠低於額度。
- Firestore 讀取每日 50k 免費，同理充足。
- CORS：目前 ALLOWED_ORIGIN=* 允許所有來源；戰情室網域上線後可改成該網域收窄。
```

---

## Part 3 — 安全性注意

### Firestore 匿名讀的風險（既有條件，v2 未改變）

本 Worker 以**匿名**（無 service account）打 Firestore REST API 讀 `app/main`，
這條能通表示 Firestore Security Rules 目前對 `app/main` **允許公開讀**。

**潛在風險**：
- 任何人**直接**打 Firestore REST（不經本 Worker）也能讀到 `app/main` 全部欄位，
  包含 `ec.users`（含密碼 hash）、`ec.lineConfig`（含 LINE channel token）、
  `ec.employees` 等敏感資料。
- 這**不是本 API 製造的風險**（既有條件，line-notify-worker 也採此 pattern），
  但戰情室明確點名要確認，故明列。

**建議（另案處理，非本 PR 範圍）**：
1. 短期：rotate `ec.lineConfig.channelToken`（LINE Channel Access Token）防已被爬過。
2. 中期：收緊 Firestore Rules 到「`ec.users`、`ec.lineConfig`、`ec.employees` 要
   認證才能讀」、「其他欄位匿名可讀」；同時改 Worker 走服務帳號或 Firebase Admin SDK。
   這會動到 `yc-line-notify` 與本 Worker 兩支，需一起改。
3. 長期：Firestore Rules 全關、所有讀寫都走帶認證的 Worker / Cloud Function。

**請 Kelly 評估優先序；本 PR 不自動改動 Rules。**

### 本 API 的憑證管理

- `WARROOM_API_KEY` 存 Cloudflare Secret（Rotate 隨時可換，無需改 code）。
- 不經聊天、截圖、repo 傳遞；只用 LINE 私訊 / email 給戰情室負責人。
- 戰情室端存於環境變數（`YC_WARROOM_API_KEY`），不進程式碼。

---

## Part 4 — 自己先逐賣場對帳一次（送出去前驗收）

這份 PR 以分支 `feature/warroom-api-v2-daily` 交付，**尚未部署到 Cloudflare**。
Kelly 收到後請：

### Step 1：部署候選版到 Cloudflare（照 Part 1 流程）

### Step 2：挑一個已填報完整的日期做對帳

```bash
curl -H "X-API-Key: <KEY>" \
  "https://yc-warroom-readonly.kelly-fc6.workers.dev/daily?date=2026-11-17"
```

拿 output 的 `shops[].revenue` 跟辦公室儀表板的日營收卡片逐一對照：

| API 回傳 shop | 對照儀表板 | 結果 |
|---|---|---|
| shopee-ohmg (生活好麻吉) | 儀表板首頁蝦皮生活好麻吉卡片當日營收 | 應一致 |
| shopee-wanle (玩樂盒子) | 儀表板首頁蝦皮玩樂盒子卡片當日營收 | 應一致 |
| shopee-senzhi (森之旅) | 儀表板首頁蝦皮森之旅卡片當日營收 | 應一致 |
| shopee-vic (維克生活) | 儀表板首頁蝦皮維克生活卡片當日營收 | 應一致 |
| momo-main (MOMO) | 儀表板首頁 MOMO 卡片當日營收 | 應一致 |
| momo-plus (MO+) | 儀表板首頁 MO+ 卡片當日營收 | 應一致 |
| coupang-main (酷澎) | 儀表板首頁酷澎卡片當日營收 | 應一致 |

### Step 3：異常情境測試

| 測試 | 期望 |
|---|---|
| 不帶 X-API-Key | 401 Unauthorized |
| 錯誤 X-API-Key | 401 Unauthorized |
| `?date=` 空值 | 400 "Missing required query param" |
| `?date=2026/11/15` | 400 "Invalid date format" |
| `?date=2026-02-30` | 400 "Invalid calendar date"（2026 非閏年） |
| `?date=2099-01-01` | 400 "in the future" |
| 7 天前某日（全未填） | 200；shops 全 `filled: false, revenue: 0` |

對完 7 家數字一致、7 個錯誤情境行為正確 → 可以把文件與金鑰給戰情室。
對不上 → 保留 curl 回應與對比截圖，回來一起看。
