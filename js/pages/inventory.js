/* js/pages/inventory.js -- 庫存頁（第 1 塊：表格顯示 / 直接編輯 / 新增月份 / 本機模擬），以 Object.assign(App, ...) 合併回 App
 *
 * 取代 Google 試算表「元創數位公司庫存&MOMO庫存統計表」。選單在「辦公室」群組的採購與商開之間，
 *   但【不是部門】：路由 'inventory'（不走 office-），所以不碰 ec.departments / canAccessOffice / OFFICE_FEATURES。
 * 資料：Firestore 文件 app/inventory，經 window.__cloudInventory（firebase.js）讀寫，不進 Store / app/main。
 *   { schema:1, months:{ 'YYYY-MM':{ companyWh, inTransit, momoWh, countNoteShopee, countNoteMomo, orderAmount, note,
 *     createdAt, createdBy, updatedAt, updatedBy } } }
 *   寫入只送有變的那一格：writePaths([[['months',月,欄位],值], [['months',月,'updatedAt'],TS], [['months',月,'updatedBy'],{…}]])，
 *   兩人同時改不同格不互蓋。清空數字＝寫 null（不刪欄位）。不能刪除月份。
 * 總計、較上月一律即時算、不存（_invTotal / _invDiff）：
 *   總計＝公司倉＋在途存貨＋MOMO倉，空白當 0；三格都空白 ⇒ 總計空白。較上月＝本月總計 − 上一個日曆月總計，任一邊空白 ⇒ 空白。
 *   ⚠ 財務儀表板之後讀 app/inventory 自己算總計，規則必須跟這裡一樣（見 CLAUDE.md）。
 * 編輯：照 KPI 填寫模式（profit.js kpiFillKey / kpiFillBlur）——Enter 存檔並往下一列、Esc 還原、值有變失焦就存；
 *   清空只有 Enter 算數（失焦時空白＝取消）。打錯（不是數字）紅框、不存。總計與較上月不是輸入框。
 * 權限：看＝所有登入者（app.js _isRouteAllowed）；編輯、新增月份＝非 view（_invCanEdit，以後收緊只改這裡）。
 *   真正防線仍是資料層：__installReadonlyCloudGuard 會把 __cloudInventory.writePaths 包住。
 * 事件：data-inv-* ＋ #main-content 上【只綁一次】的具名委派，不寫 inline handler，所以本檔函式不必掛 window。
 * 雲端推播重畫時，若正在某格打字：重畫後把焦點、打到一半的字、游標放回同一格（_invFocus），不會被洗掉。
 * 本機模擬：Console 打 __inventoryMock(true)（空資料）或 __inventoryMock('demo')（假資料），只在 localhost 生效、資料只在記憶體（見檔尾）。
 * 第 2 塊：表格上方 4 張卡（_invCardsHtml）＋最近盤點小字＋折線圖（_invDrawChart，Chart.js 4.4.0，index.html 已載入）。
 *   卡片與圖表跟表格在同一次 viewInventory 裡畫：雲端推播重畫、打字中保留焦點（_invCaptureFocus / _invRestoreFocus）都一起涵蓋；
 *   圖表在焦點放回去【之後】才畫，new Chart 不會搶焦點。切換鈕狀態（_invSeriesOn）只在記憶體。
 */
const App = window.App;
const { escapeHtml, showToast } = window;

// 表格欄位（順序＝畫面順序）。num＝數字格；txt＝文字格；auto＝即時計算、不能編輯。
const INV_COLS = Object.freeze([
  { k: 'companyWh',       l: '公司倉',       t: 'num' },
  { k: 'inTransit',       l: '在途存貨',     t: 'num' },
  { k: 'momoWh',          l: 'MOMO倉',       t: 'num' },
  { k: '_total',          l: '總計',         t: 'auto' },
  { k: '_diff',           l: '較上月',       t: 'auto' },
  { k: 'countNoteShopee', l: '盤點（蝦皮）', t: 'txt' },
  { k: 'countNoteMomo',   l: '盤點（MOMO）', t: 'txt' },
  { k: 'orderAmount',     l: '叫貨金額',     t: 'num' },
  { k: 'note',            l: '備註',         t: 'txt' },
]);
const INV_FIELDS = Object.freeze(INV_COLS.filter(c => c.t !== 'auto').map(c => c.k));
const INV_TXT_MAX = 200;
const INV_RO_MSG = '僅檢視帳號無法修改庫存';
const INV_OPEN_YEARS = 2;   // 預設展開最新幾個年份（收合狀態只在記憶體）
const INV_UNIT = '單位：元（成本，含進口稅費與運費）';
// 圖表的線（順序＝切換鈕順序）。color＝:root 變數名，畫圖當下用 getComputedStyle 取值，不寫死色碼。
const INV_SERIES = Object.freeze([
  { k: 'total',     l: '總計',     color: '--primary' },
  { k: 'companyWh', l: '公司倉',   color: '--info' },
  { k: 'inTransit', l: '在途存貨', color: '--warn' },
  { k: 'momoWh',    l: 'MOMO倉',   color: '--success' },
]);
const INV_CHART_ID = 'inv-chart';

