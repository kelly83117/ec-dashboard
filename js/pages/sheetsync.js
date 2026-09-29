/* js/pages/sheetsync.js -- 儀表板首頁「⇩ 從試算表同步」（過渡期工具）
 *
 * 同事在 Google 試算表「蝦皮每日營收」填各通路營收 / 廣告費；Kelly 每天按一次，
 * 把試算表的數字寫進 app/main 的 ec.platforms（daily / dailyAdSpend / dailyBy）。
 *
 *   讀取：Apps Script 網頁應用程式（原始碼紀錄在 repo 根目錄 sheet-sync.gs），
 *         🔴 只能用 JSONP（<script> + callback）。fetch 讀會被 Google 轉址端回 404（實測）。
 *   比對：一律跟 __cloudStore.getDoc('server') 的伺服器現值比，不用 Store._mem。
 *   寫入：全檔唯一一處雲端寫入在 confirmSheetSync 的步驟 (6)，寫前 findStale + precheck，
 *         寫後再讀一次 verify。window.__sheetSyncDryRun = true 時只跑到 precheck、不寫。
 *
 * 純函式掛在 window.SheetSync（方便 node:vm 測試）；App 方法只有下面四支。
 */
const App = window.App;
const { Store, escapeHtml, showToast, PLATFORMS_WITH_AD_SPEND } = window;

const SHEET_SYNC_URL = 'https://script.google.com/macros/s/AKfycbz6IpYlNDuk9frEwZIW1kZqrH2s8SpYhgg5AiXwwmyTX4HJ7cITfhuInmaiXNluNZmA3w/exec';
// 可以按這顆鈕的帳號（username 轉小寫比對，不看角色）
const SHEET_SYNC_USERS = ['kelly', 'keani'];   // ⚠ 'keani' 只供分支驗收，merge 前要 revert

const SS_DATA_KEYS = [
  '玩樂盒子|營收', '玩樂盒子|廣告費',
  '生活好麻吉|營收', '生活好麻吉|廣告費',
  '維克生活|營收', '維克生活|廣告費',
  '森之旅|營收', '森之旅|廣告費',
  'MOMO|營收', 'MO+|營收', '酷澎|營收', 'PChome|營收', '博客來|營收', 'Friday|營收',
];
const SS_CHECK_KEYS = ['_shopeeTotal', '_momoTotal', '_coupangTotal', '_dayTotal'];
const SS_ROW_KEYS = ['date'].concat(SS_DATA_KEYS, SS_CHECK_KEYS);
const SS_REV_CHANNELS = SS_DATA_KEYS.filter(k => k.endsWith('|營收')).map(k => k.split('|')[0]);
// 逐日驗算 4 項：[名稱, 相加的通路, 試算表加總欄]
const SS_DAY_CHECKS = [
  ['蝦皮四家', ['玩樂盒子', '生活好麻吉', '維克生活', '森之旅'], '_shopeeTotal'],
  ['MOMO + MO+', ['MOMO', 'MO+'], '_momoTotal'],
  ['酷澎', ['酷澎'], '_coupangTotal'],
  ['10 家合計', SS_REV_CHANNELS, '_dayTotal'],
];
const SS_FIELD = { '營收': 'daily', '廣告費': 'dailyAdSpend' };
const SS_CELL_FIELDS = ['daily', 'dailyAdSpend'];
const SS_MAX_DOC_BYTES = 950000;
const SS_TIMEOUT_MS = 60000;

/* ═══════════ 純函式（不碰 DOM / 雲端）═══════════ */

function addDaysStr(s, n) {
  const d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10) + n));
  return d.toISOString().slice(0, 10);
}
function validDateStr(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
// 台北時區的「今天」（試算表端也用 Asia/Taipei 判斷 to 必須早於今天）
function taipeiToday(now) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(now || new Date());
  const g = t => (p.find(x => x.type === t) || {}).value;
  return g('year') + '-' + g('month') + '-' + g('day');
}

