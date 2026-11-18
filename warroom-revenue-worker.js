/**
 * 元創數位 AI 戰情室 — 唯讀營收 / 廣告費 API（v2 候選）
 *
 * 部署到 Cloudflare Workers，提供戰情室兩支端點：
 *
 *   GET /revenue
 *     查詢台灣時間「最近一個完整營業日」的 全通路總營收 + 蝦皮廣告費（NT$）。
 *     回傳 { asOf, metrics: { revenue, adSpend } }。
 *     （v1.1 行為，保留給高階儀表卡片使用；戰情室可用來做首頁總覽。）
 *
 *   GET /daily?date=YYYY-MM-DD
 *     （v2 新增）查詢指定台灣日期的「每個賣場」營收明細。
 *     回傳 { date, docUpdatedAt, shops:[…], coverage:{…} }。
 *     每筆 shop：{ channel, channelName, shop, shopName, revenue, filled, filledBy }。
 *     filled=false 代表該賣場該日「未填報」；filled=true + revenue=0 代表「填 0」。
 *
 * ---- 資料範圍（有意的收窄） ----
 *   此 API 只回傳「行銷類」指標：
 *     revenue  = 每日各賣場營收（毛額）
 *     adSpend  = 每日蝦皮 4 賣場廣告費總和（/revenue 端點匯總）
 *   ⚠ 不包含 淨利 / 成本 / 退貨淨額 / 帳號密碼 / 員工資料 / 薪資 / 內部備註。
 *   Worker 只讀 app/main 的 ec.platforms 欄位；完全不碰 app/profit、
 *   ec.users、ec.employees、ec.lineConfig、ec.bossTasks 等任何敏感 key。
 *
 * ---- 資料來源與算法 ----
 *   Firestore 專案 yc-dashboard-9aa6c、文件 app/main、欄位 ec.platforms
 *   （與辦公室儀表板同一份、同一條讀取路徑）。
 *
 *   /revenue 的 revenue：7 個賣場 daily[YYYY-MM-DD] 加總。
 *   /revenue 的 adSpend：4 個蝦皮賣場 dailyAdSpend[YYYY-MM-DD] 加總。
 *   /daily  的 shops[]：7 個賣場各自的 daily[YYYY-MM-DD]，區分「未填」與「填 0」。
 *
 * ---- 涵蓋的賣場清單（PChome / 博客來 / FriDay 尚未涵蓋） ----
 *   這 7 家由行銷團隊每日手動輸入毛額，是現階段的唯一日級資料源：
 *     蝦皮通路：生活好麻吉 / 玩樂盒子 / 森之旅 / 維克生活
 *     MOMO 通路：MOMO / MO+
 *     酷澎通路：酷澎
 *
 *   PChome / 博客來 / FriDay 採**月對帳**機制，日級營收**不在 Firestore**：
 *     - app/pchome_orders：PChome 訂單原始資料（按月儲存，非日級彙總）
 *     - app/books_recon：博客來 months.{帳月}.sales / fee / orders（月級）
 *     - app/friday_recon：FriDay months.{YYYY-MM}.{站別}.orders / promo（月級）
 *   若戰情室需要這 3 家的日級營收，需另外做 v3：拆月檔 → 逐筆攤到日 → 加總。
 *   在此之前，/daily 僅回 7 家。
 *
 * ---- 退貨處理 ----
 *   ⚠ 不扣退貨。ec.platforms.daily 由行銷團隊每日手動輸入當日毛額，
 *   系統沒有退貨回寫；退貨歸入月對帳與淨利表，不影響此欄位。
 *
 * ---- 「完整營業日」怎麼定義（/revenue 端點） ----
 *   行銷團隊在次日早上回填前一日營收 → 以「昨日 (TW)」為最近完整營業日。
 *   若呼叫時昨日尚未回填（任何一個賣場皆為 0）→ 往回掃最多 7 天，
 *   取第一個有任何賣場非 0 的日期。全空 → 回 404。
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
 *   讀取能通是因為 app/main 目前以 public read 規則對外開放。
 *   ⚠ 這同時代表：任何人直接打 Firestore REST（不經本 Worker）也能讀到
 *   app/main 全部欄位（包含 ec.users 的密碼 hash、ec.lineConfig 的 token 等）。
 *   本 API 沒有再擴大這個風險，但若要徹底封起來，需另案改 Firestore
 *   Security Rules（並改本 Worker 以服務帳號或 ID Token 存取）。
 *   這點已在 WARROOM_API_SETUP.md 的「安全性注意」章節寫明。
 */