let _invData = null;       // 最新快照（app/inventory 的內容；文件不存在＝{}）
let _invLoaded = false;    // 收過第一份快照
let _invUnsub = null;
let _invMock = null;       // 模擬模式：{ doc, listeners, api }；null＝走雲端
let _invSubscribing = false;
const _invSaving = new Set();       // 寫入中的格子 'YYYY-MM|欄位'
const _invYearOpen = new Map();     // 使用者手動展開 / 收合過的年份 → true / false
let _invAdding = false;             // 新增月份寫入中（防連點）
let _invRendering = false;          // viewInventory → bindInventory 之間（舊輸入框被移除時不當成失焦存檔）
let _invFocus = null;               // 重畫前焦點所在的格子 {ym, f, value, s, e, invalid}
const _invSeriesOn = new Set(['total']);   // 圖表顯示哪幾條線（預設只有總計；只在記憶體）
let _invChart = null;               // 目前的 Chart 實例（重畫前 destroy）

/* ---------- 純函式（測試直接呼叫） ---------- */
const _invIsYm = s => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
const _invYmLabel = ym => String(ym).replace('-', '/');
function _invPrevYm(ym) {
  const y = +ym.slice(0, 4), m = +ym.slice(5, 7);
  return m === 1 ? (y - 1) + '-12' : y + '-' + String(m - 1).padStart(2, '0');
}
function _invNextYm(ym) {
  const y = +ym.slice(0, 4), m = +ym.slice(5, 7);
  return m === 12 ? (y + 1) + '-01' : y + '-' + String(m + 1).padStart(2, '0');
}
const _invIsNum = v => typeof v === 'number' && Number.isFinite(v);
// 總計：三格都不是數字 ⇒ null；否則加總（不是數字的當 0）。用「分」整數加總，避開浮點尾差。
function _invTotal(row) {
  if (!row || typeof row !== 'object') return null;
  const vs = [row.companyWh, row.inTransit, row.momoWh];
  if (!vs.some(_invIsNum)) return null;
  return vs.reduce((s, v) => s + (_invIsNum(v) ? Math.round(v * 100) : 0), 0) / 100;
}
// 較上月：本月與上一個日曆月都有總計才算
function _invDiff(months, ym) {
  const a = _invTotal(months && months[ym]), b = _invTotal(months && months[_invPrevYm(ym)]);
  return (a == null || b == null) ? null : Math.round((a - b) * 100) / 100;
}
// 數字輸入：空白 ⇒ {ok,v:null}；可千分位、$、NT$、空白、負號、最多 2 位小數；其他 ⇒ {ok:false}
function _invParseNum(raw) {
  const t = String(raw == null ? '' : raw).replace(/NT\$|\$|,|\s/g, '');
  if (t === '') return { ok: true, v: null };
  if (!/^-?\d+(\.\d{1,2})?$/.test(t)) return { ok: false, v: null };
  return { ok: true, v: parseFloat(t) };
}
function _invFmtNum(v) {
  if (!_invIsNum(v)) return '';
  return (v < 0 ? '-' : '') + Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
}
function _invFmtDiff(v) {
  if (!_invIsNum(v)) return '';
  return (v > 0 ? '+' : '') + _invFmtNum(v);
}
// 雲端時間（Timestamp / 毫秒數字）→ 'YYYY-MM-DD HH:mm'
function _invFmtAt(at) {
  let d = null;
  if (at && typeof at.toDate === 'function') { try { d = at.toDate(); } catch {} }
  else if (_invIsNum(at)) d = new Date(at);
  if (!d || isNaN(d.getTime())) return '';
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
// 今天（台灣時間）的 'YYYY-MM'
function _invThisYm(now) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit' }).formatToParts(now || new Date());
    const y = parts.find(x => x.type === 'year').value, m = parts.find(x => x.type === 'month').value;
    return y + '-' + m;
  } catch {
    const d = now || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }
}
// 下一個可以新增的月份：最新月份的下一個月；沒有任何月份 ⇒ 本月。超過本月 ⇒ allowed:false（還沒到）。
function _invAddTarget(months, thisYm) {
  const keys = Object.keys(months || {}).filter(_invIsYm).sort();
  const ym = keys.length ? _invNextYm(keys[keys.length - 1]) : thisYm;
  return { ym, allowed: ym <= thisYm };
}
// 一格的目前值（數字格：數字或 null；文字格：字串）
function _invCur(months, ym, f) {
  const row = months && months[ym];
  const v = row && typeof row === 'object' ? row[f] : undefined;
  const col = INV_COLS.find(c => c.k === f);
  if (col && col.t === 'num') return _invIsNum(v) ? v : null;
  return typeof v === 'string' ? v : '';
}
// 這一格這次要不要寫、寫什麼。純函式。回 {kind:'write', v} / {kind:'same'} / {kind:'cancel'} / {kind:'invalid', msg}
//   fromBlur：失焦觸發（空白＝取消，不清空）；Enter 觸發時空白＝清空。
function _invDecide(col, raw, cur, fromBlur) {
  const t = String(raw == null ? '' : raw).trim();
  if (col.t === 'num') {
    if (t === '') {
      if (cur == null) return { kind: 'same' };
      return fromBlur ? { kind: 'cancel' } : { kind: 'write', v: null };
    }
    const n = _invParseNum(t);
    if (!n.ok) return { kind: 'invalid', msg: col.l + '請輸入數字（可有千分位、最多 2 位小數）' };
    return n.v === cur ? { kind: 'same' } : { kind: 'write', v: n.v };
  }
  if (t.length > INV_TXT_MAX) return { kind: 'invalid', msg: col.l + '最多 ' + INV_TXT_MAX + ' 字（目前 ' + t.length + '）' };
  if (t === '') {
    if (cur === '') return { kind: 'same' };
    return fromBlur ? { kind: 'cancel' } : { kind: 'write', v: '' };
  }
  return t === cur ? { kind: 'same' } : { kind: 'write', v: t };
}
// 一格的寫入內容（只送這一格＋這個月的 updatedAt / updatedBy）
function _invCellPairs(ym, f, v, by, TS) {
  return [[['months', ym, f], v], [['months', ym, 'updatedAt'], TS], [['months', ym, 'updatedBy'], by]];
}
// 卡片的「本月」＝最新一個三倉有任何數字（總計不是空白）的月份；全部都空 ⇒ null（不顯示卡片）
function _invLatestYm(months) {
  const keys = Object.keys(months || {}).filter(_invIsYm).sort().reverse();
  return keys.find(k => _invTotal(months[k]) != null) || null;
}
function _invCardsData(months) {
  const ym = _invLatestYm(months);
  if (!ym) return null;
  const row = months[ym];
  const v = k => (_invIsNum(row[k]) ? row[k] : null);
  return { ym, total: _invTotal(row), diff: _invDiff(months, ym), companyWh: v('companyWh'), inTransit: v('inTransit'), momoWh: v('momoWh') };
}
// 最近盤點＝最新一個「蝦皮或 MOMO 盤點備註有字」的月份；沒有 ⇒ null
function _invLatestCount(months) {
  const keys = Object.keys(months || {}).filter(_invIsYm).sort().reverse();
  const t = v => (typeof v === 'string' ? v.trim() : '');
  const ym = keys.find(k => months[k] && (t(months[k].countNoteShopee) || t(months[k].countNoteMomo)));
  return ym ? { ym, shopee: t(months[ym].countNoteShopee), momo: t(months[ym].countNoteMomo) } : null;
}
// 圖表資料：X 軸＝最早到最新的每一個日曆月（中間沒有的月份也列出、值 null ⇒ 斷線）；
//   每條線的值：總計用 _invTotal，三倉用原數字；不是數字 ⇒ null。
function _invChartData(months) {
  const keys = Object.keys(months || {}).filter(_invIsYm).sort();
  if (!keys.length) return { labels: [], yms: [], series: {} };
  const yms = [];
  for (let ym = keys[0]; ym <= keys[keys.length - 1]; ym = _invNextYm(ym)) yms.push(ym);
  const series = {};
  INV_SERIES.forEach(sr => {
    series[sr.k] = yms.map(ym => {
      const row = months[ym];
      if (sr.k === 'total') return _invTotal(row);
      return row && _invIsNum(row[sr.k]) ? row[sr.k] : null;
    });
  });
  return { labels: yms.map(_invYmLabel), yms, series };
}
// Chart.js 的 datasets（只放切換鈕選中的；順序照 INV_SERIES）。colorOf(變數名) → 顏色字串。
function _invDatasets(data, on, colorOf) {
  return INV_SERIES.filter(sr => on.has(sr.k)).map(sr => {
    const c = colorOf(sr.color) || undefined;
    return { label: sr.l, data: data.series[sr.k] || [], borderColor: c, backgroundColor: c,
      borderWidth: sr.k === 'total' ? 2.5 : 1.5, pointRadius: 2, pointHoverRadius: 4, tension: 0, spanGaps: false };
  });
}

