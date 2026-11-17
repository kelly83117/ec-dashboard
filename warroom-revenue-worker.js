/**
 * 元創數位 AI 戰情室 — 唯讀營收 / 廣告費 API（v1.1）
 *
 * 部署到 Cloudflare Workers，提供戰情室一支端點：
 *   GET /revenue
 *     查詢台灣時間「最近一個完整營業日」的 行銷營收 + 廣告費（NT$）。
 *     回傳 { asOf, metrics: { revenue, adSpend } } — 金額為數字、NT$ 元。
 *
 * ---- 資料範圍（有意的收窄） ----
 *   此 API 只回傳「行銷類」指標：
 *     metrics.revenue  = 每日全通路營收（毛額）
 *     metrics.adSpend  = 每日蝦皮 4 賣場廣告費總和
 *   ⚠ 不包含 淨利 / 成本 / 退貨淨額 / 帳號密碼 / 員工資料 / 薪資 / 內部備註。
 *   Worker 只讀 app/main 的 ec.platforms 欄位；完全不碰 app/profit、
 *   ec.users、ec.employees 等財務或員工相關 key。
 *
 * ---- 資料來源與算法 ----
 *   Firestore 專案 yc-dashboard-9aa6c、文件 app/main、欄位 ec.platforms
 *   （與辦公室儀表板同一份、同一條讀取路徑）。
 *
 *   revenue：7 個通路 daily[YYYY-MM-DD] 直接加總：
 *     生活好麻吉 / 玩樂盒子 / 森之旅 / 維克生活 / MOMO / MO+ / 酷澎
 *     口徑同 js/pages/dashboard.js 的「全通路總營收」卡片。
 *
 *   adSpend：只含 4 個蝦皮賣場 dailyAdSpend[YYYY-MM-DD] 加總：
 *     生活好麻吉 / 玩樂盒子 / 森之旅 / 維克生活
 *     MOMO / MO+ / 酷澎 本系統未追蹤廣告費，不計入。
 *
 * ---- 退貨處理 ----
 *   ⚠ 不扣退貨。ec.platforms.daily 由行銷團隊每日手動輸入當日毛額，
 *   系統沒有退貨回寫；退貨歸入月對帳與淨利表，不影響此欄位。
 *   「金額一致」驗收請與辦公室儀表板「昨日全通路總營收」比對（相同口徑）。
 *
 * ---- 「完整營業日」怎麼定義 ----
 *   行銷團隊在次日早上回填前一日營收 → 以「昨日 (TW)」為最近完整營業日。
 *   若呼叫時昨日尚未回填（任何一個通路皆為 0）→ 往回掃最多 7 天，
 *   取第一個有任何通路非 0 的日期。全空 → 回 404。
 *   adSpend 以同一個日期回傳；若該日尚未填廣告費 → adSpend = 0。
 *
 * ---- v2：逐賣場每日營收（2026-11-17 候選版） ----
 *   GET /revenue/daily?date=YYYY-MM-DD   （台灣日期，必填）
 *     回指定日期「每個賣場一筆」：日期、通路代碼、賣場代碼、賣場名稱、
 *     營收（NT$ 整數、未扣退貨）、狀態、資料更新時間。
 *     - 有填（含填 0）→ status:"reported"、revenue:數字（實際零營收就是 0）
 *     - 沒填           → status:"not_reported"、revenue:null
 *     - updatedAt＝看板首頁 dailyBy[日期].at（營收與廣告費共用的署名時間，
 *       台灣時間 ISO）；舊資料沒有署名時為 null。不輸出署名的人名 / 帳號。
 *     涵蓋賣場＝STORE_CATALOG（10 家，含 PChome / 博客來 / Friday）；資料裡
 *     出現不在清單的平台名稱時也照列（channelCode/storeCode 為 "unknown"），
 *     確保逐筆對帳不漏。
 *     口徑＝辦公室看板首頁「每日營收」各平台卡片的數字（ec.platforms[].daily）。
 *   驗證：X-API-Key: <key> 或 Authorization: Bearer <key>，
 *     key 可為 WARROOM_API_KEY 或（選填）REVENUE_API_KEY。
 *   v1 的 GET /revenue 回傳完全不變。
 *
 * ---- 必要 env / secret ----
 *   WARROOM_API_KEY       Secret：戰情室呼叫時要附 X-API-Key 這個密碼
 *   FIREBASE_PROJECT_ID   Plain：yc-dashboard-9aa6c
 *
 * ---- 可選 env ----
 *   REVENUE_API_KEY       Secret：給外部接收端（例如 ChatGPT）的另一把 key，
 *                         可單獨更換 / 撤銷，不影響戰情室的 WARROOM_API_KEY
 *   ALLOWED_ORIGIN        Plain：CORS 允許的來源（預設 *）；戰情室的網域
 *                         上線後可改成該網域收窄
 *
 * ---- Firestore 權限說明 ----
 *   此 Worker 以匿名身份讀 Firestore（跟 line-notify-worker 相同 pattern）。
 *   Firebase 服務帳號 JSON 不放這裡、也不需要。
 *   資料讀取受 Firestore Security Rules 約束；若日後把 rules 收緊到需要
 *   驗證，再改成帶服務帳號。
 */

