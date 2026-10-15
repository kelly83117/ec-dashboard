/**
 * 「蝦皮每日營收」→ 元創儀表板「從試算表同步」唯讀 API
 *
 * ⚠ 這個檔案只是 repo 內的紀錄，不會自動部署。線上版本在 Apps Script 編輯器裡，
 *   改了這裡要手動貼過去；改了那裡也要回寫這裡，兩邊保持一致。
 *
 * 部署資訊：
 *   - 獨立專案（不是綁定在試算表上的），擁有者 keani.kuo@gmail.com。
 *     用 SpreadsheetApp.openById(SHEET_ID) 開「蝦皮每日營收」。
 *   - appsscript.json 的 oauthScopes：["https://www.googleapis.com/auth/spreadsheets"]
 *   - 網頁應用程式：執行身分「我」、具有存取權的使用者「所有人」。
 *   - 改程式後：部署 → 管理部署作業 → 編輯 → 版本選「新版本」→ 部署（網址不變）。
 *     不要按「新增部署作業」，那會產生新網址，前端 js/pages/sheetsync.js 的 SHEET_SYNC_URL 就連不到。
 * 本程式只讀取，不寫入任何儲存格。
 *
 *   ?from=2026-09-22&to=2026-09-28&callback=fn   → 逐日資料（to 必須早於今天）
 *   ?headers=1&month=2026-09                     → 只回該月分頁的表頭與欄位分類（檢查用）
 *   callback 參數（/^[A-Za-z_$][\w$]{0,63}$/）存在時回 JSONP：fn(JSON);
 *   前端一律用 JSONP 讀（fetch 會被 Google 轉址端回 404，實測）。
 */

const SHEET_ID = '1_H4mvwYgUQje1n6576uDCnYwd6trXJ5giKuD09rGz-w';
let CALLBACK_ = '';

const TZ_TODAY = 'Asia/Taipei';            // 判斷「今天」用的時區
const CN_MONTH = ['一','二','三','四','五','六','七','八','九','十','十一','十二'];
const MAX_SPAN_DAYS = 31;
const TOTAL_ROW_LABEL = '總計';
const DATE_HEADER = '日期';

// 14 個資料欄。key（通路|指標）就是回傳 JSON 的欄位名。
const DATA_KEYS = [
  '玩樂盒子|營收', '玩樂盒子|廣告費',
  '生活好麻吉|營收', '生活好麻吉|廣告費',
  '維克生活|營收', '維克生活|廣告費',
  '森之旅|營收', '森之旅|廣告費',
  'MOMO|營收', 'MO+|營收', '酷澎|營收', 'PChome|營收', '博客來|營收', 'Friday|營收',
];
// 有 ROAS 欄的通路（ROAS 欄只略過、不讀）
const AD_CHANNELS = ['玩樂盒子', '生活好麻吉', '維克生活', '森之旅'];
const METRICS = ['營收', '廣告費'];
// 第 2 列直接寫子通路名的情況：子通路 → 第 1 列必須是的群組名
const SUB_CHANNEL_PARENT = { 'MOMO': 'MOMO', 'MO+': 'MOMO' };
// 分隔欄右側的加總欄：表頭 → 回傳名（加底線前綴）
const CHECK_KEYS = {
  '蝦皮總營收': 'shopeeTotal',
  'MOMO': 'momoTotal',
  '酷澎': 'coupangTotal',
  '當日總營收': 'dayTotal',
};

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    CALLBACK_ = /^[A-Za-z_$][\w$]{0,63}$/.test(String(p.callback || '')) ? String(p.callback) : '';
    const ss = SpreadsheetApp.openById(SHEET_ID);
    if (p.headers) return json_(headersOnly_(ss, String(p.month || '')));
    return json_(readRange_(ss, String(p.from || ''), String(p.to || '')));
  } catch (err) {
    return json_(fail_('Apps Script 例外：' + (err && err.message ? err.message : err)));
  }
}