const FIRESTORE_DOC_PATH = 'app/main';

// 賣場清單（含穩定英文代碼）— /daily 端點回的 shop / channel 欄位就用這個對照
// 新增蝦皮賣場要同時加這裡 + Firestore ec.platforms；移除同理
const SHOP_ROSTER = [
  { shop: 'shopee-ohmg',   shopName: '生活好麻吉', channel: 'shopee',  channelName: '蝦皮',  hasAdSpend: true  },
  { shop: 'shopee-wanle',  shopName: '玩樂盒子',   channel: 'shopee',  channelName: '蝦皮',  hasAdSpend: true  },
  { shop: 'shopee-senzhi', shopName: '森之旅',     channel: 'shopee',  channelName: '蝦皮',  hasAdSpend: true  },
  { shop: 'shopee-vic',    shopName: '維克生活',   channel: 'shopee',  channelName: '蝦皮',  hasAdSpend: true  },
  { shop: 'momo-main',     shopName: 'MOMO',       channel: 'momo',    channelName: 'MOMO',  hasAdSpend: false },
  { shop: 'momo-plus',     shopName: 'MO+',        channel: 'momo',    channelName: 'MOMO',  hasAdSpend: false },
  { shop: 'coupang-main',  shopName: '酷澎',       channel: 'coupang', channelName: '酷澎',  hasAdSpend: false },
];

const SHOP_NAMES_FOR_REVENUE = SHOP_ROSTER.map(s => s.shopName);
const SHOP_NAMES_WITH_AD_SPEND = SHOP_ROSTER.filter(s => s.hasAdSpend).map(s => s.shopName);

const TW_TZ_OFFSET_MIN = 8 * 60; // Asia/Taipei 恆定 +08:00（台灣無日光節約）
const MAX_LOOKBACK_DAYS = 7;

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin) });
    }
    if (request.method !== 'GET') {
      return jsonResp({ error: 'Method not allowed' }, 405, allowedOrigin);
    }

    // 驗 X-API-Key
    const apiKey = request.headers.get('X-API-Key') || '';
    if (!env.WARROOM_API_KEY) {
      return jsonResp({ error: 'Server not configured (WARROOM_API_KEY missing)' }, 500, allowedOrigin);
    }
    if (apiKey !== env.WARROOM_API_KEY) {
      return jsonResp({ error: 'Unauthorized' }, 401, allowedOrigin);
    }
    if (!env.FIREBASE_PROJECT_ID) {
      return jsonResp({ error: 'Server not configured (FIREBASE_PROJECT_ID missing)' }, 500, allowedOrigin);
    }

    const url = new URL(request.url);

    // ------- /revenue：最近完整營業日的 summary（v1.1 保留） -------
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

    // ------- /daily?date=YYYY-MM-DD：指定日期的逐賣場明細（v2 新增） -------
    if (url.pathname === '/daily') {
      const dateStr = url.searchParams.get('date') || '';
      const dateErr = validateDailyDate(dateStr);
      if (dateErr) return jsonResp({ error: dateErr }, 400, allowedOrigin);
      try {
        const result = await getDailyByShop(env, dateStr);
        return jsonResp(result, 200, allowedOrigin);
      } catch (e) {
        console.error('[daily] failed:', e);
        return jsonResp({ error: 'Internal error', detail: String((e && e.message) || e) }, 500, allowedOrigin);
      }
    }

    return jsonResp({ error: 'Not found' }, 404, allowedOrigin);
  },
};