// mode 'week'：昨天往前 7 天；mode 'month'：month（YYYY-MM）整月，最多到昨天
function range(mode, today, month) {
  if (!validDateStr(today)) return { error: '今天日期不正確：' + today };
  const yesterday = addDaysStr(today, -1);
  if (mode === 'week') return { from: addDaysStr(yesterday, -6), to: yesterday, yesterday };
  if (mode === 'month') {
    const ym = String(month || '');
    if (!/^\d{4}-\d{2}$/.test(ym) || !validDateStr(ym + '-01')) return { error: '月份格式需為 YYYY-MM：' + ym };
    const from = ym + '-01';
    if (from > yesterday) return { error: ym + ' 還沒有過完的日子（只能讀到昨天 ' + yesterday + '）' };
    const y = +ym.slice(0, 4), m = +ym.slice(5, 7);
    const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    return { from, to: last < yesterday ? last : yesterday, yesterday };
  }
  return { error: '不明的範圍模式：' + mode };
}

// 儲存格值 → blank / num / bad。數字先 Math.round；負數、字串（含「日期格式:…」）一律 bad
function classifyCell(v) {
  if (v === '') return { kind: 'blank' };
  if (typeof v === 'number') {
    if (!isFinite(v)) return { kind: 'bad', raw: v, reason: '不是有限數字' };
    if (v < 0) return { kind: 'bad', raw: v, reason: '負數' };
    const r = Math.round(v) + 0;   // +0：把 -0 正規化成 0
    return { kind: 'num', raw: v, value: r, rounded: r !== v };
  }
  if (typeof v === 'string') {
    return { kind: 'bad', raw: v, reason: v.startsWith('日期格式:') ? '日期格式（不是數字）' : '文字（不是數字）' };
  }
  return { kind: 'bad', raw: v, reason: '不明型別 ' + (v === null ? 'null' : typeof v) };
}

// 回應整包驗證：ok、rows 陣列、每列 key 集合剛好等於 date + 14 資料欄 + 4 底線欄、日期在範圍內且不重複
function validateResponse(resp, rng) {
  if (!resp || typeof resp !== 'object') return { ok: false, error: '回應不是物件' };
  if (resp.ok !== true) return { ok: false, error: '試算表回報錯誤：' + (resp.error || '（無訊息）') };
  if (!Array.isArray(resp.rows)) return { ok: false, error: '回應缺少 rows 陣列' };
  const want = SS_ROW_KEYS.slice().sort().join('\n');
  const seen = {};
  for (let i = 0; i < resp.rows.length; i++) {
    const row = resp.rows[i];
    if (!row || typeof row !== 'object' || Array.isArray(row)) return { ok: false, error: '第 ' + (i + 1) + ' 列不是物件' };
    const keys = Object.keys(row);
    if (keys.slice().sort().join('\n') !== want) {
      const extra = keys.filter(k => SS_ROW_KEYS.indexOf(k) < 0);
      const missing = SS_ROW_KEYS.filter(k => keys.indexOf(k) < 0);
      return { ok: false, error: '第 ' + (i + 1) + ' 列欄位不符（多：' + (extra.join('、') || '無') + '；少：' + (missing.join('、') || '無') + '）' };
    }
    const d = row.date;
    if (!validDateStr(d)) return { ok: false, error: '第 ' + (i + 1) + ' 列日期不正確：' + d };
    if (rng && (d < rng.from || d > rng.to)) return { ok: false, error: '日期 ' + d + ' 不在範圍 ' + rng.from + '～' + rng.to + ' 內' };
    if (seen[d]) return { ok: false, error: '日期重複：' + d };
    seen[d] = true;
  }
  return { ok: true, rows: resp.rows };
}

// 逐日驗算 4 項。空白當 0（試算表 SUM 也是）；無法讀取的格子讓該項直接不符
function checkDayTotals(row) {
  const n = v => (v === '' ? 0 : (typeof v === 'number' && isFinite(v) ? v : NaN));
  const fails = [];
  SS_DAY_CHECKS.forEach(([item, chs, totKey]) => {
    const sum = chs.reduce((s, ch) => s + n(row[ch + '|營收']), 0);
    const total = n(row[totKey]);
    if (isNaN(sum)) fails.push({ item, reason: '含無法讀取的格子' });
    else if (isNaN(total)) fails.push({ item, reason: '加總欄無法讀取（' + String(row[totKey]) + '）' });
    else if (Math.abs(sum - total) >= 0.01) fails.push({ item, reason: '各通路相加 ' + sum + '，加總欄 ' + total });
  });
  return { ok: fails.length === 0, fails };
}

function cellVal(p, field, date) {
  const o = p && p[field];
  const v = o && typeof o === 'object' ? o[date] : undefined;
  return (v === undefined || v === null || v === '') ? null : v;
}

