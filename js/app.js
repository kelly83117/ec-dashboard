/* ===================== 主程式核心 =====================
 * Store + 工具函式 + 設定常數 + App 物件核心（boot / login / 路由 / render）
 * 各頁面方法已拆到 js/pages/*.js（透過 Object.assign(App, ...) 合併）。
 * ===================================================== */
/* =========================================================================
 *  元創數位 · 績效管理
 *  純前端單檔應用：localStorage 帳號 + 部門/員工 CRUD
 *  ========================================================================= */

// 全域錯誤捕捉：把任何 JS 錯誤顯示在登入頁，避免無聲失敗
window.addEventListener('error', function(e) {
  var box = document.getElementById('js-status');
  if (box) box.textContent = '⚠ JS 錯誤：' + (e.message || e.error) + ' @ ' + (e.lineno || '?');
  else console.error('JS error before DOM ready:', e);
});

const Store = {
  KEYS: {
    users: 'ec.users',
    departments: 'ec.departments',
    employees: 'ec.employees',
    platforms: 'ec.platforms',
    platformsBackup: 'ec.platformsBackup',
    dailyTasks: 'ec.dailyTasks',
    session: 'ec.session',
    seeded: 'ec.seeded.v5',
  },
  _mem: {},
  _useMem: (function() {
    // 偵測 localStorage 可用性；data: URL / 隱私模式 / 沙箱 iframe 下會失敗
    try {
      const t = '__ec_test__';
      localStorage.setItem(t, '1');
      localStorage.removeItem(t);
      return false;
    } catch { return true; }
  })(),
  get(key, fallback) {
    if (this._useMem) {
      return this._mem[key] !== undefined ? this._mem[key] : fallback;
    }
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      this._useMem = true;
      return this._mem[key] !== undefined ? this._mem[key] : fallback;
    }
  },
  set(key, value) {
    if (this._useMem) { this._mem[key] = value; return; }
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { this._useMem = true; this._mem[key] = value; }
  },
  remove(key) {
    if (this._useMem) { delete this._mem[key]; return; }
    try { localStorage.removeItem(key); }
    catch { this._useMem = true; delete this._mem[key]; }
  },
};

/* ------------- 密碼雜湊（同步 FNV-like，非真實安全方案，僅避免明碼儲存） ------------- */
function hashPassword(pw) {
  const s = String(pw) + '::ec-dashboard::v2';
  let h1 = 0x811c9dc5 >>> 0;
  let h2 = 0x12345678 >>> 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul((h2 + c) >>> 0, 0x85ebca6b) >>> 0;
    h2 = (h2 ^ (h2 >>> 13)) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

/* ------------- 種子資料（冪等，只補缺漏，不覆蓋使用者輸入） -------------
 * 每次載入都會跑，但只在某個鍵不存在時才寫入預設值；
 * 加上對舊版員工資料 schema（orders/items/...）的就地遷移。
 * 想完全重置請按登入頁的「↻ 重設範例資料」。
 */
function seedData() {
  const defaultPwHash = hashPassword('admin123');

  // Users：若沒有任何 admin 帳號才補上預設 admin；同時補齊缺漏的 Q1–Q4 欄位
  const users = Store.get(Store.KEYS.users, []);
  let usersChanged = false;
  if (!users.some(u => u.role === 'admin')) {
    users.push({ username: 'admin', password: defaultPwHash, name: '陳大明', role: 'admin', departments: [], q1: null, q2: null, q3: null, q4: null });
    usersChanged = true;
  }
  users.forEach(u => {
    if (!('q1' in u)) { u.q1 = null; usersChanged = true; }
    if (!('q2' in u)) { u.q2 = null; usersChanged = true; }
    if (!('q3' in u)) { u.q3 = null; usersChanged = true; }
    if (!('q4' in u)) { u.q4 = null; usersChanged = true; }
    // 將舊版單一 department 字串遷移為 departments 陣列
    if (!Array.isArray(u.departments)) {
      u.departments = u.department ? [u.department] : [];
      usersChanged = true;
    }
  });
  if (usersChanged) Store.set(Store.KEYS.users, users);

  // Departments：完全沒有才補預設 4 個辦公室
  const departments = Store.get(Store.KEYS.departments);
  if (!departments || departments.length === 0) {
    Store.set(Store.KEYS.departments, [
      { id: 'd1', name: '行銷', color: '#ec4899' },
      { id: 'd2', name: '採購', color: '#10b981' },
      { id: 'd3', name: '商開', color: '#6366f1' },
      { id: 'd4', name: '設計', color: '#8b5cf6' },
    ]);
  }

  // 績效管理已直接讀取使用者帳號，不再需要獨立的 employees 資料；
  // 舊版的 ec.employees 留在 localStorage 不會影響運作。

  Store.set(Store.KEYS.seeded, true);
}

/* ------------- 計算年度績效分數（Q1–Q4 平均，0–100） ------------- */
function computeScore(emp) {
  const qs = [emp.q1, emp.q2, emp.q3, emp.q4].filter(q => typeof q === 'number' && !isNaN(q));
  if (qs.length === 0) return 0;
  return Math.round(qs.reduce((s, q) => s + q, 0) / qs.length);
}
function getQuarterScore(emp, q) {
  const v = emp[q];
  return typeof v === 'number' && !isNaN(v) ? v : null;
}
// 取得使用者所屬辦公室清單（相容舊欄位 department）
function getUserDepts(user) {
  if (!user) return [];
  if (Array.isArray(user.departments)) return user.departments.filter(Boolean);
  if (user.department) return [user.department];
  return [];
}
function getUserDeptLabel(user) {
  const list = getUserDepts(user);
  return list.length ? list.join('・') : '全公司';
}
function canAccessOffice(user, dept) {
  if (!user || !dept) return false;
  if (user.role === 'admin') return true;
  if (user.crossOfficeAccess === true) return true;
  // 行銷部門可進「設計」辦公室（d4），對 KPI 紀錄做退回審核
  if (dept.id === 'd4' && getUserDepts(user).includes('行銷')) return true;
  return getUserDepts(user).includes(dept.name);
}

// 辦公室內可細分的功能（per-dept feature list）
// 預設此 dept 沒有 features 設定 = 全部都有（往後相容舊資料）
const OFFICE_FEATURES = {
  '行銷': [
    { key: 'calendar',   label: '工作日誌' },
    { key: 'profit',     label: '淨利表' },
    { key: 'insight',    label: '洞察表' },
    { key: 'lineNotify', label: 'LINE 通知設定' },
  ],
};
function hasOfficeFeature(user, deptName, featureKey) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (!getUserDepts(user).includes(deptName)) return false;
  const features = user.officeFeatures && user.officeFeatures[deptName];
  if (!Array.isArray(features)) return true; // 舊資料 = 全部都有
  return features.includes(featureKey);
}

function trendFromQuarters(emp) {
  const a = emp.q3, b = emp.q4;
  if (typeof a !== 'number' || typeof b !== 'number') return 'flat';
  if (b - a >= 2) return 'up';
  if (a - b >= 2) return 'down';
  return 'flat';
}

/* ------------- 工具 ------------- */
const uid = () => Math.random().toString(36).slice(2, 10);
const DEPT_COLORS = ['#6366f1','#10b981','#f59e0b','#3b82f6','#ec4899','#8b5cf6','#ef4444','#14b8a6','#64748b'];

/* ------------- 平台營收（儀表板首頁） ------------- */
const PLATFORMS = [
  { name: '生活好麻吉', icon: '🛍️', color: '#f59e0b', today: 284500, yesterday: 253114, week: 1820000, month: 6840000 },
  { name: '玩樂盒子',   icon: '🎁', color: '#6366f1', today: 156200, yesterday: 144362, week: 1050000, month: 3920000 },
  { name: '森之旅',     icon: '🌲', color: '#10b981', today: 198700, yesterday: 188163, week: 1380000, month: 5180000 },
  { name: '維克生活',   icon: '🏡', color: '#14b8a6', today: 92300,  yesterday: 94279,  week: 640000,  month: 2410000 },
  { name: 'MOMO',       icon: '🛒', color: '#ec4899', today: 612800, yesterday: 517131, week: 4050000, month: 15240000 },
  { name: 'MO+',        icon: '💎', color: '#db2777', today: 245400, yesterday: 230856, week: 1620000, month: 6120000 },
  { name: '酷澎',       icon: '🚀', color: '#3b82f6', today: 421900, yesterday: 367829, week: 2810000, month: 10580000 },
];
const fmtNTD = n => 'NT$ ' + Math.round(n).toLocaleString();

// 有廣告費的平台（其他平台不填、不顯示廣告費欄位）
const PLATFORMS_WITH_AD_SPEND = new Set(['生活好麻吉', '玩樂盒子', '森之旅', '維克生活']);