/* ---------- 資料來源（雲端 / 本機模擬）唯一入口 ---------- */
function _invIsLocalHost() {
  const h = String((window.location && window.location.hostname) || '').toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1' || h.endsWith('.localhost');
}
function _invBackend() {
  return _invMock ? _invMock.api : (window.__cloudInventory || null);
}
const _invMe = () => App.currentUser || null;
const _invIsRO = () => (typeof App.isReadOnly === 'function' ? !!App.isReadOnly() : !!(_invMe() && _invMe().role === 'view'));
const _invCanEdit = () => !!_invMe() && !_invIsRO();
const _invBy = () => { const u = _invMe() || {}; return { username: u.username || '', name: u.name || '' }; };
const _invMonths = () => (_invData && _invData.months && typeof _invData.months === 'object') ? _invData.months : {};

function _invOnSnap(data) {
  _invData = (data && typeof data === 'object') ? data : {};
  _invLoaded = true;
  if (_invSubscribing) return;   // 訂閱當下同步回呼（模擬模式會這樣）：呼叫端 viewInventory 正在 render，重畫會遞迴
  if (typeof App.renderFromCloud === 'function') App.renderFromCloud('inventory');
}
function _invEnsureSub() {
  if (_invUnsub) return true;
  const be = _invBackend();
  if (!be || typeof be.subscribe !== 'function') return false;
  _invSubscribing = true;
  try {
    const un = be.subscribe(_invOnSnap, err => {
      console.error('[inventory] 訂閱失敗', err);
      showToast('⚠ 庫存讀取失敗：' + ((err && err.message) || err), 'error', 6000);
    });
    _invUnsub = typeof un === 'function' ? un : () => {};
  } catch (e) {
    console.error('[inventory] 訂閱失敗', e);
    return false;
  } finally {
    _invSubscribing = false;
  }
  return true;
}
function _invResetSub() {
  if (_invUnsub) { try { _invUnsub(); } catch {} }
  _invUnsub = null;
  _invData = null;
  _invLoaded = false;
  _invSaving.clear();
}