// 試算表各列 × 伺服器現值 → 格子清單（新增 / 不同 / 相同 / 空白 / 無法讀取）
function buildDiff(rows, platforms, opts) {
  opts = opts || {};
  const adSet = opts.adSet || PLATFORMS_WITH_AD_SPEND;
  const op = opts.operatorName || '';
  if (!Array.isArray(platforms)) return { error: '雲端 ec.platforms 不是陣列' };
  const byName = {}, dup = [];
  platforms.forEach((p, i) => { const nm = p && p.name; if (nm in byName) dup.push(nm); else byName[nm] = i; });
  if (dup.length) return { error: '雲端 ec.platforms 有重名通路：' + dup.join('、') };
  const chs = [...new Set(SS_DATA_KEYS.map(k => k.split('|')[0]))];
  const missing = chs.filter(ch => !(ch in byName));
  if (missing.length) return { error: '試算表有、但雲端 ec.platforms 沒有的通路：' + missing.join('、') };
  const badAd = SS_DATA_KEYS.filter(k => k.endsWith('|廣告費')).map(k => k.split('|')[0]).filter(ch => !adSet.has(ch));
  if (badAd.length) return { error: '試算表有廣告費、但儀表板不收廣告費的通路：' + badAd.join('、') };

  const cells = [], bad = [], dayFails = {};
  const counts = { add: 0, diff: 0, same: 0, blank: 0, blankKeep: 0, bad: 0 };
  rows.slice().sort((a, b) => (a.date < b.date ? -1 : 1)).forEach(row => {
    const date = row.date;
    const dc = checkDayTotals(row);
    if (!dc.ok) dayFails[date] = dc.fails;
    SS_DATA_KEYS.forEach(key => {
      const [ch, metric] = key.split('|');
      const field = SS_FIELD[metric];
      const p = platforms[byName[ch]];
      const cur = cellVal(p, field, date);
      const c = classifyCell(row[key]);
      if (c.kind === 'blank') { counts.blank++; if (cur !== null) counts.blankKeep++; return; }
      if (c.kind === 'bad') { counts.bad++; bad.push({ date, ch, metric, raw: c.raw, reason: c.reason }); return; }
      const cell = {
        id: ch + '|' + field + '|' + date, ch, field, metric, date,
        value: c.value, old: cur, oldBy: (p.dailyBy && p.dailyBy[date]) || null,
        rounded: metric === '營收' && c.rounded, dayBad: !dc.ok,
      };
      if (cur === null) cell.cat = 'add';
      else if (Number(cur) === c.value) cell.cat = 'same';
      else cell.cat = 'diff';
      cell.checked = cell.cat === 'add' && !cell.dayBad;
      counts[cell.cat]++;
      cells.push(cell);
    });
  });
  // 署名變更提示：這一列（通路, 日期）有候選格、原署名是別人 → 寫入後會改成操作者
  const sigChanges = [], seenSig = {};
  cells.forEach(c => {
    if (c.cat === 'same' || !c.oldBy) return;
    const k = c.ch + '|' + c.date;
    if (seenSig[k] || (c.oldBy.name || '') === op) return;
    seenSig[k] = true;
    sigChanges.push({ ch: c.ch, date: c.date, from: c.oldBy.name || '（無名）', to: op });
  });
  return { cells, counts, bad, dayFails, sigChanges };
}

// 預覽之後，被勾選的格子在伺服器上有沒有被改過（有就整次中止）
function findStale(previewPlatforms, freshPlatforms, selected) {
  const find = (arr, ch) => (Array.isArray(arr) ? arr.find(p => p && p.name === ch) : null);
  const out = [];
  selected.forEach(c => {
    const a = find(previewPlatforms, c.ch), b = find(freshPlatforms, c.ch);
    if (!b) { out.push({ ch: c.ch, field: c.field, date: c.date, before: cellVal(a, c.field, c.date), now: '（通路不見了）' }); return; }
    const before = cellVal(a, c.field, c.date), now = cellVal(b, c.field, c.date);
    if (stableStringify(before) !== stableStringify(now)) out.push({ ch: c.ch, field: c.field, date: c.date, before, now });
  });
  return out;
}

