/* ES Module 進入點 — 依序載入 app → pages/* → profit → firebase */
/* ?v= 版本號要跟 index.html 裡的 app-version 及 main.js?v= 一起改，不然 GitHub Pages 的
   10 分鐘 JS 快取會讓使用者重新整理後還是看到舊版功能 */
import './app.js?v=2026-07-21-164';
import './pages/modal.js?v=2026-07-21-164';
import './pages/dashboard.js?v=2026-07-21-164';
import './pages/marketing.js?v=2026-07-21-164';
import './pages/employees.js?v=2026-07-21-164';
import './pages/daily.js?v=2026-07-21-164';
import './pages/offices.js?v=2026-07-21-164';
import './pages/users.js?v=2026-07-21-164';
import './profit.js?v=2026-07-21-164';
import './firebase.js?v=2026-07-21-164';