const FIRESTORE_DOC_PATH = 'app/main';
const PLATFORMS_FOR_REVENUE = ['生活好麻吉', '玩樂盒子', '森之旅', '維克生活', 'MOMO', 'MO+', '酷澎'];
// 只有蝦皮 4 個賣場追蹤廣告費（MOMO/酷澎 不在本系統追蹤）
const PLATFORMS_WITH_AD_SPEND = ['生活好麻吉', '玩樂盒子', '森之旅', '維克生活'];
const TW_TZ_OFFSET_MIN = 8 * 60; // Asia/Taipei 恆定 +08:00（台灣無日光節約）
const MAX_LOOKBACK_DAYS = 7;

// v2 逐賣場：看板 ec.platforms[].name → 對外代碼（順序＝看板首頁順序）
//   通路代碼對齊 js/app.js PLATFORM_MARKETPLACE；新增賣場要加在這裡。
const STORE_CATALOG = [
  { name: '生活好麻吉', channelCode: 'shopee',  storeCode: 'shopee_haomaji' },
  { name: '玩樂盒子',   channelCode: 'shopee',  storeCode: 'shopee_wanle' },
  { name: '森之旅',     channelCode: 'shopee',  storeCode: 'shopee_senzhilu' },
  { name: '維克生活',   channelCode: 'shopee',  storeCode: 'shopee_weike' },
  { name: 'MOMO',       channelCode: 'momo',    storeCode: 'momo' },
  { name: 'MO+',        channelCode: 'momo',    storeCode: 'momo_plus' },
  { name: '酷澎',       channelCode: 'coupang', storeCode: 'coupang' },
  { name: 'PChome',     channelCode: 'pchome',  storeCode: 'pchome' },
  { name: '博客來',     channelCode: 'books',   storeCode: 'books' },
  { name: 'Friday',     channelCode: 'friday',  storeCode: 'friday' },
];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin) });
    }
    if (request.method !== 'GET') {
      return jsonResp({ error: 'Method not allowed' }, 405, allowedOrigin);
    }

    // 驗 X-API-Key（或 Authorization: Bearer）
    if (!env.WARROOM_API_KEY) {
      return jsonResp({ error: 'Server not configured (WARROOM_API_KEY missing)' }, 500, allowedOrigin);
    }
    if (!isAuthorized(request, env)) {
      return jsonResp({ error: 'Unauthorized' }, 401, allowedOrigin);
    }
    if (!env.FIREBASE_PROJECT_ID) {
      return jsonResp({ error: 'Server not configured (FIREBASE_PROJECT_ID missing)' }, 500, allowedOrigin);
    }

    const url = new URL(request.url);
    if (url.pathname === '/revenue/daily') {
      const date = url.searchParams.get('date') || '';
      if (!isValidYmd(date)) {
        return jsonResp({ error: 'Invalid date: use Taiwan date YYYY-MM-DD, e.g. ?date=2026-11-16' }, 400, allowedOrigin);
      }
      try {
        return jsonResp(await getDailyRevenueByStore(env, date), 200, allowedOrigin);
      } catch (e) {
        console.error('[revenue/daily] failed:', e);
        return jsonResp({ error: 'Internal error' }, 500, allowedOrigin);
      }
    }
    if (url.pathname === '/revenue' || url.pathname === '/') {
      try {
        const result = await getLatestCompleteRevenue(env);
        if (!result) {
          return jsonResp({ error: 'No revenue data in the past 7 days' }, 404, allowedOrigin);
        }
        return jsonResp(result, 200, allowedOrigin);
      } catch (e) {
        console.error('[revenue] failed:', e);
        return jsonResp({ error: 'Internal error', detail: String((e && e.message) || e) }, 500, allowedOrigin);
      }
    }

    return jsonResp({ error: 'Not found' }, 404, allowedOrigin);
  },
};

