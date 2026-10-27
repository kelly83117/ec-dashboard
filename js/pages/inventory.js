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
 *   期間（_invRange：近 12／近 24 個月／全部，預設 24）一律停在最新一個有數字的月份（同統計卡「本月」，_invLatestYm），
 *   只在記憶體；切換時只重畫圖表。
 * 第 3 塊：匯入舊 Google 試算表，Console 打 __inventoryImportLegacy()（只限管理員；先預覽，再 { commit: true } 才寫）。
 *   資料不進程式碼；匯入的月份多 source:'legacy-sheet'、legacyRow 兩個欄位（畫面不顯示）。
 * 盤點欄只留日期：兩個盤點欄存檔時先經過 _invCleanCountNote（「蝦皮04/30填」→「4/30」，整理不了照原文存）；
 *   舊資料用 Console 打 __inventoryCleanCountNotes()（只限管理員；先預覽，再 { commit: true } 才寫）。
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
// 圖表期間：以「資料中最新的月份」往回算（不是今天），資料不足就顯示全部有的月份。只在記憶體（切頁保留、重新整理回預設）。
const INV_RANGES = Object.freeze([{ k: '12', n: 12, l: '近 12 個月' }, { k: '24', n: 24, l: '近 24 個月' }, { k: 'all', n: 0, l: '全部' }]);
let _invRange = '24';
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
// 盤點欄只留日期（純函式）。ch＝這一欄的通路：'shopee'（盤點（蝦皮））或 'momo'（盤點（MOMO））。回 { v, ok }：
//   去頭尾空白（含全形空白）→ 只去掉【這一欄自己的】通路名（蝦皮欄：蝦皮；MOMO 欄：MOMO / MO，不分大小寫）及後面的空白、冒號
//   → 去掉結尾的「填」→ 剩下是 M/D（M 1～12、D 1～31，可有前導 0）⇒ { v:'M/D'（不帶前導 0）, ok:true }。
//   剩下不是 M/D（例如「失真」「13/1」）⇒ 原文不改（只去頭尾空白）、ok:false（無法整理）。
//   開頭是【另一個】通路名（資料可能放錯欄，例如蝦皮欄的「MO 9/30」）不會被剝掉，剩下的就不是 M/D ⇒ 自然落到「無法整理」，不必另外判斷。
//   空白 ⇒ { v:'', ok:true }。D 不檢查大小月（2/30 照樣整理），只是備註、沒有年份可判斷閏年。
const INV_CN_OWN = { shopee: /^蝦皮[\s\u3000:：]*/, momo: /^(momo|mo)[\s\u3000:：]*/i };
function _invCleanCountNote(s, ch) {
  const orig = String(s == null ? '' : s).replace(/^[\s\u3000]+|[\s\u3000]+$/g, '');
  if (orig === '') return { v: '', ok: true };
  const t = orig.replace(INV_CN_OWN[ch] || /^$/, '').replace(/[\s\u3000]*填[\s\u3000]*$/, '').replace(/^[\s\u3000]+|[\s\u3000]+$/g, '');
  const m = /^(\d{1,2})\/(\d{1,2})$/.exec(t);
  if (m && +m[1] >= 1 && +m[1] <= 12 && +m[2] >= 1 && +m[2] <= 31) return { v: (+m[1]) + '/' + (+m[2]), ok: true };
  return { v: orig, ok: false };
}
const INV_CN_FIELDS = Object.freeze({ countNoteShopee: 'shopee', countNoteMomo: 'momo' });
function _invDecide(col, raw, cur, fromBlur) {
  let t = String(raw == null ? '' : raw).trim();
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
  // 盤點欄：先整理成日期再比對、再存（整理不了就照原文存，不擋）
  if (INV_CN_FIELDS[col.k]) t = _invCleanCountNote(t, INV_CN_FIELDS[col.k]).v;
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
// 「最近盤點」那行的文字（未 escape）。備註本身已含通路名（蝦皮 / MO）就原樣顯示，不含才加前綴；沒填的那一邊不顯示。
//   例：蝦皮10/1、MO 9/30填 ⇒「最近盤點：蝦皮10/1／MO 9/30填（2026/09）」；10/1、9/30 ⇒「最近盤點：蝦皮 10/1／MOMO 9/30（2026/09）」
//   （盤點欄只留日期起）先經過 _invCleanCountNote 整理成日期，再一律加「蝦皮 」/「MOMO 」前綴；沒填的那一邊不顯示。
//   整理不了的照原文顯示：原文已含這一欄的通路名就不再加前綴（避免「蝦皮 蝦皮盤點延後」），不含才加。
//   例：蝦皮10/1、MO 9/30填 ⇒「最近盤點：蝦皮 10/1／MOMO 9/30（2026/09）」；失真 ⇒「蝦皮 失真」
function _invCountNoteText(cnt) {
  if (!cnt) return '';
  const parts = [];
  const one = (raw, ch, label, own) => {
    if (!raw) return;
    const c = _invCleanCountNote(raw, ch);
    parts.push(c.ok ? label + ' ' + c.v : (own.test(c.v) ? c.v : label + ' ' + c.v));
  };
  one(cnt.shopee, 'shopee', '蝦皮', /蝦皮/);
  one(cnt.momo, 'momo', 'MOMO', /mo/i);
  return '最近盤點：' + parts.join('／') + '（' + _invYmLabel(cnt.ym) + '）';
}
// 圖表資料：X 軸＝最早到最新的每一個日曆月（中間沒有的月份也列出、值 null ⇒ 斷線）；
//   每條線的值：總計用 _invTotal，三倉用原數字；不是數字 ⇒ null。
//   range：'12' / '24' / 'all'（沒給＝全部）。
//   終點一律是「最新一個有數字的月份」——跟統計卡的「本月」同一個判斷（_invLatestYm：三倉至少一格有數字），
//     所以月初剛新增、還沒填的月份不會被算進去（不會出現最後一點是空的）。「全部」也一樣。
//     三倉都沒有數字（_invLatestYm 是 null）⇒ 照原本以最新月份 key 為終點（圖上全是空的，同之前的空狀態）。
//   近 12／近 24 個月：從終點往回取 N 個日曆月；資料不足 N 個月就從最早的月份開始。全部：最早的月份到終點。
function _invChartData(months, range) {
  const keys = Object.keys(months || {}).filter(_invIsYm).sort();
  if (!keys.length) return { labels: [], yms: [], series: {} };
  let yms = [];
  for (let ym = keys[0]; ym <= keys[keys.length - 1]; ym = _invNextYm(ym)) yms.push(ym);
  yms = yms.slice(0, yms.indexOf(_invLatestYm(months) || keys[keys.length - 1]) + 1);
  const r = INV_RANGES.find(x => x.k === range);
  if (r && r.n && yms.length > r.n) yms = yms.slice(yms.length - r.n);
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
// be.getDoc() 的結果 → 資料物件（文件不存在 ⇒ null）。所有讀 getDoc 結果的地方一律走這裡。
//   Firestore DocumentSnapshot：exists() 為 false ⇒ null；否則 data({ serverTimestamps:'estimate' })。
//   🔴 一定要帶 estimate（#376）：寫完立刻讀回時，serverTimestamp 可能還沒從伺服器回到本機，
//     不帶參數的 data() 會把它讀成 null ⇒ 匯入的讀回比對 57 個月全部「讀回不一致（createdAt）」，其實資料都寫對了。
//     estimate 會給本機估計的時間（Timestamp），伺服器回來後就是正式值。
//   一般物件照用（舊寫法 / 測試替身）；null、undefined ⇒ null。
function _invDocData(s) {
  if (s == null) return null;
  if (typeof s.data === 'function') {
    const ex = typeof s.exists === 'function' ? s.exists() : s.exists !== false;
    if (!ex) return null;
    return s.data({ serverTimestamps: 'estimate' }) || {};
  }
  return typeof s === 'object' ? s : null;
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
  return `<td class="inv-cell inv-cell-${col.t}"><input class="inv-in inv-in-${col.t}${INV_CN_FIELDS[col.k] ? ' inv-in-cnt' : ''}${saving ? ' inv-saving' : ''}" type="text"`
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
  // 表頭：數字欄（含總計、較上月）靠右、文字欄靠左，內縮都跟輸入框文字一樣（css .inv-th-num / .inv-th-txt）
  //   表頭跟著該欄內容的對齊方向：數字欄靠右（inv-th-num）、兩個盤點欄置中（inv-th-cnt）、備註靠左（inv-th-txt）
  //   「自動」標籤放在字【前面】：靠右時切齊數字右緣的是「總計」「較上月」這幾個字，不是標籤
  const thCls = c => (c.t === 'txt' ? (INV_CN_FIELDS[c.k] ? 'inv-th-cnt' : 'inv-th-txt') : 'inv-th-num') + (c.t === 'auto' ? ' inv-th-auto' : '');
  const head = `<tr><th class="inv-ym" scope="col">月份</th>${INV_COLS.map(c => `<th scope="col" class="${thCls(c)}">${c.t === 'auto' ? '<span class="inv-auto-tag">自動</span>' : ''}${escapeHtml(c.l)}</th>`).join('')}</tr>`;
  // 固定欄寬（css .inv-table 是 table-layout:fixed）：月份、六個數字欄、兩個盤點各有寬度，備註拿剩下的
  const colCls = c => (c.k === 'note' ? 'inv-col-note' : c.t === 'txt' ? 'inv-col-cnt' : 'inv-col-num');
  const cols = `<colgroup><col class="inv-col-ym">${INV_COLS.map(c => `<col class="${colCls(c)}">`).join('')}</colgroup>`;
  const body = years.map((y, rank) => {
    const open = _invYearOpenOf(y, rank);
    const ms = keys.filter(k => k.startsWith(y + '-'));
    return `<tbody class="inv-year${open ? ' inv-year-open' : ''}">`
      + `<tr class="inv-year-row"><th colspan="${INV_COLS.length + 1}"><button type="button" class="inv-year-btn" data-inv-act="year" data-year="${escapeHtml(y)}" aria-expanded="${open ? 'true' : 'false'}">${open ? '▾' : '▸'} ${escapeHtml(y)} 年<span class="inv-year-n">${ms.length} 個月</span></button></th></tr>`
      + (open ? ms.map(k => _invRowHtml(k, months, ro)).join('') : '')
      + '</tbody>';
  }).join('');
  return `<div class="inv-table-wrap"><table class="inv-table">${cols}<thead>${head}</thead>${body}</table></div>`;
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
  const cntHtml = cnt ? `<p class="inv-count-note">${escapeHtml(_invCountNoteText(cnt))}</p>` : '';
  return `<div class="stat-grid inv-stat-grid">
        ${card('total', '本月總庫存', c.total, '較上月 ' + diff)}
        ${card('company', '公司倉', c.companyWh)}
        ${card('transit', '在途存貨', c.inTransit)}
        ${card('momo', 'MOMO倉', c.momoWh)}
      </div>${cntHtml}`;
}
// 期間鈕（樣式同線條切換鈕）。切換時只換這一塊（#inv-range-btns）並重畫圖表，不整頁重畫
function _invRangeBtnsHtml() {
  return INV_RANGES.map(r => {
    const on = _invRange === r.k;
    return `<button type="button" class="pill inv-range-btn${on ? ' active' : ''}" data-inv-act="range" data-range="${escapeHtml(r.k)}" aria-pressed="${on ? 'true' : 'false'}">${escapeHtml(r.l)}</button>`;
  }).join('');
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
        <div class="inv-chart-hd"><span class="inv-chart-title">庫存走勢</span><span class="filter-spacer"></span><span class="inv-range" id="inv-range-btns">${_invRangeBtnsHtml()}</span>${btns}</div>
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
    const data = _invChartData(_invMonths(), _invRange);
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
          // 月份標籤自動間隔：autoSkip，另外最多 12 個標籤（「全部」五年多 60 個月時不會擠在一起）
          x: { ticks: { color: muted || undefined, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 }, grid: { display: false } },
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
      const data = _invDocData(await be.getDoc()) || {};
      const got = data.months && data.months[ym] ? data.months[ym][f] : undefined;
      if ((got === undefined ? null : got) !== v) {
        console.warn('[inventory] 讀回不一致', { 月份: ym, 欄位: f, 寫入值: v, 讀回值: got, 讀回型別: got === null ? 'null' : typeof got });
        fail('讀回不一致');
      }
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
      // 讀回只檢查這個月份存在（不檢查 createdAt 的值）；仍走 _invDocData，跟其他讀回一致
      const data = _invDocData(await be.getDoc()) || {};
      if (data.months && data.months[ym]) showToast('✓ 已新增 ' + _invYmLabel(ym), 'success');
      else {
        console.warn('[inventory] 新增月份讀回找不到', { 月份: ym, 讀回的月份數: data.months ? Object.keys(data.months).length : 0 });
        showToast('❌ 沒有新增（讀回找不到 ' + _invYmLabel(ym) + '）', 'error', 6000);
      }
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
  } else if (act === 'range') {
    // 期間：只換期間鈕那一塊、重畫圖表；不整頁重畫（表格、卡片、較上月都不動）
    const k = b.dataset.range;
    if (!INV_RANGES.some(r => r.k === k) || k === _invRange) return;
    _invRange = k;
    const box = document.getElementById('inv-range-btns');
    if (box) box.innerHTML = _invRangeBtnsHtml();
    _invDrawChart();
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

/* ---------- 第 3 塊：匯入舊 Google 試算表「元創數位公司庫存&MOMO庫存統計表」（只給管理員，Console 打 __inventoryImportLegacy()） ----------
 * 資料不進程式碼：使用者自己從試算表「檔案 → 下載 → CSV」存檔，在彈窗裡選檔 → 解析 → Console 預覽（console.table）。
 * 兩段式：__inventoryImportLegacy() 只預覽、不寫；__inventoryImportLegacy({ commit: true }) 才拿上一次預覽結果寫入。
 * 已存在的月份（months 裡有這個 key，不管有沒有數字）一律跳過、不覆蓋；寫入前再用雲端現值確認一次。
 * 寫入：一個年份一次 writePaths（同一批原子成功或失敗），寫完讀回逐月逐欄比對；一批失敗不中斷。重跑時已寫入的月份會被跳過，可以安全接續。
 * 每月寫入 7 個欄位＋source:'legacy-sheet'＋legacyRow（試算表列號）＋createdAt/By、updatedAt/By（執行者、伺服器時間）；文件頂層沒有 schema 時補 schema:1。
 * 試算表的「總計」「前月份比較」不寫（畫面即時算），只拿來對帳：差超過 INV_LEGACY_TOL 元列出來，照樣寫入。
 * 下面 _invLegacy* 是純函式（不碰 DOM、不碰雲端），工具與測試共用。 */
const INV_LEGACY_TOL = 1;   // 對帳容許差（元）：差超過 1 元才算不一致
const INV_LEGACY_FIELDS = Object.freeze(['companyWh', 'inTransit', 'momoWh', 'countNoteShopee', 'countNoteMomo', 'orderAmount', 'note']);

// RFC 4180（同 issues.js _issLegacyParseCsv）：引號內可含逗號與換行，"" 代表一個 "；CRLF / LF / CR 都當換行；去 BOM。
//   回 { ok:true, rows:[{ row: 試算表列號（從 1）, cells }] } 或 { ok:false, error }
function _invLegacyParseCsv(text) {
  let s = String(text == null ? '' : text);
  if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
  const rows = [];
  let row = [], cell = '', q = false;
  const endRow = () => { row.push(cell); rows.push(row); row = []; cell = ''; };
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\r') { if (s[i + 1] === '\n') i++; endRow(); }
    else if (ch === '\n') endRow();
    else cell += ch;
  }
  if (q) return { ok: false, error: 'CSV 格式錯誤：有引號沒有閉合（檔案可能不完整）' };
  if (cell !== '' || row.length) endRow();
  return { ok: true, rows: rows.map((cells, i) => ({ row: i + 1, cells })) };
}
const _invLegacyTrim = v => String(v == null ? '' : v).replace(/[\s　 ]+/g, ' ').trim();
// 數字格 → { v: 數字或 null, warn: 字串或 null }。看不懂一律 null＋警告，不猜。
function _invLegacyNum(raw) {
  const orig = _invLegacyTrim(raw);
  if (orig === '') return { v: null, warn: null };
  if (/^#[A-Z0-9\/]+[!?]?$/i.test(orig)) return { v: null, warn: '試算表錯誤值 ' + orig };
  let t = orig.replace(/NT\$|\$|,|\s/g, '').replace(/[－−]/g, '-');
  if (t === '-') return { v: null, warn: '只有「-」，不確定是 0 還是沒填，當空白' };
  let neg = false;
  const p = /^\((.+)\)$/.exec(t);
  if (p) { neg = true; t = p[1]; }
  if (!/^-?\d+(\.\d+)?$/.test(t) || (neg && t[0] === '-')) return { v: null, warn: '看不懂：' + orig };
  let v = parseFloat(t);
  if (neg) v = -v;
  const dec = (t.split('.')[1] || '').length;
  // 四捨五入用十進位字串位移（'2200.555e2'），避開 2200.555*100＝220055.49999… 的浮點誤差；負數照絕對值進位
  if (dec > 2) return { v: (v < 0 ? -1 : 1) * Math.round(parseFloat(t.replace('-', '') + 'e2')) / 100, warn: '超過 2 位小數，四捨五入：' + orig };
  return { v, warn: null };
}
// 月份格 → { ok:true, ym } 或 { ok:false, reason }。接受 2022/01、2022/1、2022-01、2022.01、2022年1月、2022/1/1（日期只接受 1 號）。
function _invLegacyYm(raw) {
  const t = _invLegacyTrim(raw).replace(/\s/g, '');
  if (t === '') return { ok: false, reason: '月份空白' };
  let m = /^(\d{4})[\/\-.](\d{1,2})$/.exec(t) || /^(\d{4})年(\d{1,2})月$/.exec(t);
  let day = null;
  if (!m) { const d = /^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/.exec(t); if (d) { m = d; day = +d[3]; } }
  if (!m) return { ok: false, reason: '月份看不懂：' + _invLegacyTrim(raw) };
  const y = +m[1], mo = +m[2];
  if (y < 2000 || y > 2099) return { ok: false, reason: '年份不合理：' + _invLegacyTrim(raw) };
  if (mo < 1 || mo > 12) return { ok: false, reason: '月份不合理：' + _invLegacyTrim(raw) };
  if (day != null && day !== 1) return { ok: false, reason: '月份是日期但不是 1 號：' + _invLegacyTrim(raw) };
  return { ok: true, ym: y + '-' + String(mo).padStart(2, '0') };
}
// 表頭列 → 欄位對應；不是表頭回 null。必要欄：月份、公司倉、在途、MOMO倉、總計。
//   盤點備註：表頭寫「蝦皮」「MOMO」就照表頭（named）；只有一個「盤點」欄（合併儲存格）⇒ 它＋右邊表頭空白那欄，看內容判斷（merged）。
function _invLegacyHeader(cells) {
  const c = (cells || []).map(_invLegacyTrim);
  const find = (re, used) => c.findIndex((x, i) => !used.has(i) && re.test(x));
  const used = new Set(), col = {};
  const take = (k, re) => { const i = find(re, used); if (i >= 0) { used.add(i); col[k] = i; } return i; };
  take('ym', /月份/);
  take('companyWh', /公司倉/);
  take('inTransit', /在途/);
  take('momoWh', /MOMO\s*倉/i);
  take('total', /總計/);
  if (['ym', 'companyWh', 'inTransit', 'momoWh', 'total'].some(k => col[k] == null)) return null;
  take('prevDiff', /前月|比較/);
  take('orderAmount', /叫貨/);
  const notes = c.map((x, i) => (!used.has(i) && /盤點/.test(x)) ? i : -1).filter(i => i >= 0);
  const sh = notes.find(i => /蝦皮/.test(c[i])), mo = notes.find(i => /MO/i.test(c[i]) && !/蝦皮/.test(c[i]));
  if (sh != null && mo != null) { col.noteA = sh; col.noteB = mo; col.noteMode = 'named'; }
  else if (notes.length === 1) {
    col.noteA = notes[0];
    if (notes[0] + 1 < c.length && c[notes[0] + 1] === '' && !used.has(notes[0] + 1)) col.noteB = notes[0] + 1;
    col.noteMode = 'merged';
  } else if (notes.length >= 2) { col.noteA = notes[0]; col.noteB = notes[1]; col.noteMode = 'merged'; }
  return col;
}
// 盤點備註兩格 → { shopee, momo, warn }。named：照表頭；merged：含 MO ⇒ MOMO、含蝦皮 ⇒ 蝦皮，都不含照位置（左蝦皮、右 MOMO）。
function _invLegacyNotes(a, b, mode) {
  a = _invLegacyTrim(a); b = _invLegacyTrim(b);
  if (mode === 'named') return { shopee: a, momo: b, warn: null };
  const tag = x => { if (!x) return null; const s = /蝦皮/.test(x), m = /mo/i.test(x); return s && !m ? 'shopee' : m && !s ? 'momo' : null; };
  const ta = tag(a), tb = tag(b);
  const other = t => (t === 'shopee' ? 'momo' : 'shopee');
  let ca = 'shopee', cb = 'momo', warn = null;
  if (ta && tb && ta === tb) warn = '兩格盤點備註看起來都是' + (ta === 'shopee' ? '蝦皮' : 'MOMO') + '，照欄位順序放（左蝦皮、右 MOMO）';
  else if (ta) { ca = ta; cb = other(ta); }
  else if (tb) { cb = tb; ca = other(tb); }
  const out = { shopee: '', momo: '', warn };
  if (a) out[ca] = a;
  if (b) out[cb] = b;
  return out;
}
// 叫貨金額 → { v, noteText, warn }：整格是數字就用；否則抽數字，剛好一個就用；抽不到或兩個以上 ⇒ null，原文放 note。
function _invLegacyOrder(raw) {
  const t = _invLegacyTrim(raw);
  if (t === '') return { v: null, noteText: '', warn: null };
  const n = _invLegacyNum(t);
  if (n.v != null && !n.warn) return { v: n.v, noteText: '', warn: null };
  const nums = t.match(/\d[\d,]*(?:\.\d+)?/g) || [];
  if (nums.length === 1) return { v: parseFloat(nums[0].replace(/,/g, '')), noteText: '', warn: null };
  return { v: null, noteText: '叫貨金額原文：' + t, warn: '叫貨金額' + (nums.length ? '有 ' + nums.length + ' 個數字' : '沒有數字') + '，原文放備註：' + t };
}
// 一列裡「盤點備註、叫貨金額、備註」的判斷（純函式）。回 { shopee, momo, orderAmount, note, warns[] }。
//   ① 有表頭名稱的欄照既有規則：盤點日備註 / 蝦皮 / MOMO 欄走 _invLegacyNotes；叫貨欄（例如「當月新增叫貨總計」）走 _invLegacyOrder。
//   ② 「前月份比較」（沒有就「總計」）右邊、表頭空白的欄（包含超出表頭長度的欄），逐格看內容（trim 後空白略過）：
//      開頭 MO（不分大小寫）⇒ MOMO 盤點；開頭「蝦皮」⇒ 蝦皮盤點；
//      含「叫貨」：以冒號結尾的標籤（例如「2/27叫貨金額:」）⇒ 取右邊緊鄰那格，是單純數字就當候選（那格不再判斷）；
//                  否則抽數字，剛好一個 ⇒ 候選，零個或兩個以上 ⇒ 不明確；
//      單純數字 ⇒ 叫貨金額候選；單獨一個「-」略過；其他文字 ⇒ 備註。
//   ③ 叫貨金額只有「剛好一個候選、而且沒有任何不明確」才採用；否則 null，相關原文全部放進備註「叫貨金額原文：…」並警告。
//      同類盤點備註兩格以上 ⇒ 用「／」串起來並警告；備註多段用「；」串起來。
function _invLegacyExtras(cells, col, hdr) {
  cells = cells || []; hdr = hdr || [];
  const warns = [], shopee = [], momo = [], texts = [], cands = [], unclear = [], orderRaw = [];
  const get = k => (col[k] == null ? '' : cells[col[k]]);
  if (col.noteA != null || col.noteB != null) {
    const nt = _invLegacyNotes(get('noteA'), get('noteB'), col.noteMode);
    if (nt.shopee) shopee.push(nt.shopee);
    if (nt.momo) momo.push(nt.momo);
    if (nt.warn) warns.push(nt.warn);
  }
  const fixed = new Set(['ym', 'companyWh', 'inTransit', 'momoWh', 'total', 'prevDiff', 'orderAmount', 'noteA', 'noteB'].map(k => col[k]).filter(v => v != null));
  const anchor = col.prevDiff != null ? col.prevDiff : col.total;
  const consumed = new Set();
  const isPureNum = t => { const n = _invLegacyNum(t); return n.v != null && !n.warn ? n.v : null; };
  const last = Math.max(cells.length, hdr.length);
  for (let i = anchor + 1; i < last; i++) {
    if (fixed.has(i) || consumed.has(i) || _invLegacyTrim(hdr[i]) !== '') continue;
    const t = _invLegacyTrim(cells[i]);
    if (!t || t === '-') continue;
    if (/^mo/i.test(t)) { momo.push(t); continue; }
    if (/^蝦皮/.test(t)) { shopee.push(t); continue; }
    if (/叫貨/.test(t)) {
      if (/[:：]\s*$/.test(t)) {
        const nb = _invLegacyTrim(cells[i + 1]);
        const v = nb ? isPureNum(nb) : null;
        if (v != null) { cands.push(v); orderRaw.push(t + nb); consumed.add(i + 1); }
        else { unclear.push(t); orderRaw.push(t); warns.push('叫貨金額標籤右邊不是數字：' + t + (nb ? ' ' + nb : '')); }
        continue;
      }
      const nums = t.match(/\d[\d,]*(?:\.\d+)?/g) || [];
      if (nums.length === 1) { cands.push(parseFloat(nums[0].replace(/,/g, ''))); orderRaw.push(t); }
      else { unclear.push(t); orderRaw.push(t); warns.push('叫貨金額不明確（' + (nums.length ? nums.length + ' 個數字' : '沒有數字') + '）：' + t); }
      continue;
    }
    const v = isPureNum(t);
    if (v != null) { cands.push(v); orderRaw.push(t); continue; }
    texts.push(t);
  }
  // 有表頭的叫貨欄（照既有 _invLegacyOrder 規則）；被左邊標籤取走的那格不再判斷
  if (col.orderAmount != null && !consumed.has(col.orderAmount)) {
    const raw = _invLegacyTrim(get('orderAmount'));
    if (raw) {
      const od = _invLegacyOrder(raw);
      if (od.v != null) { cands.push(od.v); orderRaw.push(raw); }
      else { unclear.push(raw); orderRaw.push(raw); if (od.warn) warns.push(od.warn); }
    }
  }
  let orderAmount = null, orderNote = '';
  if (cands.length === 1 && !unclear.length) orderAmount = cands[0];
  else if (orderRaw.length) {
    orderNote = '叫貨金額原文：' + orderRaw.join('、');
    if (cands.length) warns.push('叫貨金額不採用（候選 ' + cands.length + ' 個、不明確 ' + unclear.length + ' 個），原文放備註');
  }
  if (shopee.length > 1) warns.push('蝦皮盤點備註有 ' + shopee.length + ' 格，用「／」串起來');
  if (momo.length > 1) warns.push('MOMO 盤點備註有 ' + momo.length + ' 格，用「／」串起來');
  return { shopee: shopee.join('／'), momo: momo.join('／'), orderAmount, note: texts.concat(orderNote ? [orderNote] : []).join('；'), warns };
}
// 這個月是不是整列沒有資料（三倉、兩個盤點備註、叫貨金額、備註全部空白）⇒ 不寫入
function _invLegacyIsBlank(f) {
  return ['companyWh', 'inTransit', 'momoWh', 'orderAmount'].every(k => f[k] == null)
    && ['countNoteShopee', 'countNoteMomo', 'note'].every(k => !f[k]);
}
// 整份 CSV 的列 → 匯入計畫（純函式）。existing＝雲端已有的 months（判斷「已存在」與對帳時的上個月）。
//   回 { ok, error?, headers, items:[{ ym, row, status:'write'|'exists'|'blank', fields, sheetTotal, sheetPrev, warns[], recon[] }], skipped:[{ row, reason, text }], ignored }
function _invLegacyBuild(rows, existing) {
  existing = existing || {};
  let col = null, hdr = null, headers = 0, ignored = 0;
  const raw = [], skipped = [];
  for (const r of rows || []) {
    const cells = r.cells || [];
    const h = _invLegacyHeader(cells);
    if (h) { col = h; hdr = cells; headers++; continue; }
    const blank = cells.every(x => _invLegacyTrim(x) === '');
    if (!col || blank) { ignored++; continue; }   // 第一個表頭之前（大標題）、空白列
    const get = k => (col[k] == null ? '' : cells[col[k]]);
    const y = _invLegacyYm(get('ym'));
    if (!y.ok) {
      const others = cells.filter((x, i) => i !== col.ym && _invLegacyTrim(x) !== '');
      if (!others.length) { ignored++; continue; }   // 只有年份分組字樣（例如「2023 年」）
      skipped.push({ row: r.row, reason: y.reason, text: cells.map(_invLegacyTrim).join(',').slice(0, 40) });
      continue;
    }
    const warns = [];
    const fields = {};
    ['companyWh', 'inTransit', 'momoWh'].forEach(k => {
      const n = _invLegacyNum(get(k));
      fields[k] = n.v;
      if (n.warn) warns.push(({ companyWh: '公司倉', inTransit: '在途存貨', momoWh: 'MOMO倉' })[k] + '：' + n.warn);
    });
    const ex = _invLegacyExtras(cells, col, hdr);
    fields.countNoteShopee = ex.shopee;
    fields.countNoteMomo = ex.momo;
    fields.orderAmount = ex.orderAmount;
    fields.note = ex.note;
    warns.push(...ex.warns);
    raw.push({ ym: y.ym, row: r.row, fields, sheetTotal: _invLegacyNum(get('total')), sheetPrev: _invLegacyNum(get('prevDiff')), warns, hasPrevCol: col.prevDiff != null });
  }
  if (!headers) return { ok: false, error: '找不到表頭：沒有任何一列同時有「月份」「公司倉」「在途」「MOMO倉」「總計」', headers, items: [], skipped, ignored };
  // 同一個月份出現兩次以上 ⇒ 全部跳過，不猜要用哪一列
  const byYm = new Map();
  raw.forEach(it => { if (!byYm.has(it.ym)) byYm.set(it.ym, []); byYm.get(it.ym).push(it); });
  const items = [];
  byYm.forEach((list, ym) => {
    if (list.length > 1) { list.forEach(it => skipped.push({ row: it.row, reason: _invYmLabel(ym) + ' 重複（第 ' + list.map(x => x.row).join('、') + ' 列）', text: '' })); return; }
    items.push(list[0]);
  });
  items.sort((a, b) => (a.ym < b.ym ? -1 : 1));
  skipped.sort((a, b) => a.row - b.row);
  // 對帳：上一個月優先用這次 CSV，其次雲端已存在的
  const csvMap = new Map(items.map(it => [it.ym, it.fields]));
  const fmt = v => _invFmtNum(v) || '空白';
  items.forEach(it => {
    it.recon = [];
    // 空白月份（例如試算表先排好、還沒填的 2026/10～12）：不寫、不對帳、不算錯誤
    if (_invLegacyIsBlank(it.fields)) { it.status = 'blank'; delete it.hasPrevCol; return; }
    it.status = Object.prototype.hasOwnProperty.call(existing, it.ym) ? 'exists' : 'write';
    const tot = _invTotal(it.fields);
    if (it.sheetTotal.v == null) it.recon.push('試算表沒有總計' + (it.sheetTotal.warn ? '（' + it.sheetTotal.warn + '）' : '') + '，略過比對');
    else if (tot == null || Math.abs(tot - it.sheetTotal.v) > INV_LEGACY_TOL) it.recon.push('總計：試算表 ' + fmt(it.sheetTotal.v) + '／算出 ' + fmt(tot));
    if (it.hasPrevCol) {
      const pym = _invPrevYm(it.ym);
      const prevRow = csvMap.has(pym) ? csvMap.get(pym) : existing[pym];
      const pt = _invTotal(prevRow);
      if (it.sheetPrev.v == null) { if (_invLegacyTrim(it.sheetPrev.warn)) it.recon.push('試算表前月份比較：' + it.sheetPrev.warn + '，略過比對'); }
      else if (tot == null || pt == null) it.recon.push('前月份比較無法比對（' + (tot == null ? '本月' : _invYmLabel(pym)) + '沒有總計）');
      else if (Math.abs((tot - pt) - it.sheetPrev.v) > INV_LEGACY_TOL) it.recon.push('前月份比較：試算表 ' + fmt(it.sheetPrev.v) + '／算出 ' + fmt(Math.round((tot - pt) * 100) / 100));
    }
    delete it.hasPrevCol;
  });
  return { ok: true, headers, items, skipped, ignored };
}
// 一個月的寫入路徑（每個欄位一條；月份 key 原本不存在 ⇒ 等於新建）
function _invLegacyMonthPairs(it, by, TS) {
  const base = ['months', it.ym];
  const pairs = INV_LEGACY_FIELDS.map(k => [base.concat(k), it.fields[k]]);
  pairs.push([base.concat('source'), 'legacy-sheet'], [base.concat('legacyRow'), it.row],
    [base.concat('createdAt'), TS], [base.concat('createdBy'), by], [base.concat('updatedAt'), TS], [base.concat('updatedBy'), by]);
  return pairs;
}
// 要寫的月份依年份分批：[{ year, items }]，年份由舊到新
function _invLegacyBatches(items) {
  const m = new Map();
  items.forEach(it => { const y = it.ym.slice(0, 4); if (!m.has(y)) m.set(y, []); m.get(y).push(it); });
  return [...m.keys()].sort().map(year => ({ year, items: m.get(year) }));
}
// 讀回比對時「應該讀到什麼」（診斷表用）：七個欄位是寫入值；createdAt 是「時間（不能是 null）」
function _invLegacyWant(it, by, k) {
  if (INV_LEGACY_FIELDS.includes(k)) return it.fields[k];
  if (k === 'source') return 'legacy-sheet';
  if (k === 'legacyRow') return it.row;
  if (k === 'createdBy') return by.username;
  if (k === 'createdAt') return '伺服器時間（不能是 null）';
  return '';
}
// 讀回比對一個月：回不一致的欄位清單
function _invLegacyVerify(got, it, by) {
  const bad = [];
  if (!got || typeof got !== 'object') return ['整個月份'];
  INV_LEGACY_FIELDS.forEach(k => { if ((got[k] === undefined ? null : got[k]) !== it.fields[k]) bad.push(k); });
  if (got.source !== 'legacy-sheet') bad.push('source');
  if (got.legacyRow !== it.row) bad.push('legacyRow');
  if (!got.createdBy || got.createdBy.username !== by.username) bad.push('createdBy');
  if (got.createdAt == null) bad.push('createdAt');
  return bad;
}

let _invLegacy = null;   // 上一次預覽：{ build, fileName, at, backend }；寫入或切換模擬 / 雲端時清掉
const _invLegacyStatusLabel = s => (s === 'write' ? '寫入' : s === 'blank' ? '略過（空白月份）' : '跳過（已存在）');
function _invLegacyPrintPreview(st) {
  const b = st.build;
  console.table(b.items.map(it => ({
    月份: _invYmLabel(it.ym), 列: it.row, 狀態: _invLegacyStatusLabel(it.status),
    公司倉: it.fields.companyWh, 在途存貨: it.fields.inTransit, MOMO倉: it.fields.momoWh,
    算出總計: _invTotal(it.fields), 試算表總計: it.sheetTotal.v,
    對帳: it.recon.join('；') || '✓', 盤點蝦皮: it.fields.countNoteShopee, 盤點MOMO: it.fields.countNoteMomo,
    叫貨金額: it.fields.orderAmount, 備註: it.fields.note, 警告: it.warns.join('；'),
  })));
  if (b.skipped.length) { console.warn('[inventory] 整列跳過 ' + b.skipped.length + ' 列：'); console.table(b.skipped.map(s => ({ 列: s.row, 原因: s.reason, 原文: s.text }))); }
  const bad = b.items.filter(it => it.recon.some(x => /：試算表/.test(x)));
  if (bad.length) { console.warn('[inventory] 對帳不一致 ' + bad.length + ' 個月（照樣寫入）：'); console.table(bad.map(it => ({ 月份: _invYmLabel(it.ym), 對帳: it.recon.join('；') }))); }
  console.log('[inventory] ' + _invLegacySummary(b) + '。要寫入請在 Console 打 __inventoryImportLegacy({ commit: true })');
}
function _invLegacySummary(b) {
  const w = b.items.filter(it => it.status === 'write').length, bl = b.items.filter(it => it.status === 'blank').length, ex = b.items.length - w - bl;
  const warns = b.items.reduce((s, it) => s + it.warns.length, 0);
  const bad = b.items.filter(it => it.recon.some(x => /：試算表/.test(x))).length;
  return '要寫入 ' + w + ' 個月、已存在跳過 ' + ex + ' 個月、整列跳過 ' + b.skipped.length + ' 列、空白月份略過 ' + bl + ' 個、警告 ' + warns + ' 格、對帳不一致 ' + bad + ' 個月';
}
function _invLegacyOutHtml(msg, cls) {
  return `<div class="inv-imp-msg${cls ? ' ' + cls : ''}">${escapeHtml(msg)}</div>`;
}
// 解析 CSV 文字 → 存預覽 → 印 Console（彈窗與測試共用）。回 _invLegacy 或 { error }
function _invLegacyLoad(text, fileName) {
  _invLegacy = null;
  const parsed = _invLegacyParseCsv(text);
  if (!parsed.ok) return { error: parsed.error };
  const build = _invLegacyBuild(parsed.rows, _invMonths());
  if (!build.ok) return { error: build.error };
  _invLegacy = { build, fileName: fileName || '', at: Date.now(), backend: _invBackend() };
  _invLegacyPrintPreview(_invLegacy);
  return _invLegacy;
}
async function _invLegacyCommit() {
  const st = _invLegacy;
  if (!st) { console.warn('[inventory] 沒有預覽結果：請先不帶參數呼叫 __inventoryImportLegacy() 選檔預覽'); return { ok: false, wrote: 0, skipped: 0, failed: 0 }; }
  const be = _invBackend();
  if (!be || typeof be.writePaths !== 'function' || typeof be.getDoc !== 'function') { console.warn('[inventory] 雲端尚未就緒，這次不寫'); return { ok: false, wrote: 0, skipped: 0, failed: 0 }; }
  if (be !== st.backend) { _invLegacy = null; console.warn('[inventory] 預覽之後切換過模擬 / 雲端，請重新預覽'); return { ok: false, wrote: 0, skipped: 0, failed: 0 }; }
  _invLegacy = null;   // 先清掉：寫入中再呼叫一次 commit 也不會重寫
  const by = _invBy();
  const readDoc = async () => _invDocData(await be.getDoc()) || {};   // 寫入前重查、補 schema 判斷、寫完讀回都用它（#376：要 estimate）
  const diag = [];   // 讀回不一致的明細（最多印 20 列）：月份、欄位、寫入值、讀回值、讀回型別
  const results = [];
  const n = { wrote: 0, skipped: 0, failed: 0 };
  st.build.items.filter(it => it.status !== 'write').forEach(it => { results.push({ 月份: _invYmLabel(it.ym), 結果: it.status === 'blank' ? '略過（空白月份）' : '跳過（預覽時已存在）' }); n.skipped++; });
  for (const batch of _invLegacyBatches(st.build.items.filter(it => it.status === 'write'))) {
    let doc;
    try { doc = await readDoc(); }
    catch (e) { batch.items.forEach(it => { results.push({ 月份: _invYmLabel(it.ym), 結果: '失敗：讀不到雲端現值 ' + ((e && (e.code || e.message)) || e) }); n.failed++; }); continue; }
    const months = (doc.months && typeof doc.months === 'object') ? doc.months : {};
    const todo = batch.items.filter(it => {
      if (!Object.prototype.hasOwnProperty.call(months, it.ym)) return true;
      results.push({ 月份: _invYmLabel(it.ym), 結果: '跳過（預覽後才出現，已存在）' }); n.skipped++; return false;
    });
    if (!todo.length) continue;
    const pairs = [];
    if (doc.schema === undefined) pairs.push([['schema'], 1]);
    todo.forEach(it => pairs.push(..._invLegacyMonthPairs(it, by, be.TS)));
    let bad = null;
    try {
      const r = await be.writePaths(pairs);
      if (!(r && r.ok)) bad = '未寫入雲端（被擋下：唯讀帳號或本機防護）';
      else {
        const got = await readDoc();
        const gm = (got.months && typeof got.months === 'object') ? got.months : {};
        todo.forEach(it => {
          const diff = _invLegacyVerify(gm[it.ym], it, by);
          if (diff.length) {
            results.push({ 月份: _invYmLabel(it.ym), 結果: '失敗：讀回不一致（' + diff.join('、') + '）' }); n.failed++;
            const g = gm[it.ym] || {};
            diff.forEach(k => { const want = _invLegacyWant(it, by, k), v = g[k];
              diag.push({ 月份: _invYmLabel(it.ym), 欄位: k, 寫入值: want, 讀回值: v && typeof v.toDate === 'function' ? '時間 ' + _invFmtAt(v) : v, 讀回型別: v === null ? 'null' : typeof v }); });
          }
          else { results.push({ 月份: _invYmLabel(it.ym), 結果: '✓ 已寫入' }); n.wrote++; }
        });
      }
    } catch (e) {
      bad = '失敗：' + ((e && (e.code || e.message)) || e);
      console.warn('[inventory] 匯入 ' + batch.year + ' 年寫入或讀回時出錯', { code: e && e.code, message: e && e.message, error: e });
    }
    if (bad) todo.forEach(it => { results.push({ 月份: _invYmLabel(it.ym), 結果: bad }); n.failed++; });
  }
  results.sort((a, b) => (a.月份 < b.月份 ? -1 : 1));
  console.table(results);
  if (diag.length) {
    console.warn('[inventory] 讀回不一致明細（' + diag.length + ' 格' + (diag.length > 20 ? '，只列前 20 格' : '') + '）：');
    console.table(diag.slice(0, 20));
  }
  const msg = '[inventory] 匯入完成：寫入 ' + n.wrote + ' 個月、跳過 ' + n.skipped + ' 個月、失敗 ' + n.failed + ' 個月' + (n.failed ? '。失敗的月份可以重新預覽後再 commit 一次（已寫入的會被跳過）' : '');
  (n.failed ? console.warn : console.log)(msg);
  if (App.route === 'inventory') App.render();
  return { ok: n.failed === 0, ...n };
}

Object.assign(App, {
  _invOpenLegacyImport() {
    this.openModal({
      title: '匯入舊庫存試算表（CSV）',
      width: 'min(640px, 94vw)',
      hideFooter: true,
      bodyHtml: `
      <p class="inv-imp-note">選從 Google 試算表「檔案 → 下載 → 逗號分隔值（.csv）」存下來的檔案。這一步<b>只預覽、不寫入</b>，結果印在 Console（console.table）。已存在的月份一律跳過、不覆蓋。</p>
      <div class="field"><input type="file" id="inv-imp-file" class="inv-imp-file" accept=".csv,text/csv"></div>
      <div id="inv-imp-out" class="inv-imp-out"></div>`,
      onMount: () => {
        const inp = document.getElementById('inv-imp-file');
        const out = () => document.getElementById('inv-imp-out');
        if (inp) inp.addEventListener('change', () => {
          const f = inp.files && inp.files[0];
          if (!f) return;
          const r = new FileReader();
          r.onload = () => {
            const st = _invLegacyLoad(String(r.result || ''), f.name);
            const o = out(); if (!o) return;
            o.innerHTML = st.error ? _invLegacyOutHtml(st.error, 'inv-imp-err')
              : _invLegacyOutHtml(_invLegacySummary(st.build) + '。明細在 Console；要寫入請在 Console 打 __inventoryImportLegacy({ commit: true })', 'inv-imp-sum');
          };
          r.onerror = () => { const o = out(); if (o) o.innerHTML = _invLegacyOutHtml('讀檔失敗', 'inv-imp-err'); };
          r.readAsText(f, 'utf-8');
        });
      },
    });
  },
});
window.__inventoryImportLegacy = function (opts) {
  const me = App.currentUser;
  if (!me || me.role !== 'admin') { console.warn('[inventory] 只有管理員可以匯入舊庫存試算表'); return false; }
  if (opts && opts.commit === true) return _invLegacyCommit();
  _invEnsureSub();
  if (!_invLoaded) { console.warn('[inventory] 庫存資料還沒載入（先進一次「庫存」頁），為了判斷哪些月份已經存在，這次不執行'); return false; }
  App._invOpenLegacyImport();
  return true;
};

/* ---------- 盤點欄只留日期：舊資料一次性清理（只給管理員，Console 打 __inventoryCleanCountNotes()） ----------
 * 兩段式同匯入：__inventoryCleanCountNotes() 只預覽（console.table：月份、欄位、改前、改後、狀態）、不寫；
 *   __inventoryCleanCountNotes({ commit: true }) 才拿上一次預覽寫入。
 * 只寫「會改」的格子：每格只送那一個欄位路徑，每個有寫到的月份各加一組 updatedAt / updatedBy；不動 createdAt / createdBy、不動其他欄位。
 * 依年份分批；每批寫入前用雲端現值重比，跟預覽時的「改前」不同（有人剛改過）就跳過並列出，不蓋掉；寫完用 _invDocData（estimate）讀回逐格比對。
 * 寫入前先清掉預覽（連按兩次只寫一次）；切換模擬 / 雲端時清掉預覽（__inventoryMock）。 */
const INV_CN_LABEL = { countNoteShopee: '盤點（蝦皮）', countNoteMomo: '盤點（MOMO）' };
const INV_CN_STATUS = { change: '會改', same: '不用改', unclean: '無法整理' };
// 預覽清單（純函式）：只列有內容的盤點格。回 [{ ym, f, before, after, status:'change'|'same'|'unclean' }]，依月份、蝦皮→MOMO 排序
function _invCleanBuild(months) {
  const rows = [];
  Object.keys(months || {}).filter(_invIsYm).sort().forEach(ym => {
    const r = months[ym];
    if (!r || typeof r !== 'object') return;
    Object.keys(INV_CN_FIELDS).forEach(f => {
      const before = typeof r[f] === 'string' ? r[f] : '';
      if (before.replace(/[\s\u3000]/g, '') === '') return;
      const c = _invCleanCountNote(before, INV_CN_FIELDS[f]);
      rows.push({ ym, f, before, after: c.ok ? c.v : before, status: !c.ok ? 'unclean' : (c.v === before ? 'same' : 'change') });
    });
  });
  return rows;
}
let _invCleanPlan = null;   // 上一次預覽：{ rows, backend, at }；寫入或切換模擬 / 雲端時清掉
function _invCleanSummary(rows) {
  const n = k => rows.filter(x => x.status === k).length;
  return { change: n('change'), same: n('same'), unclean: n('unclean') };
}
function _invCleanPreview() {
  const rows = _invCleanBuild(_invMonths());
  _invCleanPlan = { rows, backend: _invBackend(), at: Date.now() };
  console.table(rows.map(x => ({ 月份: _invYmLabel(x.ym), 欄位: INV_CN_LABEL[x.f], 改前: x.before, 改後: x.after, 狀態: INV_CN_STATUS[x.status] })));
  const s = _invCleanSummary(rows);
  console.log('[inventory] 盤點欄只留日期：會改 ' + s.change + ' 格、不用改 ' + s.same + ' 格、無法整理 ' + s.unclean + ' 格。'
    + (s.change ? '要寫入請在 Console 打 __inventoryCleanCountNotes({ commit: true })' : '沒有要改的格子'));
  return s;
}
async function _invCleanCommit() {
  const st = _invCleanPlan;
  const none = { ok: false, changed: 0, skipped: 0, failed: 0 };
  if (!st) { console.warn('[inventory] 沒有預覽結果：請先不帶參數呼叫 __inventoryCleanCountNotes()'); return none; }
  const be = _invBackend();
  if (!be || typeof be.writePaths !== 'function' || typeof be.getDoc !== 'function') { console.warn('[inventory] 雲端尚未就緒，這次不寫'); return none; }
  if (be !== st.backend) { _invCleanPlan = null; console.warn('[inventory] 預覽之後切換過模擬 / 雲端，請重新預覽'); return none; }
  _invCleanPlan = null;   // 先清掉：寫入中再呼叫一次 commit 也不會重寫
  const by = _invBy();
  const readDoc = async () => _invDocData(await be.getDoc()) || {};
  const results = [], diag = [];
  const n = { changed: 0, skipped: 0, failed: 0 };
  const res = (x, text) => results.push({ 月份: _invYmLabel(x.ym), 欄位: INV_CN_LABEL[x.f], 改前: x.before, 改後: x.after, 結果: text });
  const todoAll = st.rows.filter(x => x.status === 'change');
  for (const batch of _invLegacyBatches(todoAll)) {
    let doc;
    try { doc = await readDoc(); }
    catch (e) { batch.items.forEach(x => { res(x, '失敗：讀不到雲端現值 ' + ((e && (e.code || e.message)) || e)); n.failed++; }); continue; }
    const months = (doc.months && typeof doc.months === 'object') ? doc.months : {};
    // 寫入前重比：雲端現值跟預覽時的「改前」不同 ⇒ 有人剛改過，跳過、不蓋掉
    const todo = batch.items.filter(x => {
      const cur = months[x.ym] && typeof months[x.ym][x.f] === 'string' ? months[x.ym][x.f] : '';
      if (cur === x.before) return true;
      res(x, '跳過（雲端已被改過：現值「' + cur + '」）'); n.skipped++; return false;
    });
    if (!todo.length) continue;
    const pairs = todo.map(x => [['months', x.ym, x.f], x.after]);
    [...new Set(todo.map(x => x.ym))].forEach(ym => pairs.push([['months', ym, 'updatedAt'], be.TS], [['months', ym, 'updatedBy'], by]));
    let bad = null;
    try {
      const r = await be.writePaths(pairs);
      if (!(r && r.ok)) bad = '未寫入雲端（被擋下：唯讀帳號或本機防護）';
      else {
        const gm = ((await readDoc()).months) || {};
        todo.forEach(x => {
          const got = gm[x.ym] ? gm[x.ym][x.f] : undefined;
          if (got === x.after) { res(x, '✓ 已改'); n.changed++; }
          else {
            res(x, '失敗：讀回不一致'); n.failed++;
            diag.push({ 月份: _invYmLabel(x.ym), 欄位: INV_CN_LABEL[x.f], 寫入值: x.after, 讀回值: got, 讀回型別: got === null ? 'null' : typeof got });
          }
        });
      }
    } catch (e) {
      bad = '失敗：' + ((e && (e.code || e.message)) || e);
      console.warn('[inventory] 清理盤點欄 ' + batch.year + ' 年寫入或讀回時出錯', { code: e && e.code, message: e && e.message, error: e });
    }
    if (bad) todo.forEach(x => { res(x, bad); n.failed++; });
  }
  results.sort((a, b) => (a.月份 < b.月份 ? -1 : a.月份 > b.月份 ? 1 : 0));
  console.table(results);
  if (diag.length) { console.warn('[inventory] 讀回不一致明細（' + diag.length + ' 格' + (diag.length > 20 ? '，只列前 20 格' : '') + '）：'); console.table(diag.slice(0, 20)); }
  const msg = '[inventory] 盤點欄清理完成：已改 ' + n.changed + ' 格、跳過 ' + n.skipped + ' 格、失敗 ' + n.failed + ' 格' + (n.failed ? '。失敗的格子可以重新預覽後再 commit 一次（已改好的會變成「不用改」）' : '');
  (n.failed ? console.warn : console.log)(msg);
  if (App.route === 'inventory') App.render();
  return { ok: n.failed === 0, ...n };
}
window.__inventoryCleanCountNotes = function (opts) {
  const me = App.currentUser;
  if (!me || me.role !== 'admin') { console.warn('[inventory] 只有管理員可以清理盤點欄'); return false; }
  if (opts && opts.commit === true) return _invCleanCommit();
  _invEnsureSub();
  if (!_invLoaded) { console.warn('[inventory] 庫存資料還沒載入（先進一次「庫存」頁），這次不執行'); return false; }
  return _invCleanPreview();
};

/* ---------- 本機模擬開關：__inventoryMock(true / 'demo' / false) ----------
 * 只在 localhost / 127.0.0.1 / [::1] / *.localhost 生效；正式站呼叫只印警告、回 false、什麼都不改。
 * 開啟後資料來源換成記憶體 mock（介面同 __cloudInventory，writePaths 照 FieldPath 語意），不碰 Firestore / Store / localStorage。
 *   'demo'：塞 2024/01～上個月的假數字（含幾格空白），方便看畫面。 */
function _invMakeMock(demo) {
  const TS = Symbol('mockTS');
  const doc = { schema: 1, months: {} };
  const listeners = new Set();
  const clone = o => JSON.parse(JSON.stringify(o));
  const tsOf = ms => ({ toDate: () => new Date(ms) });   // 像 Firestore Timestamp（有 toDate）
  // 剛寫入、「伺服器還沒回來」的時間欄位（'YYYY-MM\u0001欄位'）。照 Firestore 的行為（#376）：
  //   這段期間 data() 不帶參數 ⇒ null；data({ serverTimestamps:'estimate' }) ⇒ 本機估計的時間。
  //   下一輪（推播之前）才算伺服器回來，所以「寫完立刻 getDoc 讀回」一定會碰到這段期間。
  const pending = new Set();
  const reviveAt = (o, estimate) => {   // JSON clone 會丟掉 toDate，讀出時補回
    Object.entries(o.months || {}).forEach(([ym, r]) => { ['createdAt', 'updatedAt'].forEach(k => {
      if (r && _invIsNum(r[k + 'Ms'])) { r[k] = (pending.has(ym + '\u0001' + k) && !estimate) ? null : tsOf(r[k + 'Ms']); delete r[k + 'Ms']; }
    }); });
    return o;
  };
  const snap = (opts) => reviveAt(clone(doc), !!(opts && opts.serverTimestamps === 'estimate'));
  // 推播放到下一輪（同 Firestore：本機寫入的快照事件不會在 writePaths 的呼叫堆疊裡同步觸發）；推播前伺服器時間已經回來
  const emit = () => setTimeout(() => { pending.clear(); const s = snap(); listeners.forEach(cb => { try { cb(s); } catch (e) { console.error(e); } }); }, 0);
  // getDoc 回傳跟 Firestore DocumentSnapshot 一樣的形狀：id、exists()、data(options)；snapshot 本身沒有 months 等欄位
  const snapshot = () => { const ex = Object.keys(doc).length > 0;
    return { id: 'inventory', exists: () => ex, data: (opts) => (ex ? snap(opts) : undefined) }; };
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
    getDoc: () => Promise.resolve(snapshot()),
    writePaths: (pairs) => {
      if (!Array.isArray(pairs) || !pairs.length) return Promise.resolve({ ok: true });
      for (const [segs, v] of pairs) {
        let o = doc;
        for (let i = 0; i < segs.length - 1; i++) { if (!o[segs[i]] || typeof o[segs[i]] !== 'object') o[segs[i]] = {}; o = o[segs[i]]; }
        const last = segs[segs.length - 1];
        if (v === TS) { o[last + 'Ms'] = Date.now(); delete o[last]; if (segs[0] === 'months' && segs.length === 3) pending.add(segs[1] + '\u0001' + last); }
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
  _invLegacy = null;   // 匯入預覽不跨模擬 / 雲端
  _invCleanPlan = null;   // 盤點欄清理的預覽也是
  _invMock = want ? _invMakeMock(on === 'demo') : null;
  console.warn(want ? '[inventory] 模擬模式已開啟：資料只在本機記憶體' : '[inventory] 模擬模式已關閉，改回雲端');
  if (App.route === 'inventory') App.render();
  return want;
};