// 平台所屬通路（卡片上的色標用）
const PLATFORM_MARKETPLACE = {
  '生活好麻吉': 'shopee', '玩樂盒子': 'shopee', '森之旅': 'shopee', '維克生活': 'shopee',
  'MOMO': 'momo', 'MO+': 'momo',
  '酷澎': 'coupang',
};
// 通路 logo 圖檔（檔案放在 logos/ 資料夾）
const MARKETPLACE_BADGE = {
  shopee:  { src: 'assets/logos/shopee.png',  name: '蝦皮' },
  momo:    { src: 'assets/logos/momo.png',    name: 'MOMO' },
  coupang: { src: 'assets/logos/coupang.png', name: '酷澎' },
};
function marketplaceBadgeHtml(platformName) {
  const m = PLATFORM_MARKETPLACE[platformName] || 'shopee';
  const s = MARKETPLACE_BADGE[m];
  return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
    <img src="${s.src}" alt="${s.name}"
      style="width:36px;height:36px;object-fit:contain;border-radius:8px;flex-shrink:0">
    <span style="font-size:16px;font-weight:800;color:var(--text);letter-spacing:.3px">${escapeHtml(platformName)}</span>
  </div>`;
}

// 平台分組（用於儀表板上方 4 張總覽卡）
const PLATFORM_GROUPS = [
  { name: '全賣場總營收', icon: '🏪', color: '#0f172a', members: ['生活好麻吉','玩樂盒子','森之旅','維克生活','MOMO','MO+','酷澎'] },
  { name: '蝦皮總營收',   logo: 'assets/logos/shopee.png',  color: '#ee4d2d', members: ['生活好麻吉','玩樂盒子','森之旅','維克生活'] },
  { name: 'MOMO 總營收',  logo: 'assets/logos/momo.png',    color: '#e6007e', members: ['MOMO','MO+'] },
  { name: '酷澎營收',     logo: 'assets/logos/coupang.png', color: '#3b82f6', members: ['酷澎'] },
];

/* ------------- 日期工具 ------------- */
function toDateStr(d) {
  // local-time YYYY-MM-DD (避免 toISOString 的 UTC 偏差導致跨日)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function eachDay(startStr, endStr, fn) {
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  for (let d = start; d <= end; d = addDays(d, 1)) fn(toDateStr(d));
}
function sumDaily(daily, startStr, endStr) {
  if (!daily || !startStr || !endStr || startStr > endStr) return 0;
  let s = 0; eachDay(startStr, endStr, k => { s += +daily[k] || 0; });
  return s;
}
function getRangeDates(range, customStart, customEnd) {
  const now = new Date();
  const today = toDateStr(now);
  if (range === 'today')     return { start: today, end: today, label: '今日' };
  if (range === 'yesterday') { const y = toDateStr(addDays(now, -1)); return { start: y, end: y, label: '昨日' }; }
  if (range === 'week') {
    // 本週週一 → 今天
    const dow = now.getDay() || 7; // Sun=0→7, Mon=1, ... Sat=6
    return { start: toDateStr(addDays(now, -(dow - 1))), end: today, label: '本週' };
  }
  if (range === 'month') {
    const m1 = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: toDateStr(m1), end: today, label: '本月' };
  }
  if (range === 'custom') {
    const s = customStart || toDateStr(addDays(now, -6));
    const e = customEnd   || today;
    const label = (s === e) ? s.replace(/-/g, '/') : `${s.replace(/-/g, '/')} ~ ${e.replace(/-/g, '/')}`;
    return { start: s, end: e, label };
  }
  return { start: today, end: today, label: '今日' };
}

/* ------------- 平台資料遷移：舊 schema → 每日序列 daily{} -------------
 * 只做 schema 轉換：保留已有的 daily 資料；缺欄位時補空物件 {}。
 * **不再自動補假資料**（避免顯示沒填過的日期還有數字）。
 */
function migratePlatforms(platforms) {
  if (!Array.isArray(platforms)) return platforms;
  let changed = false;
  const out = platforms.map(p => {
    if (p.daily && typeof p.daily === 'object') {
      return p; // 已是新版（不論是否為空）
    }
    changed = true;
    return { name: p.name, icon: p.icon, color: p.color, daily: {}, dailyAdSpend: p.dailyAdSpend || {} };
  });
  return changed ? out : platforms;
}

/* (已移除 ensureDailyRecent — 不再自動補空白日子的假數字) */

/* ------------- 每日工作進度 ------------- */
const DAILY_TASK_STATUS = {
  '進行中': { color: '#3b82f6', bg: '#dbeafe', emoji: '🔵' },
  '已完成': { color: '#10b981', bg: '#d1fae5', emoji: '✅' },
  '遇阻':   { color: '#ef4444', bg: '#fee2e2', emoji: '⚠️' },
  '待開始': { color: '#6b7280', bg: '#e5e7eb', emoji: '⏳' },
};
const DAILY_TASK_STATUS_LIST = Object.keys(DAILY_TASK_STATUS);

// 工作內容分類（行銷專用，但結構通用）
// 淨利表 / 洞察表 / 影片拍攝；洞察表底下還有第二層分群
const TASK_CATEGORIES = [
  {
    name: '淨利表',
    color: '#f59e0b',
    items: ['高利潤商品', '賠錢中', '低淨利', '危險商品', '低效廣告'],
  },
  {
    name: '洞察表',
    color: '#8b5cf6',
    groups: [
      { name: '下滑類', items: ['重跌品', '衰退品'] },
      { name: '成長類', items: ['爆發品', '成長品'] },
      { name: '轉換類', items: ['零轉換', '弱轉換', '轉換偏低'] },
    ],
  },
  {
    name: '拍攝',
    color: '#0d9488',
    items: ['室內', '戶外'],
  },
  {
    name: '其他',
    color: '#6b7280',
    items: [],
  },
];
const TASK_CATEGORY_NAMES = TASK_CATEGORIES.map(c => c.name);
// 舊名 → 新名對應，避免歷史資料的分類找不到 meta
const TASK_CATEGORY_ALIASES = {
  '影片拍攝': '拍攝',
};
function getCategoryMeta(name) {
  const canonical = TASK_CATEGORY_ALIASES[name] || name;
  return TASK_CATEGORIES.find(c => c.name === canonical) || null;
}
function getCategoryItems(name) {
  const c = getCategoryMeta(name);
  if (!c) return [];
  if (c.items) return c.items;
  if (c.groups) return c.groups.flatMap(g => g.items);
  return [];
}

function todayStr() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function genId() {
  // Math.random is intentional here — not in workflow script context
  return 't_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/* ------------- 各辦公室頁面設定 ------------- */
const OFFICE_CONFIG = {
  d1: {
    icon: '📣',
    subtitle: '',
    stats: [
      { icon: '📣', label: '進行中活動', value: '0', meta: '本月新增 0 檔' },
      { icon: '👥', label: '月觸及人數', value: '0', meta: '較上月 —' },
      { icon: '💰', label: '本月廣告支出', value: 'NT$0', meta: '預算使用 0%' },
      { icon: '🎯', label: '平均轉換率', value: '0%', meta: '較上月 —' },
    ],
    tabs: [
      { key: 'profit', title: '淨利表', customHtml: window.__profitTabHtml || '' },
      { key: 'insight', title: '洞察表',
        heads: ['維度', '指標', '數值', '備註'],
        rows: [
          ['年齡層', '25–34 佔比', '38%', '主力客群'],
          ['地區',   '雙北佔比',   '54%', '南部待開發'],
          ['通路',   'IG 轉換率',  '4.2%', '高於整體平均'],
          ['時段',   '晚間 20–22 點瀏覽佔比', '34%', '主要瀏覽時段'],
          ['客單價', '本月平均',   'NT$ 1,280', '較上月 ↑ 6%'],
        ],
      },
    ],
  },
  d2: {
    icon: '🛒',
    subtitle: '供應商管理、採購單與成本控制',
    stats: [
      { icon: '🏭', label: '合作供應商', value: '0', meta: '本月新增 0 家' },
      { icon: '📋', label: '待處理採購單', value: '0', meta: '逾期 0 張' },
      { icon: '💵', label: '本月採購金額', value: 'NT$0', meta: '較上月 —' },
      { icon: '⏱️', label: '平均交期', value: '0 天', meta: '較上月 —' },
    ],
    tabs: [
      { key: 'order-suggest', title: '叫貨量建議',
        heads: ['商品', '目前庫存', '上月銷量', '建議叫貨量', '建議下單日'],
        rows: [
          ['母嬰用品 A',  '120', '350', '500', '本週內'],
          ['寢具組 B',    '45',  '180', '300', '5/24 前'],
          ['保養品 C',    '230', '420', '400', '下週'],
          ['家電配件 D',  '78',  '210', '350', '5/26 前'],
        ],
      },
      { key: 'vendor-score', title: '廠商評分',
        heads: ['廠商', '配合月數', '平均交期', '品質', '價格', '綜合評分'],
        rows: [
          ['永豐紙業',  '24', '5.2 天', '⭐⭐⭐⭐⭐', '⭐⭐⭐⭐',  '92'],
          ['佳穩五金',  '18', '7.0 天', '⭐⭐⭐⭐',   '⭐⭐⭐⭐⭐', '88'],
          ['達誠包材',  '36', '4.5 天', '⭐⭐⭐⭐⭐', '⭐⭐⭐',    '85'],
          ['新詮國際',  '8',  '8.4 天', '⭐⭐⭐',     '⭐⭐⭐⭐',   '72'],
        ],
      },
      { key: 'stock-warn', title: '庫存預警',
        heads: ['商品', '當前庫存', '安全庫存', '狀態'],
        rows: [
          ['母嬰用品 A', '120', '300', '🔴 不足'],
          ['寢具組 B',   '45',  '150', '🔴 不足'],
          ['保養品 C',   '230', '200', '🟢 正常'],
          ['玩具 D',     '580', '300', '🟡 過剩'],
          ['家電 E',     '410', '350', '🟢 正常'],
        ],
      },
    ],
  },
  d3: {
    icon: '💼',
    subtitle: '商業開發、合作洽談與客戶關係',
    stats: [
      { icon: '🔥', label: '本月熱銷品項', value: '0', meta: '較上月 —' },
      { icon: '📦', label: '待評估商品', value: '0', meta: '本週新增 0 件' },
      { icon: '✅', label: '已推薦進貨', value: '0', meta: '採購確認 0 件' },
      { icon: '💰', label: '預估毛利率', value: '0%', meta: '目標 35%' },
    ],
    tabs: [
      { key: 'ai-select', title: '🤖 AI 選品', dynamic: 'ai-select' },
      { key: 'trend-radar', title: '🔥 熱搜雷達', dynamic: 'trend-radar' },
      { key: 'supplier', title: '🏭 供應商管理', dynamic: 'supplier-mgmt' },
      { key: 'profit-calc', title: '💰 毛利試算機', dynamic: 'profit-calc' },
      { key: 'competitor', title: '📈 競品追蹤', dynamic: 'competitor-track' },
      { key: 'launch', title: '🗓️ 上架計劃表', dynamic: 'launch-plan' },
      { key: 'overview', title: '📊 選品總覽', customHtml: `
        <div class="table-card" style="margin-bottom:16px">
          <div class="table-card-header"><h3>本月選品狀態</h3></div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:16px">
            <div style="text-align:center;padding:20px;background:var(--bg-card,#f0fdf4);border-radius:10px">
              <div style="font-size:32px;font-weight:700;color:#059669">0</div>
              <div style="font-size:13px;color:#059669;margin-top:4px">✅ 推薦進貨</div>
            </div>
            <div style="text-align:center;padding:20px;background:var(--bg-card,#fffbeb);border-radius:10px">
              <div style="font-size:32px;font-weight:700;color:#d97706">0</div>
              <div style="font-size:13px;color:#d97706;margin-top:4px">👀 觀察中</div>
            </div>
            <div style="text-align:center;padding:20px;background:var(--bg-card,#fef2f2);border-radius:10px">
              <div style="font-size:32px;font-weight:700;color:#dc2626">0</div>
              <div style="font-size:13px;color:#dc2626;margin-top:4px">❌ 不建議</div>
            </div>
          </div>
        </div>
        <div class="table-card" style="margin-bottom:16px">
          <div class="table-card-header"><h3>熱門品類排行</h3></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>品類</th><th>評估件數</th><th>推薦率</th><th>平均毛利率</th><th>趨勢</th></tr></thead>
              <tbody>
                <tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:20px">暫無資料</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="table-card">
          <div class="table-card-header"><h3>近期推薦進貨清單</h3></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>商品名稱</th><th>品類</th><th>預估毛利率</th><th>建議首批量</th><th>狀態</th></tr></thead>
              <tbody>
                <tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:20px">暫無資料</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      ` },
    ],
  },
  d4: {
    icon: '🎨',
    subtitle: '設計團隊個人績效',
    stats: [], // 改用 KPI 頁的自訂統計
    tabs: [
      { key: 'kpi', title: '個人績效', dynamic: 'design-kpi' },
    ],
  },
};

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function showToast(message, type = '') {
  const t = document.getElementById('toast');
  t.textContent = message;
  t.className = `toast show ${type}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ============================================================
 *  主 App 物件
 * ============================================================ */
const App = {
  route: 'employees',
  filter: { dept: 'all', quarter: 'all', range: 'today', customStart: '', customEnd: '', officeTab: {}, dailyProgress: { employee: 'all', status: 'all', dateFrom: '', dateTo: '' }, dashboardMarketing: { employee: 'all' } },

  init() {
    seedData();
    this.ensureAdmin();
    this.bindNav();
    this.bindSidebarToggle();
    // 記憶體模式：雲端同步下這是正常狀態（Store._mem 為主，Firestore 為持久層）
    // 只有 localStorage 真的寫不進去（quota / 隱私模式）時才提醒
    if (Store._useMem) {
      try {
        localStorage.setItem('__ec_ls_probe__', '1');
        localStorage.removeItem('__ec_ls_probe__');
        // localStorage 正常，_useMem=true 是因為雲端同步；不需要顯眼警告
        console.log('[EC] 使用記憶體 + 雲端同步模式（正常）');
      } catch {
        console.warn('[EC] localStorage 不可用（隱私模式或空間爆），本次資料重整後會清空');
      }
    }
    // 整個應用層級的「離開頁面警告」：偵測所有未同步來源
    //   洞察表 / 淨利表 / 工作日誌 / 儀表板營收卡片
    if (!window.__appUnloadGuardInstalled) {
      window.__appUnloadGuardInstalled = true;
      window.addEventListener('beforeunload', (e) => {
        try {
          const reasons = (typeof this._checkUnsyncedSources === 'function')
            ? this._checkUnsyncedSources()
            : [];
          if (reasons.length > 0) {
            e.preventDefault();
            e.returnValue = '';
            return '';
          }
        } catch {}
      });
    }
    const session = Store.get(Store.KEYS.session);
    if (session) {
      const user = (Store.get(Store.KEYS.users, [])).find(u => u.username === session.username);
      if (user) {
        this.enterApp(user);
        return;
      }
    }
    this.showLogin();
  },

  // 若不知為何沒有任何使用者，自動補回預設 admin（避免被鎖在外面）
  ensureAdmin() {
    const users = Store.get(Store.KEYS.users, []);
    if (users.length === 0) {
      Store.set(Store.KEYS.users, [{
        username: 'admin',
        password: hashPassword('admin123'),
        name: '陳大明',
        role: 'admin',
        departments: [],
      }]);
    }
  },

  bindNav() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        // 父層 toggle 按鈕：只展開/收合子項，不導航
        if (btn.dataset.toggleGroup) {
          const groupKey = btn.dataset.toggleGroup;
          const group = document.querySelector(`.nav-sub-group[data-group="${groupKey}"]`);
          const expanded = btn.classList.toggle('expanded');
          if (group) group.classList.toggle('expanded', expanded);
          return;
        }
        if (btn.dataset.route) this.navigate(btn.dataset.route);
      });
    });
  },

  /* ------------- 側欄收合 ------------- */
  bindSidebarToggle() {
    const btn = document.getElementById('sidebar-toggle-btn');
    if (!btn) return;
    const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
    // 還原上次的狀態（桌機才用 collapse，手機一律抽屜）
    try {
      if (!isMobile() && localStorage.getItem('ec.sidebarCollapsed') === '1') {
        document.body.classList.add('sidebar-collapsed');
      }
    } catch {}
    const updateIcon = () => {
      if (isMobile()) {
        btn.textContent = document.body.classList.contains('mobile-drawer-open') ? '✕' : '☰';
      } else {
        btn.textContent = document.body.classList.contains('sidebar-collapsed') ? '›' : '‹';
      }
    };
    updateIcon();
    btn.addEventListener('click', () => {
      if (isMobile()) {
        document.body.classList.toggle('mobile-drawer-open');
      } else {
        const collapsed = document.body.classList.toggle('sidebar-collapsed');
        try { localStorage.setItem('ec.sidebarCollapsed', collapsed ? '1' : '0'); } catch {}
      }
      updateIcon();
    });
    // 點側欄外的 backdrop 區域 → 關抽屜
    document.addEventListener('click', (e) => {
      if (!isMobile()) return;
      if (!document.body.classList.contains('mobile-drawer-open')) return;
      const sidebar = document.querySelector('.sidebar');
      if (!sidebar) return;
      if (sidebar.contains(e.target) || btn.contains(e.target)) return;
      document.body.classList.remove('mobile-drawer-open');
      updateIcon();
    });
    // 點側欄裡的項目（nav 切頁）→ 自動關抽屜
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.addEventListener('click', (e) => {
        if (!isMobile()) return;
        if (e.target.closest('.nav-item, .nav-sub')) {
          setTimeout(() => {
            document.body.classList.remove('mobile-drawer-open');
            updateIcon();
          }, 80);
        }
      });
    }
    window.addEventListener('resize', updateIcon);
  },

  /* ------------- 登入 ------------- */
  showLogin() {
    document.getElementById('view-login').style.display = 'flex';
    document.getElementById('view-app').style.display = 'none';
    this._hideBoot();
  },

  /* 隱藏全屏載入遮罩（淡出後移除）*/
  _hideBoot() {
    const el = document.getElementById('view-boot');
    if (!el) return;
    el.classList.add('hide');
    setTimeout(() => { try { el.parentNode && el.parentNode.removeChild(el); } catch {} }, 220);
  },

  showAuthError(msg) {
    const e = document.getElementById('login-error');
    e.textContent = msg;
    e.classList.add('show');
  },

  login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const ulow = username.toLowerCase();

    // 後門：admin / admin123 永遠可登入（不論 localStorage 狀態），同時修復資料
    if (ulow === 'admin' && password === 'admin123') {
      const users = Store.get(Store.KEYS.users, []);
      let admin = users.find(u => u.username.toLowerCase() === 'admin');
      if (!admin) {
        admin = { username: 'admin', password: hashPassword('admin123'),
                  name: '陳大明', role: 'admin', departments: [] };
        users.push(admin);
      } else {
        // 修復舊版錯誤雜湊
        admin.password = hashPassword('admin123');
        admin.role = 'admin';
      }
      Store.set(Store.KEYS.users, users);
      Store.set(Store.KEYS.session, { username: admin.username });
      this.enterApp(admin);
      return;
    }

    const users = Store.get(Store.KEYS.users, []);
    const user = users.find(u => u.username.toLowerCase() === ulow);
    if (!user) { this.showAuthError('帳號不存在'); return; }
    const hash = hashPassword(password);
    if (hash !== user.password) { this.showAuthError('密碼錯誤'); return; }
    Store.set(Store.KEYS.session, { username: user.username });
    this.enterApp(user);
  },

  logout() {
    if (!confirm('確定要登出嗎？')) return;
    Store.remove(Store.KEYS.session);
    this.currentUser = null;
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    this.showLogin();
  },

  /* ------------- 進入主應用 ------------- */
  enterApp(user) {
    this.currentUser = user;
    // 1) 先把使用者資訊套到側欄（avatar / 名字 / 權限），讓 view-app 一顯示就是正確的樣子
    this.applyUserPerms(user);
    // 2) 還原上次瀏覽的路由 - 雙重儲存 (sessionStorage 先, 再 localStorage)
    let savedRoute = 'dashboard';
    try {
      const r = sessionStorage.getItem('ec.lastRoute') || localStorage.getItem('ec.lastRoute');
      if (r) savedRoute = r;
    } catch {}
    if (savedRoute && savedRoute !== 'dashboard') {
      const ok = this._isRouteAllowed(savedRoute, user);
      if (!ok) savedRoute = 'dashboard';
    }
    // 3) 先把目標頁面渲染好（不顯示），再一次切換 view-login → view-app
    this.route = savedRoute;
    try { localStorage.setItem('ec.lastRoute', savedRoute); } catch {}
    try { sessionStorage.setItem('ec.lastRoute', savedRoute); } catch {}
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.route === savedRoute);
    });
    if (savedRoute.startsWith('office-d1')) {
      const parent = document.querySelector('[data-toggle-group="d1"]');
      const group = document.querySelector('.nav-sub-group[data-group="d1"]');
      if (parent) parent.classList.add('expanded');
      if (group) group.classList.add('expanded');
    }
    this.render();
    // 4) 最後才切顯示，畫面已經是目標頁的樣子，不會閃 "?" 或首頁
    document.getElementById('view-login').style.display = 'none';
    document.getElementById('view-app').style.display = 'block';
    this._hideBoot();
    this.startMidnightWatcher();
    // 5) 若雲端 snapshot 在 enterApp 之前已抵達（手機慢、Firebase 比 UI 快），
    //    那次 render 用的是空 Store；補一次 render 才會顯示出來
    if (window.__pendingFirstRender) {
      window.__pendingFirstRender = false;
      setTimeout(() => { try { this.render(); } catch {} }, 0);
    }
  },

  _isRouteAllowed(route, user) {
    if (route === 'dashboard') return true;
    if (route === 'employees') return true;
    if (route === 'users') return user.role === 'admin';
    if (route.startsWith('office-')) {
      const rest = route.slice('office-'.length);
      const firstDash = rest.indexOf('-');
      const deptId = firstDash > 0 ? rest.slice(0, firstDash) : rest;
      const departments = Store.get(Store.KEYS.departments, []);
      const dept = departments.find(d => d.id === deptId);
      return canAccessOffice(user, dept);
    }
    return true;
  },

  /* ------------- 跨日自動 reset：每分鐘檢查「昨日」是否變了 ------------- */
  startMidnightWatcher() {
    if (this._midnightTimer) return;
    this._lastInputDate = toDateStr(addDays(new Date(), -1));
    this._midnightTimer = setInterval(() => {
      const nowYesterday = toDateStr(addDays(new Date(), -1));
      if (nowYesterday === this._lastInputDate) return;
      // 跨日了，自動重新渲染（如果使用者正在打字就不要打斷）
      const active = document.activeElement;
      const inOurInput = active && active.tagName === 'INPUT' && (
        active.classList.contains('card-rev') || active.classList.contains('card-ads')
      );
      const hasUnsaved = Array.from(document.querySelectorAll('.card-rev, .card-ads')).some(el => {
        const norm = v => (v == null ? '' : String(v).trim());
        return norm(el.value) !== norm(el.dataset.original);
      });
      if (inOurInput || hasUnsaved) return; // 等使用者存好或取消後下一分鐘再試
      this._lastInputDate = nowYesterday;
      if (this.route === 'dashboard' && typeof this.render === 'function') {
        this.render();
        showToast(`已跨日，自動切換至 ${nowYesterday}`, 'success');
      }
    }, 60000); // 每 60 秒檢查一次
  },

  // 依使用者權限更新側欄的顯示（角色資訊、管理員區、可見的辦公室）
  applyUserPerms(user) {
    const deptLabel = getUserDeptLabel(user);
    document.getElementById('user-name').textContent = user.name;
    document.getElementById('user-role').textContent =
      (user.role === 'admin' ? '管理員' : '員工') + '・' + deptLabel;
    document.getElementById('user-avatar').textContent = user.name.slice(0, 1);

    const isAdmin = user.role === 'admin';
    document.getElementById('admin-group').style.display = isAdmin ? '' : 'none';
    document.getElementById('nav-users').style.display = isAdmin ? '' : 'none';

    const departments = Store.get(Store.KEYS.departments, []);
    // 子路由 → feature key 對應（同部門的不同子頁）
    const ROUTE_FEATURE = {
      'office-d1':         'calendar',
      'office-d1-profit':  'profit',
      'office-d1-insight': 'insight',
    };
    document.querySelectorAll('[data-route^="office-"]').forEach(btn => {
      const route = btn.dataset.route;
      const rest = route.slice('office-'.length);
      const firstDash = rest.indexOf('-');
      const deptId = firstDash > 0 ? rest.slice(0, firstDash) : rest;
      const dept = departments.find(d => d.id === deptId);
      let visible = canAccessOffice(user, dept);
      // 子路由再加 feature 檢查（admin 不受限）
      if (visible && dept && ROUTE_FEATURE[route] && user.role !== 'admin') {
        visible = hasOfficeFeature(user, dept.name, ROUTE_FEATURE[route]);
      }
      btn.style.display = visible ? '' : 'none';
    });
    // 父層 toggle 按鈕 + 子項群組：依照群組 key 對應到部門
    document.querySelectorAll('[data-toggle-group]').forEach(btn => {
      const deptId = btn.dataset.toggleGroup;
      const dept = departments.find(d => d.id === deptId);
      const canSee = canAccessOffice(user, dept);
      btn.style.display = canSee ? '' : 'none';
      const group = document.querySelector(`.nav-sub-group[data-group="${deptId}"]`);
      if (group) group.style.display = canSee ? '' : 'none';
    });
  },

  /* ------------- 路由 ------------- */
  // 偵測目前是否有任何「本機已寫但還沒推雲端」的內容（洞察表 / 淨利表 / 工作日誌）
  _checkUnsyncedSources() {
    const reasons = [];
    if (window.__insightPendingNotes && window.__insightPendingNotes.size > 0) {
      reasons.push(`洞察表（${window.__insightPendingNotes.size} 個賣場）`);
    }
    // 淨利表：global-sync-btn 沒有 hidden 且非 disabled 時 = 有 pending
    const profitBtn = document.getElementById('global-sync-btn');
    if (profitBtn && profitBtn.style.display !== 'none' && !profitBtn.disabled) {
      reasons.push('淨利表');
    }
    if (window.__dpPendingNames && window.__dpPendingNames.size > 0) {
      reasons.push(`工作日誌（${window.__dpPendingNames.size} 人）`);
    }
    // 儀表板首頁的營收 / 廣告費卡片：value 跟 dataset.original 不一致 = 還沒按 ✓ 存
    const dirtyCards = Array.from(document.querySelectorAll('.card-rev, .card-ads')).filter(el => {
      const norm = v => (v == null ? '' : String(v).trim());
      return norm(el.value) !== norm(el.dataset.original);
    });
    if (dirtyCards.length > 0) {
      // 依列 (data-idx) 去重，避免同一列 rev + ads 都 dirty 時被計兩次
      const rows = new Set(dirtyCards.map(el => el.dataset.idx));
      reasons.push(`每日營收（${rows.size} 列未按 ✓ 儲存）`);
    }
    return reasons;
  },

  navigate(route) {
    if (!route) return;
    // 切換分頁前先檢查是否有未同步內容
    if (this.route && this.route !== route) {
      const reasons = this._checkUnsyncedSources();
      if (reasons.length > 0) {
        const msg = '⚠️ 你還有未同步到雲端的內容：\n\n'
          + reasons.map(r => '• ' + r).join('\n')
          + '\n\n請先按下對應頁面的「☁ 同步雲端」按鈕推上去，老闆和同事才看得到。\n\n仍要切換頁面嗎？（你目前打的內容不會消失，但只存在這台電腦上）';
        if (!confirm(msg)) return;
      }
    }
    this.route = route;
    // 持久化目前路由 - 同時存 sessionStorage 跟 localStorage 雙重保險
    try { sessionStorage.setItem('ec.lastRoute', route); } catch {}
    try { localStorage.setItem('ec.lastRoute', route); } catch {}
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.route === route);
    });
    // 若進入到 office-d1 系列任一頁，自動展開行銷子項
    if (route.startsWith('office-d1')) {
      const parent = document.querySelector('[data-toggle-group="d1"]');
      const group = document.querySelector('.nav-sub-group[data-group="d1"]');
      if (parent) parent.classList.add('expanded');
      if (group) group.classList.add('expanded');
    }
    this.render();
  },

  render() {
    const main = document.getElementById('main-content');
    if (this.route && this.route.startsWith('office-')) {
      const rest = this.route.slice('office-'.length); // 例如 'd1' / 'd1-profit' / 'd1-insight'
      const firstDash = rest.indexOf('-');
      const deptId = firstDash > 0 ? rest.slice(0, firstDash) : rest;
      const subRoute = firstDash > 0 ? rest.slice(firstDash + 1) : null;
      main.innerHTML = this.viewOffice(deptId, subRoute);
      this.bindOfficeTabs(deptId);
      return;
    }
    switch (this.route) {
      case 'dashboard': main.innerHTML = this.viewDashboard(); this.bindDashboardPills(); this.bindCardInputs(); this.bindLineChartTooltip(); break;
      case 'employees': main.innerHTML = this.viewEmployees(); this.bindFilterBar(); break;
      case 'users': main.innerHTML = this.viewUsers(); break;
      default: main.innerHTML = this.viewDashboard(); this.bindDashboardPills(); this.bindCardInputs(); this.bindLineChartTooltip();
    }
  },

  /* ============================================================
   *  儀表板首頁
   * ============================================================ */

  /* ============================================================
   *  行銷辦公室 - 工作週曆（Google Calendar 風格的週檢視）
   * ============================================================ */
  /* ============================================================
   *  營運表現洞察表 — 整合 3 份 Excel：母表 / 銷售排行 / 商品表現
   *  並依商品編號合併、自動分類、警示母表缺漏、跨週對照
   * ============================================================ */

  /* 解析上傳的 Excel，依商品編號合併 */

  /* 解析「商品清單」母表 — 一次解析所有賣場分頁（玩樂/好麻吉/森之旅） */

  /* 解析「商品表現」報表（蝦皮匯出） */

  /* 綁定洞察表 3 個上傳 + 清除按鈕 */
  /* ------------- 多賣場：把舊的 ec.insightXxx 搬到 ec.insight_玩樂_xxx，只做一次 ------------- */


  /* ------------- 分類門檻設定 modal ------------- */

  /* ------------- 商品備註 modal ------------- */
  /* ------------- 同步洞察表 / 淨利表後，自動匯入今日調整摘要到工作日誌 ------------- */
  // 也處理「刪除全部當日紀錄後」自動把摘要區塊一併清掉
  // opts.silent = true → 不顯示 toast（給每次小編輯/刪除用）


  /* ------------- 匯出 Excel ------------- */


  /* ------------- LINE 通知：呼叫 Cloudflare Worker push 訊息 ------------- */
  // opts.kind / opts.task：worker v2 收到會送出帶按鈕的 Flex Message（kind='assigned'）
  async pushLineNotify(recipientNames, message, opts) {
    const cfg = Store.get('ec.lineConfig', null);
    if (!cfg || !cfg.workerUrl || !cfg.secret) return { skipped: true, reason: '尚未設定 LINE 通知' };
    const ids = recipientNames
      .map(name => cfg.userIds && cfg.userIds[name])
      .filter(Boolean);
    if (ids.length === 0) return { skipped: true, reason: '指派對象沒有 LINE userId' };
    return this._pushLineRaw(cfg, ids, message, opts);
  },
  // 直接用 userId 推（給「通知老闆」這類情境用，因為老闆 userId 跟 3 位同事分開存）
  async pushLineNotifyToBoss(message, opts) {
    const cfg = Store.get('ec.lineConfig', null);
    if (!cfg || !cfg.workerUrl || !cfg.secret) return { skipped: true, reason: '尚未設定 LINE 通知' };
    const ids = Array.isArray(cfg.bossUserIds) ? cfg.bossUserIds.filter(Boolean) : [];
    if (ids.length === 0) return { skipped: true, reason: '尚未設定老闆 userId' };
    return this._pushLineRaw(cfg, ids, message, opts);
  },
  async _pushLineRaw(cfg, recipientUserIds, message, opts) {
    try {
      const body = { recipientUserIds, message };
      if (opts && opts.kind) body.kind = opts.kind;
      if (opts && opts.task) body.task = opts.task;
      const resp = await fetch(cfg.workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Notify-Secret': cfg.secret },
        body: JSON.stringify(body),
      });
      const data = await resp.json().catch(() => ({}));
      return { ok: resp.ok, data };
    } catch (e) {
      return { ok: false, error: String(e && e.message || e) };
    }
  },

  /* ------------- LINE 通知設定（依 officeFeatures['行銷'].lineNotify 權限） ------------- */

  /* ------------- 老闆任務歷史紀錄 modal ------------- */

  /* ------------- 老闆任務：新增 / 編輯 modal ------------- */

  /* 每日營收曲線（近 N 天） */



  /* 營收輸入區塊（HTML 片段，不含 page-header） */


  /* ============================================================
   *  本月明細 — 試算表式檢視
   *  參數 yArg / mArg（0-indexed）：可切到任何月份；不傳就用當月
   * ============================================================ */

  /* ------------- 還原 platforms 備份 ------------- */

  /* ============================================================
   *  卡片內 inputs（今日營收 + 廣告費）— 失焦時跳出確認 / 取消 dialog
   * ============================================================ */

  /* （已棄用）營收輸入區段 bindRevenueEntry — 保留方法避免外部呼叫崩潰 */


  /* ============================================================
   *  績效管理
   * ============================================================ */



  /* ------------- 工作週曆事件綁定 ------------- */
  /* ------------- 每日工作進度（新版：3 人卡片 + 老闆任務） ------------- */




  /* ------------- 快速新增單一待辦事項 ------------- */

  /* ------------- 自助修改密碼 Modal ------------- */

  /* ------------- 績效分數 Modal（編輯指定使用者的 Q1–Q4） ------------- */

  /* ============================================================
   *  設計團隊 KPI（林美玲 / 沈思妤 個人績效）
   * ============================================================ */

  // 該月工作天數（週一到週五）
  // 今天是該月第幾個工作天（含當天；非工作天回傳上一個工作天的序號）

  // 計算 KPI 三大區得分


  renderShopeeTrendTab() {
    return `<div class="table-card">
      <div class="table-card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div>
          <h3>🔍 Google 台灣熱搜榜</h3>
          <p>來源：Google Trends 台灣每日熱門搜尋，資料為當日即時更新</p>
        </div>
        <button id="gt-refresh" style="padding:6px 14px;border:1px solid var(--border);background:white;border-radius:7px;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px">
          🔄 重新整理
        </button>
      </div>
      <div style="padding:16px">
        <div id="gt-loading" style="display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text-muted);padding:8px 0">
          <div style="width:16px;height:16px;border:2px solid var(--border);border-top-color:#4285f4;border-radius:50%;animation:spin 0.8s linear infinite"></div>
          從 Google Trends 載入中...
        </div>
        <div id="gt-list" style="display:none"></div>
        <div id="gt-error" style="display:none;padding:16px;text-align:center;color:var(--text-muted);font-size:13px"></div>
      </div>
    </div>`;
  },

  bindShopeeTrend() {
    const loadingEl = document.getElementById('gt-loading');
    const listEl = document.getElementById('gt-list');
    const errorEl = document.getElementById('gt-error');

    const load = () => {
      if (loadingEl) { loadingEl.style.display = 'flex'; }
      if (listEl) listEl.style.display = 'none';
      if (errorEl) errorEl.style.display = 'none';

      // 從 GitHub Actions 每日自動更新的 JSON 讀取（同 domain，無 CORS 問題）
      fetch('data/trends.json?_=' + Date.now(), { signal: AbortSignal.timeout(8000) })
        .then(r => r.json())
        .then(data => {
          const rawItems = data.items || [];
          if (!rawItems.length) throw new Error('no items');
          // 轉成統一格式供後續使用
          const items = rawItems.map(it => ({
            querySelector: (sel) => {
              if (sel === 'title') return { textContent: it.title };
              if (sel === 'approx_traffic') return it.traffic ? { textContent: it.traffic } : null;
              return null;
            }
          }));

          if (loadingEl) loadingEl.style.display = 'none';
          if (listEl) {
            listEl.style.display = '';
            const rows = items.map((item, i) => {
              const title = item.querySelector('title')?.textContent || '';
              const traffic = item.querySelector('approx_traffic')?.textContent || '';
              const newsTitle = item.querySelector('news_item_title')?.textContent || '';
              const newsUrl = item.querySelector('news_item_url')?.textContent || '';
              const searchUrl = 'https://trends.google.com.tw/trending?geo=TW';
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
              const rankColor = i < 3 ? '#4285f4' : i < 10 ? '#555' : '#999';
              const bg = i < 3 ? '#f0f6ff' : '#fafafa';
              return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border:1px solid var(--border);border-radius:9px;background:${bg};margin-bottom:8px">
                <span style="font-size:14px;font-weight:800;color:${rankColor};min-width:32px;text-align:center">${medal}</span>
                <div style="flex:1;min-width:0">
                  <div style="font-size:14px;font-weight:${i<3?'700':'500'};color:var(--text)">${escapeHtml(title)}</div>
                  ${newsTitle ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(newsTitle)}</div>` : ''}
                </div>
                ${traffic ? `<span style="font-size:11px;color:#4285f4;font-weight:600;white-space:nowrap">${escapeHtml(traffic)} 搜尋</span>` : ''}
                <div style="display:flex;gap:6px;flex-shrink:0">
                  <a href="https://www.google.com/search?q=${encodeURIComponent(title)}" target="_blank" style="padding:3px 9px;background:#4285f4;color:white;border-radius:5px;font-size:11px;text-decoration:none;font-weight:600">Google</a>
                  <a href="https://shopee.tw/search?keyword=${encodeURIComponent(title)}" target="_blank" style="padding:3px 9px;background:#ee4d2d;color:white;border-radius:5px;font-size:11px;text-decoration:none;font-weight:600">蝦皮</a>
                </div>
              </div>`;
            }).join('');

            listEl.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${
              items.map((item, i) => {
                const title = item.querySelector('title')?.textContent || '';
                const traffic = item.querySelector('approx_traffic')?.textContent || '';
                const newsTitle = item.querySelector('news_item_title')?.textContent || '';
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
                const rankColor = i < 3 ? '#4285f4' : i < 10 ? '#555' : '#999';
                const bg = i < 3 ? '#f0f6ff' : '#fafafa';
                return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:9px;background:${bg}">
                  <span style="font-size:13px;font-weight:800;color:${rankColor};min-width:28px;text-align:center">${medal}</span>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:13px;font-weight:${i<3?'700':'500'};color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(title)}</div>
                    ${traffic ? `<div style="font-size:11px;color:#4285f4;font-weight:600;margin-top:1px">${escapeHtml(traffic)} 搜尋次數</div>` : ''}
                    ${newsTitle ? `<div style="font-size:11px;color:var(--text-muted);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(newsTitle)}</div>` : ''}
                  </div>
                  <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
                    <a href="https://www.google.com/search?q=${encodeURIComponent(title)}" target="_blank" style="padding:2px 8px;background:#4285f4;color:white;border-radius:5px;font-size:11px;text-decoration:none;font-weight:600;text-align:center">Google</a>
                    <a href="https://shopee.tw/search?keyword=${encodeURIComponent(title)}" target="_blank" style="padding:2px 8px;background:#ee4d2d;color:white;border-radius:5px;font-size:11px;text-decoration:none;font-weight:600;text-align:center">蝦皮</a>
                  </div>
                </div>`;
              }).join('')
            }</div>
            <div style="margin-top:12px;font-size:11px;color:var(--text-muted);display:flex;align-items:center;justify-content:space-between">
              <span>資料來源：Google Trends 台灣 · 每日更新</span>
              <a href="https://trends.google.com.tw/trending?geo=TW" target="_blank" style="color:#4285f4;text-decoration:none;font-weight:600">查看完整榜單 ↗</a>
            </div>`;
          }
        })
        .catch(() => {
          if (loadingEl) loadingEl.style.display = 'none';
          if (errorEl) {
            errorEl.style.display = '';
            errorEl.innerHTML = `<div style="padding:20px;text-align:center">
              <div style="font-size:24px;margin-bottom:8px">😔</div>
              <div style="font-weight:600;margin-bottom:6px">無法載入 Google Trends 資料</div>
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px">可能是網路或 CORS 問題</div>
              <a href="https://trends.google.com.tw/trending?geo=TW" target="_blank" style="padding:8px 18px;background:#4285f4;color:white;border-radius:7px;font-size:13px;text-decoration:none;font-weight:600">直接開啟 Google Trends ↗</a>
            </div>`;
          }
        });
    };

    load();
    document.getElementById('gt-refresh')?.addEventListener('click', load);
  },

  /* ===== 供應商管理 ===== */
  renderSupplierTab() {
    const aiSuppliersSection = `
      <div class="table-card" style="margin-bottom:16px;border-top:3px solid #f97316">
        <div class="table-card-header">
          <div>
            <h3 style="margin:0;color:#c2410c">🤖 AI 今日推薦找貨方向</h3>
            <p style="margin:2px 0 0;font-size:12px;color:var(--text-muted)">根據當季節慶自動推薦 · 每天早上 9 點更新 · 點連結直接開 1688 搜尋</p>
          </div>
        </div>
        <div id="ai-suppliers-content" style="padding:14px 16px">
          <div style="font-size:13px;color:var(--text-muted)">載入中...</div>
        </div>
      </div>`;

    const suppliers = JSON.parse(localStorage.getItem('ec_d3_suppliers') || '[]');
    const sc = { '合作中': '#d1fae5,#065f46', '洽談中': '#fef3c7,#92400e', '暫停': '#fee2e2,#991b1b', '備選': '#eff6ff,#1e40af' };
    const rows = suppliers.length === 0
      ? '<tr><td colspan="9" style="text-align:center;color:#9ca3af;padding:24px">尚無資料，點擊「＋ 新增」開始建立</td></tr>'
      : suppliers.map((s, i) => {
          const [bg, fc] = (sc[s.status] || '#f3f4f6,#374151').split(',');
          return `<tr>
            <td style="font-weight:600">${escapeHtml(s.name)}</td>
            <td>${escapeHtml(s.cat||'')}</td>
            <td>${escapeHtml(s.contact||'')}</td>
            <td>${escapeHtml(s.phone||'')}</td>
            <td>${escapeHtml(s.moq||'')}</td>
            <td>${escapeHtml(s.price||'')}</td>
            <td><span style="background:${bg};color:${fc};padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600">${escapeHtml(s.status||'')}</span></td>
            <td style="color:var(--text-muted);max-width:160px">${escapeHtml(s.note||'')}</td>
            <td><button class="d3-sup-del" data-i="${i}" style="padding:3px 10px;border:1px solid #fee2e2;background:#fff5f5;color:#dc2626;border-radius:5px;font-size:12px;cursor:pointer">刪除</button></td>
          </tr>`;
        }).join('');
    return aiSuppliersSection + `<div class="table-card">
      <div class="table-card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div><h3>🏭 供應商管理</h3><p>記錄合作或洽談中的供應商資訊</p></div>
        <button id="d3-sup-add" style="padding:7px 16px;background:#ff5722;color:white;border:0;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer">＋ 新增</button>
      </div>
      <div id="d3-sup-form" style="display:none;padding:16px;background:#fff8f5;border-bottom:1px solid var(--border);display:none">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px">
          <input id="d3-sup-name" placeholder="供應商名稱 *" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
          <input id="d3-sup-cat" placeholder="主要品類" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
          <input id="d3-sup-contact" placeholder="聯絡人" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:10px">
          <input id="d3-sup-phone" placeholder="電話 / LINE" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
          <input id="d3-sup-moq" placeholder="最低起訂量" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
          <input id="d3-sup-price" placeholder="報價範圍" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
          <select id="d3-sup-status" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
            <option>合作中</option><option>洽談中</option><option>備選</option><option>暫停</option>
          </select>
        </div>
        <div style="display:flex;gap:8px">
          <input id="d3-sup-note" placeholder="備註" style="flex:1;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
          <button id="d3-sup-save" style="padding:8px 18px;background:#ff5722;color:white;border:0;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">儲存</button>
          <button id="d3-sup-cancel" style="padding:8px 14px;background:none;border:1px solid var(--border);border-radius:6px;font-size:13px;cursor:pointer">取消</button>
        </div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>供應商</th><th>品類</th><th>聯絡人</th><th>電話/LINE</th><th>最低起訂</th><th>報價範圍</th><th>狀態</th><th>備註</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </div>`;
  },
  bindSupplierTab() {
    // 載入 AI 供應商推薦
    fetch('data/suppliers.json?_=' + Date.now())
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const el = document.getElementById('ai-suppliers-content');
        if (!el) return;
        if (!data || !data.items || !data.items.length) {
          el.innerHTML = '<div style="font-size:13px;color:var(--text-muted)">暫無推薦，明天早上 9 點更新</div>';
          return;
        }
        el.innerHTML = `
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">
            ${data.items.map(s => `
              <a href="${s.url}" target="_blank" style="display:block;padding:12px 14px;border:1px solid #fed7aa;border-radius:10px;text-decoration:none;color:inherit;background:#fff7ed;transition:box-shadow .15s"
                onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.1)'" onmouseout="this.style.boxShadow=''">
                <div style="font-size:13px;font-weight:700;color:#c2410c;margin-bottom:4px">🏭 ${escapeHtml(s.name)}</div>
                <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">${escapeHtml(s.reason)}</div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:11px">
                  ${s.price_range ? `<span style="background:#fff;border:1px solid #fed7aa;padding:2px 7px;border-radius:5px;color:#92400e">💰 ${escapeHtml(s.price_range)}/件</span>` : ''}
                  ${s.moq ? `<span style="background:#fff;border:1px solid #fed7aa;padding:2px 7px;border-radius:5px;color:#92400e">📦 最低 ${escapeHtml(s.moq)}</span>` : ''}
                </div>
                <div style="margin-top:8px;font-size:11px;color:#f97316;font-weight:600">開啟 1688 搜尋 ↗</div>
              </a>`).join('')}
          </div>
          <div style="margin-top:8px;font-size:11px;color:var(--text-muted)">更新時間：${data.updated || '—'}</div>`;
      })
      .catch(() => {});

    const form = document.getElementById('d3-sup-form');
    document.getElementById('d3-sup-add')?.addEventListener('click', () => {
      form.style.display = form.style.display === 'none' ? '' : 'none';
    });
    document.getElementById('d3-sup-cancel')?.addEventListener('click', () => { form.style.display = 'none'; });
    document.getElementById('d3-sup-save')?.addEventListener('click', () => {
      const name = document.getElementById('d3-sup-name')?.value.trim();
      if (!name) { alert('請填寫供應商名稱'); return; }
      const list = JSON.parse(localStorage.getItem('ec_d3_suppliers') || '[]');
      list.push({ name, cat: document.getElementById('d3-sup-cat')?.value.trim(), contact: document.getElementById('d3-sup-contact')?.value.trim(), phone: document.getElementById('d3-sup-phone')?.value.trim(), moq: document.getElementById('d3-sup-moq')?.value.trim(), price: document.getElementById('d3-sup-price')?.value.trim(), status: document.getElementById('d3-sup-status')?.value, note: document.getElementById('d3-sup-note')?.value.trim() });
      localStorage.setItem('ec_d3_suppliers', JSON.stringify(list));
      this.render();
    });
    document.querySelectorAll('.d3-sup-del').forEach(btn => btn.addEventListener('click', () => {
      const list = JSON.parse(localStorage.getItem('ec_d3_suppliers') || '[]');
      list.splice(+btn.dataset.i, 1);
      localStorage.setItem('ec_d3_suppliers', JSON.stringify(list));
      this.render();
    }));
  },

  /* ===== 毛利試算機 ===== */
  renderProfitCalcTab() {
    const hist = JSON.parse(localStorage.getItem('ec_d3_calc_hist') || '[]');
    const histRows = hist.length === 0
      ? '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:16px">尚無試算紀錄</td></tr>'
      : hist.slice().reverse().map((h, i) => `<tr>
          <td style="font-weight:600">${escapeHtml(h.name||'—')}</td>
          <td>NT$ ${Number(h.cost).toLocaleString()}</td>
          <td>NT$ ${Number(h.price).toLocaleString()}</td>
          <td style="color:${h.margin>=35?'#059669':h.margin>=20?'#d97706':'#dc2626'};font-weight:700">${h.margin}%</td>
          <td>NT$ ${Number(h.profit).toLocaleString()}</td>
          <td><button class="d3-calc-del" data-i="${hist.length-1-i}" style="padding:2px 8px;border:1px solid #fee2e2;background:#fff5f5;color:#dc2626;border-radius:5px;font-size:12px;cursor:pointer">刪除</button></td>
        </tr>`).join('');
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start">
      <div class="table-card">
        <div class="table-card-header"><h3>💰 毛利試算機</h3><p>輸入成本與售價，即時計算毛利率</p></div>
        <div style="padding:20px;display:flex;flex-direction:column;gap:14px">
          <div>
            <label style="font-size:12px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:5px">商品名稱（選填）</label>
            <input id="d3-calc-name" placeholder="例：藍牙耳機" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:7px;font-size:13px;font-family:inherit">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>
              <label style="font-size:12px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:5px">進貨成本 (NT$) *</label>
              <input id="d3-calc-cost" type="number" placeholder="0" min="0" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:7px;font-size:13px;font-family:inherit">
            </div>
            <div>
              <label style="font-size:12px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:5px">建議售價 (NT$) *</label>
              <input id="d3-calc-price" type="number" placeholder="0" min="0" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:7px;font-size:13px;font-family:inherit">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>
              <label style="font-size:12px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:5px">平台費率 (%)</label>
              <input id="d3-calc-fee" type="number" placeholder="5" min="0" max="100" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:7px;font-size:13px;font-family:inherit">
            </div>
            <div>
              <label style="font-size:12px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:5px">運費 + 雜費 (NT$)</label>
              <input id="d3-calc-ship" type="number" placeholder="0" min="0" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:7px;font-size:13px;font-family:inherit">
            </div>
          </div>
          <div id="d3-calc-result" style="display:none;background:linear-gradient(135deg,#fff3ef,#fff8f5);border-radius:10px;padding:16px;border:1px solid #fdd0b8">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;text-align:center">
              <div><div style="font-size:11px;color:var(--text-muted);font-weight:600;margin-bottom:4px">毛利潤</div><div id="d3-calc-r-profit" style="font-size:22px;font-weight:800;color:#ff5722"></div></div>
              <div><div style="font-size:11px;color:var(--text-muted);font-weight:600;margin-bottom:4px">毛利率</div><div id="d3-calc-r-margin" style="font-size:22px;font-weight:800"></div></div>
              <div><div style="font-size:11px;color:var(--text-muted);font-weight:600;margin-bottom:4px">損益兩平售價</div><div id="d3-calc-r-break" style="font-size:22px;font-weight:800;color:#6b7280"></div></div>
            </div>
            <div id="d3-calc-r-judge" style="margin-top:12px;text-align:center;font-size:13px;font-weight:600;padding:6px 12px;border-radius:6px"></div>
          </div>
          <div style="display:flex;gap:8px">
            <button id="d3-calc-go" style="flex:1;padding:10px;background:#ff5722;color:white;border:0;border-radius:7px;font-size:14px;font-weight:700;cursor:pointer">計算</button>
            <button id="d3-calc-save" style="display:none;padding:10px 16px;background:none;border:1px solid #ff5722;color:#ff5722;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer">儲存紀錄</button>
          </div>
        </div>
      </div>
      <div class="table-card">
        <div class="table-card-header"><h3>📂 試算紀錄</h3></div>
        <div class="table-wrap"><table>
          <thead><tr><th>商品</th><th>進貨成本</th><th>售價</th><th>毛利率</th><th>毛利潤</th><th></th></tr></thead>
          <tbody id="d3-calc-hist-tbody">${histRows}</tbody>
        </table></div>
      </div>
    </div>`;
  },
  bindProfitCalcTab() {
    let lastResult = null;
    const calc = () => {
      const cost = parseFloat(document.getElementById('d3-calc-cost')?.value) || 0;
      const price = parseFloat(document.getElementById('d3-calc-price')?.value) || 0;
      const fee = parseFloat(document.getElementById('d3-calc-fee')?.value) || 0;
      const ship = parseFloat(document.getElementById('d3-calc-ship')?.value) || 0;
      if (!cost || !price) return;
      const totalCost = cost + ship + price * (fee / 100);
      const profit = price - totalCost;
      const margin = price > 0 ? Math.round((profit / price) * 1000) / 10 : 0;
      const breakeven = Math.ceil(totalCost);
      const resEl = document.getElementById('d3-calc-result');
      const saveBtn = document.getElementById('d3-calc-save');
      if (resEl) resEl.style.display = '';
      if (saveBtn) saveBtn.style.display = '';
      document.getElementById('d3-calc-r-profit').textContent = `NT$ ${profit.toLocaleString('zh-TW', {maximumFractionDigits:0})}`;
      const marginEl = document.getElementById('d3-calc-r-margin');
      if (marginEl) { marginEl.textContent = `${margin}%`; marginEl.style.color = margin >= 35 ? '#059669' : margin >= 20 ? '#d97706' : '#dc2626'; }
      document.getElementById('d3-calc-r-break').textContent = `NT$ ${breakeven.toLocaleString()}`;
      const judge = document.getElementById('d3-calc-r-judge');
      if (judge) {
        if (margin >= 35) { judge.textContent = '✅ 優良 — 毛利率達標（≥35%）'; judge.style.cssText = 'background:#d1fae5;color:#065f46;margin-top:12px;text-align:center;font-size:13px;font-weight:600;padding:6px 12px;border-radius:6px'; }
        else if (margin >= 20) { judge.textContent = '⚠️ 尚可 — 毛利率偏低，建議議價或調售價'; judge.style.cssText = 'background:#fef3c7;color:#92400e;margin-top:12px;text-align:center;font-size:13px;font-weight:600;padding:6px 12px;border-radius:6px'; }
        else { judge.textContent = '❌ 危險 — 毛利率過低，不建議進貨'; judge.style.cssText = 'background:#fee2e2;color:#991b1b;margin-top:12px;text-align:center;font-size:13px;font-weight:600;padding:6px 12px;border-radius:6px'; }
      }
      lastResult = { name: document.getElementById('d3-calc-name')?.value.trim(), cost, price, fee, ship, profit: Math.round(profit), margin };
    };
    document.getElementById('d3-calc-go')?.addEventListener('click', calc);
    ['d3-calc-cost','d3-calc-price','d3-calc-fee','d3-calc-ship'].forEach(id => document.getElementById(id)?.addEventListener('input', () => { if (lastResult) calc(); }));
    document.getElementById('d3-calc-save')?.addEventListener('click', () => {
      if (!lastResult) return;
      const hist = JSON.parse(localStorage.getItem('ec_d3_calc_hist') || '[]');
      hist.push(lastResult);
      localStorage.setItem('ec_d3_calc_hist', JSON.stringify(hist));
      this.render();
    });
    document.querySelectorAll('.d3-calc-del').forEach(btn => btn.addEventListener('click', () => {
      const hist = JSON.parse(localStorage.getItem('ec_d3_calc_hist') || '[]');
      hist.splice(+btn.dataset.i, 1);
      localStorage.setItem('ec_d3_calc_hist', JSON.stringify(hist));
      this.render();
    }));
  },

  /* ===== 選品任務板 ===== */
  renderKanbanTab() {
    const data = JSON.parse(localStorage.getItem('ec_d3_kanban') || '[]');
    const cols = ['待評估', '評估中', '已推薦', '結案'];
    const colColors = { '待評估': '#eff6ff,#1e40af,#3b82f6', '評估中': '#fef3c7,#92400e,#f59e0b', '已推薦': '#d1fae5,#065f46,#10b981', '結案': '#f3f4f6,#374151,#9ca3af' };
    const colHtml = cols.map(col => {
      const items = data.filter(d => d.col === col);
      const [bg, fc, bc] = colColors[col].split(',');
      return `<div style="flex:1;min-width:200px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <span style="font-size:13px;font-weight:700;color:${fc};background:${bg};padding:4px 12px;border-radius:999px">${col} <span style="opacity:.7">${items.length}</span></span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;min-height:60px" id="d3-kb-col-${col}">
          ${items.map((item, idx) => {
            const realIdx = data.indexOf(item);
            const colIdx = cols.indexOf(col);
            return `<div style="background:white;border-radius:9px;padding:12px 14px;box-shadow:0 1px 4px rgba(0,0,0,.08);border-left:3px solid ${bc}">
              <div style="font-weight:600;font-size:13px;margin-bottom:4px">${escapeHtml(item.name)}</div>
              <div style="font-size:12px;color:var(--text-muted)">${escapeHtml(item.cat||'')}${item.margin ? ' · 預估毛利 ' + item.margin + '%' : ''}</div>
              <div style="margin-top:8px;display:flex;gap:6px">
                ${colIdx > 0 ? `<button class="d3-kb-prev" data-i="${realIdx}" style="padding:2px 8px;border:1px solid var(--border);border-radius:5px;font-size:11px;cursor:pointer;background:white">← 退回</button>` : ''}
                ${colIdx < 3 ? `<button class="d3-kb-next" data-i="${realIdx}" style="padding:2px 8px;background:${bc};color:white;border:0;border-radius:5px;font-size:11px;cursor:pointer">推進 →</button>` : ''}
                <button class="d3-kb-del" data-i="${realIdx}" style="padding:2px 8px;border:1px solid #fee2e2;background:#fff5f5;color:#dc2626;border-radius:5px;font-size:11px;cursor:pointer;margin-left:auto">✕</button>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }).join('');
    return `<div class="table-card" style="margin-bottom:16px">
      <div class="table-card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div><h3>📋 選品任務板</h3><p>拖曳商品跨欄，追蹤每個選品的評估進度</p></div>
        <button id="d3-kb-add" style="padding:7px 16px;background:#ff5722;color:white;border:0;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer">＋ 新增商品</button>
      </div>
      <div id="d3-kb-form" style="display:none;padding:14px 20px;background:#fff8f5;border-bottom:1px solid var(--border)">
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <input id="d3-kb-name" placeholder="商品名稱 *" style="flex:2;min-width:140px;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
          <input id="d3-kb-cat" placeholder="品類" style="flex:1;min-width:100px;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
          <input id="d3-kb-margin" type="number" placeholder="預估毛利率%" style="flex:1;min-width:100px;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
          <select id="d3-kb-col" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
            ${cols.map(c => `<option>${c}</option>`).join('')}
          </select>
          <button id="d3-kb-save" style="padding:8px 16px;background:#ff5722;color:white;border:0;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">新增</button>
          <button id="d3-kb-cancel" style="padding:8px 12px;background:none;border:1px solid var(--border);border-radius:6px;font-size:13px;cursor:pointer">取消</button>
        </div>
      </div>
      <div style="padding:16px;display:flex;gap:12px;overflow-x:auto">${colHtml}</div>
    </div>`;
  },
  bindKanbanTab() {
    const cols = ['待評估', '評估中', '已推薦', '結案'];
    const form = document.getElementById('d3-kb-form');
    document.getElementById('d3-kb-add')?.addEventListener('click', () => { form.style.display = form.style.display === 'none' ? '' : 'none'; });
    document.getElementById('d3-kb-cancel')?.addEventListener('click', () => { form.style.display = 'none'; });
    document.getElementById('d3-kb-save')?.addEventListener('click', () => {
      const name = document.getElementById('d3-kb-name')?.value.trim();
      if (!name) { alert('請填寫商品名稱'); return; }
      const list = JSON.parse(localStorage.getItem('ec_d3_kanban') || '[]');
      list.push({ name, cat: document.getElementById('d3-kb-cat')?.value.trim(), margin: document.getElementById('d3-kb-margin')?.value.trim(), col: document.getElementById('d3-kb-col')?.value });
      localStorage.setItem('ec_d3_kanban', JSON.stringify(list));
      this.render();
    });
    document.querySelectorAll('.d3-kb-next').forEach(btn => btn.addEventListener('click', () => {
      const list = JSON.parse(localStorage.getItem('ec_d3_kanban') || '[]');
      const i = +btn.dataset.i; const ci = cols.indexOf(list[i]?.col);
      if (ci < 3) { list[i].col = cols[ci + 1]; localStorage.setItem('ec_d3_kanban', JSON.stringify(list)); this.render(); }
    }));
    document.querySelectorAll('.d3-kb-prev').forEach(btn => btn.addEventListener('click', () => {
      const list = JSON.parse(localStorage.getItem('ec_d3_kanban') || '[]');
      const i = +btn.dataset.i; const ci = cols.indexOf(list[i]?.col);
      if (ci > 0) { list[i].col = cols[ci - 1]; localStorage.setItem('ec_d3_kanban', JSON.stringify(list)); this.render(); }
    }));
    document.querySelectorAll('.d3-kb-del').forEach(btn => btn.addEventListener('click', () => {
      const list = JSON.parse(localStorage.getItem('ec_d3_kanban') || '[]');
      list.splice(+btn.dataset.i, 1);
      localStorage.setItem('ec_d3_kanban', JSON.stringify(list));
      this.render();
    }));
  },

  /* ===== 競品追蹤 ===== */
  renderCompetitorTab() {
    const data = JSON.parse(localStorage.getItem('ec_d3_competitors') || '[]');
    const rows = data.length === 0
      ? '<tr><td colspan="8" style="text-align:center;color:#9ca3af;padding:24px">尚無資料</td></tr>'
      : data.map((d, i) => {
          const diff = d.ourPrice && d.compPrice ? Number(d.ourPrice) - Number(d.compPrice) : null;
          const diffStr = diff === null ? '—' : diff > 0 ? `<span style="color:#dc2626">貴 ${diff.toLocaleString()}</span>` : diff < 0 ? `<span style="color:#059669">便宜 ${Math.abs(diff).toLocaleString()}</span>` : '相同';
          return `<tr>
            <td style="font-weight:600">${escapeHtml(d.name)}</td>
            <td>NT$ ${Number(d.ourPrice||0).toLocaleString()}</td>
            <td>${escapeHtml(d.compName||'')}</td>
            <td>${escapeHtml(d.platform||'')}</td>
            <td>NT$ ${Number(d.compPrice||0).toLocaleString()}</td>
            <td>${diffStr}</td>
            <td style="color:var(--text-muted)">${escapeHtml(d.updated||'')}</td>
            <td><button class="d3-comp-del" data-i="${i}" style="padding:2px 8px;border:1px solid #fee2e2;background:#fff5f5;color:#dc2626;border-radius:5px;font-size:12px;cursor:pointer">刪除</button></td>
          </tr>`;
        }).join('');
    return `<div class="table-card">
      <div class="table-card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div><h3>📈 競品追蹤</h3><p>追蹤各平台競品售價，掌握市場定價區間</p></div>
        <button id="d3-comp-add" style="padding:7px 16px;background:#ff5722;color:white;border:0;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer">＋ 新增</button>
      </div>
      <div id="d3-comp-form" style="display:none;padding:14px 20px;background:#fff8f5;border-bottom:1px solid var(--border)">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px">
          <input id="d3-comp-name" placeholder="我方商品名稱 *" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
          <input id="d3-comp-our" type="number" placeholder="我方售價" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
          <input id="d3-comp-cname" placeholder="競品名稱/店家" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px">
          <select id="d3-comp-platform" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
            <option>蝦皮</option><option>momo</option><option>PChome</option><option>露天</option><option>Yahoo</option><option>其他</option>
          </select>
          <input id="d3-comp-cprice" type="number" placeholder="競品售價" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
          <input id="d3-comp-updated" placeholder="更新日期" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
          <div style="display:flex;gap:8px">
            <button id="d3-comp-save" style="flex:1;padding:8px;background:#ff5722;color:white;border:0;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">儲存</button>
            <button id="d3-comp-cancel" style="padding:8px 12px;background:none;border:1px solid var(--border);border-radius:6px;font-size:13px;cursor:pointer">取消</button>
          </div>
        </div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>我方商品</th><th>我方售價</th><th>競品名稱</th><th>平台</th><th>競品售價</th><th>價差</th><th>更新日</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </div>`;
  },
  bindCompetitorTab() {
    const form = document.getElementById('d3-comp-form');
    document.getElementById('d3-comp-add')?.addEventListener('click', () => { form.style.display = form.style.display === 'none' ? '' : 'none'; });
    document.getElementById('d3-comp-cancel')?.addEventListener('click', () => { form.style.display = 'none'; });
    document.getElementById('d3-comp-save')?.addEventListener('click', () => {
      const name = document.getElementById('d3-comp-name')?.value.trim();
      if (!name) { alert('請填寫商品名稱'); return; }
      const list = JSON.parse(localStorage.getItem('ec_d3_competitors') || '[]');
      list.push({ name, ourPrice: document.getElementById('d3-comp-our')?.value, compName: document.getElementById('d3-comp-cname')?.value.trim(), platform: document.getElementById('d3-comp-platform')?.value, compPrice: document.getElementById('d3-comp-cprice')?.value, updated: document.getElementById('d3-comp-updated')?.value.trim() || new Date().toLocaleDateString('zh-TW') });
      localStorage.setItem('ec_d3_competitors', JSON.stringify(list));
      this.render();
    });
    document.querySelectorAll('.d3-comp-del').forEach(btn => btn.addEventListener('click', () => {
      const list = JSON.parse(localStorage.getItem('ec_d3_competitors') || '[]');
      list.splice(+btn.dataset.i, 1);
      localStorage.setItem('ec_d3_competitors', JSON.stringify(list));
      this.render();
    }));
  },

  /* ===== 上架計劃表 ===== */
  renderLaunchPlanTab() {
    const data = JSON.parse(localStorage.getItem('ec_d3_launch') || '[]');
    const sc = { '規劃中': '#eff6ff,#1e40af', '備貨中': '#fef3c7,#92400e', '已上架': '#d1fae5,#065f46', '延期': '#fee2e2,#991b1b', '取消': '#f3f4f6,#374151' };
    const today = new Date().toISOString().slice(0,10);
    const rows = data.length === 0
      ? '<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:24px">尚無資料</td></tr>'
      : data.map((d, i) => {
          const [bg, fc] = (sc[d.status] || '#f3f4f6,#374151').split(',');
          const overdue = d.status !== '已上架' && d.status !== '取消' && d.date && d.date < today;
          return `<tr style="${overdue ? 'background:#fff5f5' : ''}">
            <td style="font-weight:600">${escapeHtml(d.name)}</td>
            <td style="${overdue ? 'color:#dc2626;font-weight:600' : ''}">${escapeHtml(d.date||'—')}${overdue ? ' ⚠️' : ''}</td>
            <td>${escapeHtml(d.owner||'')}</td>
            <td><span style="background:${bg};color:${fc};padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600">${escapeHtml(d.status||'')}</span></td>
            <td style="color:var(--text-muted)">${escapeHtml(d.note||'')}</td>
            <td>
              <select class="d3-launch-status" data-i="${i}" style="padding:3px 6px;border:1px solid var(--border);border-radius:5px;font-size:12px;font-family:inherit">
                ${['規劃中','備貨中','已上架','延期','取消'].map(s => `<option${s===d.status?' selected':''}>${s}</option>`).join('')}
              </select>
            </td>
            <td><button class="d3-launch-del" data-i="${i}" style="padding:2px 8px;border:1px solid #fee2e2;background:#fff5f5;color:#dc2626;border-radius:5px;font-size:12px;cursor:pointer">刪除</button></td>
          </tr>`;
        }).join('');
    return `<div class="table-card">
      <div class="table-card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div><h3>🗓️ 上架計劃表</h3><p>追蹤推薦商品的備貨與上架進度，逾期項目會標紅</p></div>
        <button id="d3-launch-add" style="padding:7px 16px;background:#ff5722;color:white;border:0;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer">＋ 新增</button>
      </div>
      <div id="d3-launch-form" style="display:none;padding:14px 20px;background:#fff8f5;border-bottom:1px solid var(--border)">
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 2fr auto auto;gap:10px;align-items:center">
          <input id="d3-launch-name" placeholder="商品名稱 *" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
          <input id="d3-launch-date" type="date" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
          <input id="d3-launch-owner" placeholder="負責人" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
          <select id="d3-launch-status" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
            <option>規劃中</option><option>備貨中</option><option>已上架</option><option>延期</option><option>取消</option>
          </select>
          <input id="d3-launch-note" placeholder="備註" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
          <button id="d3-launch-save" style="padding:8px 16px;background:#ff5722;color:white;border:0;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap">儲存</button>
          <button id="d3-launch-cancel" style="padding:8px 12px;background:none;border:1px solid var(--border);border-radius:6px;font-size:13px;cursor:pointer">取消</button>
        </div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>商品名稱</th><th>預計上架日</th><th>負責人</th><th>狀態</th><th>備註</th><th>更新狀態</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </div>`;
  },
  bindLaunchPlanTab() {
    const form = document.getElementById('d3-launch-form');
    document.getElementById('d3-launch-add')?.addEventListener('click', () => { form.style.display = form.style.display === 'none' ? '' : 'none'; });
    document.getElementById('d3-launch-cancel')?.addEventListener('click', () => { form.style.display = 'none'; });
    document.getElementById('d3-launch-save')?.addEventListener('click', () => {
      const name = document.getElementById('d3-launch-name')?.value.trim();
      if (!name) { alert('請填寫商品名稱'); return; }
      const list = JSON.parse(localStorage.getItem('ec_d3_launch') || '[]');
      list.push({ name, date: document.getElementById('d3-launch-date')?.value, owner: document.getElementById('d3-launch-owner')?.value.trim(), status: document.getElementById('d3-launch-status')?.value, note: document.getElementById('d3-launch-note')?.value.trim() });
      localStorage.setItem('ec_d3_launch', JSON.stringify(list));
      this.render();
    });
    document.querySelectorAll('.d3-launch-status').forEach(sel => sel.addEventListener('change', () => {
      const list = JSON.parse(localStorage.getItem('ec_d3_launch') || '[]');
      list[+sel.dataset.i].status = sel.value;
      localStorage.setItem('ec_d3_launch', JSON.stringify(list));
      this.render();
    }));
    document.querySelectorAll('.d3-launch-del').forEach(btn => btn.addEventListener('click', () => {
      const list = JSON.parse(localStorage.getItem('ec_d3_launch') || '[]');
      list.splice(+btn.dataset.i, 1);
      localStorage.setItem('ec_d3_launch', JSON.stringify(list));
      this.render();
    }));
  },

  renderImgSearchTab() {
    return '<div class="table-card" style="margin-bottom:16px">'
      + '<div class="table-card-header"><h3>以圖搜貨</h3><p>上傳圖片，自動搜尋 1688 推薦賣家 & 蝦皮熱銷商品</p></div>'
      + '<div style="padding:14px">'
      + '<div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:14px">'
      + '<div style="display:flex;flex-direction:column;gap:8px;align-items:center">'
      + '<div id="img-drop-zone" style="border:2px dashed var(--border);border-radius:8px;padding:14px 20px;text-align:center;cursor:pointer;width:140px;box-sizing:border-box">'
      + '<div style="font-size:24px">📷</div>'
      + '<div style="font-size:12px;color:var(--text-muted);margin-top:4px">點擊或拖曳圖片</div>'
      + '<input id="img-file-input" type="file" accept="image/*" style="display:none">'
      + '</div>'
      + '<div id="img-preview-wrap" style="display:none"><img id="img-preview" style="width:140px;height:100px;object-fit:cover;border-radius:6px;border:1px solid var(--border)"></div>'
      + '</div>'
      + '<div style="display:flex;flex-direction:column;gap:8px;justify-content:center">'
      + '<button id="btn-search-both" style="padding:8px 18px;background:#10b981;color:white;border:none;border-radius:6px;font-size:13px;cursor:pointer;font-family:inherit;font-weight:500">🔍 搜尋商品</button>'
      + '<button id="btn-search-lens" style="padding:8px 14px;background:none;border:1px solid #4285f4;color:#4285f4;border-radius:6px;font-size:12px;cursor:pointer;font-family:inherit">↗ Google Lens 開新頁</button>'
      + '<button id="btn-clear-img" style="padding:8px 18px;background:none;border:1px solid var(--border);border-radius:6px;font-size:13px;cursor:pointer;font-family:inherit">清除</button>'
      + '</div>'
      + '<div id="img-search-loading" style="display:none;align-items:center;gap:10px;font-size:13px;color:var(--text-muted);padding:8px 0">'
      + '<div style="width:18px;height:18px;border:2px solid var(--border);border-top-color:#10b981;border-radius:50%;animation:spin 0.8s linear infinite"></div>'
      + '<span id="img-search-loading-text">AI 辨識中...</span>'
      + '</div>'
      + '</div>'
      + '<div id="img-search-results" style="display:none;margin-top:12px">'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'
      + '<div><div style="font-size:13px;font-weight:600;color:#e8320a;margin-bottom:8px">🏷️ 1688 推薦賣家</div><div id="ali-results"></div></div>'
      + '<div><div style="font-size:13px;font-weight:600;color:#ee4d2d;margin-bottom:8px">🔥 蝦皮熱銷商品</div><div id="shopee-results"></div></div>'
      + '</div>'
      + '<div id="img-search-lens-link" style="display:none;margin-top:10px;font-size:12px;color:var(--text-muted)"></div>'
      + '</div>'
      + '</div>'
      + '</div>';
  },

  bindImgSearch() {
    const dropZone = document.getElementById('img-drop-zone');
    const fileInput = document.getElementById('img-file-input');
    const previewWrap = document.getElementById('img-preview-wrap');
    const preview = document.getElementById('img-preview');
    const loading = document.getElementById('img-search-loading');
    const loadingText = document.getElementById('img-search-loading-text');
    const resultsWrap = document.getElementById('img-search-results');
    const keywordWrap = document.getElementById('img-search-keyword');
    let currentFile = null;

    const showPreview = (file) => {
      currentFile = file;
      const reader = new FileReader();
      reader.onload = e => { preview.src = e.target.result; previewWrap.style.display = ''; };
      reader.readAsDataURL(file);
      if (resultsWrap) resultsWrap.style.display = 'none';
      if (keywordWrap) keywordWrap.style.display = 'none';
    };

    dropZone?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', e => { if (e.target.files[0]) showPreview(e.target.files[0]); });
    dropZone?.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = '#10b981'; });
    dropZone?.addEventListener('dragleave', () => { dropZone.style.borderColor = ''; });
    dropZone?.addEventListener('drop', e => { e.preventDefault(); dropZone.style.borderColor = ''; if (e.dataTransfer.files[0]) showPreview(e.dataTransfer.files[0]); });

    document.getElementById('btn-clear-img')?.addEventListener('click', () => {
      currentFile = null;
      previewWrap.style.display = 'none';
      if (fileInput) fileInput.value = '';
      if (resultsWrap) resultsWrap.style.display = 'none';
      if (keywordWrap) keywordWrap.style.display = 'none';
      if (loading) loading.style.display = 'none';
    });

    const renderItem = (item, color) => {
      return '<a href="' + item.url + '" target="_blank" style="display:flex;gap:8px;align-items:center;padding:8px;border:1px solid var(--border);border-radius:6px;margin-bottom:6px;text-decoration:none;color:inherit;background:var(--card-bg)">'
        + (item.img ? '<img src="' + item.img + '" style="width:48px;height:48px;object-fit:cover;border-radius:4px;flex-shrink:0" onerror="this.style.display=\'none\'">' : '<div style="width:48px;height:48px;background:var(--border);border-radius:4px;flex-shrink:0"></div>')
        + '<div style="flex:1;min-width:0">'
        + '<div style="font-size:12px;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">' + item.title + '</div>'
        + '<div style="font-size:13px;font-weight:600;color:' + color + ';margin-top:2px">' + item.price + '</div>'
        + (item.sold ? '<div style="font-size:11px;color:var(--text-muted)">' + item.sold + '</div>' : '')
        + '</div>'
        + '</a>';
    };

    const aliEl = document.getElementById('ali-results');
    const shopeeEl = document.getElementById('shopee-results');
    const lensLinkEl = document.getElementById('img-search-lens-link');

    const renderCard = (item, color) => {
      const title = (item.title || item.url || '').substring(0, 45);
      const displayTitle = title || '查看商品';
      return '<a href="' + item.url + '" target="_blank" style="display:flex;gap:8px;align-items:center;padding:8px;border:1px solid var(--border);border-radius:6px;margin-bottom:6px;text-decoration:none;color:inherit">'
        + (item.img ? '<img src="' + item.img + '" style="width:44px;height:44px;object-fit:cover;border-radius:4px;flex-shrink:0" onerror="this.style.display=\'none\'">' : '')
        + '<div style="flex:1;min-width:0">'
        + '<div style="font-size:12px;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">' + displayTitle + '</div>'
        + (item.price ? '<div style="font-size:13px;font-weight:600;color:' + color + ';margin-top:2px">' + item.price + '</div>' : '')
        + '<div style="font-size:11px;color:var(--text-muted)">' + (item.source || '') + ' ↗</div>'
        + '</div></a>';
    };

    const doSearch = async () => {
      if (!currentFile) { showToast('請先上傳圖片', 'error'); return; }
      if (loading) loading.style.display = 'flex';
      if (loadingText) loadingText.textContent = 'AI 辨識中...';
      if (resultsWrap) resultsWrap.style.display = 'none';
      try {
        const fd = new FormData();
        fd.append('image', currentFile);
        const resp = await fetch('https://ec-image-search.jessica-d31.workers.dev', { method: 'POST', body: fd });
        const data = await resp.json();
        if (loading) loading.style.display = 'none';

        if (aliEl) {
          aliEl.innerHTML = data.ali && data.ali.length > 0
            ? data.ali.map(i => renderCard(i, '#e8320a')).join('')
            : '<a href="' + (data.aliSearchUrl || 'https://s.1688.com/youyuan/index.htm') + '" target="_blank" style="display:block;padding:10px;border:1px dashed var(--border);border-radius:6px;font-size:12px;color:#e8320a;text-decoration:none;text-align:center">點此在 1688 以圖搜款 ↗</a>';
        }
        if (shopeeEl) {
          shopeeEl.innerHTML = data.shopee && data.shopee.length > 0
            ? data.shopee.map(i => renderCard(i, '#ee4d2d')).join('')
            : '<a href="https://shopee.tw/search" target="_blank" style="display:block;padding:10px;border:1px dashed var(--border);border-radius:6px;font-size:12px;color:#ee4d2d;text-decoration:none;text-align:center">點此前往蝦皮搜尋 ↗</a>';
        }
        if (lensLinkEl && data.lensUrl) {
          lensLinkEl.style.display = '';
          lensLinkEl.innerHTML = '或 <a href="' + data.lensUrl + '" target="_blank" style="color:#4285f4">開啟 Google Lens 查看更多相似商品 ↗</a>';
        }
        if (resultsWrap) resultsWrap.style.display = '';
      } catch(e) {
        if (loading) loading.style.display = 'none';
        showToast('搜尋失敗，請稍後再試', 'error');
      }
    };

    document.getElementById('btn-search-both')?.addEventListener('click', doSearch);
    document.getElementById('btn-search-lens')?.addEventListener('click', async () => {
      if (!currentFile) { showToast('請先上傳圖片', 'error'); return; }
      if (loading) loading.style.display = 'flex';
      if (loadingText) loadingText.textContent = '上傳中...';
      try {
        const fd = new FormData();
        fd.append('image', currentFile);
        const resp = await fetch('https://ec-image-search.jessica-d31.workers.dev', { method: 'POST', body: fd });
        const data = await resp.json();
        if (loading) loading.style.display = 'none';
        if (data.yandexUrl) {
          window.open(data.yandexUrl, '_blank');
        } else {
          showToast('上傳失敗，請稍後再試', 'error');
        }
      } catch(e) { if (loading) loading.style.display = 'none'; showToast('失敗', 'error'); }
    });
  },

  /* ===== 熱搜雷達 ===== */
  renderTrendRadarTab() {
    const logs = JSON.parse(localStorage.getItem('ec_d3_trend_logs') || '[]');
    const PLATFORMS = [
      { id: 'shopee',  name: '蝦皮',   color: '#fca5a5', textColor: '#7f1d1d', icon: '🛍', hotUrl: 'https://shopee.tw/flash_sale',     searchUrl: 'https://shopee.tw/search?keyword=' },
      { id: 'tiktok',  name: 'TikTok', color: '#d1d5db', textColor: '#111827', icon: '📱', hotUrl: 'https://www.tiktok.com/trending',   searchUrl: 'https://www.tiktok.com/search?q=' },
      { id: '1688',    name: '1688',   color: '#fdba74', textColor: '#7c2d12', icon: '🏭', hotUrl: 'https://www.1688.com/huo/',          searchUrl: 'https://s.1688.com/selloffer/offerlist.htm?keywords=' },
      { id: 'taobao',  name: '淘寶',   color: '#fb923c', textColor: '#431407', icon: '🛒', hotUrl: 'https://www.taobao.com',             searchUrl: 'https://s.taobao.com/search?q=' },
    ];
    // 🚀 起飛商品推薦區（自動）放在最上方，讓使用者一進來就看到
    const risingSection = `
      <div class="table-card" style="margin-bottom:16px;border-top:3px solid #f59e0b">
        <div class="table-card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div>
            <h3 style="margin:0;color:#d97706">🚀 正在起飛的商品（自動推薦）</h3>
            <p style="margin:2px 0 0;font-size:12px;color:var(--text-muted)">根據 Google 台灣熱搜關鍵字，自動在蝦皮找出最多人買的相關商品 · 每天早上 9 點自動更新</p>
          </div>
        </div>
        <div style="padding:14px 16px">
          <div id="tr-rising-loading" style="display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text-muted);padding:6px 0">
            <div style="width:14px;height:14px;border:2px solid var(--border);border-top-color:#f59e0b;border-radius:50%;animation:spin 0.8s linear infinite"></div>
            <span id="tr-rising-status">等待熱搜關鍵字載入...</span>
          </div>
          <div id="tr-rising-list" style="display:none"></div>
          <div id="tr-rising-error" style="display:none"></div>
        </div>
      </div>`;

    // 熱搜關鍵字雲（Google + 蝦皮，自動）
    const keywordsSection = `
      <div class="table-card" style="margin-bottom:16px">
        <div class="table-card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div><h3>🔥 即時熱搜關鍵字</h3><p>Google 台灣熱搜 · 每筆一鍵跳四大平台搜尋</p></div>
          <div style="display:flex;gap:8px">
            <button id="tr-gt-refresh" style="padding:5px 12px;border:1px solid var(--border);background:white;border-radius:6px;font-size:13px;cursor:pointer">🔄 重整</button>
            <a href="https://trends.google.com.tw/trending?geo=TW" target="_blank" style="padding:5px 12px;background:#4285f4;color:white;border-radius:6px;font-size:13px;text-decoration:none;font-weight:600">完整榜單 ↗</a>
          </div>
        </div>
        <div style="padding:14px 16px">
          <div id="tr-gt-loading" style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-muted)">
            <div style="width:14px;height:14px;border:2px solid var(--border);border-top-color:#4285f4;border-radius:50%;animation:spin 0.8s linear infinite"></div>載入中...
          </div>
          <div id="tr-gt-list" style="display:none"></div>
          <div id="tr-gt-error" style="display:none"></div>
        </div>
      </div>`;

    const logRows = logs.length === 0
      ? `<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--text-muted);font-size:13px">還沒有記錄，發現起飛商品就記在這裡！</td></tr>`
      : logs.map((l, i) => {
          const p = PLATFORMS.find(x => x.id === l.platform);
          const trendColor = l.trend === '🚀 急速上升' ? '#059669' : l.trend === '📈 穩定成長' ? '#2563eb' : '#d97706';
          return `<tr>
            <td style="font-size:12px;color:var(--text-muted);white-space:nowrap">${escapeHtml(l.date || '')}</td>
            <td><span style="background:${p ? p.color+'22' : '#eee'};color:${p ? p.color : '#666'};padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600">${p ? p.icon+' '+p.name : escapeHtml(l.platformName || l.platform)}</span></td>
            <td style="font-weight:600">${escapeHtml(l.keyword || '')}</td>
            <td style="font-size:13px;color:var(--text-muted)">${escapeHtml(l.heat || '')}</td>
            <td style="color:${trendColor};font-weight:600;font-size:13px;white-space:nowrap">${escapeHtml(l.trend || '')}</td>
            <td style="font-size:12px;color:var(--text-muted);max-width:160px">${escapeHtml(l.note || '')}</td>
            <td><button class="trend-log-del" data-i="${i}" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:16px;padding:2px 6px">🗑</button></td>
          </tr>`;
        }).join('');

    const platformBtns = PLATFORMS.map(p =>
      `<a href="${p.hotUrl}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:${p.color};color:${p.textColor};border-radius:7px;text-decoration:none;font-size:12px;font-weight:600;white-space:nowrap;border:1px solid ${p.textColor}22">${p.icon} ${p.name} 熱搜</a>`
    ).join('');

    const logTableBody = `
      <div class="table-card" style="margin-bottom:16px">
        <div class="table-card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div><h3>📝 手動記錄</h3><p>把各平台發現的起飛商品記下來</p></div>
          <button id="trend-log-add-btn" style="padding:7px 16px;background:#10b981;color:white;border:0;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer">＋ 新增</button>
        </div>
        <div id="trend-log-form" style="display:none;padding:14px 16px;background:#f0fdf4;border-bottom:1px solid var(--border)">
          <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end">
            <div style="min-width:110px"><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">平台</div>
              <select id="tl-platform" style="padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
                <option value="shopee">🛍 蝦皮</option><option value="tiktok">📱 TikTok</option>
                <option value="1688">🏭 1688</option><option value="taobao">🛒 淘寶</option>
              </select></div>
            <div style="flex:2;min-width:160px"><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">商品 / 關鍵字 *</div>
              <input id="tl-keyword" type="text" placeholder="例：磁吸行動電源" style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box"></div>
            <div style="flex:1;min-width:130px"><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">熱度指標</div>
              <input id="tl-heat" type="text" placeholder="例：搜尋+30%" style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box"></div>
            <div style="min-width:120px"><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">趨勢判斷</div>
              <select id="tl-trend" style="padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
                <option>🚀 急速上升</option><option>📈 穩定成長</option><option>👀 觀察中</option>
              </select></div>
            <div style="flex:2;min-width:150px"><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">備註</div>
              <input id="tl-note" type="text" placeholder="例：競品少、客單高" style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box"></div>
            <button id="tl-save" style="padding:7px 14px;background:#10b981;color:white;border:0;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">儲存</button>
            <button id="tl-cancel" style="padding:7px 10px;border:1px solid var(--border);background:white;border-radius:6px;font-size:13px;cursor:pointer">取消</button>
          </div>
        </div>
        <div class="table-wrap">
          <table style="width:100%;font-size:13px">
            <thead style="background:var(--surface)">
              <tr>
                <th style="padding:8px 10px;text-align:left;font-size:12px;color:var(--text-muted);width:88px">日期</th>
                <th style="padding:8px 10px;text-align:left;font-size:12px;color:var(--text-muted);width:80px">平台</th>
                <th style="padding:8px 10px;text-align:left;font-size:12px;color:var(--text-muted)">商品 / 關鍵字</th>
                <th style="padding:8px 10px;text-align:left;font-size:12px;color:var(--text-muted);width:140px">熱度指標</th>
                <th style="padding:8px 10px;text-align:left;font-size:12px;color:var(--text-muted);width:110px">趨勢判斷</th>
                <th style="padding:8px 10px;text-align:left;font-size:12px;color:var(--text-muted)">備註</th>
                <th style="padding:8px 10px;width:36px"></th>
              </tr>
            </thead>
            <tbody>${logRows}</tbody>
          </table>
        </div>
      </div>`;

    return risingSection + keywordsSection + `
      <!-- 平台快速入口 + 一鍵搜尋 -->
      <div class="table-card" style="margin-bottom:16px">
        <div class="table-card-header"><h3>🔍 一鍵跨平台搜尋</h3><p>輸入關鍵字同時在四大平台搜尋，或直接點平台熱搜入口</p></div>
        <div style="padding:12px 16px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;border-bottom:1px solid var(--border)">
          <input id="trend-kw" type="text" placeholder="輸入關鍵字..." style="flex:1;min-width:180px;padding:8px 12px;border:1px solid var(--border);border-radius:7px;font-size:13px;font-family:inherit">
          <button id="trend-search-all" style="padding:8px 18px;background:#6366f1;color:white;border:0;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap">🔍 搜尋</button>
        </div>
        <div id="trend-links" style="padding:10px 16px;display:none;flex-wrap:wrap;gap:8px"></div>
        <div style="padding:12px 16px;display:flex;flex-wrap:wrap;gap:8px">${platformBtns}</div>
      </div>
    ` + logTableBody;
  },

  bindTrendRadar() {
    const PLATFORMS = [
      { id: 'shopee',  name: '蝦皮',   color: '#fca5a5', textColor: '#7f1d1d', icon: '🛍', searchUrl: 'https://shopee.tw/search?keyword=' },
      { id: 'tiktok',  name: 'TikTok', color: '#d1d5db', textColor: '#111827', icon: '📱', searchUrl: 'https://www.tiktok.com/search?q=' },
      { id: '1688',    name: '1688',   color: '#fdba74', textColor: '#7c2d12', icon: '🏭', searchUrl: 'https://s.1688.com/selloffer/offer_search.htm?charset=utf8&keywords=' },
      { id: 'taobao',  name: '淘寶',   color: '#fb923c', textColor: '#431407', icon: '🛒', searchUrl: 'https://s.taobao.com/search?q=' },
    ];

    // 直接呼叫（瀏覽器原生，Shopee 是 SPA 自己就用 JS 呼叫這個 API）
    const _directFetch = async (url) => {
      const r = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        credentials: 'omit',
        headers: { 'accept': 'application/json, text/plain, */*' }
      });
      if (!r.ok) throw new Error(r.status);
      return r;
    };

    // 備援 proxy 輪詢
    const _proxyFetch = async (url) => {
      const e = encodeURIComponent(url);
      const tries = [
        () => fetch('https://corsproxy.io/?url=' + e, { signal: AbortSignal.timeout(8000) }),
        () => fetch('https://api.allorigins.win/raw?url=' + e, { signal: AbortSignal.timeout(8000) }),
      ];
      for (const t of tries) {
        try { const r = await t(); if (r.ok) return r; } catch {}
      }
      throw new Error('all_fail');
    };

    // 蝦皮（透過 Cloudflare Worker 代理，解決 CORS）
    const _fetchShopee = async (kw) => {
      const workerUrl = `https://ec-image-search.jessica-d31.workers.dev/?kw=${encodeURIComponent(kw)}`;
      let data;
      try { data = await (await fetch(workerUrl, { signal: AbortSignal.timeout(10000) })).json(); }
      catch {
        const url = `https://shopee.tw/api/v4/search/search_item?by=sales&keyword=${encodeURIComponent(kw)}&limit=3&newest=0&order=desc&page_type=search&scenario=PAGE_GLOBAL_SEARCH&version=2`;
        try { data = await (await _directFetch(url)).json(); }
        catch { data = await (await _proxyFetch(url)).json(); }
      }
      return (data?.items || []).map(item => {
        const b = item.item_basic || item;
        const itemId = b.itemid || b.item_id;
        const shopId = b.shopid || b.shop_id;
        const image = b.image || '';
        return {
          keyword: kw, name: b.name || '', price: b.price ? Math.round(b.price / 100000) : 0,
          sold: b.historical_sold || b.sold || 0,
          url: `https://shopee.tw/product/${shopId}/${itemId}`,
          image: image ? `https://cf.shopee.tw/file/${image}_tn` : '',
          source: '蝦皮'
        };
      }).filter(r => r.name && r.url.includes('/product/'));
    };

    // PChome 直接抓
    const _fetchPChome = async (kw) => {
      const url = `https://ecshweb.pchome.com.tw/search/v3.3/?q=${encodeURIComponent(kw)}&page=1&sort=rnk/dc`;
      let data;
      try { data = await (await _directFetch(url)).json(); }
      catch { data = await (await _proxyFetch(url)).json(); }
      return (data?.Prods || []).slice(0, 2).map(p => {
        const id = p.Id || '';
        return {
          keyword: kw, name: p.Name || '', price: p.Price || 0,
          sold: p.totalReviewNum || 0,
          url: `https://24h.pchome.com.tw/prod/${id}`,
          image: id ? `https://a.ecimg.tw/items/${id.slice(0,8)}/${id}/000001.jpg` : '',
          source: 'PChome'
        };
      }).filter(r => r.name);
    };

    // 本地備援商品（API 失敗時顯示，只顯示確定符合關鍵字的商品，不亂配）
    const _fetchLocalProducts = async () => {
      try {
        const d = await fetch('data/products.json?_=' + Date.now()).then(r => r.json());
        return d.items || [];
      } catch { return []; }
    };

    const _renderProducts = (results, listEl, isLive) => {
      if (!listEl) return;
      const seen = new Set();
      const deduped = results.filter(r => { if (seen.has(r.keyword)) return false; seen.add(r.keyword); return true; }).slice(0, 5);
      deduped.sort((a, b) => (b.sold || 0) - (a.sold || 0));
      const isAI = results.some(r => r.source === 'AI推薦');
      const medals = ['🥇','🥈','🥉','4.','5.'];
      listEl.style.display = '';
      listEl.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:8px">
          ${deduped.map((r, i) => {
            const soldStr = (r.sold||0) >= 10000 ? ((r.sold)/10000).toFixed(1)+'萬筆' : (r.sold||0) > 0 ? (r.sold)+'筆' : '';
            return `<a href="${r.url}" target="_blank"
              style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;text-decoration:none;color:inherit;transition:box-shadow .15s"
              onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.1)'" onmouseout="this.style.boxShadow=''">
              <div style="font-size:20px;width:28px;text-align:center;flex-shrink:0">${medals[i]||''}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;color:#7c3aed;font-weight:600;margin-bottom:3px">🤖 ${escapeHtml(r.keyword)}</div>
                <div style="font-size:14px;font-weight:600;line-height:1.4;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(r.name)}</div>
                ${r.reason ? `<div style="font-size:12px;color:var(--text-muted);margin-top:3px">${escapeHtml(r.reason)}</div>` : ''}
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div style="font-size:16px;font-weight:700;color:#7c3aed">NT$${(r.price||0).toLocaleString()}</div>
                ${soldStr ? `<div style="font-size:11px;color:var(--text-muted)">${soldStr}</div>` : ''}
              </div>
            </a>`;
          }).join('')}
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--text-muted)">🤖 Claude AI 每天早上 9 點根據節慶與季節自動推薦 · 點商品可在蝦皮搜尋</div>`;
    };

    const loadRisingProducts = async (keywords) => {
      const loadingEl = document.getElementById('tr-rising-loading');
      const statusEl = document.getElementById('tr-rising-status');
      const listEl = document.getElementById('tr-rising-list');
      const errorEl = document.getElementById('tr-rising-error');
      if (loadingEl) loadingEl.style.display = 'flex';
      if (listEl) listEl.style.display = 'none';
      if (errorEl) errorEl.style.display = 'none';

      // 先顯示備援商品，讓畫面立刻有東西
      const localProds = await _fetchLocalProducts();
      if (localProds.length) {
        if (loadingEl) loadingEl.style.display = 'none';
        _renderProducts(localProds, listEl, false);
      }

      // 背景嘗試即時 API
      const top = keywords.slice(0, 6);
      const results = [];
      for (let i = 0; i < top.length; i++) {
        const kw = top[i];
        if (statusEl) statusEl.textContent = `即時更新 (${i+1}/${top.length})：${kw}`;
        try { const p = await _fetchShopee(kw); if (p.length) { results.push(...p); continue; } } catch {}
        try { const p = await _fetchPChome(kw); if (p.length) { results.push(...p); continue; } } catch {}
      }

      if (loadingEl) loadingEl.style.display = 'none';
      if (results.length > 0) {
        // 即時資料成功，取代備援
        _renderProducts(results, listEl, true);
      }
      // 否則保留已顯示的備援商品

      if (!listEl || (localProds.length === 0 && results.length === 0)) {
        if (listEl) {
          listEl.style.display = '';
          listEl.innerHTML = `<div style="padding:16px;color:var(--text-muted);font-size:13px;text-align:center"><div style="font-size:24px;margin-bottom:8px">⚠️</div>無法載入商品</div>`;
        }
        return;
      }

      // 渲染已由 _renderProducts 處理完畢
    };

    // 一鍵跨平台搜尋 — 顯示連結讓使用者點擊（繞過瀏覽器彈出封鎖）
    document.getElementById('trend-search-all')?.addEventListener('click', () => {
      const kw = (document.getElementById('trend-kw')?.value || '').trim();
      if (!kw) { showToast('請輸入關鍵字', 'error'); return; }
      const linksEl = document.getElementById('trend-links');
      if (!linksEl) return;
      linksEl.style.display = 'flex';
      linksEl.innerHTML = PLATFORMS.map(p =>
        `<a href="${p.searchUrl + encodeURIComponent(kw)}" target="_blank" rel="noopener"
          style="padding:7px 14px;background:${p.color};color:${p.textColor};border:1px solid ${p.textColor}22;border-radius:7px;font-size:13px;font-weight:600;text-decoration:none">
          ${p.icon} ${p.name} ↗</a>`
      ).join('');
    });
    document.getElementById('trend-kw')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('trend-search-all')?.click();
    });

    // Google Trends 載入
    const loadGT = () => {
      const loading = document.getElementById('tr-gt-loading');
      const list = document.getElementById('tr-gt-list');
      const error = document.getElementById('tr-gt-error');
      if (loading) loading.style.display = 'flex';
      if (list) list.style.display = 'none';
      if (error) error.style.display = 'none';

      fetch('data/trends.json?_=' + Date.now(), { signal: AbortSignal.timeout(8000) })
        .then(r => r.json())
        .then(data => {
          const rawItems = data.items || [];
          if (!rawItems.length) throw new Error();
          const items = rawItems.map(it => ({
            querySelector: (sel) => {
              if (sel === 'title') return { textContent: it.title };
              if (sel === 'approx_traffic') return it.traffic ? { textContent: it.traffic } : null;
              return null;
            }
          }));
          if (loading) loading.style.display = 'none';
          if (!list) return;
          list.style.display = '';
          list.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
            items.map((item, i) => {
              const title = item.querySelector('title')?.textContent || '';
              const traffic = item.querySelector('approx_traffic')?.textContent || '';
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
              const bg = i < 3 ? '#f0f6ff' : (i % 2 === 0 ? '#fafafa' : 'white');
              const rankColor = i < 3 ? '#4285f4' : i < 10 ? '#555' : '#999';
              const platformLinks = PLATFORMS.map(p =>
                `<a href="${p.searchUrl}${encodeURIComponent(title)}" target="_blank" style="padding:2px 7px;background:${p.color};color:white;border-radius:4px;font-size:10px;text-decoration:none;font-weight:600;text-align:center">${p.icon}${p.name}</a>`
              ).join('');
              return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:9px;background:${bg}">
                <span style="font-weight:800;color:${rankColor};min-width:28px;text-align:center;font-size:13px">${medal}</span>
                <div style="flex:1;min-width:0">
                  <div class="trend-kw-title" style="font-size:13px;font-weight:${i<3?'700':'500'};color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(title)}</div>
                  ${traffic ? `<div style="font-size:11px;color:#4285f4;margin-top:1px">${escapeHtml(traffic)} 搜尋</div>` : ''}
                </div>
                <div style="display:flex;flex-direction:column;gap:3px;flex-shrink:0">${platformLinks}</div>
              </div>`;
            }).join('') + '</div>' +
            '<div style="margin-top:10px;font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;align-items:center">' +
            '<span>來源：Google Trends 台灣 · 每日更新</span>' +
            '<a href="https://trends.google.com.tw/trending?geo=TW" target="_blank" style="color:#4285f4;text-decoration:none;font-weight:600">查看完整榜單 ↗</a></div>';
          // 載入完後自動分析起飛商品
          const keywords = items.map(item => item.querySelector('title')?.textContent || '').filter(Boolean);
          loadRisingProducts(keywords);
        })
        .catch(() => {
          if (loading) loading.style.display = 'none';
          if (error) {
            error.style.display = '';
            error.innerHTML = `<div style="text-align:center;padding:16px;color:var(--text-muted)">
              <div style="font-size:22px;margin-bottom:6px">😔</div>
              <div style="font-size:13px;margin-bottom:10px">無法自動載入（CORS / 網路限制）</div>
              <a href="https://trends.google.com.tw/trending?geo=TW" target="_blank" style="padding:6px 14px;background:#4285f4;color:white;border-radius:6px;font-size:13px;text-decoration:none">開啟 Google Trends ↗</a>
            </div>`;
          }
          // Trends 失敗時用備用關鍵字兜底
          loadRisingProducts(['防曬', '涼感', '露營', '寵物', '美妝']);
        });
    };
    document.getElementById('tr-gt-refresh')?.addEventListener('click', loadGT);
    document.getElementById('tr-rising-refresh')?.addEventListener('click', () => {
      const kws = Array.from(document.querySelectorAll('#tr-gt-list .trend-kw-title')).map(el => el.textContent).filter(Boolean);
      loadRisingProducts(kws.length ? kws : ['防曬', '涼感', '露營', '寵物', '美妝']);
    });
    loadGT();

    // TikTok Creative Center 熱門 Hashtag
    const loadTT = () => {
      const loading = document.getElementById('tr-tt-loading');
      const list = document.getElementById('tr-tt-list');
      const error = document.getElementById('tr-tt-error');
      if (loading) loading.style.display = 'flex';
      if (list) list.style.display = 'none';
      if (error) error.style.display = 'none';

      const ttUrl = 'https://ads.tiktok.com/business/creativecenter/api/v1/trending/hashtags/list?period=7&page=1&limit=20&country_code=TW&language=zh-Hant';
      _pfetch(ttUrl)
        .then(r => r.json())
        .then(data => {
          const tags = (data?.data?.list) || [];
          if (!tags.length) throw new Error('no data');
          if (loading) loading.style.display = 'none';
          if (!list) return;
          list.style.display = '';
          const tagChips = tags.map((t, i) => {
            const name = t.hashtag_name || t.name || '';
            const views = t.video_views || t.view_count || 0;
            const viewStr = views >= 1e8 ? (views/1e8).toFixed(1)+'億' : views >= 1e4 ? Math.round(views/1e4)+'萬' : (views || '');
            const bg = i < 3 ? '#010101' : '#f3f4f6';
            const fg = i < 3 ? 'white' : 'var(--text)';
            return `<a href="https://www.tiktok.com/search?q=${encodeURIComponent('#'+name)}" target="_blank"
              style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;background:${bg};color:${fg};border-radius:999px;text-decoration:none;font-size:13px;font-weight:600">
              #${escapeHtml(name)}${viewStr ? `<span style="font-size:10px;opacity:.75">${viewStr}</span>` : ''}
            </a>`;
          }).join('');
          list.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px">${tagChips}</div>
            <div style="margin-top:10px;font-size:11px;color:var(--text-muted)">來源：TikTok Creative Center · 近 7 天 TW 熱門標籤</div>`;
        })
        .catch(() => {
          if (loading) loading.style.display = 'none';
          if (error) {
            error.style.display = '';
            error.innerHTML = `<div style="text-align:center;padding:16px;color:var(--text-muted)">
              <div style="font-size:13px;margin-bottom:10px">TikTok API 受限，請直接開啟 Creative Center 查看</div>
              <a href="https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/zh" target="_blank" style="padding:6px 14px;background:#010101;color:white;border-radius:6px;font-size:13px;text-decoration:none">開啟 TikTok Creative Center ↗</a>
            </div>`;
          }
        });
    };
    loadTT();

    // 起飛商品記錄表單
    const form = document.getElementById('trend-log-form');
    document.getElementById('trend-log-add-btn')?.addEventListener('click', () => {
      if (!form) return;
      form.style.display = form.style.display === 'none' ? '' : 'none';
    });
    document.getElementById('tl-cancel')?.addEventListener('click', () => {
      if (form) form.style.display = 'none';
    });
    document.getElementById('tl-save')?.addEventListener('click', () => {
      const kw = (document.getElementById('tl-keyword')?.value || '').trim();
      if (!kw) { showToast('請填寫商品 / 關鍵字', 'error'); return; }
      const platform = document.getElementById('tl-platform')?.value || 'shopee';
      const pInfo = PLATFORMS.find(p => p.id === platform);
      const list = JSON.parse(localStorage.getItem('ec_d3_trend_logs') || '[]');
      list.unshift({
        date: new Date().toISOString().slice(0, 10),
        platform,
        platformName: pInfo?.name || platform,
        keyword: kw,
        heat: (document.getElementById('tl-heat')?.value || '').trim(),
        trend: document.getElementById('tl-trend')?.value || '',
        note: (document.getElementById('tl-note')?.value || '').trim(),
      });
      localStorage.setItem('ec_d3_trend_logs', JSON.stringify(list));
      showToast('已記錄！', 'success');
      this.render();
    });
    document.querySelectorAll('.trend-log-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const list = JSON.parse(localStorage.getItem('ec_d3_trend_logs') || '[]');
        list.splice(+btn.dataset.i, 1);
        localStorage.setItem('ec_d3_trend_logs', JSON.stringify(list));
        showToast('已刪除', 'success');
        this.render();
      });
    });
  },

  renderAiSelectTab(deptId, color, dept) {
    const records = Store.get('ec.aiSelect', []);
    const badge = (rec) => {
      if (rec.score >= 70) return `<span style="background:#d1fae5;color:#065f46;font-size:12px;padding:2px 10px;border-radius:999px;font-weight:500">推薦進貨</span>`;
      if (rec.score >= 40) return `<span style="background:#fef3c7;color:#92400e;font-size:12px;padding:2px 10px;border-radius:999px;font-weight:500">觀察</span>`;
      return `<span style="background:#fee2e2;color:#991b1b;font-size:12px;padding:2px 10px;border-radius:999px;font-weight:500">不建議</span>`;
    };
    const scoreColor = (s) => s >= 70 ? '#059669' : s >= 40 ? '#d97706' : '#dc2626';
    const total = records.length;
    const rec70 = records.filter(r => r.score >= 70).length;
    const rec40 = records.filter(r => r.score >= 40 && r.score < 70).length;
    const recNo = records.filter(r => r.score < 40).length;

    const statsHtml = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
        <div style="background:var(--bg-card,#f9fafb);border-radius:10px;padding:14px 16px">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">本週 AI 分析</div>
          <div style="font-size:22px;font-weight:600">${total}</div>
          <div style="font-size:11px;color:var(--text-muted)">件商品</div>
        </div>
        <div style="background:var(--bg-card,#f9fafb);border-radius:10px;padding:14px 16px">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">推薦進貨</div>
          <div style="font-size:22px;font-weight:600;color:#059669">${rec70}</div>
          <div style="font-size:11px;color:var(--text-muted)">評分 ≥ 70</div>
        </div>
        <div style="background:var(--bg-card,#f9fafb);border-radius:10px;padding:14px 16px">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">觀察中</div>
          <div style="font-size:22px;font-weight:600;color:#d97706">${rec40}</div>
          <div style="font-size:11px;color:var(--text-muted)">評分 40–69</div>
        </div>
        <div style="background:var(--bg-card,#f9fafb);border-radius:10px;padding:14px 16px">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">不建議</div>
          <div style="font-size:22px;font-weight:600;color:#dc2626">${recNo}</div>
          <div style="font-size:11px;color:var(--text-muted)">評分 &lt; 40</div>
        </div>
      </div>`;

    const formHtml = `
      <div class="table-card" style="margin-bottom:16px">
        <div class="table-card-header"><h3>新增商品分析</h3></div>
        <div style="padding:16px;display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end">
          <div style="flex:2;min-width:180px">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">商品名稱</div>
            <input id="ai-product-name" type="text" placeholder="例：寵物自動飲水機" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:14px;font-family:inherit;box-sizing:border-box">
          </div>
          <div style="flex:1;min-width:100px">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">1688 成本 (NT$)</div>
            <input id="ai-cost" type="number" placeholder="例：120" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:14px;font-family:inherit;box-sizing:border-box">
          </div>
          <div style="flex:1;min-width:100px">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">預計售價 (NT$)</div>
            <input id="ai-price" type="number" placeholder="例：399" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:14px;font-family:inherit;box-sizing:border-box">
          </div>
          <div style="flex:1;min-width:100px">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">對手月銷量</div>
            <input id="ai-heat" type="number" placeholder="例：500" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:14px;font-family:inherit;box-sizing:border-box">
          </div>
          <div style="flex:1;min-width:100px">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">法規風險</div>
            <select id="ai-risk" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:14px;font-family:inherit;box-sizing:border-box">
              <option value="低">低</option>
              <option value="中">中（需檢驗）</option>
              <option value="高">高（侵權風險）</option>
            </select>
          </div>
          <button id="ai-analyze-btn" style="padding:8px 20px;background:#10b981;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-family:inherit;white-space:nowrap">🤖 AI 分析</button>
        </div>
      </div>`;

    const listHtml = records.length === 0
      ? `<div class="empty" style="padding:40px;text-align:center"><div style="font-size:40px;margin-bottom:10px">🔍</div><p>尚無分析紀錄，請在上方新增商品</p></div>`
      : `<div class="table-card">
          <div class="table-card-header"><h3>AI 選品評分紀錄</h3></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>商品名稱</th><th>AI 評分</th><th>預估毛利率</th><th>建議</th><th>風險提醒</th><th>建議售價</th><th>建議叫貨量</th><th>操作</th></tr></thead>
              <tbody>
                ${records.map((r, i) => `
                  <tr>
                    <td style="font-weight:500">${escapeHtml(r.name)}</td>
                    <td style="font-weight:700;color:${scoreColor(r.score)}">${r.score}</td>
                    <td>${r.margin}%</td>
                    <td>${badge(r)}</td>
                    <td style="font-size:13px;color:${r.riskLevel==='高'?'#dc2626':r.riskLevel==='中'?'#d97706':'var(--text-muted)'}">${escapeHtml(r.riskNote)}</td>
                    <td>NT$${r.suggestPrice}</td>
                    <td>${r.suggestQty} 件</td>
                    <td><button class="ai-del-btn" data-idx="${i}" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px;padding:2px 6px">🗑</button></td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`;

    return statsHtml + formHtml + listHtml;
  },

  bindAiSelect(deptId) {
    const analyzeBtn = document.getElementById('ai-analyze-btn');
    if (!analyzeBtn) return;
    analyzeBtn.addEventListener('click', () => {
      const name = document.getElementById('ai-product-name').value.trim();
      const cost = parseFloat(document.getElementById('ai-cost').value);
      const price = parseFloat(document.getElementById('ai-price').value);
      const heat = document.getElementById('ai-heat').value;
      const risk = document.getElementById('ai-risk').value;
      if (!name) { showToast('請輸入商品名稱', 'error'); return; }
      if (!cost || !price || price <= cost) { showToast('請確認成本與售價（售價需高於成本）', 'error'); return; }

      const margin = Math.round((price - cost) / price * 100);
      const competitorSold = parseInt(heat) || 0;
      // 對手月銷量評分：>1000筆=滿分，市場夠大；100-1000中等；<100偏冷
      const heatScore = competitorSold >= 1000 ? 30 : competitorSold >= 500 ? 25 : competitorSold >= 200 ? 20 : competitorSold >= 100 ? 15 : competitorSold > 0 ? 8 : 10;
      const riskPenalty = risk === '高' ? 30 : risk === '中' ? 10 : 0;
      const marginScore = Math.min(margin, 50);
      const score = Math.max(0, Math.min(100, heatScore + marginScore + 20 - riskPenalty));
      const riskNote = risk === '高' ? '侵權/法規風險高' : risk === '中' ? '需附檢驗報告' : '低風險';
      const suggestPrice = Math.round(price * 0.95);
      const suggestQty = score >= 70 ? 200 : score >= 40 ? 100 : 50;

      const records = Store.get('ec.aiSelect', []);
      records.unshift({ name, cost, price, margin, heat: competitorSold > 0 ? competitorSold + '筆/月' : '未填', riskLevel: risk, riskNote, score, suggestPrice, suggestQty, createdAt: Date.now() });
      Store.set('ec.aiSelect', records);
      showToast('AI 分析完成！', 'success');
      this.render();
    });

    document.querySelectorAll('.ai-del-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const records = Store.get('ec.aiSelect', []);
        records.splice(idx, 1);
        Store.set('ec.aiSelect', records);
        showToast('已刪除', 'success');
        this.render();
      });
    });
  },


  /* ============================================================
   *  各辦公室頁面（行銷 / 採購 / 商開 / 設計）
   * ============================================================ */

  /* ============================================================
   *  帳號管理（管理員）
   * ============================================================ */



  /* ============================================================
   *  通用 Modal
   * ============================================================ */


};

