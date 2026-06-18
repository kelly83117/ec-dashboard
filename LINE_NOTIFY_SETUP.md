# LINE 通知設定步驟

當老闆指派任務給同事，同事的手機 LINE 會跳通知。
全程約 20-30 分鐘，照著做就好。

---

## Part 1 — LINE Developers 設定（5-10 分鐘）

### 1. 開 LINE Developers 帳號

1. 開 https://developers.line.biz/
2. 右上角點「Log in」→ 用個人 LINE 帳號登入（建議用公司負責人帳號）
3. 第一次會問你「Developer name」「Email」，填好就好
4. 進入 Console 後點「Create a new provider」
5. Provider name 填「元創」之類

### 2. 建立 Messaging API channel

1. 點剛建好的 Provider → 點「Create a Messaging API channel」
2. 填寫：
   - **Channel name**：`元創內部通知`（同事 LINE 會看到這個名字）
   - **Channel description**：`任務指派通知`
   - **Category** / **Subcategory**：選「資訊／IT」或類似
   - **Email**：你的信箱
3. 同意條款 → Create

### 3. 拿 Channel Access Token

1. 進入剛建好的 channel
2. 點上方分頁 **Messaging API**
3. 滾到下方「Channel access token」區
4. 點「Issue」→ 跳出一長串 token，**複製下來貼到記事本暫存**
5. 同一頁上方有 **QR code**，**截圖存著**（等下要給 3 位同事掃）

### 4. 關閉「自動回覆」（避免機器人亂回訊息）

1. 還在 Messaging API 分頁
2. 滾到「LINE Official Account features」
3. **Auto-reply messages** 點 Edit → 切成「Disabled」
4. **Greeting messages** 也可以關掉（看你要不要新加好友打招呼）

### 5. 拿 3 位同事的 LINE userId（**重要**）

LINE 不會直接給你 user 的 ID，要透過互動取得。3 種方法，挑一個：

**方法 A：用 LINE Bot Designer 抓（最簡單）**
1. 開 https://designer.linebiz.tech/messaging-api/quickstart-messaging-api/
2. 找 webhook 或 echo bot sample，貼上 Channel Access Token
3. 同事傳訊息給 bot 後就能看到 userId

**方法 B：暫時開啟 Webhook 抓**
1. 在 channel 的 Messaging API 分頁，把 **Webhook URL** 暫時設成 https://webhook.site/ （網站會自動產給你一個 URL）
2. 同事掃 QR code 加好友後，**對 bot 隨便傳一個訊息**（例如「hi」）
3. webhook.site 會收到 JSON，裡面 `events[0].source.userId` 就是該同事的 userId
4. 3 位同事都做一遍，記下他們的 userId（格式：`Uxxxxxxxxxxxxxx`）
5. 拿到後把 Webhook URL 清掉（避免漏資料）

**方法 C：找會寫 code 的人**
就是建一個簡單的 webhook 接收 follow event，記下 userId。

完成後你應該有：
```
陳君葳 → U1234567890abcdef...
洪嘉蓮 → U2345678901bcdefg...
郭雅琪 → U3456789012cdefgh...
```

---

## Part 2 — Cloudflare Worker 部署（10 分鐘）

### 1. 開 Cloudflare 帳號

1. 開 https://dash.cloudflare.com/sign-up
2. 用你的信箱註冊
3. 不需要綁定網域

### 2. 建立 Worker

1. 左側選單點 **Workers & Pages**
2. 點 **Create application** → **Create Worker**
3. Worker name 填：`yc-line-notify`（或你喜歡的）
4. 點 **Deploy**（先部署預設範例）

### 3. 貼上 worker 程式碼

1. 部署完後點 **Edit code**
2. 把編輯器裡的全部刪掉
3. 把 `line-notify-worker.js` 整個檔案內容貼進去
4. 點右上角 **Save and deploy**

### 4. 設定 Secrets（Channel Token 跟通知密碼）

1. 回到 Worker 主頁
2. 點 **Settings** → **Variables and Secrets**
3. 點 **Add variable**，填：
   - Name: `LINE_CHANNEL_TOKEN`
   - Value: 貼上 Part 1 第 3 步拿到的 Channel Access Token
   - Type: 選 **Secret**
   - 點 Save
4. 再 Add 一個：
   - Name: `NOTIFY_SECRET`
   - Value: 自己想一串密碼（建議：隨機字母數字 16 個字以上）
   - Type: 選 **Secret**
   - 把這串密碼**複製下來貼到記事本暫存**
   - 點 Save
5. （可選）再 Add 一個：
   - Name: `ALLOWED_ORIGIN`
   - Value: `https://kelly83117.github.io`
   - Type: Plain text
6. 設完後**回到 worker 主頁，再點 Save and deploy 一次**讓變數生效

### 5. 拿到 Worker URL

回主頁，會看到 Worker 的 URL：
```
https://yc-line-notify.<你的帳號>.workers.dev
```
**複製下來**。

---

## Part 3 — 儀表板設定（2 分鐘）

1. 進入儀表板 → 行銷辦公室首頁
2. 點黃色任務區右下角的「⚙️ LINE 通知設定」（只有 admin 看得到）
3. 填入：
   - **Worker URL**：剛拿到的 Cloudflare Worker URL
   - **通知密碼**：剛剛設的 `NOTIFY_SECRET`
   - **陳君葳的 LINE userId**：剛拿到的
   - **洪嘉蓮的 LINE userId**：剛拿到的
   - **郭雅琪的 LINE userId**：剛拿到的
4. 點「儲存設定」
5. 點「測試通知」→ 3 位同事的 LINE 應該會收到測試訊息

---

## Part 4 — 測試與使用

設定完成後，老闆只要照常在儀表板新增任務，被指派的同事就會自動收到 LINE 訊息，例如：

```
🔔 元創內部通知
[老闆指派任務]
完成 6月份報表
👤 指派給：陳君葳
📅 截止：2026/06/20
→ 前往儀表板查看
```

---

## 常見問題

**Q：費用？**
- LINE Messaging API 官方帳號：免費 200 訊息/月（內部用完全夠）
- Cloudflare Workers：免費 100,000 requests/天（一萬年也用不完）
- 完全 0 月費

**Q：訊息沒到？**
- 確認同事有把 bot 加為好友（沒加 = LINE 不會發）
- 確認 userId 正確
- 在 Worker 主頁點 Logs 可以看每次呼叫的紀錄

**Q：能換訊息格式嗎？**
- 可以。改 worker.js 裡的 messages 部分；或叫 Claude 幫你改更花俏的 Flex Message

**Q：如果離職要怎麼把人移除？**
- 進儀表板「LINE 通知設定」把該人的 userId 清空就好

**Q：密碼外洩怎麼辦？**
- 進 Cloudflare → Worker → Variables → 把 NOTIFY_SECRET 換掉
- 同時進儀表板「LINE 通知設定」更新通知密碼