// JSON 深拷貝 fresh 後，只套用勾選的格子；每個被寫到的（通路, 日期）寫一次 dailyBy
function apply(freshPlatforms, selected, by) {
  const merged = JSON.parse(JSON.stringify(freshPlatforms));
  const touched = {};
  selected.forEach(c => {
    const p = merged.find(x => x && x.name === c.ch);
    if (!p) throw new Error('apply：找不到通路 ' + c.ch);
    if (!p[c.field] || typeof p[c.field] !== 'object') p[c.field] = {};
    p[c.field][c.date] = c.value;
    touched[c.ch + '|' + c.date] = p;
  });
  Object.keys(touched).forEach(k => {
    const p = touched[k], date = k.slice(k.lastIndexOf('|') + 1);
    if (!p.dailyBy || typeof p.dailyBy !== 'object') p.dailyBy = {};
    p.dailyBy[date] = { name: by.name, at: by.at, src: by.src };
  });
  return merged;
}

function utf8Len(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff) { n += 4; i++; }
    else n += 3;
  }
  return n;
}

// 寫前檢查：回傳問題清單（空陣列 = 通過）
function precheck(fresh, merged, selected, opts) {
  const adSet = opts.adSet || PLATFORMS_WITH_AD_SPEND;
  const P = [];
  if (!Array.isArray(fresh) || !Array.isArray(merged)) return ['fresh / merged 不是陣列'];
  if (fresh.length !== merged.length) P.push('陣列長度改變：' + fresh.length + ' → ' + merged.length);
  const names = {};
  const n = Math.min(fresh.length, merged.length);
  for (let i = 0; i < n; i++) {
    const a = fresh[i] || {}, b = merged[i] || {};
    if (a.name !== b.name) P.push('第 ' + i + ' 筆 name 改變：' + a.name + ' → ' + b.name);
    if (b.name in names) P.push('重名通路：' + b.name);
    names[b.name] = true;
    const keys = [...new Set(Object.keys(a).concat(Object.keys(b)))];
    keys.forEach(k => {
      if (k === 'daily' || k === 'dailyAdSpend' || k === 'dailyBy') return;
      if (stableStringify(a[k]) !== stableStringify(b[k])) P.push(b.name + ' 的 ' + k + ' 被改動');
    });
  }
  const sel = {}, selPairs = {};
  selected.forEach(c => { sel[c.ch + '|' + c.field + '|' + c.date] = c; selPairs[c.ch + '|' + c.date] = true; });
  const changed = {};
  for (let i = 0; i < n; i++) {
    const a = fresh[i] || {}, b = merged[i] || {}, ch = b.name;
    SS_CELL_FIELDS.forEach(f => {
      const ao = (a[f] && typeof a[f] === 'object') ? a[f] : {}, bo = (b[f] && typeof b[f] === 'object') ? b[f] : {};
      [...new Set(Object.keys(ao).concat(Object.keys(bo)))].forEach(d => {
        if (stableStringify(ao[d]) === stableStringify(bo[d])) return;
        const id = ch + '|' + f + '|' + d;
        changed[id] = true;
        if (!sel[id]) P.push('沒勾選卻被改動：' + id);
        else if (bo[d] !== sel[id].value) P.push('寫入值不符：' + id + '（' + bo[d] + '，應為 ' + sel[id].value + '）');
        if (f === 'dailyAdSpend' && !adSet.has(ch)) P.push('不收廣告費的通路出現廣告費：' + id);
        if (!(d <= opts.yesterday)) P.push('日期晚於昨天：' + id);
      });
    });
    const ay = (a.dailyBy && typeof a.dailyBy === 'object') ? a.dailyBy : {}, by = (b.dailyBy && typeof b.dailyBy === 'object') ? b.dailyBy : {};
    [...new Set(Object.keys(ay).concat(Object.keys(by)))].forEach(d => {
      if (stableStringify(ay[d]) === stableStringify(by[d])) return;
      if (!selPairs[ch + '|' + d]) P.push('沒勾選卻改了署名：' + ch + ' ' + d);
      else if (opts.by && stableStringify(by[d]) !== stableStringify(opts.by)) P.push('署名內容不符：' + ch + ' ' + d);
    });
  }
  Object.keys(sel).forEach(id => { if (!changed[id]) P.push('勾選了但沒有改到：' + id); });
  const doc = Object.assign({}, opts.docData || {});
  doc[opts.key || 'ec.platforms'] = merged;
  const bytes = utf8Len(JSON.stringify(doc));
  if (bytes > (opts.maxBytes || SS_MAX_DOC_BYTES)) P.push('估計文件大小 ' + bytes + ' bytes，超過 ' + (opts.maxBytes || SS_MAX_DOC_BYTES));
  return P;
}