// 回傳 { asOf, metrics: { revenue, adSpend } } 或 null（過去 7 天都沒營收資料）
async function getLatestCompleteRevenue(env) {
  const docFields = await firestoreGetFields(FIRESTORE_DOC_PATH, env);
  const platforms = fromFirestoreValue(docFields['ec.platforms']) || [];
  if (!Array.isArray(platforms) || platforms.length === 0) return null;

  const todayTw = twTodayStr();

  // 從「昨日 (TW)」往回掃最多 7 天，第一個有「營收」資料的日期就回傳
  // 判「完整營業日」的依據是 revenue（主要指標）；adSpend 同日期取、若當日未填 = 0
  for (let i = 1; i <= MAX_LOOKBACK_DAYS; i++) {
    const dateStr = addDaysStr(todayTw, -i);
    let revenueTotal = 0;
    let adSpendTotal = 0;
    let hasRevenue = false;
    for (const p of platforms) {
      if (!p) continue;
      if (PLATFORMS_FOR_REVENUE.includes(p.name)) {
        const v = +((p.daily || {})[dateStr]);
        if (Number.isFinite(v) && v > 0) {
          hasRevenue = true;
          revenueTotal += v;
        }
      }
      if (PLATFORMS_WITH_AD_SPEND.includes(p.name)) {
        const a = +((p.dailyAdSpend || {})[dateStr]);
        if (Number.isFinite(a) && a > 0) adSpendTotal += a;
      }
    }
    if (hasRevenue) {
      return {
        asOf: `${dateStr}T23:59:59+08:00`,
        metrics: {
          revenue: Math.round(revenueTotal),
          adSpend: Math.round(adSpendTotal),
        },
      };
    }
  }
  return null;
}

