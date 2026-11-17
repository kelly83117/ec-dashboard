/**
 * 元創數位 AI 戰情室 — 唯讀營收 / 廣告費 API（v2.0）
 *
 * 部署到 Cloudflare Workers，提供兩支端點：
 *   GET /revenue                       （v1，行為不變）
 *     查詢台灣時間「最近一個完整營業日」的 行銷營收 + 廣告費（NT$）。
 *     回傳 { asOf, metrics: { revenue, adSpend } } — 金額為數字、NT$ 元。
 *   GET /revenue/daily?date=YYYY-MM-DD （v2 新增，逐賣場每日營收）
 *     date＝台灣日期。回傳 { date, currency, basis, stores:[…] }，
 *     每個賣場一筆：date / channel / storeCode / storeName / revenue / status / updatedAt。
 *     revenue：新台幣整數、未扣退貨；status：
 *       reported      ＝有填（含實際 0 營收，revenue = 0）
 *       not_reported  ＝這天沒填（revenue = null）
 *       invalid_value ＝有值但不是數字（revenue = null，看板會當 0 加總）
 *     updatedAt：看板「署名」dailyBy[日期].at 轉台灣時間；營收與廣告費共用同一筆，
 *     所以是「這一格（營收或廣告費）最後一次存檔的時間」。舊資料沒有署名 → null。
 *     不輸出填寫人姓名 / 帳號。
 *
 * ---- 驗證 ----
 *   兩種擇一（值相同）：
 *     X-API-Key: <key>
 *     Authorization: Bearer <key>
 *   以固定時間比對，錯誤或沒帶一律 401。
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
 * ---- /revenue/daily 錯誤碼 ----
 *   400 缺 date、格式不是 YYYY-MM-DD、不存在的日期、晚於台灣今天
 *   401 沒帶或錯誤的憑證
 *   500 Worker / Firestore 異常（不回傳內部細節）
 *   沒有資料的日期回 200，每個賣場 status = not_reported。
 *
 * ---- 必要 env / secret ----
 *   WARROOM_API_KEY       Secret：戰情室呼叫時要附 X-API-Key 這個密碼
 *   FIREBASE_PROJECT_ID   Plain：yc-dashboard-9aa6c
 *
 * ---- 可選 env ----
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

// v2 逐賣場：看板 ec.platforms 的 name → 對外代碼。只輸出這張表內的賣場（白名單）；
// 看板新增賣場時要加在這裡，否則 API 不會出現（不會猜代碼）。
// 口徑同 js/app.js PLATFORM_MARKETPLACE。
const STORE_MAP = {
  '生活好麻吉': { channel: 'shopee',  storeCode: 'shopee_haomaji' },
  '玩樂盒子':   { channel: 'shopee',  storeCode: 'shopee_wanle' },
  '森之旅':     { channel: 'shopee',  storeCode: 'shopee_senzhilu' },
  '維克生活':   { channel: 'shopee',  storeCode: 'shopee_weike' },
  'MOMO':       { channel: 'momo',    storeCode: 'momo_main' },
  'MO+':        { channel: 'momo',    storeCode: 'momo_plus' },
  '酷澎':       { channel: 'coupang', storeCode: 'coupang' },
  'PChome':     { channel: 'pchome',  storeCode: 'pchome' },
  '博客來':     { channel: 'books',   storeCode: 'books' },
  'Friday':     { channel: 'friday',  storeCode: 'friday' },
};

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin) });
    }
    if (request.method !== 'GET') {
      return jsonResp({ error: 'Method not allowed' }, 405, allowedOrigin);
    }

    // 驗憑證：X-API-Key 或 Authorization: Bearer（固定時間比對）
    if (!env.WARROOM_API_KEY) {
      return jsonResp({ error: 'Server not configured' }, 500, allowedOrigin);
    }
    if (!timingSafeEqualStr(presentedKey(request), env.WARROOM_API_KEY)) {
      return jsonResp({ error: 'Unauthorized' }, 401, allowedOrigin);
    }
    if (!env.FIREBASE_PROJECT_ID) {
      return jsonResp({ error: 'Server not configured' }, 500, allowedOrigin);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (path === '/revenue/daily') {
      const date = url.searchParams.get('date');
      const bad = validateTwDate(date);
      if (bad) return jsonResp({ error: bad }, 400, allowedOrigin);
      try {
        const result = await getDailyByStore(env, date);
        return jsonResp(result, 200, allowedOrigin);
      } catch (e) {
        console.error('[revenue/daily] failed:', e);
        return jsonResp({ error: 'Internal error' }, 500, allowedOrigin);
      }
    }
    if (path === '/revenue' || path === '/') {
      try {
        const result = await getLatestCompleteRevenue(env);
        if (!result) {
          return jsonResp({ error: 'No revenue data in the past 7 days' }, 404, allowedOrigin);
        }
        return jsonResp(result, 200, allowedOrigin);
      } catch (e) {
        console.error('[revenue] failed:', e);
        return jsonResp({ error: 'Internal error' }, 500, allowedOrigin);
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

// =============== v2：逐賣場每日營收 ================
// 只讀 ec.platforms 裡白名單賣場的 daily[date] 與 dailyBy[date].at；不讀、不回傳其他欄位。
async function getDailyByStore(env, date) {
  const docFields = await firestoreGetFields(FIRESTORE_DOC_PATH, env, ['ec.platforms']);
  const platforms = fromFirestoreValue(docFields['ec.platforms']) || [];
  return buildDailyByStore(Array.isArray(platforms) ? platforms : [], date);
}

function buildDailyByStore(platforms, date) {
  const stores = [];
  const seen = new Set();
  for (const p of platforms) {
    if (!p || typeof p.name !== 'string') continue;
    const meta = STORE_MAP[p.name];
    if (!meta || seen.has(p.name)) continue;
    seen.add(p.name);
    const daily = (p.daily && typeof p.daily === 'object') ? p.daily : {};
    const raw = Object.prototype.hasOwnProperty.call(daily, date) ? daily[date] : undefined;
    let revenue = null;
    let status = 'not_reported';
    if (raw !== undefined && raw !== null && raw !== '') {
      const n = Number(raw);
      if (Number.isFinite(n)) { revenue = Math.round(n); status = 'reported'; }
      else status = 'invalid_value';
    }
    const sig = p.dailyBy && p.dailyBy[date];
    const at = sig && Number(sig.at);
    stores.push({
      date,
      channel: meta.channel,
      storeCode: meta.storeCode,
      storeName: p.name,
      revenue,
      status,
      updatedAt: Number.isFinite(at) && at > 0 ? msToTwIso(at) : null,
    });
  }
  return { date, currency: 'TWD', basis: 'gross_before_returns', stores };
}

function validateTwDate(s) {
  if (!s) return 'Missing date (YYYY-MM-DD, Taiwan date)';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return 'Invalid date format (expected YYYY-MM-DD)';
  if (addDaysStr(s, 0) !== s) return 'Invalid date';
  if (s > twTodayStr()) return 'Date is in the future (Taiwan time)';
  return null;
}

function presentedKey(request) {
  const x = request.headers.get('X-API-Key');
  if (x) return x;
  const auth = request.headers.get('Authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  return m ? m[1].trim() : '';
}

// 固定時間比對（長度不同也跑完整個迴圈）
function timingSafeEqualStr(a, b) {
  const ea = new TextEncoder().encode(String(a || ''));
  const eb = new TextEncoder().encode(String(b || ''));
  const len = Math.max(ea.length, eb.length);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < len; i++) diff |= (ea[i] || 0) ^ (eb[i] || 0);
  return diff === 0 && eb.length > 0;
}

function msToTwIso(ms) {
  const d = new Date(ms + TW_TZ_OFFSET_MIN * 60 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}+08:00`;
}

// =============== Firestore REST helpers（匿名讀） ================
// fields：只取這些欄位（Firestore mask；含點的字面 key 要用反引號包起來）。不給＝整份。
async function firestoreGetFields(docPath, env, fields) {
  let url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${docPath}`;
  if (Array.isArray(fields) && fields.length) {
    url += '?' + fields.map(f => 'mask.fieldPaths=' + encodeURIComponent('`' + f + '`')).join('&');
  }
  const resp = await fetch(url);
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Firestore GET ${docPath}: ${resp.status} ${txt.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data.fields || {};
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

// node 測試用（Cloudflare 只看 default export）
export const __test = { buildDailyByStore, validateTwDate, timingSafeEqualStr, msToTwIso, STORE_MAP };