/* ---------- 畫面 ---------- */
function _invYearOpenOf(year, rank) {
  return _invYearOpen.has(year) ? _invYearOpen.get(year) : rank < INV_OPEN_YEARS;
}
function _invCellHtml(col, ym, months, ro) {
  if (col.k === '_total') return `<td class="inv-auto">${escapeHtml(_invFmtNum(_invTotal(months[ym])))}</td>`;
  if (col.k === '_diff') {
    const d = _invDiff(months, ym);
    return `<td class="inv-auto${d != null && d < 0 ? ' inv-neg' : d != null && d > 0 ? ' inv-pos' : ''}">${escapeHtml(_invFmtDiff(d))}</td>`;
  }
  const cur = _invCur(months, ym, col.k);
  const raw = col.t === 'num' ? (cur == null ? '' : String(cur)) : cur;
  const disp = col.t === 'num' ? _invFmtNum(cur) : cur;
  const saving = _invSaving.has(ym + '|' + col.k);
  return `<td class="inv-cell inv-cell-${col.t}"><input class="inv-in inv-in-${col.t}${saving ? ' inv-saving' : ''}" type="text"`
    + (col.t === 'num' ? ' inputmode="decimal"' : ` maxlength="${INV_TXT_MAX}"`)
    + ` autocomplete="off" aria-label="${escapeHtml(_invYmLabel(ym) + ' ' + col.l)}"`
    + ` data-inv-ym="${escapeHtml(ym)}" data-inv-f="${escapeHtml(col.k)}" data-raw="${escapeHtml(raw)}" data-disp="${escapeHtml(disp)}"`
    + ` value="${escapeHtml(disp)}"${ro || saving ? ' readonly' : ''}></td>`;
}
function _invRowHtml(ym, months, ro) {
  const row = months[ym] || {};
  const who = row.updatedBy && (row.updatedBy.name || row.updatedBy.username);
  const at = _invFmtAt(row.updatedAt);
  const tip = who || at ? '最後修改：' + (who || '?') + (at ? ' · ' + at : '') : '';
  return `<tr data-inv-row="${escapeHtml(ym)}"><th class="inv-ym" scope="row"${tip ? ` title="${escapeHtml(tip)}"` : ''}>${escapeHtml(_invYmLabel(ym))}</th>`
    + INV_COLS.map(c => _invCellHtml(c, ym, months, ro)).join('') + '</tr>';
}
function _invTableHtml(months, ro) {
  const keys = Object.keys(months).filter(_invIsYm).sort().reverse();
  const years = [...new Set(keys.map(k => k.slice(0, 4)))];
  const head = `<tr><th class="inv-ym" scope="col">月份</th>${INV_COLS.map(c => `<th scope="col" class="${c.t === 'auto' ? 'inv-th-auto' : ''}">${escapeHtml(c.l)}${c.t === 'auto' ? '<span class="inv-auto-tag">自動</span>' : ''}</th>`).join('')}</tr>`;
  const body = years.map((y, rank) => {
    const open = _invYearOpenOf(y, rank);
    const ms = keys.filter(k => k.startsWith(y + '-'));
    return `<tbody class="inv-year${open ? ' inv-year-open' : ''}">`
      + `<tr class="inv-year-row"><th colspan="${INV_COLS.length + 1}"><button type="button" class="inv-year-btn" data-inv-act="year" data-year="${escapeHtml(y)}" aria-expanded="${open ? 'true' : 'false'}">${open ? '▾' : '▸'} ${escapeHtml(y)} 年<span class="inv-year-n">${ms.length} 個月</span></button></th></tr>`
      + (open ? ms.map(k => _invRowHtml(k, months, ro)).join('') : '')
      + '</tbody>';
  }).join('');
  return `<div class="inv-table-wrap"><table class="inv-table"><thead>${head}</thead>${body}</table></div>`;
}
function _invAddBtnHtml(months) {
  const t = _invAddTarget(months, _invThisYm());
  const lbl = '＋ 新增 ' + _invYmLabel(t.ym);
  if (!t.allowed) return `<button type="button" class="btn-ghost inv-add" disabled title="${escapeHtml('還沒到 ' + _invYmLabel(t.ym))}">${escapeHtml(lbl)}</button>`;
  return `<button type="button" class="btn-ghost inv-add" data-inv-act="add" data-ym="${escapeHtml(t.ym)}"${_invAdding ? ' disabled' : ''}>${escapeHtml(_invAdding ? '新增中…' : lbl)}</button>`;
}

