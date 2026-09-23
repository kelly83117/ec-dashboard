/* ES Module 進入點 — 依序載入 app → pages/* → profit → firebase */
/* ?v= 版本號要跟 index.html 裡的 app-version 及 main.js?v= 一起改，不然 GitHub Pages 的
   10 分鐘 JS 快取會讓使用者重新整理後還是看到舊版功能 */
import './app.js?v=2026-09-23-692';
import './pages/modal.js?v=2026-09-23-692';
import './pages/dashboard.js?v=2026-09-23-692';
import './pages/marketing.js?v=2026-09-23-692';
import './pages/employees.js?v=2026-09-23-692';
import './pages/daily.js?v=2026-09-23-692';
import './pages/offices.js?v=2026-09-23-692';
import './pages/users.js?v=2026-09-23-692';
// ⚡ profit.js（~1.9MB）【不再靜態 import】——ESM 整包 graph 下載+解析完才 render 登入，
//   手機卡在這、連登入畫面都到不了。改由 js/app.js 的 window.__ensureProfit() 在「進淨利表 / 工作日誌」
//   時【動態 import】（await 後才 render／才用 profit.js 的 window 匯出）。
//   ?v= 由 __ensureProfit 讀 <meta app-version> 帶（單一版號源、不會漂）→ bump-version.js 的 main.js 從 10→9 個 ?v=。
import './firebase.js?v=2026-09-23-692';