// 寫後驗證：伺服器讀回來的陣列 vs 送出去的 merged（key 順序不影響）
function verify(expected, actual) {
  const P = [];
  if (!Array.isArray(actual)) return ['讀回的 ec.platforms 不是陣列'];
  if (expected.length !== actual.length) P.push('長度不符：送出 ' + expected.length + '、讀回 ' + actual.length);
  const n = Math.min(expected.length, actual.length);
  for (let i = 0; i < n; i++) {
    const a = expected[i] || {}, b = actual[i] || {};
    if (stableStringify(a) === stableStringify(b)) continue;
    const keys = [...new Set(Object.keys(a).concat(Object.keys(b)))];
    keys.forEach(k => {
      if (stableStringify(a[k]) === stableStringify(b[k])) return;
      if (k === 'daily' || k === 'dailyAdSpend' || k === 'dailyBy') {
        const ao = a[k] || {}, bo = b[k] || {};
        [...new Set(Object.keys(ao).concat(Object.keys(bo)))].forEach(d => {
          if (stableStringify(ao[d]) !== stableStringify(bo[d])) P.push(a.name + ' ' + k + ' ' + d + '：送出 ' + stableStringify(ao[d]) + '、讀回 ' + stableStringify(bo[d]));
        });
      } else P.push(a.name + ' 的 ' + k + ' 不一致');
    });
  }
  return P;
}

function stableStringify(v) {
  if (v === undefined) return 'undefined';
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(x => (x === undefined ? 'null' : stableStringify(x))).join(',') + ']';
  return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + stableStringify(v[k])).join(',') + '}';
}

// JSONP：動態插 <script>，callback 每次唯一；成功 / 逾時 / onerror 都清掉 <script> 與 window 上的 callback
let __ssSeq = 0;
function jsonp(url, params, env) {
  env = env || {};
  const doc = env.document || document, win = env.window || window;
  const setT = env.setTimeout || setTimeout, clearT = env.clearTimeout || clearTimeout;
  const timeoutMs = env.timeoutMs || SS_TIMEOUT_MS;
  const cb = '__ssCb_' + (env.now ? env.now() : Date.now()) + '_' + (++__ssSeq);
  const qs = Object.keys(params || {}).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
  qs.push('callback=' + cb);
  return new Promise((resolve, reject) => {
    const s = doc.createElement('script');
    let done = false, timer = null;
    const cleanup = () => {
      done = true;
      if (timer !== null) clearT(timer);
      if (s.parentNode) s.parentNode.removeChild(s);
      try { delete win[cb]; } catch (e) { win[cb] = undefined; }
    };
    win[cb] = (data) => { if (done) return; cleanup(); resolve(data); };
    s.onerror = () => { if (done) return; cleanup(); reject(new Error('無法載入試算表回應（網路錯誤或網址失效）')); };
    timer = setT(() => { if (done) return; cleanup(); reject(new Error('試算表 ' + Math.round(timeoutMs / 1000) + ' 秒內沒有回應')); }, timeoutMs);
    s.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + qs.join('&');
    s.async = true;
    (doc.head || doc.body || doc.documentElement).appendChild(s);
  });
}

const SheetSync = {
  SHEET_SYNC_URL, SHEET_SYNC_USERS, SS_DATA_KEYS, SS_CHECK_KEYS,
  range, classifyCell, validateResponse, buildDiff, checkDayTotals, findStale, apply, precheck, verify, stableStringify,
  jsonp, taipeiToday, addDaysStr, utf8Len,
};

/* ═══════════ 畫面（module 私有）═══════════ */

const fmtN = v => (v === null || v === undefined ? '—' : Number(v).toLocaleString());
const cellLabel = c => escapeHtml(c.date.slice(5).replace('-', '/')) + ' ' + escapeHtml(c.ch) + ' ' + escapeHtml(c.metric);
const byLabel = b => (b ? escapeHtml(b.name || '（無名）') + (b.src === 'sheet' ? '（試算表）' : '') : '—');

function ssSelectedCount(st) { return st.sel ? st.sel.size : 0; }