// ======================================================================
// /revenue：最近完整營業日的 summary
// ======================================================================
async function getLatestCompleteRevenue(env) {
  const doc = await firestoreGetDoc(FIRESTORE_DOC_PATH, env);
  const platforms = fromFirestoreValue(doc.fields && doc.fields['ec.platforms']) || [];
  if (!Array.isArray(platforms) || platforms.length === 0) return null;

  const todayTw = twTodayStr();

  for (let i = 1; i <= MAX_LOOKBACK_DAYS; i++) {
    const dateStr = addDaysStr(todayTw, -i);
    let revenueTotal = 0;
    let adSpendTotal = 0;
    let hasRevenue = false;
    for (const p of platforms) {
      if (!p) continue;
      if (SHOP_NAMES_FOR_REVENUE.includes(p.name)) {
        const v = +((p.daily || {})[dateStr]);
        if (Number.isFinite(v) && v > 0) {
          hasRevenue = true;
          revenueTotal += v;
        }
      }
      if (SHOP_NAMES_WITH_AD_SPEND.includes(p.name)) {
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

// ======================================================================
// /daily?date=YYYY-MM-DD：指定日期的逐賣場明細
// ======================================================================
async function getDailyByShop(env, dateStr) {
  const doc = await firestoreGetDoc(FIRESTORE_DOC_PATH, env);
  const platforms = fromFirestoreValue(doc.fields && doc.fields['ec.platforms']) || [];
  const byName = {};
  if (Array.isArray(platforms)) {
    for (const p of platforms) {
      if (p && typeof p.name === 'string') byName[p.name] = p;
    }
  }

  const shops = SHOP_ROSTER.map(meta => {
    const p = byName[meta.shopName] || {};
    const daily = p.daily || {};
    const dailyBy = p.dailyBy || {};
    const has = Object.prototype.hasOwnProperty.call(daily, dateStr);
    const raw = has ? daily[dateStr] : undefined;
    // 區分「未填」（key 不存在、null、undefined）與「填 0」（key 存在且是數字 0）
    let filled = false;
    let revenue = 0;
    if (has && raw !== null && raw !== undefined) {
      const n = +raw;
      if (Number.isFinite(n)) { filled = true; revenue = Math.round(n); }
    }
    const filledBy = has && typeof dailyBy[dateStr] === 'string' && dailyBy[dateStr] ? dailyBy[dateStr] : null;
    return {
      channel: meta.channel,
      channelName: meta.channelName,
      shop: meta.shop,
      shopName: meta.shopName,
      revenue,
      filled,
      filledBy,
    };
  });

  return {
    date: dateStr,
    // Firestore document 的最後修改時間（整份 app/main，不是這格；當作參考）
    docUpdatedAt: doc.updateTime || null,
    shops,
    coverage: {
      included: [
        { channel: 'shopee',  channelName: '蝦皮',  shops: ['生活好麻吉', '玩樂盒子', '森之旅', '維克生活'] },
        { channel: 'momo',    channelName: 'MOMO',  shops: ['MOMO', 'MO+'] },
        { channel: 'coupang', channelName: '酷澎',  shops: ['酷澎'] },
      ],
      notIncluded: {
        pchome: '目前無日級營收欄位；資料採月對帳機制儲存於 app/pchome_orders，需另案 v3 拆解',
        books:  '目前無日級營收欄位；資料採月對帳儲存於 app/books_recon',
        friday: '目前無日級營收欄位；資料採月對帳儲存於 app/friday_recon',
      },
    },
    note: '欄位說明：revenue 為新台幣整數、毛額、未扣退貨；filled=false 代表該賣場該日未由行銷回填（視為未填報，非 0 營收）',
  };
}

// 驗證 date 參數格式；錯誤回傳錯誤訊息字串，正確回 null
function validateDailyDate(dateStr) {
  if (!dateStr) return 'Missing required query param: date (format: YYYY-MM-DD)';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return `Invalid date format "${dateStr}"; expected YYYY-MM-DD`;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (m < 1 || m > 12) return `Invalid month in date "${dateStr}"`;
  if (d < 1 || d > 31) return `Invalid day in date "${dateStr}"`;
  // 防呆：Date 建構若還原不回原字串，代表非真實日期（例如 2026-02-30）
  const roundtrip = new Date(Date.UTC(y, m - 1, d));
  const back = `${roundtrip.getUTCFullYear()}-${String(roundtrip.getUTCMonth() + 1).padStart(2, '0')}-${String(roundtrip.getUTCDate()).padStart(2, '0')}`;
  if (back !== dateStr) return `Invalid calendar date "${dateStr}"`;
  // 不接受未來日期（以 TW 當日為界）
  const todayTw = twTodayStr();
  if (dateStr > todayTw) return `date "${dateStr}" is in the future (today in TW is ${todayTw})`;
  return null;
}

// ======================================================================
// Firestore REST helpers（匿名讀）
// ======================================================================
async function firestoreGetDoc(docPath, env) {
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${docPath}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Firestore GET ${docPath}: ${resp.status} ${txt}`);
  }
  // 整份 doc 回傳；裡面有 fields（欄位）與 updateTime（最後修改時間）
  return await resp.json();
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

// ======================================================================
// 台灣時間 helpers（Asia/Taipei 恆定 UTC+8，無日光節約）
// ======================================================================
function twTodayStr() {
  const now = new Date();
  const twMs = now.getTime() + TW_TZ_OFFSET_MIN * 60 * 1000;
  const d = new Date(twMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function addDaysStr(ymd, delta) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

// ======================================================================
// HTTP helpers
// ======================================================================
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
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