window.App = App;

let __appBooted = false;
function __bootApp() {
  if (__appBooted) return; __appBooted = true;
  try {
    App.init();
    document.addEventListener('DOMContentLoaded', function() {
      var box = document.getElementById('js-status');
      if (box && !box.textContent) {
        box.style.color = 'var(--success)';
        box.textContent = '✓ 系統就緒';
      }
    });
    setTimeout(function() {
      var box = document.getElementById('js-status');
      if (box && !box.textContent) {
        box.style.color = '#10b981';
        box.textContent = '✓ 系統就緒';
      }
    }, 50);
  } catch (err) {
    alert('App 初始化失敗：' + err.message + '\n\n' + err.stack);
    var box = document.getElementById('js-status');
    if (box) box.textContent = '⚠ 初始化失敗：' + err.message;
  }
}

// 本機獨有、不可同步的鍵（session 不上雲，避免一個人登入別人也跟著登入）
const __LOCAL_ONLY_KEYS = new Set([Store.KEYS.session]);

function __localGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function __localSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
function __localRemove(key) {
  try { localStorage.removeItem(key); } catch {}
}

// 雲端寫入失敗時的通用通報：呼叫 App.showAlertModal (pages/modal.js 提供)，
// 退而求其次走 console.error + showToast。會幫使用者翻譯 1 MiB 超限這類常見錯。
function __notifyCloudFail(key, err, action) {
  action = action || '寫入';
  const raw = (err && (err.message || err.code || err.toString())) || '未知錯誤';
  const detail = `key: ${key}\n${raw}`;
  console.error('[cloud ' + action + ' failed]', key, err);
  // 翻譯常見錯誤
  let friendly = raw;
  if (/exceeds the maximum allowed size|1,048,576|1048576/.test(raw)) {
    friendly = '雲端文件已達 1 MiB 上限，這筆 ' + action + ' 被拒絕。\n資料還在本機，重整前請先匯出 / 截圖備份。\n請聯絡管理員把舊月份資料封存。';
  } else if (/permission|PERMISSION_DENIED/i.test(raw)) {
    friendly = '雲端拒絕：沒有寫入權限。請聯絡管理員。';
  } else if (/quota|RESOURCE_EXHAUSTED/i.test(raw)) {
    friendly = '雲端額度已用完。請聯絡管理員。';
  } else if (/network|fetch|offline|ECONNRESET/i.test(raw)) {
    friendly = '雲端連線失敗（網路 / 離線）。資料只存在本機，請恢復連線後再試。';
  }
  if (window.App && typeof window.App.showAlertModal === 'function') {
    window.App.showAlertModal({
      title: '雲端' + action + '失敗',
      message: friendly,
      detail: detail,
      kind: 'error',
      dedupeKey: 'cloud-' + action + '-' + key,
    });
  } else if (typeof window.showToast === 'function') {
    window.showToast('❌ 雲端' + action + '失敗：' + (friendly.split('\n')[0] || raw), 'error');
  }
}