function readRange_(ss, from, to) {
  if (!validDate_(from) || !validDate_(to)) {
    return fail_('from / to 必須是有效日期，格式 YYYY-MM-DD（例 2026-09-22）');
  }
  if (from > to) return fail_('from（' + from + '）晚於 to（' + to + '）');
  const today = Utilities.formatDate(new Date(), TZ_TODAY, 'yyyy-MM-dd');
  if (to >= today) return fail_('只讀到昨天：to（' + to + '）必須早於今天（' + today + '）');
  const span = daysBetween_(from, to) + 1;
  if (span > MAX_SPAN_DAYS) return fail_('範圍 ' + span + ' 天，超過上限 ' + MAX_SPAN_DAYS + ' 天');
  const months = monthsBetween_(from, to);
  if (months.length > 2) return fail_('範圍跨了 ' + months.length + ' 個月，最多 2 個月');

  const out = { ok: true, sheets: [], readAt: new Date().toISOString(), rows: [], totals: {}, layouts: {}, error: null };
  for (const ym of months) {
    const r = readMonth_(ss, ym);
    if (!r.ok) return fail_(r.error, { sheet: r.sheet, header: r.header || null, layout: r.layout || null });
    out.sheets.push(r.sheet);
    out.totals[r.sheet] = r.total;
    out.layouts[r.sheet] = r.layout;
    r.rows.forEach(row => { if (row.date >= from && row.date <= to) out.rows.push(row); });
  }
  return out;
}

function readMonth_(ss, ym) {
  const y = +ym.slice(0, 4), m = +ym.slice(5, 7);
  const name = sheetName_(y, m);
  const sh = ss.getSheetByName(name);
  if (!sh) {
    return { ok: false, sheet: name,
      error: '找不到分頁「' + name + '」。現有分頁：' + ss.getSheets().map(s => s.getName()).join('、') };
  }
  const lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  if (lastRow < 3 || lastCol < 2) return { ok: false, sheet: name, error: '分頁「' + name + '」沒有資料' };

  const values = sh.getRange(1, 1, lastRow, lastCol).getValues();   // 原始值，不是顯示字串
  const a1Year = parseInt(String(values[0][0]).replace(/[^\d]/g, ''), 10);
  if (a1Year !== y) return { ok: false, sheet: name, error: name + ' 的 A1 是「' + values[0][0] + '」，應為年份 ' + y };
  if (norm_(values[1][0]) !== DATE_HEADER) {
    return { ok: false, sheet: name, error: name + ' 的 A2 是「' + values[1][0] + '」，應為「' + DATE_HEADER + '」' };
  }

  const header = readHeader_(sh, values, lastCol);
  const layout = classify_(header.r1, header.r2);
  if (layout.problems.length) {
    return { ok: false, sheet: name, header: headerTable_(header), layout: publicLayout_(layout),
      error: name + ' 表頭檢查失敗：' + layout.problems.join('；') };
  }

  const tz = ss.getSpreadsheetTimeZone();
  const rows = [], seen = {};
  let total = null;
  for (let i = 2; i < values.length; i++) {
    const row = values[i], a = row[0];
    if (norm_(a) === TOTAL_ROW_LABEL) { total = pick_(row, layout); break; }
    if (a === '' || a === null) continue;                     // 空白列跳過
    const date = parseDateCell_(a, y, tz);
    if (!date || date.slice(0, 7) !== ym) {
      return { ok: false, sheet: name, error: name + ' 第 ' + (i + 1) + ' 列 A 欄「' + show_(a, tz) + '」不是本月日期' };
    }
    if (seen[date]) return { ok: false, sheet: name, error: name + ' 日期重複：' + date + '（第 ' + (i + 1) + ' 列）' };
    seen[date] = true;
    rows.push(Object.assign({ date: date }, pick_(row, layout)));
  }
  if (!total) return { ok: false, sheet: name, error: name + ' 找不到 A 欄為「' + TOTAL_ROW_LABEL + '」的列' };
  return { ok: true, sheet: name, rows: rows, total: total, layout: publicLayout_(layout) };
}