// =============== v2：指定台灣日期、逐賣場 ================
async function getDailyRevenueByStore(env, date) {
  const { fields, updateTime } = await firestoreGetDoc(FIRESTORE_DOC_PATH, env, ['ec.platforms']);
  const raw = fromFirestoreValue(fields['ec.platforms']);
  const platforms = Array.isArray(raw) ? raw.filter(p => p && typeof p.name === 'string') : [];
  const byName = new Map(platforms.map(p => [p.name, p]));

  const rows = [];
  const pushRow = (name, channelCode, storeCode) => {
    const p = byName.get(name);
    const v = p && p.daily ? p.daily[date] : undefined;
    const num = (v === null || v === undefined || v === '') ? NaN : Number(v);
    const reported = Number.isFinite(num);
    const sig = p && p.dailyBy ? p.dailyBy[date] : null;
    const at = sig && Number.isFinite(Number(sig.at)) ? Number(sig.at) : null;
    rows.push({
      date,
      channelCode,
      storeCode,
      storeName: name,
      revenue: reported ? Math.round(num) : null,
      status: reported ? 'reported' : 'not_reported',
      updatedAt: (reported && at) ? twIso(at) : null,
    });
  };
  STORE_CATALOG.forEach(s => pushRow(s.name, s.channelCode, s.storeCode));
  // 資料裡有、清單沒有的平台照列，避免對帳漏掉
  platforms.forEach(p => {
    if (!STORE_CATALOG.some(s => s.name === p.name)) pushRow(p.name, 'unknown', 'unknown');
  });

  const reportedRows = rows.filter(r => r.status === 'reported');
  return {
    date,
    timezone: 'Asia/Taipei',
    currency: 'TWD',
    basis: 'gross_before_returns',
    sourceUpdatedAt: updateTime ? twIso(Date.parse(updateTime)) : null,
    stores: rows,
    summary: {
      stores: rows.length,
      reported: reportedRows.length,
      notReported: rows.length - reportedRows.length,
      revenueReportedTotal: reportedRows.reduce((s, r) => s + r.revenue, 0),
    },
  };
}

function isValidYmd(s) {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// epoch ms → 台灣時間 ISO（+08:00）
function twIso(ms) {
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms + TW_TZ_OFFSET_MIN * 60 * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}+08:00`;
}

// =============== 驗證 ================
function isAuthorized(request, env) {
  let key = request.headers.get('X-API-Key') || '';
  if (!key) {
    const m = /^Bearer\s+(.+)$/i.exec(request.headers.get('Authorization') || '');
    if (m) key = m[1].trim();
  }
  if (!key) return false;
  const valid = [env.WARROOM_API_KEY, env.REVENUE_API_KEY].filter(k => typeof k === 'string' && k.length > 0);
  let ok = false;
  for (const k of valid) ok = timingSafeEqualStr(key, k) || ok;
  return ok;
}

function timingSafeEqualStr(a, b) {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < eb.length; i++) diff |= (ea[i] || 0) ^ eb[i];
  return diff === 0;
}

// =============== Firestore REST helpers（匿名讀） ================
// fieldPaths：只取這幾個欄位（Firestore mask；含點的字面 key 要用反引號包）
//   → 不把 ec.users 等其他欄位下載進 Worker。
async function firestoreGetDoc(docPath, env, fieldPaths) {
  let url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${docPath}`;
  if (fieldPaths && fieldPaths.length) {
    url += '?' + fieldPaths.map(f => 'mask.fieldPaths=' + encodeURIComponent('`' + f + '`')).join('&');
  }
  const resp = await fetch(url);
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Firestore GET ${docPath}: ${resp.status} ${txt}`);
  }
  const data = await resp.json();
  return { fields: data.fields || {}, updateTime: data.updateTime || null };
}

async function firestoreGetFields(docPath, env) {
  return (await firestoreGetDoc(docPath, env, ['ec.platforms'])).fields;
}

function fromFirestoreValue(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('doubleValue' in v) return v.doubleValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in v) {
    const result = {};
    Object.entries(v.mapValue.fields || {}).forEach(([k, val]) => {
      result[k] = fromFirestoreValue(val);
    });
    return result;
  }
  return null;
}

// =============== 台灣時間 helpers ================
// Taipei 恆定 UTC+8（無日光節約），用 offset 直接偏移比 Intl 快又穩
function twTodayStr() {
  const now = new Date();
  const twMs = now.getTime() + TW_TZ_OFFSET_MIN * 60 * 1000;
  const d = new Date(twMs);
  // 此時 d 的 UTC 欄位 = 台灣本地日期；用 getUTCxxx 讀取
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function addDaysStr(ymd, delta) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

// =============== HTTP helpers ================
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
  };
}

function jsonResp(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin) },
  });
}