function _invCardsHtml(months) {
  const c = _invCardsData(months);
  if (!c) return '';
  const ymTag = `<span class="inv-stat-ym">${escapeHtml(_invYmLabel(c.ym))}</span>`;
  const val = v => escapeHtml(v == null ? '—' : _invFmtNum(v));
  const diff = c.diff == null ? '<span>—</span>'
    : c.diff < 0 ? `<span class="down">▼ ${escapeHtml(_invFmtNum(-c.diff))}</span>`
    : c.diff > 0 ? `<span class="up">▲ ${escapeHtml(_invFmtNum(c.diff))}</span>`
    : '<span>0</span>';
  const card = (cls, label, v, meta) => `<div class="stat-card inv-stat inv-stat-${cls}">
          <div class="stat-label">${escapeHtml(label)}${ymTag}</div>
          <div class="stat-value">${val(v)}</div>${meta ? `
          <div class="stat-meta">${meta}</div>` : ''}
        </div>`;
  const cnt = _invLatestCount(months);
  const cntHtml = cnt ? `<p class="inv-count-note">最近盤點：蝦皮 ${escapeHtml(cnt.shopee || '—')}／MOMO ${escapeHtml(cnt.momo || '—')}（${escapeHtml(_invYmLabel(cnt.ym))}）</p>` : '';
  return `<div class="stat-grid inv-stat-grid">
        ${card('total', '本月總庫存', c.total, '較上月 ' + diff)}
        ${card('company', '公司倉', c.companyWh)}
        ${card('transit', '在途存貨', c.inTransit)}
        ${card('momo', 'MOMO倉', c.momoWh)}
      </div>${cntHtml}`;
}
function _invChartHtml() {
  const btns = INV_SERIES.map(sr => {
    const on = _invSeriesOn.has(sr.k);
    return `<button type="button" class="pill inv-series-btn inv-series-${escapeHtml(sr.k)}${on ? ' active' : ''}" data-inv-act="series" data-series="${escapeHtml(sr.k)}" aria-pressed="${on ? 'true' : 'false'}">${escapeHtml(sr.l)}</button>`;
  }).join('');
  const box = (typeof window.Chart === 'function')
    ? `<canvas id="${INV_CHART_ID}" aria-label="庫存走勢圖" role="img"></canvas>`
    : '<div class="inv-chart-fail">圖表載入失敗（表格照常可用）</div>';
  return `<div class="inv-chart-card">
        <div class="inv-chart-hd"><span class="inv-chart-title">庫存走勢</span><span class="filter-spacer"></span>${btns}</div>
        <div class="inv-chart-box">${box}</div>
      </div>`;
}
function _invCssVar(name) {
  try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); } catch { return ''; }
}
function _invDestroyChart() {
  if (_invChart) { try { _invChart.destroy(); } catch {} }
  _invChart = null;
}
// innerHTML 換完之後才畫（bindInventory 呼叫）。canvas 不在（沒資料 / Chart 不存在 / 不在這頁）就只清掉舊的。
function _invDrawChart() {
  _invDestroyChart();
  const Chart = window.Chart;
  const cv = document.getElementById(INV_CHART_ID);
  if (!cv || typeof Chart !== 'function') return;
  try {
    const old = typeof Chart.getChart === 'function' ? Chart.getChart(cv) : null;
    if (old) old.destroy();
    const data = _invChartData(_invMonths());
    const grid = _invCssVar('--border'), muted = _invCssVar('--text-muted');
    _invChart = new Chart(cv.getContext('2d'), {
      type: 'line',
      data: { labels: data.labels, datasets: _invDatasets(data, _invSeriesOn, _invCssVar) },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ctx.dataset.label + '：' + (ctx.parsed.y == null ? '—' : _invFmtNum(ctx.parsed.y)) } },
        },
        scales: {
          x: { ticks: { color: muted || undefined, maxRotation: 0, autoSkip: true }, grid: { display: false } },
          y: { ticks: { color: muted || undefined, callback: v => _invFmtNum(v) }, grid: { color: grid || undefined } },
        },
      },
    });
  } catch (e) {
    console.error('[inventory] 畫圖失敗', e);
    _invChart = null;
    const box = cv.parentNode;
    if (box) box.innerHTML = '<div class="inv-chart-fail">圖表載入失敗（表格照常可用）</div>';
  }
}