function ssRenderHtml(st) {
  const r = st.range || {};
  let h = `
    <div class="ss-controls">
      <label class="ss-mode"><input type="radio" name="ss-mode" value="week"${st.mode === 'week' ? ' checked' : ''}${st.busy ? ' disabled' : ''}> 最近 7 天</label>
      <label class="ss-mode"><input type="radio" name="ss-mode" value="month"${st.mode === 'month' ? ' checked' : ''}${st.busy ? ' disabled' : ''}> 整個月</label>
      <input type="month" id="ss-month" class="ss-month" value="${escapeHtml(st.month || '')}"${st.mode === 'month' && !st.busy ? '' : ' disabled'}>
      <button type="button" class="btn-ghost ss-reload" onclick="App.sheetSyncReload()"${st.loading || st.busy ? ' disabled' : ''}>重新讀取</button>
    </div>`;
  if (r.from) h += `<div class="ss-range">範圍：${escapeHtml(r.from)} ～ ${escapeHtml(r.to)}</div>`;
  if (st.loading) return h + '<div class="ss-loading">讀取中…（試算表有時要 10～30 秒才回應，最多等 60 秒）</div>';
  if (st.error) return h + `<div class="ss-error">${escapeHtml(st.error)}</div>` + ssMsgHtml(st);
  const d = st.diff;
  if (!d) return h + ssMsgHtml(st);
  const c = d.counts;
  const dayBadDates = Object.keys(d.dayFails);
  const compact = !c.diff && !d.bad.length && !dayBadDates.length;
  const N = ssSelectedCount(st);
  const btn = st.done ? '' : `<div class="ss-actions"><button type="button" class="btn-primary ss-confirm" onclick="App.confirmSheetSync()"${N === 0 || st.busy ? ' disabled' : ''}>${st.busy ? '寫入中…' : '寫入 ' + N + ' 格'}</button></div>`;
  const blankNote = c.blankKeep ? `、試算表空白但儀表板有值 ${c.blankKeep} 格（不動）` : '';
  const sigNote = d.sigChanges.length
    ? `；${d.sigChanges.length} 列署名將改為 ${escapeHtml(d.sigChanges[0].to)}（原：${escapeHtml([...new Set(d.sigChanges.map(s => s.from))].join('、'))}）` : '';
  if (compact) {
    return h + `<div class="ss-summary-line">新增 ${c.add} 格、相同 ${c.same} 格${blankNote}${sigNote}</div>` + btn + ssMsgHtml(st);
  }
  const sigOf = {};
  d.sigChanges.forEach(s => { sigOf[s.ch + '|' + s.date] = s; });
  const sigCell = x => { const s = sigOf[x.ch + '|' + x.date]; return s ? `此列署名將由 ${escapeHtml(s.from)} 改為 ${escapeHtml(s.to)}` : ''; };
  const cb = x => `<input type="checkbox" class="ss-cb" data-id="${escapeHtml(x.id)}"${st.sel.has(x.id) ? ' checked' : ''}${st.done || st.busy ? ' disabled' : ''}>`;
  const rowCls = x => (x.dayBad ? ' class="ss-daybad"' : '');

  if (dayBadDates.length) {
    h += `<div class="ss-section ss-section-bad"><div class="ss-section-title">驗算不符（該日格子預設不勾）</div><ul class="ss-list">`
      + dayBadDates.map(dt => `<li class="ss-bad-text">${escapeHtml(dt)}：${d.dayFails[dt].map(f => escapeHtml(f.item + ' — ' + f.reason)).join('；')}</li>`).join('')
      + '</ul></div>';
  }
  if (d.bad.length) {
    h += `<div class="ss-section ss-section-bad"><div class="ss-section-title">無法讀取 ${d.bad.length} 格（不寫入）</div><ul class="ss-list">`
      + d.bad.map(b => `<li>${escapeHtml(b.date)} ${escapeHtml(b.ch)} ${escapeHtml(b.metric)}：「${escapeHtml(String(b.raw))}」${escapeHtml(b.reason)}</li>`).join('')
      + '</ul></div>';
  }
  const adds = d.cells.filter(x => x.cat === 'add'), diffs = d.cells.filter(x => x.cat === 'diff');
  if (adds.length) {
    h += `<div class="ss-section"><div class="ss-section-title">新增 ${adds.length} 格（儀表板空白）</div><table class="ss-table"><tbody>`
      + adds.map(x => `<tr${rowCls(x)}><td class="ss-td-cb">${cb(x)}</td><td>${cellLabel(x)}</td><td class="ss-num">${fmtN(x.value)}${x.rounded ? ' <span class="ss-tag">已四捨五入</span>' : ''}</td><td class="ss-note">${sigCell(x)}</td></tr>`).join('')
      + '</tbody></table></div>';
  }
  if (diffs.length) {
    h += `<div class="ss-section"><div class="ss-section-title">不同 ${diffs.length} 格（預設不勾，勾了才覆蓋）</div><table class="ss-table"><thead><tr><th></th><th>格子</th><th class="ss-num">儀表板原值</th><th class="ss-num">試算表</th><th>原署名</th><th></th></tr></thead><tbody>`
      + diffs.map(x => `<tr${rowCls(x)}><td class="ss-td-cb">${cb(x)}</td><td>${cellLabel(x)}</td><td class="ss-num">${fmtN(x.old)}</td><td class="ss-num">${fmtN(x.value)}${x.rounded ? ' <span class="ss-tag">已四捨五入</span>' : ''}</td><td>${byLabel(x.oldBy)}</td><td class="ss-note">${sigCell(x)}</td></tr>`).join('')
      + '</tbody></table></div>';
  }
  h += `<div class="ss-muted">相同 ${c.same} 格（不變動）${blankNote}</div>`;
  return h + btn + ssMsgHtml(st);
}

