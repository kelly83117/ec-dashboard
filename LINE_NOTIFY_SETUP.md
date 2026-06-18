# LINE 通知設定步驟（v2）

完整功能：
1. 老闆指派任務 → 同事 LINE 收到**卡片訊息**，可直接點「✓ 標記完成」
2. 同事完成任務 → 老闆 LINE 收到完成通知
3. 每天早上 09:00 → 老闆 LINE 收到「未完成清單」
4. 同事在 LINE 對 bot 打「我的任務」→ 直接看到自己的未完成任務

照著做大約 30-40 分鐘。

---

## Part 1 — LINE Developers 設定

### 1. 開 LINE Developers 帳號

1. 開 https://developers.line.biz/
2. 用個人 LINE 登入（建議用負責人帳號）
3. Console 點「Create a new provider」→ 取名「元創」
4. 點剛建好的 Provider → 「Create a Messaging API channel」

### 2. 設定 channel

填寫：
- **Channel name**：`元創內部通知`
- **Description**：`任務指派通知`
- **Category** / **Subcategory**：選「資訊／IT」
- **Email**：你的信箱

同意條款 → Create。

### 3. 拿 Channel Access Token + Channel Secret

進 channel → 上方分頁 **Messaging API**：
- **Channel access token**：滾到下方點「Issue」→ 複製記下
- **QR code**：截圖保存（同事掃 QR 加 bot 為好友）

回上方分頁 **Basic settings**：
- **Channel secret**：複製記下（後面用來驗證 LINE 推來的 webhook 是真的）

### 4. 關閉自動回覆

回 **Messaging API** 分頁滾到底：
- **Auto-reply messages** → Edit → Disabled
- **Greeting messages** → 可選

### 5. 拿同事與老闆的 LINE userId

LINE 不會直接給 ID，要透過互動取得。**最簡單方法**：

1. 開 https://webhook.site/ → 自動跳出一個 unique URL
2. 回 LINE Developers → channel 的 **Messaging API** 分頁
3. 找 **Webhook URL**，貼上 webhook.site 給你的網址（**完整 URL**）
4. **Use webhook** 切到 **Enabled**
5. 同事掃 QR code 加 bot 為好友，**對 bot 隨便傳一句話**（例如「hi」）
6. webhook.site 會收到 JSON，找 `events[0].source.userId`，那個 `U...` 開頭的 32 字元就是該同事的 userId
7. 4 個人都做一遍：**陳君葳 / 洪嘉蓮 / 郭雅琪 / 老闆**
8. 全部拿到後，**Webhook URL 先別清，後面 Part 3 還會用**

記下：
```
陳君葳 → U1234...
洪嘉蓮 → U2345...
郭雅琪 → U3456...
老闆   → U4567...
```

---

## Part 2 — Cloudflare Worker 部署

### 1. 註冊 Cloudflare

https://dash.cloudflare.com/sign-up → 用信箱註冊（免費，不需綁網域）

### 2. 建 Worker

1. 左側 **Workers & Pages** → **Create application** → **Create Worker**
2. Worker name 填：`yc-line-notify`
3. 點 **Deploy**

### 3. 貼上 worker 程式碼

1. 點 **Edit code**
2. 把編輯器內容全部刪掉
3. 把 `line-notify-worker.js` 整個檔案內容貼進去
4. 右上角 **Save and deploy**

### 4. 設定 Secrets / 環境變數

回 Worker 主頁 → **Settings** → **Variables and Secrets**：

| 名稱 | 類型 | 值 |
|---|---|---|
| `LINE_CHANNEL_TOKEN` | Secret | Part 1 拿到的 access token |
| `LINE_CHANNEL_SECRET` | Secret | Part 1 拿到的 channel secret |
| `NOTIFY_SECRET` | Secret | 自己想一串長一點的密碼（記下） |
| `FIREBASE_PROJECT_ID` | Plain text | `yc-dashboard-9aa6c` |
| `ALLOWED_ORIGIN` | Plain text | `https://kelly83117.github.io` |

全部填完→ 回 Worker 主頁 → **Save and deploy** 一次讓變數生效。

### 5. 設定 Cron Trigger（早上 09:00 推未完成清單）