// 第 1～2 列表頭。水平合併只有左上角有值 → 在合併範圍內往右補；垂直合併（U1:U2 等）值在第 1 列，第 2 列為空。
function readHeader_(sh, values, lastCol) {
  const r1 = values[0].map(norm_), r2 = values[1].map(norm_);
  sh.getRange(1, 1, 1, lastCol).getMergedRanges().forEach(mr => {
    if (mr.getRow() !== 1) return;
    const c0 = mr.getColumn() - 1, n = mr.getNumColumns();
    for (let c = c0 + 1; c < c0 + n && c < r1.length; c++) r1[c] = r1[c0];
  });
  return { r1: r1, r2: r2 };
}

// 以「第一個第 1、2 列皆空白的欄」為界：左邊只找資料欄，右邊只找加總欄。
function classify_(r1, r2) {
  const res = { cols: {}, checks: {}, data: {}, totalCols: {}, ignored: [], separator: null, problems: [] };
  const P = res.problems;

  let sep = -1;
  for (let c = 1; c < r1.length; c++) { if (!r1[c] && !r2[c]) { sep = c; break; } }
  if (sep < 0) {
    P.push('找不到分隔欄（第 1、2 列都空白的欄），無法區分資料欄與加總欄');
    return res;
  }
  res.separator = colLetter_(sep + 1);

  // 左側：資料欄
  for (let c = 1; c < sep; c++) {
    const a = r1[c], b = r2[c], L = colLetter_(c + 1);
    if (b === 'ROAS') {
      if (AD_CHANNELS.indexOf(a) >= 0) { res.ignored.push(L); continue; }
      P.push(L + ' 欄是 ROAS，但第 1 列「' + a + '」不是蝦皮四家之一');
      continue;
    }
    let key = null;
    if (a && METRICS.indexOf(b) >= 0) key = a + '|' + b;                         // 玩樂盒子+營收、酷澎+營收…
    else if (SUB_CHANNEL_PARENT[b] && a === SUB_CHANNEL_PARENT[b]) key = b + '|營收'; // MOMO+MOMO、MOMO+MO+
    if (!key || DATA_KEYS.indexOf(key) < 0) {
      P.push('無法辨識的資料欄 ' + L + '（第 1 列「' + a + '」／第 2 列「' + b + '」）');
      continue;
    }
    if (key in res.cols) { P.push('資料欄重複：' + label_(key) + '（' + res.data[key] + '、' + L + '）'); continue; }
    res.cols[key] = c;
    res.data[key] = L;
  }
  const missing = DATA_KEYS.filter(k => !(k in res.cols));
  if (missing.length) P.push('缺少 ' + missing.length + ' 個資料欄：' + missing.map(label_).join('、'));

  // 右側：加總欄
  for (let c = sep + 1; c < r1.length; c++) {
    const a = r1[c], b = r2[c], L = colLetter_(c + 1);
    if (!a && !b) continue;
    const t = (a && b && a !== b) ? a + '|' + b : (a || b);
    const name = CHECK_KEYS[t];
    if (!name) { P.push('無法辨識的加總欄 ' + L + '「' + t + '」'); continue; }
    if (name in res.checks) { P.push('加總欄重複：「' + t + '」（' + res.totalCols[t] + '、' + L + '）'); continue; }
    res.checks[name] = c;
    res.totalCols[t] = L;
  }
  Object.keys(CHECK_KEYS).forEach(t => {
    if (!(CHECK_KEYS[t] in res.checks)) P.push('缺少加總欄「' + t + '」');
  });
  return res;
}

function pick_(row, layout) {
  const o = {};
  DATA_KEYS.forEach(k => { o[k] = cell_(row[layout.cols[k]]); });
  Object.keys(layout.checks).forEach(n => { o['_' + n] = cell_(row[layout.checks[n]]); });
  return o;
}