function ssMsgHtml(st) {
  if (!st.msg) return '';
  const cls = st.msg.kind === 'err' ? 'ss-error' : (st.msg.kind === 'ok' ? 'ss-ok' : 'ss-info');
  return `<div class="${cls}">${st.msg.text.split('\n').map(escapeHtml).join('<br>')}</div>`;
}

function ssMount(st) {
  const root = document.getElementById('ss-root');
  if (!root) return;
  root.innerHTML = ssRenderHtml(st);
  root.querySelectorAll('input[name="ss-mode"]').forEach(el => el.addEventListener('change', () => {
    st.mode = el.value;
    App.sheetSyncReload();
  }));
  const mEl = root.querySelector('#ss-month');
  if (mEl) mEl.addEventListener('change', () => { st.month = mEl.value; if (st.mode === 'month') App.sheetSyncReload(); });
  root.querySelectorAll('.ss-cb').forEach(el => el.addEventListener('change', () => {
    if (el.checked) st.sel.add(el.dataset.id); else st.sel.delete(el.dataset.id);
    const btn = root.querySelector('.ss-confirm');
    if (btn) { const N = st.sel.size; btn.textContent = '寫入 ' + N + ' 格'; btn.disabled = N === 0 || st.busy; }
  }));
}

function ssHasUnsavedEntry() {
  return [...document.querySelectorAll('.card-rev, .card-ads')]
    .some(el => String(el.value || '') !== String(el.dataset.original || ''));
}

function ssPlatformsOf(snap) {
  const data = (snap && snap.exists && snap.exists()) ? (snap.data() || {}) : {};
  return { data, platforms: data[Store.KEYS.platforms] };
}