/* ---------- 焦點保留（雲端推播重畫時） ---------- */
function _invCaptureFocus() {
  const a = document.activeElement;
  if (!a || !a.classList || !a.classList.contains('inv-in') || !a.isConnected) { _invFocus = null; return; }
  let s = null, e = null;
  try { s = a.selectionStart; e = a.selectionEnd; } catch {}
  _invFocus = { ym: a.dataset.invYm, f: a.dataset.invF, value: a.value, s, e, invalid: a.classList.contains('inv-invalid') };
}
const _invInputOf = (ym, f) => {
  const main = document.getElementById('main-content');
  return main ? [...main.querySelectorAll('input.inv-in')].find(x => x.dataset.invYm === ym && x.dataset.invF === f) || null : null;
};
let _invRestoring = false;
function _invRestoreFocus() {
  const fx = _invFocus; _invFocus = null;
  if (!fx) return;
  const n = _invInputOf(fx.ym, fx.f);
  if (!n || n.readOnly) return;
  _invRestoring = true;
  try {
    n.focus();
    n.value = fx.value;
    if (fx.invalid) n.classList.add('inv-invalid');
    if (fx.s != null) n.setSelectionRange(fx.s, fx.e);
  } catch {} finally { _invRestoring = false; }
}

/* ---------- 編輯 ---------- */
function _invMarkInvalid(inp, msg) {
  inp.classList.add('inv-invalid');
  inp.title = msg;
  showToast(msg, 'error', 3000);
}
function _invClearInvalid(inp) {
  inp.classList.remove('inv-invalid');
  inp.removeAttribute('title');
}
// 存一格。回 'write' / 'same' / 'cancel' / 'invalid' / 'denied'（寫入是非同步的，這裡只回決定）
function _invCommit(inp, fromBlur) {
  const ym = inp.dataset.invYm, f = inp.dataset.invF;
  const col = INV_COLS.find(c => c.k === f);
  if (!col || col.t === 'auto' || !_invIsYm(ym) || _invSaving.has(ym + '|' + f)) return 'same';
  const cur = _invCur(_invMonths(), ym, f);
  const d = _invDecide(col, inp.value, cur, fromBlur);
  if (d.kind === 'invalid') { _invMarkInvalid(inp, d.msg); return 'invalid'; }
  _invClearInvalid(inp);
  if (d.kind !== 'write') { inp.value = inp.dataset.disp || ''; return d.kind; }
  if (!_invCanEdit()) { inp.value = inp.dataset.disp || ''; showToast(INV_RO_MSG, 'error'); return 'denied'; }
  _invWriteCell(ym, f, d.v, inp);
  return 'write';
}
async function _invWriteCell(ym, f, v, inp) {
  const be = _invBackend();
  const key = ym + '|' + f;
  const fail = (msg) => {
    console.warn('[inventory] 寫入失敗', ym, f, msg);
    showToast('❌ ' + _invYmLabel(ym) + ' ' + (INV_COLS.find(c => c.k === f) || {}).l + ' 沒有存進雲端：' + msg, 'error', 6000);
  };
  if (!be || typeof be.writePaths !== 'function') { fail('雲端尚未就緒'); _invRerenderSoon(); return; }
  _invSaving.add(key);
  if (inp && inp.isConnected) { inp.classList.add('inv-saving'); inp.readOnly = true; }
  try {
    const r = await be.writePaths(_invCellPairs(ym, f, v, _invBy(), be.TS));
    if (!(r && r.ok)) fail('被擋下（唯讀帳號或本機防護）');
    else {
      // 🔴 讀回比對才算數（寫入路徑或值有任何差錯都會在這裡現形）
      const s = await be.getDoc();
      const data = (s && typeof s.exists === 'function' && s.exists()) ? (s.data() || {}) : {};
      const got = data.months && data.months[ym] ? data.months[ym][f] : undefined;
      if ((got === undefined ? null : got) !== v) fail('讀回不一致');
    }
  } catch (e) {
    fail((e && (e.code || e.message)) || String(e));
  } finally {
    _invSaving.delete(key);
  }
  _invRerenderSoon();
}
// 寫完一定重畫一次（成功：解除 inv-saving；失敗：還原成雲端值）。正在打字的那一格靠 _invFocus 保留。
function _invRerenderSoon() {
  if (App.route === 'inventory') App.render();
}
// Enter 之後要去的格子（下一列同欄）。先記 {ym, f}，存檔後再用它找【當下】的元素：
//   存檔可能已經觸發整頁重畫，事先拿到的元素會是被換掉的舊元素。
function _invNextKey(inp) {
  const all = [...document.querySelectorAll('#main-content input.inv-in')];
  const f = inp.dataset.invF;
  const i = all.indexOf(inp);
  if (i < 0) return null;
  const next = all.slice(i + 1).find(x => x.dataset.invF === f);
  return next ? { ym: next.dataset.invYm, f } : null;
}
async function _invAddMonth(ym) {
  if (_invAdding) return;
  if (!_invCanEdit()) { showToast(INV_RO_MSG, 'error'); return; }
  const months = _invMonths();
  const t = _invAddTarget(months, _invThisYm());
  if (!t.allowed || t.ym !== ym) { showToast('現在不能新增 ' + _invYmLabel(ym), 'error'); return; }
  if (months[ym]) { showToast(_invYmLabel(ym) + ' 已經存在', 'error'); return; }
  if (!confirm('新增 ' + _invYmLabel(ym) + '？\n\n月份新增後不能刪除（只能清空數字）。')) return;
  const be = _invBackend();
  if (!be || typeof be.writePaths !== 'function') { showToast('雲端尚未就緒，請稍後再試', 'error'); return; }
  _invAdding = true; _invRerenderSoon();
  try {
    const r = await be.writePaths([[['months', ym, 'createdAt'], be.TS], [['months', ym, 'createdBy'], _invBy()]]);
    if (!(r && r.ok)) showToast('❌ 沒有新增：被擋下（唯讀帳號或本機防護）', 'error', 6000);
    else {
      const s = await be.getDoc();
      const data = (s && typeof s.exists === 'function' && s.exists()) ? (s.data() || {}) : {};
      if (data.months && data.months[ym]) showToast('✓ 已新增 ' + _invYmLabel(ym), 'success');
      else showToast('❌ 沒有新增（讀回找不到 ' + _invYmLabel(ym) + '）', 'error', 6000);
    }
  } catch (e) {
    console.error('[inventory] 新增月份失敗', e);
    showToast('❌ 沒有新增：' + ((e && (e.code || e.message)) || e), 'error', 6000);
  } finally {
    _invAdding = false;
    _invRerenderSoon();
  }
}