async function __setupCloud() {
  try {
    const cs = window.__cloudStore;
    if (!cs) throw new Error('cloudStore not available');
    const snap = await cs.getDoc();
    let cloudData = snap.exists() ? (snap.data() || {}) : {};

    // 首次遷移：雲端無資料但本機有 → 將本機 localStorage 上傳到雲端（session 除外）
    if (Object.keys(cloudData).length === 0) {
      const local = {};
      for (const k of Object.values(Store.KEYS)) {
        if (__LOCAL_ONLY_KEYS.has(k)) continue;
        try {
          const raw = localStorage.getItem(k);
          if (raw !== null) local[k] = JSON.parse(raw);
        } catch {}
      }
      if (Object.keys(local).length > 0) {
        for (const [k, v] of Object.entries(local)) {
          await cs.setField(k, v);
        }
        cloudData = local;
      }
    }

    // 保險：雲端若殘留 session 就忽略，避免授權外洩
    delete cloudData[Store.KEYS.session];

    // 初次雲端載入：若 localStorage 有 pending 未同步的 key，用本機版本覆蓋雲端（否則
    // 使用者上次本機刪除的內容會被雲端舊資料蓋回來）
    try {
      const pendingRaw = localStorage.getItem('ec.insightPendingNotes');
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw);
        if (Array.isArray(pending)) {
          pending.forEach(pk => {
            try {
              const localRaw = localStorage.getItem(pk);
              if (localRaw !== null) cloudData[pk] = JSON.parse(localRaw);
            } catch {}
          });
        }
      }
    } catch {}

    Store._mem = cloudData;
    Store._useMem = true;

    // 蓋掉 Store.get/set/remove：
    //   - session 一律走 localStorage（避免跨裝置共用登入狀態）
    //   - 其他鍵走原本的雲端同步路徑
    const origGet = Store.get.bind(Store);
    const origSet = Store.set.bind(Store);
    const origRemove = Store.remove.bind(Store);
    Store.get = function(key, fallback) {
      if (__LOCAL_ONLY_KEYS.has(key)) return __localGet(key, fallback);
      return origGet(key, fallback);
    };
    Store.set = function(key, value) {
      if (__LOCAL_ONLY_KEYS.has(key)) { __localSet(key, value); return; }
      // 寫入時把 key 從「最近刪除」名單移除，否則訂閱回呼會把剛上傳的資料當成 race 過濾掉
      if (window.__unmarkRecentlyDeleted) window.__unmarkRecentlyDeleted(key);
      origSet(key, value);
      // 雲端寫入失敗一定要讓使用者看到（先前撞 1 MiB 上限的事件就是被靜默 reject 吃掉）
      // sync 階段不太可能 throw（setDoc 是 async），主要靠下面的 .catch 接 promise rejection
      try {
        const p = cs.setField(key, value);
        if (p && typeof p.then === 'function') {
          p.catch(err => __notifyCloudFail(key, err));
        }
      } catch (e) { __notifyCloudFail(key, e); }
    };
    // local-only 寫入：更新 Store._mem + localStorage，不推雲端
    // 用於多人協作場景：先在本機收集編輯，等使用者按「同步雲端」才一次推
    // 注意：origSet 在 _useMem=true（雲端模式必為 true）時只寫 _mem 不寫 localStorage，
    //       導致重整後本機編輯全部消失。這裡強制兩處都寫，重整後可恢復。
    Store.setLocalOnly = function(key, value) {
      if (window.__unmarkRecentlyDeleted) window.__unmarkRecentlyDeleted(key);
      try { Store._mem[key] = value; } catch {}
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    };
    // 手動把指定 key 推到雲端（搭配 setLocalOnly 使用）
    Store.pushKeyToCloud = async function(key) {
      try {
        await cs.setField(key, Store._mem[key]);
        return true;
      } catch (e) {
        console.error('[pushKeyToCloud] 失敗', key, e);
        throw e;
      }
    };
    Store.remove = function(key) {
      if (__LOCAL_ONLY_KEYS.has(key)) { __localRemove(key); return; }
      origRemove(key);
      try {
        const p = cs.removeField(key);
        if (p && typeof p.then === 'function') {
          p.catch(err => __notifyCloudFail(key, err, '刪除'));
        }
      } catch (e) { __notifyCloudFail(key, e, '刪除'); }
    };

    // 暫存「剛剛刪掉的 key」(避免訂閱 race 把它們從雲端 snapshot 帶回來)
    window.__recentlyDeleted = window.__recentlyDeleted || new Map();
    window.__markRecentlyDeleted = (keys) => {
      const now = Date.now();
      const arr = Array.isArray(keys) ? keys : [keys];
      arr.forEach(k => window.__recentlyDeleted.set(k, now));
      console.warn('[mark deleted]', arr);
    };
    window.__unmarkRecentlyDeleted = (keys) => {
      const arr = Array.isArray(keys) ? keys : [keys];
      let removed = false;
      arr.forEach(k => { if (window.__recentlyDeleted.delete(k)) removed = true; });
      if (removed) console.warn('[unmark deleted]', arr);
    };

    // 訂閱：其他人改了資料，這台會即時更新畫面
    // 但如果使用者正在 input 裡打字、或有尚未確認儲存的更動，跳過重繪避免覆蓋
    let __firstCloudSnapshot = true;
    cs.subscribe((data) => {
      const next = data || {};
      delete next[Store.KEYS.session];  // 不接受雲端的 session
      // 過濾掉「最近 30 秒內剛刪掉」的 key（避免 race 把它們又帶回來；給足網路 / 雲端延遲）
      const now = Date.now();
      const filteredOut = [];
      window.__recentlyDeleted.forEach((ts, k) => {
        if (now - ts < 30000) {
          if (next[k] !== undefined) filteredOut.push(k);
          delete next[k];
        } else {
          window.__recentlyDeleted.delete(k);
        }
      });
      if (filteredOut.length) console.warn('[subscribe] filtered out recently deleted:', filteredOut);
      // 保護本機未同步的洞察表 notes：若 pending 中的 key 在 next 也有，保留本機版本
      // 否則使用者編輯到一半就被別人雲端版本蓋掉
      const pending = window.__insightPendingNotes;
      if (pending && pending.size > 0) {
        pending.forEach(k => {
          if (Store._mem && Store._mem[k] !== undefined) next[k] = Store._mem[k];
        });
      }
      // 保護「剛剛在本機存的營收 / 廣告費」：若 2 秒內剛 commit 過，
      //   雲端 snapshot 可能還沒包含我們的寫入 → 用本機 _mem 覆蓋 next，避免值消失
      const justSavedPlatforms = window._platformJustSaved && (Date.now() - window._platformJustSaved < 2000);
      if (justSavedPlatforms && Store._mem && Store._mem[Store.KEYS.platforms] !== undefined) {
        next[Store.KEYS.platforms] = Store._mem[Store.KEYS.platforms];
      }
      // 保護「洞察表 pending 未同步的 note key」：使用者已本機刪過調整但還沒按☁同步，
      //   雲端還有舊資料，若讓 next 覆蓋會讓「已刪除」的調整跑回來
      try {
        const pending = window.__insightPendingNotes;
        if (pending && pending.size > 0 && Store._mem) {
          pending.forEach(pk => {
            if (Store._mem[pk] !== undefined) next[pk] = Store._mem[pk];
          });
        }
      } catch {}
      Store._mem = next;
      // 首批雲端 snapshot 一定強制重繪（即便 App 尚未準備、或 dirty check 誤判）
      // 否則手機開頁時，「dashboard 先用空資料 render → 雲端到了但被 dirty 條件擋住」會看不到數字
      const isFirstSnapshot = __firstCloudSnapshot;
      __firstCloudSnapshot = false;
      if (!(window.App && App.currentUser && typeof App.render === 'function')) {
        // App 還沒準備好，等準備好再補一次 render（由 enterApp 那邊處理）
        if (isFirstSnapshot) window.__pendingFirstRender = true;
        return;
      }
      if (isFirstSnapshot) {
        try { App.render(); } catch (e) { console.warn('first cloud snapshot render failed', e); }
        return;
      }
      const active = document.activeElement;
      const inOurInput = active && active.tagName === 'INPUT' && (
        active.classList.contains('card-rev') || active.classList.contains('card-ads') ||
        active.classList.contains('entry-rev') || active.classList.contains('entry-ads')
      );
      // 任一卡片有未儲存更動就不要重繪（避免把使用者打到一半的數字蓋掉）
      const hasUnsavedChanges = Array.from(document.querySelectorAll('.card-rev, .card-ads')).some(el => {
        const norm = v => (v == null ? '' : String(v).trim());
        return norm(el.value) !== norm(el.dataset.original);
      });
      // 剛剛在本機存過 → setTimeout 已經排好重繪了，跳過雲端 bounce-back 的重複重繪
      const justSavedLocally = window._platformJustSaved && (Date.now() - window._platformJustSaved < 2000);
      if (!inOurInput && !hasUnsavedChanges && !justSavedLocally) App.render();
    });
  } catch (e) {
    console.error('Cloud setup failed, falling back to localStorage', e);
  }
  __bootApp();
}