1. 還在 Worker 主頁 → **Triggers** 分頁
2. **Cron Triggers** 區 → **Add Cron Trigger**
3. 填：`0 1 * * *`（UTC 01:00 = Asia/Taipei 09:00，台灣沒有日光節約所以恆定）
4. **Add**

### 6. 拿 Worker URL

Worker 主頁上方有 URL 形式：
```
https://yc-line-notify.<你的帳號>.workers.dev
```
複製記下。

---

## Part 3 — 回 LINE Developers 設 Webhook

讓 LINE「✓ 標記完成」按鈕能傳訊息給 worker：

1. 回 LINE Developers channel → **Messaging API** 分頁
2. **Webhook URL** 改成：
   ```
   https://yc-line-notify.<你的帳號>.workers.dev/webhook
   ```
   注意結尾要有 `/webhook`！
3. 點 **Verify** → 應該顯示 Success
4. **Use webhook** 維持 Enabled

---

## Part 4 — 儀表板設定

1. 儀表板 → 行銷辦公室首頁
2. 黃色任務區點 **⚙️ LINE 通知**
3. 填：
   - **Worker URL**：Part 2 拿到的 URL（**不要**加 /webhook）
   - **通知密碼**：你設的 `NOTIFY_SECRET`
   - **陳君葳 / 洪嘉蓮 / 郭雅琪 LINE userId**：Part 1 拿到的
   - **老闆 LINE userId**：填老闆的 ID（多個主管換行排好）
4. 點 **📤 測試通知** → 4 位（同事 + 老闆）的 LINE 應該都收到測試訊息
5. 點 **儲存設定**

---

## 完整使用流程

### 場景 1：老闆指派任務
1. 老闆在儀表板新增任務「完成 6月份報表」、指派給「陳君葳」
2. 陳君葳的 LINE 立刻跳通知：
   ```
   🔔 老闆指派任務
   ┌──────────────────────┐
   │ 完成 6月份報表        │
   │ 👤 陳君葳            │
   │ 📅 2026/06/20        │
   ├──────────────────────┤
   │ [✓ 標記完成] [看詳情] │
   └──────────────────────┘
   ```

### 場景 2：陳君葳完成任務
1. 陳君葳在 LINE 直接點 **✓ 標記完成**（或進儀表板勾完成）
2. LINE 回覆「✓ 已標記完成：完成 6月份報表」
3. 同時老闆 LINE 跳通知：
   ```
   ✅ 任務完成通知
   完成 6月份報表
   👤 完成者：陳君葳（透過 LINE）
   ```

### 場景 3：每天早上 09:00
老闆 LINE 自動跳：
```
☀️ 早安老闆！未完成任務 3 件

1. 完成 6月份報表
   👤 陳君葳
   📅 2026/06/20

2. 確認新品包裝設計
   👤 全體
   📅 ⚠️ 已逾期 2026/06/15

3. 整理上週數據
   👤 洪嘉蓮
```

### 場景 4：同事查自己有什麼任務
任何時候同事在 LINE 對 bot 打「**我的任務**」，bot 回：
```
📋 陳君葳 你的未完成任務（2 件）：

1. 完成 6月份報表 (📅 2026/06/20)
2. 確認包材樣品
```

---

## 常見問題

**Q：費用？**
- LINE Messaging API：200 訊息/月免費（內部用綽綽有餘）
- Cloudflare Workers：100,000 requests/天免費
- 完全 0 月費

**Q：早上 09:00 沒收到？**
- Cloudflare 介面 → Worker → Logs 看有沒有 scheduled 觸發紀錄
- 確認 `FIREBASE_PROJECT_ID` 設成 `yc-dashboard-9aa6c`
- 確認 ec.lineConfig.bossUserIds 有設

**Q：按「✓ 標記完成」沒反應？**
- LINE Developers webhook URL 結尾是否有 `/webhook`
- Use webhook 是否 Enabled
- Worker 是否有設 `LINE_CHANNEL_SECRET`
- Cloudflare Worker Logs 看 `/webhook` 有沒有被打到

**Q：訊息卡片格式不見、變純文字？**
- 確認儀表板用最新版（強制重新整理 Ctrl+F5）
- 舊版儀表板送的是純文字格式

**Q：要怎麼測試 cron 而不用等隔天？**
- Cloudflare Worker → Triggers → Cron Triggers → 點該行右邊三個點 → Run now