/* ---------- 事件（#main-content 上只綁一次的委派） ---------- */
const _invOnPage = () => App.route === 'inventory';
function _invOnClick(e) {
  if (!_invOnPage()) return;
  const b = e.target.closest && e.target.closest('[data-inv-act]');
  if (!b) return;
  const act = b.dataset.invAct;
  if (act === 'year') {
    const y = b.dataset.year;
    const years = [...new Set(Object.keys(_invMonths()).filter(_invIsYm).map(k => k.slice(0, 4)))].sort().reverse();
    _invYearOpen.set(y, !_invYearOpenOf(y, years.indexOf(y)));
    App.render();
  } else if (act === 'add') {
    _invAddMonth(b.dataset.ym);
  } else if (act === 'series') {
    const k = b.dataset.series;
    if (!INV_SERIES.some(sr => sr.k === k)) return;
    if (_invSeriesOn.has(k)) { if (_invSeriesOn.size > 1) _invSeriesOn.delete(k); }   // 至少留一條，不讓圖變空白
    else _invSeriesOn.add(k);
    App.render();
  }
}
function _invIsIn(t) { return !!(t && t.classList && t.classList.contains('inv-in')); }
function _invOnFocusin(e) {
  if (!_invOnPage() || !_invIsIn(e.target) || _invRestoring) return;
  const inp = e.target;
  if (inp.readOnly) return;
  if (inp.classList.contains('inv-in-num')) inp.value = inp.dataset.raw || '';
  try { inp.select(); } catch {}
}
function _invOnFocusout(e) {
  if (!_invOnPage() || !_invIsIn(e.target) || _invRendering) return;
  const inp = e.target;
  if (!inp.isConnected || inp.readOnly) return;
  _invCommit(inp, true);
}
function _invOnKeydown(e) {
  if (!_invOnPage() || !_invIsIn(e.target)) return;
  const inp = e.target;
  if (inp.readOnly) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    inp.value = inp.classList.contains('inv-in-num') ? (inp.dataset.raw || '') : (inp.dataset.disp || '');
    _invClearInvalid(inp);
    return;
  }
  if (e.key === 'Enter' && !e.isComposing) {
    e.preventDefault();
    const nk = _invNextKey(inp);
    const r = _invCommit(inp, false);
    if (r === 'invalid') return;
    const n = nk && _invInputOf(nk.ym, nk.f);
    if (n) n.focus();
  }
}

Object.assign(App, {
  viewInventory() {
    // 重畫前記下正在打字的格子；bindInventory 在 innerHTML 換完後放回去
    _invCaptureFocus();
    _invRendering = true;
    const subOk = _invEnsureSub();
    const ro = !_invCanEdit();
    const months = _invMonths();
    const n = Object.keys(months).filter(_invIsYm).length;
    let body, top = '';
    if (!subOk && !_invLoaded) body = `<div class="empty"><div class="emoji">⏳</div>雲端連線中…</div>`;
    else if (!_invLoaded) body = `<div class="empty"><div class="emoji">⏳</div>載入中…</div>`;
    else if (!n) body = `<div class="empty"><div class="emoji">📦</div>還沒有任何月份${ro ? '' : '，按右上「新增」開始'}</div>`;
    else { top = _invCardsHtml(months) + _invChartHtml(); body = _invTableHtml(months, ro); }
    return `
      <div class="inv-page">
        <div class="page-header">
          <h2>庫存</h2>
          <p>公司倉、在途存貨、MOMO倉每月庫存。總計與較上月自動計算；直接點格子修改，Enter 存檔、Esc 取消。</p>
        </div>
        ${_invMock ? `<div class="inv-mock-banner">模擬模式：資料只在本機記憶體，重新整理就消失（__inventoryMock(false) 關閉）</div>` : ''}
        ${ro ? `<div class="inv-ro-hint">${escapeHtml(INV_RO_MSG)}</div>` : ''}
        ${top}
        <div class="inv-toolbar">
          <span class="inv-unit">${escapeHtml(INV_UNIT)}</span>
          <span class="filter-spacer"></span>
          ${!ro && _invLoaded ? _invAddBtnHtml(months) : ''}
        </div>
        ${body}
      </div>`;
  },

  bindInventory() {
    const main = document.getElementById('main-content');
    // 🔴 只綁一次：#main-content 不會被換掉，render 只換 innerHTML；旗標記在元素上。
    //   各 handler 自己先檢查 App.route === 'inventory'，其他頁的事件不受影響。
    if (main && !main.__invBound) {
      main.addEventListener('click', _invOnClick);
      main.addEventListener('focusin', _invOnFocusin);
      main.addEventListener('focusout', _invOnFocusout);
      main.addEventListener('keydown', _invOnKeydown);
      main.__invBound = true;
    }
    _invRendering = false;
    _invRestoreFocus();
    _invDrawChart();   // 焦點放回去之後才畫：new Chart 不會搶焦點，打字中的格子不受影響
    // 雲端物件晚於 render 才就緒（firebase.js 在 pages 之後載入）：就緒後補訂閱並重畫
    if (!_invUnsub && !_invMock && !window.__invWaitCloud) {
      window.__invWaitCloud = true;
      window.addEventListener('cloudStoreReady', () => {
        window.__invWaitCloud = false;
        if (App.route === 'inventory') App.render();
      }, { once: true });
    }
  },
});