if (window.__cloudStore) {
  __setupCloud();
} else {
  window.addEventListener('cloudStoreReady', __setupCloud, { once: true });
  // 後門：若 module script 5 秒內沒就緒（網路問題等），先用 localStorage 啟動
  setTimeout(() => { if (!__appBooted) __bootApp(); }, 5000);
}

/* ===================== window 匯流排 ===================== */
Object.assign(window, {
  App, Store,
  hashPassword, seedData, computeScore, getQuarterScore, getUserDepts, getUserDeptLabel,
  canAccessOffice, hasOfficeFeature, trendFromQuarters,
  toDateStr, addDays, eachDay, sumDaily, getRangeDates, migratePlatforms,
  todayStr, genId, escapeHtml, showToast, fmtNTD, marketplaceBadgeHtml,
  getCategoryMeta, getCategoryItems,
  uid, DEPT_COLORS, PLATFORMS, PLATFORMS_WITH_AD_SPEND, PLATFORM_MARKETPLACE,
  MARKETPLACE_BADGE, PLATFORM_GROUPS, OFFICE_CONFIG, OFFICE_FEATURES,
  DAILY_TASK_STATUS, DAILY_TASK_STATUS_LIST, TASK_CATEGORIES, TASK_CATEGORY_NAMES,
  TASK_CATEGORY_ALIASES,
});