// 數字原樣回傳；空白回 ''；其餘（文字格式的 "1,234"、"#REF!"、日期、勾選框）一律轉字串 → 前端列為「無法讀取」
function cell_(v) {
  if (v === '' || v === null) return '';
  if (typeof v === 'number') return isFinite(v) ? v : String(v);
  if (v instanceof Date) return '日期格式:' + v.toISOString();
  return String(v);
}

// A 欄可能是日期物件，也可能是「9/1」文字；年份一律以 A1 為準。
function parseDateCell_(v, year, tz) {
  const md = (v instanceof Date) ? Utilities.formatDate(v, tz, 'M/d') : String(v).trim();
  const m = md.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const s = year + '-' + pad_(+m[1]) + '-' + pad_(+m[2]);
  return validDate_(s) ? s : null;
}

function headersOnly_(ss, month) {
  if (!/^\d{4}-\d{2}$/.test(month)) return fail_('month 格式必須是 YYYY-MM（例 2026-09）');
  const y = +month.slice(0, 4), m = +month.slice(5, 7);
  if (m < 1 || m > 12) return fail_('月份不正確：' + month);
  const name = sheetName_(y, m);
  const sh = ss.getSheetByName(name);
  if (!sh) return fail_('找不到分頁「' + name + '」', { sheetsFound: ss.getSheets().map(s => s.getName()) });
  const lastCol = sh.getLastColumn();
  const values = sh.getRange(1, 1, 2, lastCol).getValues();
  const header = readHeader_(sh, values, lastCol);
  const layout = classify_(header.r1, header.r2);
  const ok = layout.problems.length === 0;
  return { ok: ok, sheet: name, a1: String(values[0][0]), a2: String(values[1][0]),
    layout: publicLayout_(layout), header: headerTable_(header),
    error: ok ? null : layout.problems.join('；') };
}

function publicLayout_(l) {
  return { separator: l.separator, data: l.data, totals: l.totalCols, ignoredRoas: l.ignored, problems: l.problems };
}
function headerTable_(h) {
  return h.r1.map((v, i) => ({ col: colLetter_(i + 1), r1: v, r2: h.r2[i] }));
}
function sheetName_(y, m) { return y + CN_MONTH[m - 1] + '月'; }   // 例「2026九月」
function validDate_(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
function monthsBetween_(from, to) {
  const out = [];
  let y = +from.slice(0, 4), m = +from.slice(5, 7);
  const ey = +to.slice(0, 4), em = +to.slice(5, 7);
  while (y < ey || (y === ey && m <= em)) {
    out.push(y + '-' + pad_(m));
    if (++m > 12) { m = 1; y++; }
  }
  return out;
}
function daysBetween_(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); }
function norm_(v) { return String(v == null ? '' : v).replace(/\s+/g, '').replace(/＋/g, '+'); }
function show_(v, tz) { return (v instanceof Date) ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : String(v); }
function label_(key) { return key.replace('|', ' '); }
function pad_(n) { return (n < 10 ? '0' : '') + n; }
function colLetter_(n) {
  let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
function fail_(msg, extra) {
  return Object.assign({ ok: false, sheets: [], readAt: new Date().toISOString(), rows: [], totals: {}, error: msg }, extra || {});
}
function json_(o) {
  if (CALLBACK_) {
    return ContentService.createTextOutput(CALLBACK_ + '(' + JSON.stringify(o) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// 在編輯器手動執行：第一次會觸發授權，之後可用來自我檢查（結果在「執行記錄」）
function testSync() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  Logger.log(JSON.stringify(headersOnly_(ss, '2026-09'), null, 1));
  Logger.log(JSON.stringify(headersOnly_(ss, '2026-07')));
  Logger.log(JSON.stringify(readRange_(ss, '2026-09-22', '2026-09-28')).slice(0, 3000));
}