/* ---------- 本機模擬開關：__inventoryMock(true / 'demo' / false) ----------
 * 只在 localhost / 127.0.0.1 / [::1] / *.localhost 生效；正式站呼叫只印警告、回 false、什麼都不改。
 * 開啟後資料來源換成記憶體 mock（介面同 __cloudInventory，writePaths 照 FieldPath 語意），不碰 Firestore / Store / localStorage。
 *   'demo'：塞 2024/01～上個月的假數字（含幾格空白），方便看畫面。 */
function _invMakeMock(demo) {
  const TS = Symbol('mockTS');
  const doc = { schema: 1, months: {} };
  const listeners = new Set();
  const clone = o => JSON.parse(JSON.stringify(o));
  const tsOf = ms => ({ toDate: () => new Date(ms) });
  const reviveAt = o => {   // JSON clone 會丟掉 toDate，讀出時補回
    Object.values(o.months || {}).forEach(r => { ['createdAt', 'updatedAt'].forEach(k => { if (r && _invIsNum(r[k + 'Ms'])) { r[k] = tsOf(r[k + 'Ms']); delete r[k + 'Ms']; } }); });
    return o;
  };
  const snap = () => reviveAt(clone(doc));
  // 推播放到下一輪（同 Firestore：本機寫入的快照事件不會在 writePaths 的呼叫堆疊裡同步觸發）
  const emit = () => setTimeout(() => { const s = snap(); listeners.forEach(cb => { try { cb(s); } catch (e) { console.error(e); } }); }, 0);
  if (demo) {
    const end = _invPrevYm(_invThisYm());
    let ym = '2024-01', i = 0;
    while (ym <= end) {
      const r = { companyWh: 8000000 + ((i * 137731) % 2500000), inTransit: i % 5 === 0 ? null : 300000 + ((i * 7919) % 400000),
        momoWh: 1500000 + ((i * 52361) % 900000), countNoteShopee: i % 3 === 0 ? '蝦皮' + (+ym.slice(5)) + '/1' : '',
        countNoteMomo: i % 3 === 0 ? 'MO ' + (+ym.slice(5)) + '/30填' : '', orderAmount: i % 4 === 0 ? null : 1200000 + ((i * 31337) % 2600000), note: '' };
      if (i === 2) { r.companyWh = null; r.inTransit = null; r.momoWh = null; r.note = '假資料：三倉都空白'; }
      doc.months[ym] = r;
      ym = _invNextYm(ym); i++;
    }
  }
  const api = {
    TS,
    subscribe: (cb) => { listeners.add(cb); cb(snap()); return () => listeners.delete(cb); },
    getDoc: () => Promise.resolve({ exists: () => true, data: () => snap() }),
    writePaths: (pairs) => {
      if (!Array.isArray(pairs) || !pairs.length) return Promise.resolve({ ok: true });
      for (const [segs, v] of pairs) {
        let o = doc;
        for (let i = 0; i < segs.length - 1; i++) { if (!o[segs[i]] || typeof o[segs[i]] !== 'object') o[segs[i]] = {}; o = o[segs[i]]; }
        const last = segs[segs.length - 1];
        if (v === TS) { o[last + 'Ms'] = Date.now(); delete o[last]; }
        else o[last] = v && typeof v === 'object' ? clone(v) : v;
      }
      emit();
      return Promise.resolve({ ok: true });
    },
  };
  return { doc, listeners, api };
}
window.__inventoryMock = function (on) {
  if (!_invIsLocalHost()) {
    console.warn('[inventory] 模擬模式只在 localhost 可用');
    return false;
  }
  const want = !!on;
  _invResetSub();
  _invYearOpen.clear();
  _invMock = want ? _invMakeMock(on === 'demo') : null;
  console.warn(want ? '[inventory] 模擬模式已開啟：資料只在本機記憶體' : '[inventory] 模擬模式已關閉，改回雲端');
  if (App.route === 'inventory') App.render();
  return want;
};