/* ═══════════ App 方法 ═══════════ */
Object.assign(App, {
  canSheetSync() {
    const u = this.currentUser;
    return !!u && SHEET_SYNC_USERS.includes(String(u.username || '').toLowerCase());
  },

  openSheetSync() {
    if (!this.canSheetSync()) return;
    if (!window.__cloudStore || !window.__firstMainSnapshotDone) { showToast('雲端資料還沒載入完成，請稍候再按', 'error'); return; }
    if (ssHasUnsavedEntry()) { showToast('填寫表有未儲存的列，請先儲存或還原後再同步', 'error'); return; }
    const y = SheetSync.addDaysStr(SheetSync.taipeiToday(), -1);
    this._ss = { mode: 'week', month: y.slice(0, 7), token: 0, sel: new Set() };
    this.openModal({
      title: '⇩ 從試算表同步',
      bodyHtml: '<div id="ss-root" class="ss-root"></div>',
      hideFooter: true,
      width: 'min(820px, 94vw)',
      onMount: () => ssMount(this._ss),
    });
    this.sheetSyncReload();
  },

  async sheetSyncReload() {
    if (!this.canSheetSync()) return;
    const st = this._ss;
    if (!st || st.busy) return;
    const mEl = document.getElementById('ss-month');
    if (mEl && mEl.value) st.month = mEl.value;
    const token = ++st.token;
    Object.assign(st, { loading: false, error: null, msg: null, diff: null, preview: null, done: false, sel: new Set() });
    st.range = SheetSync.range(st.mode, SheetSync.taipeiToday(), st.month);
    if (st.range.error) { st.error = st.range.error; st.range = null; ssMount(st); return; }
    st.loading = true;
    ssMount(st);
    try {
      const resp = await SheetSync.jsonp(SHEET_SYNC_URL, { from: st.range.from, to: st.range.to });
      if (token !== st.token) return;
      const v = SheetSync.validateResponse(resp, st.range);
      if (!v.ok) throw new Error(v.error);
      const { platforms } = ssPlatformsOf(await window.__cloudStore.getDoc('server'));
      if (token !== st.token) return;
      const opName = (this.currentUser && (this.currentUser.name || this.currentUser.username)) || '';
      const diff = SheetSync.buildDiff(v.rows, platforms, { operatorName: opName });
      if (diff.error) throw new Error(diff.error);
      st.preview = platforms;
      st.diff = diff;
      diff.cells.forEach(c => { if (c.checked) st.sel.add(c.id); });
    } catch (e) {
      if (token !== st.token) return;
      st.error = (e && e.message) ? e.message : String(e);
    }
    st.loading = false;
    ssMount(st);
  },

  async confirmSheetSync() {
    if (!this.canSheetSync()) return;
    const st = this._ss;
    if (!st || !st.diff || st.busy || st.done || st.loading) return;
    if (ssHasUnsavedEntry()) { st.msg = { kind: 'err', text: '填寫表有未儲存的列，請先儲存或還原後再寫入。' }; ssMount(st); return; }
    const selected = st.diff.cells.filter(c => c.cat !== 'same' && st.sel.has(c.id));
    if (!selected.length) return;
    const cs = window.__cloudStore;
    const yesterday = SheetSync.addDaysStr(SheetSync.taipeiToday(), -1);
    const by = { name: (this.currentUser && (this.currentUser.name || this.currentUser.username)) || '', at: Date.now(), src: 'sheet' };
    st.busy = true; st.msg = null; ssMount(st);
    const stop = (kind, text) => { st.busy = false; st.msg = { kind, text }; ssMount(st); };
    try {
      // (1) 伺服器現值
      const { data, platforms: fresh } = ssPlatformsOf(await cs.getDoc('server'));
      if (!Array.isArray(fresh)) return stop('err', '讀不到雲端 ec.platforms，已中止（沒有寫入）。');
      // (2) 預覽後有人改過勾選的格子 → 整次中止
      const stale = SheetSync.findStale(st.preview, fresh, selected);
      if (stale.length) {
        return stop('err', '預覽之後有人改過以下格子，已整次中止（沒有寫入），請按「重新讀取」：\n'
          + stale.map(s => s.date + ' ' + s.ch + ' ' + s.field + '：' + fmtN(s.before) + ' → ' + fmtN(s.now)).join('\n'));
      }
      // (3) 深拷貝套用 (4) 寫前檢查
      const merged = SheetSync.apply(fresh, selected, by);
      const problems = SheetSync.precheck(fresh, merged, selected, { yesterday, docData: data, by, key: Store.KEYS.platforms });
      if (problems.length) return stop('err', '寫前檢查未通過，已中止（沒有寫入）：\n' + problems.join('\n'));
      // (5) 預演模式
      if (window.__sheetSyncDryRun === true) return stop('info', '預演：寫前檢查通過，將寫入 ' + selected.length + ' 格（未寫入）');
      // (6) 全檔唯一一處寫入
      await cs.setField(Store.KEYS.platforms, merged);
      window._platformJustSaved = Date.now();
      Store.setLocalOnly(Store.KEYS.platforms, merged);
      // (7) 讀回驗證（不一致只列出，不回滾）
      let vp = [];
      try { vp = SheetSync.verify(merged, ssPlatformsOf(await cs.getDoc('server')).platforms); }
      catch (e) { vp = ['讀回失敗：' + ((e && e.message) || e)]; }
      st.done = true;
      stop(vp.length ? 'err' : 'ok', vp.length
        ? '已寫入 ' + selected.length + ' 格，但讀回驗證不一致（未回滾）：\n' + vp.join('\n')
        : '已寫入 ' + selected.length + ' 格，讀回驗證一致。');
      setTimeout(() => { try { this.render(); } catch (e) {} }, 0);
    } catch (e) {
      stop('err', '寫入失敗：' + ((e && e.message) || e));
    }
  },
});

Object.assign(window, { SheetSync });
