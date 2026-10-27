/* js/pages/issues.js -- 問題追蹤頁（第 1 塊：頁面骨架），以 Object.assign(App, ...) 合併回 App
 *
 * 資料：Firestore collection issues，一筆問題一份 doc，經 window.__cloudIssues（firebase.js）讀寫。
 *   不進 Store / app/main（app/main 曾撞 1MB 上限）。記憶體清單 _issList 只由訂閱快照更新。
 *   寫入只送有變的欄位（update → updateDoc），刪除＝軟刪除（deleted:true）。
 * 事件：data-iss-act ＋ #main-content 上【只綁一次】的具名委派（_issOnClick），不寫 inline onclick，
 *   所以本檔函式不必掛 window。#main-content 本身不會被 render 換掉，只換 innerHTML。
 * 權限：看清單＝所有登入者；新增＝非 view；編輯＝提出人本人或 admin（且非 view）；
 *   狀態切換、指派負責人、刪除＝只有 admin。真正防線仍是資料層（Store 閘門＋__installReadonlyCloudGuard）。
 * 第 2 塊：負責人 assignee（username，未指派＝null）；頁首 4 張計數卡（取代狀態分頁）＋篩選列（只看我負責的、區塊），
 *   篩選狀態只在記憶體。指派人選共用 daily.js 的 window.adjOwnerSelectableUsers（#306 同一份規則）。
 * 第 3 塊：問題附照片（最多 6 張、每張 200KB 以下），存 issue_images（window.__cloudIssueImage），
 *   問題文件 images:[id…] ＋ thumbs:{ id: 小縮圖 }。挑選元件 _issPhotoPicker / 存取層 _issPhotoStore 跟問題無關，時間軸共用。
 *   用量 / 孤兒：Console 打 __issueImageAudit()（只報告）、__issueImageCleanup('確定刪除')。
 * 第 4 塊：後續處理紀錄，存 issue_notes（window.__cloudIssueNotes），一則一份 doc；紀錄照片也存 issue_images（多帶 noteId）。
 *   卡片上同時只展開一個紀錄輸入框（_issComposer），全頁最多一個 paste 監聽；草稿存在記憶體，整頁重畫不會掉。
 * 第 5 塊：匯入舊需求表 CSV，Console 打 __issuesImportLegacy()（只限管理員）；資料不進程式碼，source:'legacy-sheet' 的卡片標「舊需求表匯入」。
 * 本機模擬：Console 打 __issuesMock(true)，只在 localhost 生效、資料只在記憶體（見檔尾）。
 */
const App = window.App;
const { Store, escapeHtml, showToast } = window;

// 區塊清單（依側邊選單實際頁面＋淨利表通路分頁）。存 key、顯示 label；改名只改 label，舊資料不受影響。
const ISS_AREAS = Object.freeze([
  { key: 'dashboard', label: '首頁' },
  { key: 'employees', label: '績效管理' },
  { key: 'daily',     label: '工作日誌' },
  { key: 'kpi',       label: 'KPI' },
  { key: 'profit',    label: '淨利表（蝦皮）' },
  { key: 'momo',      label: 'MOMO' },
  { key: 'coupang',   label: '酷澎' },
  { key: 'pchome',    label: 'PChome' },
  { key: 'insight',   label: '洞察表' },
  { key: 'pricing',   label: '訂價表' },
  { key: 'd3',        label: '商開' },
  { key: 'd4',        label: '設計' },
  { key: 'users',     label: '帳號/權限' },
  { key: 'other',     label: '其他' },
]);
const ISS_PRIORITIES = Object.freeze([
  { key: 'urgent', label: '緊急' },
  { key: 'normal', label: '一般' },
  { key: 'low',    label: '低' },
]);
const ISS_PR_RANK = { urgent: 0, normal: 1, low: 2 };
const ISS_STATUS_LABEL = { open: '待處理', doing: '處理中', done: '已解決' };
// 計數卡（第 2 塊取代第 1 塊的狀態分頁）：未指派只算未解決的
const ISS_CARDS = Object.freeze([
  { key: 'unassigned', label: '未指派', icon: '🙋' },
  { key: 'open',       label: '待處理', icon: '📥' },
  { key: 'doing',      label: '處理中', icon: '🔧' },
  { key: 'done',       label: '已解決', icon: '✅' },
]);
const ISS_RO_MSG = '僅檢視帳號無法提出問題';

let _issList = [];        // 目前資料來源（雲端或模擬）最新快照，含 deleted
let _issLoaded = false;   // 收過第一份快照
let _issUnsub = null;     // 目前訂閱的取消函式
let _issMock = null;      // 模擬模式：{ items: Map, listeners: Set, api }；null＝走雲端
let _issCard = null;      // 選中的計數卡（null＝不篩）；再點同一張＝取消。只在記憶體
let _issMine = false;     // 篩選列「只看我負責的」
let _issArea = '';        // 篩選列區塊（''＝全部）
let _issBusy = false;     // 卡片按鈕寫入中（防連點）

/* ---------- 小工具 ---------- */
const _issNorm = s => String(s == null ? '' : s).trim().toLowerCase();
const _issAreaLabel = k => { const a = ISS_AREAS.find(x => x.key === k); return a ? a.label : String(k || '其他'); };
const _issPrLabel = k => { const p = ISS_PRIORITIES.find(x => x.key === k); return p ? p.label : '一般'; };
const _issPrKey = k => (ISS_PR_RANK[k] !== undefined ? k : 'normal');
const _issStKey = k => (ISS_STATUS_LABEL[k] ? k : 'open');
function _issFmt(ts) {
  const n = Number(ts);
  if (!n) return '—';
  const d = new Date(n), p = x => String(x).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function _issGenId() {
  // iss- 前綴：Firestore doc id 不可符合 __.*__
  return 'iss-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}
// username → 目前姓名（沿用 makeUserIdentityResolver；對不到顯示原字）
function _issResolver() {
  const mk = window.makeUserIdentityResolver;
  const users = Store.get(Store.KEYS.users, []);
  return typeof mk === 'function' ? mk(Array.isArray(users) ? users : []) : null;
}
function _issName(username, resolve) {
  const raw = String(username == null ? '' : username).trim();
  if (!raw) return '—';
  const id = resolve ? resolve(raw) : null;
  return (id && id.ok) ? id.display : raw;
}
// 舊需求表匯入的問題（source==='legacy-sheet'）：帳號對不到時 username 是 null，改顯示試算表原字（legacyRequester / legacyHandler）。
//   有對到帳號 → 照常顯示姓名；對不到但有原字 → 「原字（舊需求表）」；原字也空白 → 「舊需求表未填」。不是舊資料就跟 _issName 一樣。
function _issPersonLabel(it, username, legacyRaw, resolve) {
  if (String(username == null ? '' : username).trim() || !it || it.source !== 'legacy-sheet') return _issName(username, resolve);
  const raw = String(legacyRaw == null ? '' : legacyRaw).trim();
  return raw ? raw + '（舊需求表）' : '舊需求表未填';
}
// 負責人顯示：同 _issName，帳號停用 / 刪除時加註
function _issAssigneeName(username, resolve) {
  const raw = String(username == null ? '' : username).trim();
  if (!raw) return '';
  const id = resolve ? resolve(raw) : null;
  if (!id || !id.ok) return raw;
  return id.display + (id.status === 'disabled' ? '（已停用）' : (id.status === 'deleted' ? '（已刪除）' : ''));
}
const _issHasAssignee = it => !!String((it && it.assignee) || '').trim();
const _issIsMine = it => { const me = App.currentUser; return !!me && _issHasAssignee(it) && _issNorm(it.assignee) === _issNorm(me.username); };
// 計數卡條件
function _issMatchCard(it, card) {
  const st = _issStKey(it.status);
  if (card === 'unassigned') return st !== 'done' && !_issHasAssignee(it);
  if (card === 'open' || card === 'doing' || card === 'done') return st === card;
  return true;
}
// 篩選列條件（只看我負責的、區塊）
function _issMatchFilter(it) {
  if (_issMine && !_issIsMine(it)) return false;
  if (_issArea && it.area !== _issArea) return false;
  return true;
}
// 計數卡數字：依篩選列算，不受目前選中的卡片影響（點下去列表筆數＝卡上數字）
function _issCounts(list) {
  const c = { unassigned: 0, open: 0, doing: 0, done: 0 };
  list.forEach(it => ISS_CARDS.forEach(k => { if (_issMatchCard(it, k.key)) c[k.key]++; }));
  return c;
}

/* ---------- 權限 ---------- */
const _issMe = () => App.currentUser || null;
const _issIsAdmin = () => { const u = _issMe(); return !!u && u.role === 'admin'; };
const _issIsRO = () => (typeof window.isReadOnly === 'function' ? !!window.isReadOnly() : !!(_issMe() && _issMe().role === 'view'));
const _issCanCreate = () => !!_issMe() && !_issIsRO();
function _issIsOwner(it) {
  const me = _issMe();
  return !!me && !!_issNorm(it && it.createdBy) && _issNorm(it.createdBy) === _issNorm(me.username);
}
const _issCanEdit = it => _issCanCreate() && (_issIsAdmin() || _issIsOwner(it));

/* ---------- 資料來源（雲端 / 本機模擬）唯一入口 ---------- */
function _issIsLocalHost() {
  const h = String((window.location && window.location.hostname) || '').toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1' || h.endsWith('.localhost');
}
function _issBackend() {
  return _issMock ? _issMock.api : (window.__cloudIssues || null);
}
function _issOnSnap(snap) {
  const docs = (snap && Array.isArray(snap.docs)) ? snap.docs : [];
  _issList = docs.map(d => ({ ...(typeof d.data === 'function' ? (d.data() || {}) : {}), id: d.id }));
  _issLoaded = true;
  _issCloudRender();
}
// 雲端推播觸發的重畫（問題、紀錄兩個訂閱共用）。
//   ① 訂閱當下同步回呼（模擬模式會這樣）時不重畫：呼叫端 viewIssues 正在 render，重畫會遞迴
//   ② 焦點在紀錄輸入框裡（正在打字）→ 先記下、等失焦再補畫，避免游標跳掉；草稿另外存在 _issComposer，重畫也不會掉
let _issPendingCloudRender = false;
function _issCloudRender() {
  if (_issSubscribing) return;
  if (_issComposerFocused()) { _issPendingCloudRender = true; return; }
  _issPendingCloudRender = false;
  if (typeof App.renderFromCloud === 'function') App.renderFromCloud('issues');
}
function _issFlushCloudRender() {
  if (_issPendingCloudRender && !_issComposerFocused()) { _issPendingCloudRender = false; if (typeof App.renderFromCloud === 'function') App.renderFromCloud('issues'); }
}
let _issSubscribing = false;
function _issEnsureSub() {
  if (_issUnsub) return true;
  const be = _issBackend();
  if (!be || typeof be.subscribe !== 'function') return false;
  _issSubscribing = true;
  try {
    const un = be.subscribe(_issOnSnap, err => {
      console.error('[issues] 訂閱失敗', err);
      showToast('⚠ 問題追蹤讀取失敗：' + ((err && err.message) || err), 'error', 6000);
    });
    _issUnsub = typeof un === 'function' ? un : () => {};
  } catch (e) {
    console.error('[issues] 訂閱失敗', e);
    return false;
  } finally {
    _issSubscribing = false;
  }
  return true;
}
function _issResetSub() {
  if (_issUnsub) { try { _issUnsub(); } catch {} }
  _issUnsub = null;
  _issList = [];
  _issLoaded = false;
  if (_issNotesUnsub) { try { _issNotesUnsub(); } catch {} }
  _issNotesUnsub = null;
  _issNotes = [];
  _issNotesLoaded = false;
}

/* ---------- 後續處理紀錄（第 4 塊）：issue_notes collection，一則一份 doc ---------- */
let _issNotes = [];          // 全部紀錄（含 deleted）
let _issNotesLoaded = false; // 收過紀錄的第一份快照
let _issNotesUnsub = null;
function _issNotesBackend() {
  return _issMock ? _issMock.notesApi : (window.__cloudIssueNotes || null);
}
function _issOnNotesSnap(snap) {
  const docs = (snap && Array.isArray(snap.docs)) ? snap.docs : [];
  _issNotes = docs.map(d => ({ ...(typeof d.data === 'function' ? (d.data() || {}) : {}), id: d.id }));
  _issNotesLoaded = true;
  _issCloudRender();
}
function _issEnsureNotesSub() {
  if (_issNotesUnsub) return true;
  const be = _issNotesBackend();
  if (!be || typeof be.subscribe !== 'function') return false;
  _issSubscribing = true;
  try {
    const un = be.subscribe(_issOnNotesSnap, err => {
      console.error('[issues] 紀錄訂閱失敗', err);
      showToast('⚠ 後續處理紀錄讀取失敗：' + ((err && err.message) || err), 'error', 6000);
    });
    _issNotesUnsub = typeof un === 'function' ? un : () => {};
  } catch (e) {
    console.error('[issues] 紀錄訂閱失敗', e);
    return false;
  } finally {
    _issSubscribing = false;
  }
  return true;
}
// 某個問題沒刪除的紀錄，由舊到新（新的在下）
function _issNotesOf(issueId) {
  return _issNotes.filter(n => n && n.issueId === issueId && n.deleted !== true)
    .sort((a, b) => ((Number(a.createdAt) || 0) - (Number(b.createdAt) || 0)) || String(a.id).localeCompare(String(b.id)));
}
function _issNoteGenId() {
  return 'ino-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

// 寫入統一包一層：回傳 true＝確定寫入；false＝失敗或被防護擋下（no-op 回 undefined）
async function _issWrite(kind, id, payload) {
  return _issWriteTo(_issBackend(), kind, id, payload);
}
async function _issNoteWrite(kind, id, payload) {
  return _issWriteTo(_issNotesBackend(), kind, id, payload);
}
async function _issWriteTo(be, kind, id, payload) {
  if (!be || typeof be[kind] !== 'function') { showToast('⚠ 雲端尚未就緒，請稍後再試', 'error', 5000); return false; }
  try {
    const r = await be[kind](id, payload);
    if (r && r.ok) return true;
    showToast('⚠ 未寫入雲端（唯讀帳號或本機防寫）', 'error', 5000);
    return false;
  } catch (e) {
    console.error('[issues] 寫入失敗', kind, id, e);
    showToast('⚠ 寫入失敗：' + ((e && e.message) || e), 'error', 6000);
    return false;
  }
}

/* ---------- 照片（第 3 塊）：存取層 + 挑選元件 ----------
 * 兩者都不知道「問題」是什麼：ownerId 現在放問題 id，之後處理紀錄時間軸可以放紀錄所屬的問題 id，直接共用。
 * 存放：issue_images collection（window.__cloudIssueImage），不放 task_images —— 老闆任務的 __taskImageAudit
 *   把 task_images 裡不在 ec.bossTasks 的圖都算孤兒，放進去會被 __taskImageCleanup 刪光。
 * 問題文件：images:[圖片 id…]（順序＝顯示順序）＋ thumbs:{ 圖片 id: 小縮圖 dataURL }（卡片只用縮圖，點開才讀全尺寸）。
 * 上傳時機：按送出才上傳（選圖 / 貼圖只在本機壓縮預覽）→ 取消、點背景關窗、關分頁都不會留下孤兒。 */
const ISS_PHOTO_MAX = 6;
const ISS_PHOTO_BYTES = 200 * 1024;   // 每張二進位上限（老闆任務是 500KB）
const ISS_THUMB_EDGE = 240, ISS_THUMB_Q = 0.6;
// _tiCompress 每一級都壓不到 200KB 時，再多試的兩級（只在問題照片用，不影響老闆任務）
const ISS_PHOTO_EXTRA_STEPS = Object.freeze([
  { maxEdge: 1024, q: 0.7,  note: '長邊 1024 JPEG 70' },
  { maxEdge: 800,  q: 0.65, note: '長邊 800 JPEG 65' },
]);
// 長圖（高 > 寬 × 2，或寬 > 高 × 2）：限制長邊會把短邊縮到看不清字（1280×6000 縮到長邊 800 只剩寬 170px），
//   改成「短邊最多 1000px、等比縮放（不放大）」，依序試 JPEG 80 / 70 / 60，上限放寬到 500KB（同老闆任務）。
const ISS_LONG_RATIO = 2;
const ISS_LONG_SHORT_EDGE = 1000;
const ISS_LONG_BYTES = 500 * 1024;
const ISS_LONG_QUALITIES = Object.freeze([0.8, 0.7, 0.6]);
const _issIsLongImage = (w, h) => w > 0 && h > 0 && (h > w * ISS_LONG_RATIO || w > h * ISS_LONG_RATIO);
// 直式長圖整張壓不到 500KB 時自動分段：寬縮到 min(原寬, 1000)，由上往下切，每段先試高 2000，
//   JPEG 80 → 70 → 60 取第一個 ≤ 500KB；某段三級都不行就段高減半重試（2000 → 1000 → 600，最低 600），仍不行才放棄。
//   每段是獨立一張照片（各自上傳、各自縮圖），算進 6 張上限。超寬圖不分段。
const ISS_SEG_FIRST_H = 2000;
const ISS_SEG_MIN_H = 600;
// 依序嘗試的段高：從 2000 起每次減半，低於 600 就用 600 → [2000, 1000, 600]
const ISS_SEG_TRY_H = Object.freeze((() => { const a = []; for (let x = ISS_SEG_FIRST_H; ; x = Math.floor(x / 2)) { const v = Math.max(ISS_SEG_MIN_H, x); a.push(v); if (v === ISS_SEG_MIN_H) return a; } })());
const _issPhotoPart = new Map();   // 分段照片的「第幾段 / 共幾段」（id → { i, n }），給放大檢視標「長圖 1/3」
const _issPhotoCache = new Map();   // 全尺寸 dataURL 快取（id → dataURL），切模擬 / 雲端時清空

function _issPhotoGenId() {
  // iim- 前綴：不符合 Firestore 禁用的 __.*__，也跟老闆任務的 img- 分得開
  return 'iim-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}
function _issBlobToDataUrl(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error('轉檔失敗'));
    r.readAsDataURL(blob);
  });
}
function _issLoadImage(blob) {
  const url = URL.createObjectURL(blob);
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('圖片解碼失敗'));
    i.src = url;
  }).finally(() => URL.revokeObjectURL(url));
}
// 從原圖切一塊畫到 dw×dh 的 canvas（白底，同 _tiDraw），輸出 Blob。sx/sy/sw/sh 是原圖座標（可以是小數）
function _issDrawSlice(img, sx, sy, sw, sh, dw, dh, type, quality) {
  return new Promise(resolve => {
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, dw); cv.height = Math.max(1, dh);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
    cv.toBlob(b => resolve(b), type, quality);
  });
}
// 直式長圖自動分段。座標一律用「縮放後」的整數像素切（每段 [y, y+segH)，合計＝縮放後總高，不漏不重疊），
//   再換算回原圖座標去畫。回 { parts:[…], note } 或 null（有一段在 600 高、JPEG 60 仍超過 500KB）
async function _issSegmentLong(img, w, h) {
  const scale = Math.min(1, ISS_LONG_SHORT_EDGE / w);
  const W = Math.max(1, Math.round(w * scale)), H = Math.max(1, Math.round(h * scale));
  const ky = h / H;   // 縮放後 1px 對應原圖的高度
  const segs = [];
  for (let y = 0; y < H;) {
    let got = null, lastH = 0;
    for (const tryH of ISS_SEG_TRY_H) {
      const segH = Math.min(tryH, H - y);   // 最後一段可以比較矮
      if (segH === lastH) continue;          // 剩下的比這次段高還矮 → 跟上一次同一段，不重試
      lastH = segH;
      for (const q of ISS_LONG_QUALITIES) {
        const b = await _issDrawSlice(img, 0, y * ky, w, segH * ky, W, segH, 'image/jpeg', q);
        if (b && b.size <= ISS_LONG_BYTES) { got = { blob: b, q, y, segH }; break; }
      }
      if (got) break;
    }
    if (!got) return null;   // 這一段縮到最低段高、JPEG 60 仍超過 500KB
    segs.push(got);
    y += got.segH;
  }
  const n = segs.length;
  const qMin = Math.round(Math.min(...segs.map(s => s.q)) * 100);   // 狀態文字寫各段裡最低的品質（不誇大）
  const parts = [];
  for (let i = 0; i < n; i++) {
    const s = segs[i];
    const t = Math.min(1, ISS_THUMB_EDGE / Math.max(W, s.segH));
    const tb = await _issDrawSlice(img, 0, s.y * ky, w, s.segH * ky, Math.max(1, Math.round(W * t)), Math.max(1, Math.round(s.segH * t)), 'image/jpeg', ISS_THUMB_Q);
    parts.push({
      dataUrl: await _issBlobToDataUrl(s.blob), mime: 'image/jpeg', bytes: s.blob.size,
      note: '長圖 ' + (i + 1) + '/' + n + '：寬 ' + W + ' JPEG ' + Math.round(s.q * 100),
      thumb: tb ? await _issBlobToDataUrl(tb) : '', part: { i: i + 1, n }, segY: s.y, segH: s.segH, width: W,
    });
  }
  return { parts, note: '長圖分 ' + n + ' 段：寬 ' + W + ' JPEG ' + qMin, totalH: H };
}
// 壓縮：沿用 daily.js 的 window._tiCompress（給 200KB 上限）＋ window._tiDraw。
//   回 { dataUrl, mime, bytes, note, thumb }；一般圖壓不下來回 null；長圖壓不下來回 { fail: 提示文字 }。
async function _issCompressPhoto(file) {
  const comp = window._tiCompress, draw = window._tiDraw;
  if (typeof comp !== 'function' || typeof draw !== 'function') throw new Error('壓縮功能未載入');
  const img = await _issLoadImage(file);
  const w = img.naturalWidth, h = img.naturalHeight;
  let c = null;
  if (_issIsLongImage(w, h)) {
    // 短邊縮到最多 1000（不放大）。_tiDraw 吃的是「長邊上限」→ 傳「長邊 × 縮放比」就得到同一個縮放比
    const shortE = Math.min(w, h), longE = Math.max(w, h);
    const scale = Math.min(1, ISS_LONG_SHORT_EDGE / shortE);
    const label = (h > w ? '寬 ' : '高 ') + Math.max(1, Math.round(shortE * scale));
    for (const q of ISS_LONG_QUALITIES) {
      const b = await draw(img, longE * scale, 'image/jpeg', q);
      if (b && b.size <= ISS_LONG_BYTES) { c = { blob: b, mime: 'image/jpeg', bytes: b.size, note: '長圖：' + label + ' JPEG ' + Math.round(q * 100) }; break; }
    }
    if (!c) {
      // 整張壓不下來：直式長圖自動分段（超寬圖不分段，維持現狀）
      if (h > w) { const seg = await _issSegmentLong(img, w, h); if (seg) return seg; }
      return { fail: '圖太長，請分段截圖' };
    }
  } else {
    // 一般圖：照舊（200KB 上限＋兩級補救）
    c = await comp(file, ISS_PHOTO_BYTES);
    if (!c) {
      for (const s of ISS_PHOTO_EXTRA_STEPS) {
        const b = await draw(img, s.maxEdge, 'image/jpeg', s.q);
        if (b && b.size <= ISS_PHOTO_BYTES) { c = { blob: b, mime: 'image/jpeg', bytes: b.size, note: s.note }; break; }
      }
    }
    if (!c) return null;
  }
  const tb = await draw(img, ISS_THUMB_EDGE, 'image/jpeg', ISS_THUMB_Q);
  return { dataUrl: await _issBlobToDataUrl(c.blob), mime: c.mime, bytes: c.bytes, note: c.note, thumb: tb ? await _issBlobToDataUrl(tb) : '' };
}

// 存取層：依模擬模式切換雲端 / 記憶體。upload 失敗丟錯；remove 是 best-effort（回 true / false、不丟錯）；get 回 dataURL 或 null
const _issPhotoStore = {
  // extra 選填：{ noteId }（紀錄照片多記所屬紀錄；問題本身的照片不帶，文件格式跟第 3 塊一樣）
  async upload(ownerId, item, extra) {
    if (!_issCanCreate()) throw new Error(ISS_RO_MSG);
    const id = _issPhotoGenId();
    const data = {
      issueId: ownerId || '', data: item.dataUrl, mime: item.mime || '', bytes: item.bytes || 0,
      createdAt: Date.now(), createdBy: (_issMe() && _issMe().username) || '',
    };
    if (item.part) { data.part = { i: item.part.i, n: item.part.n }; _issPhotoPart.set(id, data.part); }   // 長圖分段：第幾段 / 共幾段
    if (extra && extra.noteId) data.noteId = extra.noteId;
    if (_issMock) { _issMock.photos.set(id, data); _issPhotoCache.set(id, item.dataUrl); return id; }
    const c = window.__cloudIssueImage;
    if (!c || typeof c.setImage !== 'function') throw new Error('雲端尚未就緒');
    const r = await c.setImage(id, data);
    if (!(r && r.ok)) throw new Error('未寫入雲端（唯讀帳號或本機防寫）');
    _issPhotoCache.set(id, item.dataUrl);
    return id;
  },
  async remove(id) {
    _issPhotoCache.delete(id);
    if (_issMock) { _issMock.photos.delete(id); return true; }
    const c = window.__cloudIssueImage;
    if (!c || typeof c.removeImage !== 'function') return false;
    try { const r = await c.removeImage(id); return !!(r && r.ok); }
    catch (e) { console.warn('[issues photo] 刪除失敗（之後由 __issueImageAudit 找出）', id, e); return false; }
  },
  async get(id) {
    if (_issPhotoCache.has(id)) return _issPhotoCache.get(id);
    if (_issMock) { const d = _issMock.photos.get(id); if (d && d.part) _issPhotoPart.set(id, d.part); return d ? d.data : null; }
    const c = window.__cloudIssueImage;
    if (!c || typeof c.getDoc !== 'function') return null;
    try {
      const s = await c.getDoc(id);
      const d = (s && typeof s.exists === 'function' && s.exists()) ? (s.data() || {}) : null;
      if (d && d.part && d.part.n > 1) _issPhotoPart.set(id, { i: Number(d.part.i) || 0, n: Number(d.part.n) || 0 });
      if (d && d.data) { _issPhotoCache.set(id, d.data); return d.data; }
      return null;
    } catch { return null; }
  },
};

const _issModalOpen = () => { const b = document.getElementById('modal-backdrop'); return !!b && b.classList.contains('show'); };
const _issIsTextField = t => !!t && (t.tagName === 'TEXTAREA' || t.isContentEditable === true
  || (t.tagName === 'INPUT' && /^(text|search|url|email|tel|number|)$/i.test(t.type || '')));

// 照片挑選元件：選檔 / Ctrl+V / 壓縮 / 預覽 / 移除 / 上限。
//   opts：{ root（含 .ti-list / .ti-status / [data-iss-photo="pick"] 的容器）, max, existing:[{ id, thumb }],
//           initialItems（選填：還原草稿用，picker.items() 的回傳值）, accept（選填：貼上判斷）, onChange（選填：清單變了就呼叫） }
//   回傳：{ items(), added(), removed(), busy(), alive(), attach(newRoot), destroy() }；items 依顯示順序，
//     既有的 { key, id, thumb, isNew:false }、新的 { key, dataUrl, thumb, bytes, mime, part?, isNew:true }
// paste 監聽綁在 document（焦點不在輸入框時貼上事件只到 body，綁在彈窗上收不到；同老闆任務 daily.js），三道保險不殘留到別頁：
//   ① 送出成功 / 取消 / ✕ → 呼叫端 destroy()
//   ② 每次貼上先問 accept(e, root)：回 'ok' 處理、'skip' 不處理、'destroy' 自己拆掉不處理。
//      預設（彈窗用）＝「彈窗開著、照片區還在畫面上」才 'ok'，否則 'destroy'（點背景關窗不會呼叫 onCancel，靠這條）。
//      卡片上的紀錄輸入框另給一套（_issComposerAccept）。
//   ③ 開新的挑選元件前，先 destroy 上一個（_issActivePicker）→ 全頁同時最多一個 paste 監聽
// attach(newRoot)：整頁重畫後把同一個元件（含處理中的照片）接到新的照片區，不用拆掉重建。
let _issActivePicker = null;
const _issModalAccept = (e, root) => ((_issModalOpen() && document.body.contains(root)) ? 'ok' : 'destroy');
function _issPhotoPicker(opts) {
  if (_issActivePicker) _issActivePicker.destroy();
  let root = opts.root;
  const max = opts.max || ISS_PHOTO_MAX, accept = opts.accept || _issModalAccept;
  let listEl = root.querySelector('.ti-list'), statusEl = root.querySelector('.ti-status');
  let items = (opts.existing || []).map(e => ({ key: e.id, id: e.id, thumb: e.thumb || '', isNew: false }));
  if (Array.isArray(opts.initialItems)) items = items.concat(opts.initialItems.map(x => ({ ...x })));
  const removed = [];
  // 新照片的 key 從還原進來的最大編號往後接，避免撞號（草稿可能移除過中間幾張）
  let pending = 0, destroyed = false;
  let seq = items.reduce((m, x) => { const n = /^new-(\d+)$/.exec(String(x.key || '')); return n ? Math.max(m, +n[1]) : m; }, 0);
  const changed = () => { if (typeof opts.onChange === 'function') { try { opts.onChange(items.slice()); } catch (e) { console.error(e); } } };
  const setStatus = (msg, isErr) => {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.hidden = !msg;
    statusEl.classList.toggle('is-err', !!isErr);
  };
  const draw = () => {
    if (!listEl || destroyed) return;
    listEl.innerHTML = items.map(it => `
            <div class="ti-thumb" data-key="${escapeHtml(it.key)}">
              ${(it.thumb || it.dataUrl) ? `<img src="${escapeHtml(it.thumb || it.dataUrl)}" alt="照片">` : '<span class="iss-photo-missing">📷</span>'}
              <button type="button" class="ti-del" data-key="${escapeHtml(it.key)}" title="移除">✕</button>
              ${it.isNew ? `<span class="ti-size">${it.part ? escapeHtml(it.part.i + '/' + it.part.n) + '・' : ''}${escapeHtml(String(Math.round((it.bytes || 0) / 1024)))} KB</span>` : ''}
            </div>`).join('');
  };
  const addFiles = async (files) => {
    const imgs = Array.from(files || []).filter(f => f && String(f.type || '').startsWith('image/'));
    const notImg = Array.from(files || []).length - imgs.length;
    let skipped = 0;
    for (const f of imgs) {
      if (destroyed) return;
      if (items.length + pending >= max) { skipped++; continue; }
      pending++;
      setStatus('處理中…');
      try {
        const c = await _issCompressPhoto(f);
        if (destroyed) return;
        if (!c) { setStatus('有一張圖太大，壓縮後仍超過 200KB，請先裁切', true); continue; }
        if (c.fail) { setStatus(c.fail, true); continue; }   // 長圖縮到短邊 1000、JPEG 60 仍超過 500KB（分段也不行）
        if (c.parts) {
          // 長圖分段：每段一張，段數算進上限；格數不夠就一段都不加
          const free = max - items.length - (pending - 1);   // 扣掉其他還在處理中的
          if (c.parts.length > free) {
            setStatus('這張長圖需要 ' + c.parts.length + ' 格，目前只剩 ' + Math.max(0, free) + ' 格，請先移除幾張或分段截圖', true);
            continue;
          }
          c.parts.forEach(p => items.push({ key: 'new-' + (++seq), dataUrl: p.dataUrl, thumb: p.thumb, bytes: p.bytes, mime: p.mime, part: p.part, isNew: true }));
          draw(); changed();
          setStatus('已加入（' + c.note + '）');
          continue;
        }
        items.push({ key: 'new-' + (++seq), dataUrl: c.dataUrl, thumb: c.thumb, bytes: c.bytes, mime: c.mime, isNew: true });
        draw(); changed();
        setStatus('已加入（' + c.note + '）');
      } catch (e) {
        if (!destroyed) setStatus('照片處理失敗：' + ((e && e.message) || '未知錯誤'), true);
      } finally {
        pending--;
      }
    }
    if (skipped) setStatus('最多 ' + max + ' 張，請先移除幾張（略過 ' + skipped + ' 張）', true);
    else if (notImg && !imgs.length) setStatus('只能加入圖片檔', true);
  };
  const onPaste = (e) => {
    if (destroyed) return;
    const verdict = accept(e, root);   // 保險 ②
    if (verdict === 'destroy') { api.destroy(); return; }
    if (verdict !== 'ok') return;
    const cd = e.clipboardData;
    if (!cd) return;
    const files = Array.from(cd.items || []).filter(it => it.kind === 'file' && String(it.type || '').startsWith('image/'))
      .map(it => it.getAsFile()).filter(Boolean);
    if (!files.length) return;   // 沒有圖片 → 照原本行為（文字照常貼進輸入框）
    const hasText = Array.from(cd.types || []).includes('text/plain') && String(cd.getData('text/plain') || '').trim();
    if (hasText && _issIsTextField(e.target)) return;   // 焦點在文字欄、又同時有文字（例：從 Excel 複製）→ 當成貼文字
    e.preventDefault();
    addFiles(files);
  };
  const onClick = (e) => {
    const del = e.target && e.target.closest ? e.target.closest('.ti-del') : null;
    if (del) {
      const k = del.dataset.key, idx = items.findIndex(x => x.key === k);
      if (idx < 0) return;
      const [x] = items.splice(idx, 1);
      if (!x.isNew) removed.push(x.id);   // 既有的只標記，等呼叫端寫入成功才刪雲端
      draw(); setStatus(''); changed();
      return;
    }
    const pick = e.target && e.target.closest ? e.target.closest('[data-iss-photo="pick"]') : null;
    if (!pick) return;
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
    inp.onchange = () => addFiles(inp.files);
    inp.click();
  };
  root.addEventListener('click', onClick);
  document.addEventListener('paste', onPaste);
  const api = {
    items: () => items.slice(),
    added: () => items.filter(x => x.isNew),
    removed: () => removed.slice(),
    busy: () => pending > 0,
    alive: () => !destroyed,
    addFiles,
    attach(newRoot) {
      if (destroyed || !newRoot || newRoot === root) return;
      root.removeEventListener('click', onClick);
      root = newRoot;
      listEl = root.querySelector('.ti-list'); statusEl = root.querySelector('.ti-status');
      root.addEventListener('click', onClick);
      draw();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      document.removeEventListener('paste', onPaste);
      root.removeEventListener('click', onClick);
      if (_issActivePicker === api) _issActivePicker = null;
    },
  };
  _issActivePicker = api;
  draw();
  return api;
}

/* ---------- 紀錄輸入框（composer）：全頁同時只展開一個 ----------
 * 只有展開中的輸入框掛照片挑選元件（＝全頁最多一個 paste 監聽，卡片之間不會互搶）。
 * 另一張卡片的輸入框有內容時不讓切換（請先送出或取消），草稿才不會不見。
 * 整頁重畫（雲端推播、切篩選）會換掉 #main-content：文字與照片存在 _issComposer，bindIssues 重畫後放回去；
 *   照片挑選元件還活著就 attach 到新的照片區（處理中的照片也保住），被彈窗的挑選元件接手過（已拆）就用 initialItems 重建。 */
let _issComposer = null;   // { issueId, text, items, picker, saving }
const _issComposerHasContent = () => !!_issComposer && (!!String(_issComposer.text || '').trim()
  || ((_issComposer.picker && _issComposer.picker.alive()) ? _issComposer.picker.items().length : (_issComposer.items || []).length) > 0
  || !!(_issComposer.picker && _issComposer.picker.alive() && _issComposer.picker.busy()));
function _issComposerFocused() {
  const ta = document.getElementById('iss-note-text');
  return !!ta && !!document.activeElement && document.activeElement === ta;
}
const _issIsInputEl = t => !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable === true);
// 卡片輸入框的貼上規則：在問題追蹤頁、沒開彈窗、照片區在畫面上；焦點在這個輸入框裡，或不在任何輸入元件上（點了空白處）。
//   不符合時只「不處理」，不拆掉（可能只是暫時被彈窗蓋住）；離開問題追蹤頁後第一次貼上才自己拆掉。
function _issComposerAccept(e, root) {
  if (App.route !== 'issues') return 'destroy';
  if (_issModalOpen() || !document.body.contains(root)) return 'skip';
  const box = document.getElementById('iss-composer');
  const t = e && e.target;
  const inBox = !!(box && t && typeof box.contains === 'function' && box.contains(t));
  if (!inBox && _issIsInputEl(t)) return 'skip';
  return 'ok';
}
function _issComposerSync() {
  const st = _issComposer;
  const btn = document.getElementById('iss-note-add');
  if (btn) btn.disabled = !st || !!st.saving || !_issComposerHasContent();
}
function _issComposerClose() {
  if (_issComposer && _issComposer.picker) _issComposer.picker.destroy();
  _issComposer = null;
}
// 重畫後把草稿放回新的輸入框（bindIssues 呼叫）
function _issComposerMount() {
  const st = _issComposer;
  if (!st) return;
  const ta = document.getElementById('iss-note-text'), zone = document.getElementById('iss-note-zone');
  if (!ta || !zone) return;   // 那張卡片目前不在畫面上（被篩掉）：草稿留著，回來再放
  if (ta.value !== st.text) ta.value = st.text || '';
  if (st.picker && st.picker.alive()) st.picker.attach(zone);
  else {
    st.picker = _issPhotoPicker({
      root: zone, max: ISS_PHOTO_MAX, initialItems: st.items || [], accept: _issComposerAccept,
      onChange: list => { if (_issComposer === st) { st.items = list; _issComposerSync(); } },
    });
  }
  _issComposerSync();
}

/* ---------- 排序 / 篩選 ---------- */
function _issVisible() { return _issList.filter(it => it && it.deleted !== true); }
function _issSorted(list) {
  const open = list.filter(it => _issStKey(it.status) !== 'done');
  const done = list.filter(it => _issStKey(it.status) === 'done');
  open.sort((a, b) => (ISS_PR_RANK[_issPrKey(a.priority)] - ISS_PR_RANK[_issPrKey(b.priority)])
    || ((Number(b.createdAt) || 0) - (Number(a.createdAt) || 0)));
  done.sort((a, b) => (Number(b.resolvedAt) || 0) - (Number(a.resolvedAt) || 0));
  return open.concat(done);
}

/* ---------- 畫面 ---------- */
function _issBtn(act, id, text, cls, opts) {
  const o = opts || {};
  return `<button type="button" class="${cls}" data-iss-act="${act}"${id ? ` data-id="${escapeHtml(id)}"` : ''}`
    + (o.disabled ? ' disabled' : '') + (o.title ? ` title="${escapeHtml(o.title)}"` : '') + `>${escapeHtml(text)}</button>`;
}
function _issCardHtml(it, resolve) {
  const st = _issStKey(it.status), pr = _issPrKey(it.priority);
  const isAdmin = _issIsAdmin(), ro = _issIsRO();
  const resolvedLine = (label, extraCls) => `
      <div class="iss-resolution${extraCls}">
        <div class="iss-resolution-label">${escapeHtml(label)}・${escapeHtml(_issPersonLabel(it, it.resolvedBy, it.legacyHandler, resolve))}・${escapeHtml(_issFmt(it.resolvedAt))}</div>
        <div class="iss-resolution-text">${escapeHtml(it.resolution)}</div>
      </div>`;
  let resolution = '';
  if (st === 'done') resolution = resolvedLine('完成說明', '');
  else if (String(it.resolution || '').trim()) resolution = resolvedLine('上次完成說明', ' iss-resolution-prev');
  // 負責人：已指派顯示姓名；未指派且未解決＝醒目標籤；未指派但已解決＝「—」（未指派只對未解決的有意義）
  const hasAsg = _issHasAssignee(it);
  const assignee = hasAsg
    ? `<div class="iss-assignee">負責人：${escapeHtml(_issAssigneeName(it.assignee, resolve))}</div>`
    : (st !== 'done' ? `<div class="iss-assignee"><span class="iss-tag iss-unassigned">未指派</span></div>`
      : `<div class="iss-assignee">負責人：${escapeHtml(it.source === 'legacy-sheet' && String(it.legacyHandler || '').trim() ? _issPersonLabel(it, null, it.legacyHandler, resolve) : '—')}</div>`);
  const acts = [];
  if (isAdmin && !hasAsg && st !== 'done') acts.push(_issBtn('claim', it.id, '我來處理', 'btn-ghost iss-btn iss-btn-claim'));
  if (isAdmin) acts.push(_issBtn('assign', it.id, hasAsg ? '改負責人' : '指派', 'btn-ghost iss-btn'));
  if (isAdmin && st === 'open')  acts.push(_issBtn('start', it.id, '開始處理', 'btn-ghost iss-btn'));
  if (isAdmin && st !== 'done')  acts.push(_issBtn('resolve', it.id, '標記已解決', 'btn-ghost iss-btn iss-btn-done'));
  if (isAdmin && st === 'done')  acts.push(_issBtn('reopen', it.id, '重新開啟', 'btn-ghost iss-btn'));
  if (ro) acts.push(_issBtn('edit', it.id, '編輯', 'btn-ghost iss-btn', { disabled: true, title: ISS_RO_MSG }));
  else if (_issCanEdit(it)) acts.push(_issBtn('edit', it.id, '編輯', 'btn-ghost iss-btn'));
  if (isAdmin) acts.push(_issBtn('delete', it.id, '刪除', 'btn-ghost iss-btn iss-btn-danger'));
  return `
    <div class="iss-card iss-card-${st}" data-id="${escapeHtml(it.id)}">
      <div class="iss-card-head">
        <span class="iss-tag iss-st-${st}">${escapeHtml(ISS_STATUS_LABEL[st])}</span>
        <span class="iss-tag iss-pr-${pr}">${escapeHtml(_issPrLabel(pr))}</span>
        <span class="iss-tag iss-area">${escapeHtml(_issAreaLabel(it.area))}</span>
        ${it.source === 'legacy-sheet' ? '<span class="iss-tag iss-legacy">舊需求表匯入</span>' : ''}
      </div>
      <div class="iss-title">${escapeHtml(it.title)}</div>
      ${String(it.desc || '').trim() ? `<div class="iss-desc">${escapeHtml(it.desc)}</div>` : ''}
      ${_issPhotosHtml(it)}
      <div class="iss-meta">提出：${escapeHtml(_issPersonLabel(it, it.createdBy, it.legacyRequester, resolve))}・${escapeHtml(_issFmt(it.createdAt))}<span class="iss-updated">・最後更新：${escapeHtml(_issFmt(it.updatedAt || it.createdAt))}</span></div>
      ${assignee}
      ${resolution}
      ${acts.length ? `<div class="iss-actions">${acts.join('')}</div>` : ''}
      ${_issNotesHtml(it, resolve)}
    </div>`;
}
// 卡片縮圖列：只用文件裡的 thumbs（小縮圖），點了開放大檢視才讀全尺寸圖；沒有縮圖的顯示 📷
//   問題本身的照片（act='photo'）與紀錄的照片（act='note-photo'）共用
function _issPhotosHtml(it, act) {
  const ids = Array.isArray(it.images) ? it.images.filter(x => typeof x === 'string' && x) : [];
  if (!ids.length) return '';
  const thumbs = (it.thumbs && typeof it.thumbs === 'object') ? it.thumbs : {};
  return `<div class="iss-photos">${ids.map((pid, i) => {
    const t = typeof thumbs[pid] === 'string' ? thumbs[pid] : '';
    return `<button type="button" class="iss-photo" data-iss-act="${act || 'photo'}" data-id="${escapeHtml(it.id)}" data-idx="${i}" title="點開放大（${i + 1} / ${ids.length}）">`
      + (t ? `<img src="${escapeHtml(t)}" alt="照片 ${i + 1}">` : '<span class="iss-photo-missing">📷</span>') + '</button>';
  }).join('')}</div>`;
}
const _issCanDeleteNote = n => _issCanCreate() && (_issIsAdmin()
  || (!!_issNorm(n && n.createdBy) && _issNorm(n.createdBy) === _issNorm((_issMe() || {}).username)));
// 最新一則的摘要（收合時顯示）：文字前 40 字；只有照片 → 「📷 N 張照片」
function _issNoteSummary(n) {
  const text = String(n.text || '').replace(/\s+/g, ' ').trim();
  const pics = Array.isArray(n.images) ? n.images.length : 0;
  if (!text) return pics ? '📷 ' + pics + ' 張照片' : '';
  return (text.length > 40 ? text.slice(0, 40) + '…' : text) + (pics ? '（📷 ' + pics + '）' : '');
}
// 卡片下方的「後續處理紀錄」：預設收合（標題＋最新一則摘要），點開看全部；展開狀態只在記憶體
const _issNotesOpen = new Set();
function _issNotesHtml(it, resolve) {
  const notes = _issNotesOf(it.id);
  const open = _issNotesOpen.has(it.id);
  const last = notes[notes.length - 1];
  const head = `<button type="button" class="iss-notes-head" data-iss-act="notes-toggle" data-id="${escapeHtml(it.id)}" aria-expanded="${open ? 'true' : 'false'}">
          <span class="iss-notes-title">${open ? '▾' : '▸'} 後續處理紀錄（${notes.length}）</span>
          ${!open && last ? `<span class="iss-notes-latest">${escapeHtml(_issName(last.createdBy, resolve) + '・' + _issFmt(last.createdAt) + '：' + _issNoteSummary(last))}</span>` : ''}
        </button>`;
  let body = '';
  if (open) {
    const list = notes.length ? `<ol class="iss-timeline">${notes.map(n => `
          <li class="iss-note" data-note="${escapeHtml(n.id)}">
            <div class="iss-note-meta">${escapeHtml(_issName(n.createdBy, resolve))}・${escapeHtml(_issFmt(n.createdAt))}
              ${_issCanDeleteNote(n) ? _issBtn('note-del', n.id, '刪除', 'iss-note-del') : ''}</div>
            ${String(n.text || '').trim() ? `<div class="iss-note-text">${escapeHtml(n.text)}</div>` : ''}
            ${_issPhotosHtml(n, 'note-photo')}
          </li>`).join('')}</ol>` : (_issNotesLoaded ? '<div class="iss-notes-empty">還沒有紀錄</div>' : '<div class="iss-notes-empty">紀錄載入中…</div>');
    body = list + (_issIsRO() ? `<div class="iss-notes-ro">僅檢視帳號無法新增紀錄</div>` : '');
  }
  let composer = '';
  if (_issCanCreate()) {
    composer = (_issComposer && _issComposer.issueId === it.id) ? `
        <div class="iss-composer" id="iss-composer">
          <textarea id="iss-note-text" class="iss-note-input" rows="3" placeholder="補充資訊或處理進度（Ctrl+Enter 送出）"></textarea>
          <div class="ti-zone" id="iss-note-zone">
            <div class="ti-hint">在這裡按 Ctrl+V 貼上截圖，或 <button type="button" class="ti-pick" data-iss-photo="pick">＋ 選擇圖片</button>（最多 ${ISS_PHOTO_MAX} 張）</div>
            <div class="ti-list"></div>
            <div class="ti-status" hidden></div>
          </div>
          <div class="iss-form-err" id="iss-note-err" hidden></div>
          <div class="iss-composer-actions">
            <button type="button" class="btn-ghost iss-btn" data-iss-act="note-cancel" data-id="${escapeHtml(it.id)}">取消</button>
            <button type="button" class="btn-primary iss-btn iss-note-add" id="iss-note-add" data-iss-act="note-add" data-id="${escapeHtml(it.id)}" disabled>新增</button>
          </div>
        </div>` : `<button type="button" class="iss-note-open" data-iss-act="note-open" data-id="${escapeHtml(it.id)}">＋ 新增紀錄</button>`;
  }
  return `<div class="iss-notes${open ? ' is-open' : ''}">${head}${body}${composer}</div>`;
}
function _issFormHtml(it) {
  const cur = it || {};
  const area = ISS_AREAS.some(a => a.key === cur.area) ? cur.area : '';
  const pr = _issPrKey(cur.priority);
  const radios = (name, list, sel) => list.map(x => `
          <label class="iss-radio"><input type="radio" name="${name}" value="${escapeHtml(x.key)}"${x.key === sel ? ' checked' : ''}><span>${escapeHtml(x.label)}</span></label>`).join('');
  return `
      <div class="field">
        <label for="iss-f-title">問題標題（必填）</label>
        <input type="text" id="iss-f-title" maxlength="120" value="${escapeHtml(cur.title || '')}" placeholder="一句話說明遇到的問題或想調整的地方">
      </div>
      <div class="field">
        <label>區塊</label>
        <div class="iss-radio-group">${radios('iss-f-area', ISS_AREAS, area)}
        </div>
      </div>
      <div class="field">
        <label>優先度</label>
        <div class="iss-radio-group">${radios('iss-f-pr', ISS_PRIORITIES, pr)}
        </div>
      </div>
      <div class="field">
        <label for="iss-f-desc">詳細描述（選填）</label>
        <textarea id="iss-f-desc" rows="5" placeholder="在哪一頁、做了什麼、看到什麼、希望變成怎樣">${escapeHtml(cur.desc || '')}</textarea>
      </div>
      <div class="field">
        <label>照片（選填，最多 ${ISS_PHOTO_MAX} 張）</label>
        <div class="ti-zone" id="iss-photo-zone">
          <div class="ti-hint">在這個視窗裡按 Ctrl+V 貼上截圖，或 <button type="button" class="ti-pick" data-iss-photo="pick">＋ 選擇圖片</button></div>
          <div class="ti-list"></div>
          <div class="ti-status" hidden></div>
        </div>
      </div>
      <div class="iss-form-err" id="iss-f-err" hidden></div>`;
}
const _issSetErr = (id, msg) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg || '';
  el.hidden = !msg;
};
const _issSaveBtnBusy = (busy) => {
  const b = document.getElementById('modal-save');
  if (b) b.disabled = !!busy;
};

Object.assign(App, {
  viewIssues() {
    const subOk = _issEnsureSub();
    _issEnsureNotesSub();   // 紀錄另一個訂閱；還沒就緒時卡片顯示「紀錄載入中…」
    const resolve = _issResolver();
    const all = _issVisible();
    // 組合：未刪除 AND 篩選列（只看我負責的、區塊）AND 計數卡（若有）。卡上數字只依篩選列算。
    const filtered = all.filter(_issMatchFilter);
    const count = _issCounts(filtered);
    const shown = _issSorted(_issCard ? filtered.filter(it => _issMatchCard(it, _issCard)) : filtered);
    const cards = ISS_CARDS.map(c => {
      const on = _issCard === c.key;
      return `<button type="button" class="stat-card iss-stat iss-stat-${c.key}${on ? ' iss-stat-active' : ''}" data-iss-act="card" data-card="${c.key}" aria-pressed="${on ? 'true' : 'false'}">
          <div class="stat-icon">${c.icon}</div>
          <div class="stat-label">${escapeHtml(c.label)}</div>
          <div class="stat-value">${count[c.key]}</div>
        </button>`;
    }).join('');
    const areaOpts = [{ key: '', label: '全部區塊' }].concat(ISS_AREAS).map(a =>
      `<option value="${escapeHtml(a.key)}"${_issArea === a.key ? ' selected' : ''}>${escapeHtml(a.label)}</option>`).join('');
    const ro = _issIsRO();
    const addBtn = _issBtn('new', '', '＋ 提出問題', 'btn-add', ro ? { disabled: true, title: ISS_RO_MSG } : null);
    let body;
    if (!subOk) body = `<div class="empty"><div class="emoji">⏳</div>雲端尚未就緒，稍後會自動載入</div>`;
    else if (!_issLoaded) body = `<div class="empty"><div class="emoji">⏳</div>載入中…</div>`;
    else if (!all.length) body = `<div class="empty"><div class="emoji">✅</div>目前沒有任何問題</div>`;
    else if (!shown.length) body = `<div class="empty"><div class="emoji">🔍</div>沒有符合條件的問題</div>`;
    else body = `<div class="iss-list">${shown.map(it => _issCardHtml(it, resolve)).join('')}</div>`;
    return `
      <div class="page-header">
        <h2>問題追蹤</h2>
        <p>使用儀表板遇到問題、想調整時在這裡提出，由管理員處理。</p>
      </div>
      ${_issMock ? `<div class="iss-mock-banner">模擬模式：資料只在本機記憶體，重新整理就消失（__issuesMock(false) 關閉）</div>` : ''}
      ${ro ? `<div class="iss-ro-hint">${escapeHtml(ISS_RO_MSG)}</div>` : ''}
      <div class="stat-grid iss-stat-grid">${cards}</div>
      <div class="filter-bar iss-filter-bar">
        <button type="button" class="pill iss-mine${_issMine ? ' active' : ''}" data-iss-act="mine" aria-pressed="${_issMine ? 'true' : 'false'}">只看我負責的</button>
        <select class="iss-area-select" data-iss-act="area" aria-label="區塊">${areaOpts}</select>
        <span class="filter-spacer"></span>
        ${addBtn}
      </div>
      ${body}`;
  },

  bindIssues() {
    const main = document.getElementById('main-content');
    // 🔴 只綁一次：#main-content 不會被換掉，render 只換 innerHTML；旗標記在元素上，
    //   每次 render 都會呼叫 bindIssues，但第二次起直接略過 → 一次點擊只觸發一次。
    //   click、change（區塊下拉）、keydown（紀錄 Ctrl+Enter）、input（記住紀錄草稿）、focusout（打字中延後的重畫）
    //   都在同一個 if 裡一起掛，共用同一個旗標。
    if (main && !main.__issBound) {
      main.addEventListener('click', _issOnClick);
      main.addEventListener('change', _issOnChange);
      main.addEventListener('keydown', _issOnKeydown);
      main.addEventListener('input', _issOnInput);
      main.addEventListener('focusout', _issOnFocusout);
      main.__issBound = true;
    }
    _issComposerMount();   // 整頁重畫後把紀錄草稿（文字、照片）放回去
    // 雲端物件晚於 render 才就緒（firebase.js 在 pages 之後載入）：就緒後補訂閱並重畫
    if (!_issUnsub && !_issMock && !window.__issWaitCloud) {
      window.__issWaitCloud = true;
      window.addEventListener('cloudStoreReady', () => {
        window.__issWaitCloud = false;
        if (App.route === 'issues') App.render();
      }, { once: true });
    }
  },

  openIssueModal(id) {
    if (!_issCanCreate()) { showToast(ISS_RO_MSG, 'error'); return; }
    const it = id ? _issList.find(x => x.id === id && x.deleted !== true) : null;
    if (id && !it) { showToast('找不到這筆問題（可能已被刪除）', 'error'); return; }
    if (it && !_issCanEdit(it)) { showToast('只有提出人或管理員可以編輯', 'error'); return; }
    let saving = false, picker = null;
    this.openModal({
      title: it ? '編輯問題' : '提出問題',
      bodyHtml: _issFormHtml(it),
      saveLabel: it ? '儲存' : '送出',
      width: '560px',
      onMount: () => {
        const zone = document.getElementById('iss-photo-zone');
        const ids = (it && Array.isArray(it.images)) ? it.images : [];
        const thumbs = (it && it.thumbs && typeof it.thumbs === 'object') ? it.thumbs : {};
        if (zone) picker = _issPhotoPicker({ root: zone, max: ISS_PHOTO_MAX, existing: ids.map(pid => ({ id: pid, thumb: thumbs[pid] || '' })) });
      },
      onCancel: () => { if (picker) picker.destroy(); },   // 保險 ①（取消、✕）；點背景關窗靠挑選元件自己的保險 ②
      onSave: () => {
        if (saving) return false;
        if (picker && picker.busy()) { _issSetErr('iss-f-err', '照片還在處理中，請稍候'); return false; }
        const title = String((document.getElementById('iss-f-title') || {}).value || '').trim();
        const desc = String((document.getElementById('iss-f-desc') || {}).value || '').trim();
        const areaEl = document.querySelector('input[name="iss-f-area"]:checked');
        const prEl = document.querySelector('input[name="iss-f-pr"]:checked');
        const area = (areaEl && ISS_AREAS.some(a => a.key === areaEl.value)) ? areaEl.value : '';
        const priority = _issPrKey(prEl ? prEl.value : 'normal');
        if (!title) { _issSetErr('iss-f-err', '請填寫問題標題'); return false; }
        if (!area) { _issSetErr('iss-f-err', '請選擇區塊'); return false; }   // 區塊必填（不再自動存成「其他」）
        _issSetErr('iss-f-err', '');
        const me = _issMe();
        const keep = picker ? picker.items() : ((it && Array.isArray(it.images)) ? it.images.map(pid => ({ id: pid, isNew: false })) : []);
        const added = keep.filter(x => x.isNew), removedIds = picker ? picker.removed() : [];
        const oldImages = (it && Array.isArray(it.images)) ? it.images : [];
        const fields = {};
        if (it) {
          if (title !== (it.title || '')) fields.title = title;
          if (area !== (it.area || '')) fields.area = area;
          if (priority !== _issPrKey(it.priority)) fields.priority = priority;
          if (desc !== (it.desc || '')) fields.desc = desc;
          if (!Object.keys(fields).length && !added.length && !removedIds.length) {   // 什麼都沒改
            if (picker) picker.destroy();
            this.closeModal();
            return false;
          }
        }
        saving = true; _issSaveBtnBusy(true);
        (async () => {
          const issueId = it ? it.id : _issGenId();
          // 1. 先上傳這次新加的照片；任何一張失敗 → 回收已上傳的、不寫問題、不關窗
          const uploaded = [];
          try {
            for (const p of added) uploaded.push({ key: p.key, id: await _issPhotoStore.upload(issueId, p) });
          } catch (e) {
            await Promise.all(uploaded.map(u => _issPhotoStore.remove(u.id)));
            _issSetErr('iss-f-err', '照片上傳失敗：' + ((e && e.message) || '未知錯誤') + '（問題沒有送出，可以再按一次）');
            return;
          }
          const idOf = k => (uploaded.find(u => u.key === k) || {}).id;
          const images = keep.map(x => (x.isNew ? idOf(x.key) : x.id)).filter(Boolean);
          const thumbs = {};
          keep.forEach(x => { const pid = x.isNew ? idOf(x.key) : x.id; if (pid && x.thumb) thumbs[pid] = x.thumb; });
          const now = Date.now();
          // 2. 寫問題（只送有變的欄位；照片清單沒變就不送 images / thumbs）
          let ok;
          if (!it) {
            ok = await _issWrite('create', issueId, {
              id: issueId, title, area, priority, desc, status: 'open', resolution: '',
              createdAt: now, createdBy: me.username, updatedAt: now, updatedBy: me.username,
              resolvedAt: null, resolvedBy: '', assignee: null, deleted: false, images, thumbs,
            });
          } else {
            if (JSON.stringify(images) !== JSON.stringify(oldImages)) { fields.images = images; fields.thumbs = thumbs; }
            fields.updatedAt = now; fields.updatedBy = me.username;
            ok = await _issWrite('update', it.id, fields);
          }
          // 3. 問題寫入失敗 → 剛上傳的照片回收（舊照片沒動），不關窗
          if (!ok) {
            await Promise.all(uploaded.map(u => _issPhotoStore.remove(u.id)));
            return;
          }
          // 4. 寫入成功才刪編輯時移除的舊照片（best-effort；失敗留給 __issueImageAudit）
          removedIds.forEach(pid => { _issPhotoStore.remove(pid); });
          if (picker) picker.destroy();
          this.closeModal();
          showToast(it ? '已儲存' : '已送出', 'success');
          if (this.route === 'issues') this.render();
        })().finally(() => { saving = false; _issSaveBtnBusy(false); });
        return false;   // 等上傳與寫入完成才關窗
      },
    });
  },

  openIssueResolveModal(id) {
    if (!_issIsAdmin()) return;
    const it = _issList.find(x => x.id === id && x.deleted !== true);
    if (!it) { showToast('找不到這筆問題（可能已被刪除）', 'error'); return; }
    let saving = false;
    this.openModal({
      title: '標記已解決',
      bodyHtml: `
      <div class="iss-modal-target">${escapeHtml(it.title)}</div>
      <div class="field">
        <label for="iss-f-resolution">完成說明（必填）</label>
        <textarea id="iss-f-resolution" rows="4" placeholder="怎麼處理的、改了哪裡"></textarea>
      </div>
      <div class="iss-form-err" id="iss-r-err" hidden></div>`,
      saveLabel: '標記已解決',
      onSave: () => {
        if (saving) return false;
        const resolution = String((document.getElementById('iss-f-resolution') || {}).value || '').trim();
        if (!resolution) { _issSetErr('iss-r-err', '請填寫完成說明'); return false; }
        _issSetErr('iss-r-err', '');
        const me = _issMe(), now = Date.now();
        saving = true; _issSaveBtnBusy(true);
        _issWrite('update', it.id, {
          status: 'done', resolution, resolvedAt: now, resolvedBy: me.username, updatedAt: now, updatedBy: me.username,
        }).then(ok => {
          saving = false; _issSaveBtnBusy(false);
          if (!ok) return;
          this.closeModal();
          showToast('已標記為已解決', 'success');
          if (this.route === 'issues') this.render();
        });
        return false;
      },
    });
  },

  openIssueDeleteModal(id) {
    if (!_issIsAdmin()) return;
    const it = _issList.find(x => x.id === id && x.deleted !== true);
    if (!it) { showToast('找不到這筆問題（可能已被刪除）', 'error'); return; }
    let saving = false;
    this.openModal({
      title: '刪除問題',
      bodyHtml: `
      <div class="iss-modal-target">${escapeHtml(it.title)}</div>
      <p class="iss-modal-note">確定要刪除這筆問題嗎？刪除後清單上不再顯示。</p>`,
      saveLabel: '刪除',
      // 共用 openModal 的確認鈕固定是 .btn-primary（主色），刪除改用危險色：只加 class，不寫 inline style
      onMount: () => {
        const b = document.getElementById('modal-save');
        if (b) b.classList.add('iss-btn-confirm-danger');
      },
      onSave: () => {
        if (saving) return false;
        const me = _issMe();
        saving = true; _issSaveBtnBusy(true);
        _issWrite('update', it.id, { deleted: true, updatedAt: Date.now(), updatedBy: me.username }).then(ok => {
          saving = false; _issSaveBtnBusy(false);
          if (!ok) return;
          this.closeModal();
          showToast('已刪除', 'success');
          if (this.route === 'issues') this.render();
        });
        return false;
      },
    });
  },

  async _issSetStatus(id, status) {
    if (!_issIsAdmin() || _issBusy) return;
    const it = _issList.find(x => x.id === id && x.deleted !== true);
    if (!it) { showToast('找不到這筆問題（可能已被刪除）', 'error'); return; }
    if (_issStKey(it.status) === status) return;
    const me = _issMe();
    _issBusy = true;
    try {
      // 重新開啟：resolution / resolvedAt / resolvedBy 保留不清，畫面標成「上次完成說明」
      const fields = { status, updatedAt: Date.now(), updatedBy: me.username };
      // 開始處理時尚未指派 → 同一次 update 一起指派給自己
      if (status === 'doing' && !_issHasAssignee(it)) fields.assignee = me.username;
      const ok = await _issWrite('update', it.id, fields);
      if (ok && this.route === 'issues') this.render();
    } finally {
      _issBusy = false;
    }
  },

  // 我來處理：未指派、未解決的問題一鍵指派給自己
  async _issClaim(id) {
    if (!_issIsAdmin() || _issBusy) return;
    const it = _issList.find(x => x.id === id && x.deleted !== true);
    if (!it) { showToast('找不到這筆問題（可能已被刪除）', 'error'); return; }
    if (_issHasAssignee(it) || _issStKey(it.status) === 'done') return;
    const me = _issMe();
    _issBusy = true;
    try {
      const ok = await _issWrite('update', it.id, { assignee: me.username, updatedAt: Date.now(), updatedBy: me.username });
      if (ok) { showToast('已指派給自己', 'success'); if (this.route === 'issues') this.render(); }
    } finally {
      _issBusy = false;
    }
  },

  // 指派 / 改負責人：人選共用 daily.js 的 adjOwnerSelectableUsers（#306 同一份規則）
  openIssueAssignModal(id) {
    if (!_issIsAdmin()) return;
    const it = _issList.find(x => x.id === id && x.deleted !== true);
    if (!it) { showToast('找不到這筆問題（可能已被刪除）', 'error'); return; }
    const pickFn = window.adjOwnerSelectableUsers;
    const users = Store.get(Store.KEYS.users, []);
    const pick = typeof pickFn === 'function' ? pickFn(Array.isArray(users) ? users : []) : [];
    const cur = String(it.assignee || '').trim();
    const inPick = cur && pick.some(p => _issNorm(p.username) === _issNorm(cur));
    const opts = [{ value: '', text: '未指派' }].concat(pick.map(p => ({ value: p.username, text: p.label })));
    // 目前負責人不在可選名單（例：已停用）→ 額外列出並預選，按儲存沒改就不會被誤清
    if (cur && !inPick) opts.push({ value: cur, text: _issAssigneeName(cur, _issResolver()) || cur });
    const selVal = inPick ? pick.find(p => _issNorm(p.username) === _issNorm(cur)).username : cur;
    let saving = false;
    this.openModal({
      title: '指派負責人',
      bodyHtml: `
      <div class="iss-modal-target">${escapeHtml(it.title)}</div>
      <div class="field">
        <label for="iss-f-assignee">負責人</label>
        <select id="iss-f-assignee">${opts.map(o =>
          `<option value="${escapeHtml(o.value)}"${o.value === selVal ? ' selected' : ''}>${escapeHtml(o.text)}</option>`).join('')}</select>
      </div>
      ${typeof pickFn === 'function' ? '' : '<p class="iss-modal-note">讀不到帳號清單，只能設為未指派。</p>'}
      <div class="iss-form-err" id="iss-a-err" hidden></div>`,
      saveLabel: '儲存',
      onSave: () => {
        if (saving) return false;
        const v = String((document.getElementById('iss-f-assignee') || {}).value || '').trim();
        const next = v || null;
        if (_issNorm(next) === _issNorm(cur)) { this.closeModal(); return false; }   // 沒改就不送
        if (next && !opts.some(o => o.value === next)) { _issSetErr('iss-a-err', '請從清單選擇負責人'); return false; }
        const me = _issMe();
        saving = true; _issSaveBtnBusy(true);
        _issWrite('update', it.id, { assignee: next, updatedAt: Date.now(), updatedBy: me.username }).then(ok => {
          saving = false; _issSaveBtnBusy(false);
          if (!ok) return;
          this.closeModal();
          showToast(next ? '已指派' : '已改為未指派', 'success');
          if (this.route === 'issues') this.render();
        });
        return false;
      },
    });
  },

  // 展開某張卡片的紀錄輸入框（全頁同時只一個；另一張有內容時不讓切換）
  _issNoteOpen(id) {
    if (!_issCanCreate()) { showToast('僅檢視帳號無法新增紀錄', 'error'); return; }
    const it = _issList.find(x => x.id === id && x.deleted !== true);
    if (!it) { showToast('找不到這筆問題（可能已被刪除）', 'error'); return; }
    if (_issComposer && _issComposer.issueId === id) return;
    if (_issComposer) {
      if (_issComposerHasContent()) { showToast('另一張卡片還有沒送出的紀錄，請先送出或取消', 'error', 4000); return; }
      _issComposerClose();
    }
    _issComposer = { issueId: id, text: '', items: [], picker: null, saving: false };
    _issNotesOpen.add(id);   // 一起展開時間軸，寫的時候看得到前文
    this.render();
    const ta = document.getElementById('iss-note-text');
    if (ta && typeof ta.focus === 'function') ta.focus();
  },

  // 新增紀錄：先傳照片 → 寫紀錄 → 更新問題的 updatedAt / updatedBy。
  //   照片上傳失敗 / 紀錄寫入失敗 → 回收剛傳的照片、草稿保留；問題更新失敗 → 紀錄已存好、不回滾，只提示。
  async _issNoteSubmit() {
    const st = _issComposer;
    if (!st || st.saving) return;
    const setErr = msg => _issSetErr('iss-note-err', msg);
    if (!_issCanCreate()) { setErr('僅檢視帳號無法新增紀錄'); return; }
    const it = _issList.find(x => x.id === st.issueId && x.deleted !== true);
    if (!it) { setErr('找不到這筆問題（可能已被刪除）'); return; }
    const picker = st.picker && st.picker.alive() ? st.picker : null;
    if (picker && picker.busy()) { setErr('照片還在處理中，請稍候'); return; }
    const text = String(st.text || '').trim();
    const items = picker ? picker.items() : (st.items || []);
    if (!text && !items.length) { setErr('請輸入內容或附上照片'); return; }
    setErr('');
    st.saving = true; _issComposerSync();
    const me = _issMe(), noteId = _issNoteGenId();
    const uploaded = [];
    try {
      try {
        for (const p of items) uploaded.push({ key: p.key, id: await _issPhotoStore.upload(it.id, p, { noteId }) });
      } catch (e) {
        await Promise.all(uploaded.map(u => _issPhotoStore.remove(u.id)));
        setErr('照片上傳失敗：' + ((e && e.message) || '未知錯誤') + '（紀錄沒有送出，可以再按一次）');
        return;
      }
      const images = uploaded.map(u => u.id), thumbs = {};
      items.forEach((p, i) => { if (images[i] && p.thumb) thumbs[images[i]] = p.thumb; });
      const now = Date.now();
      const ok = await _issNoteWrite('create', noteId, {
        id: noteId, issueId: it.id, text, images, thumbs, createdAt: now, createdBy: me.username, deleted: false,
      });
      if (!ok) {
        await Promise.all(uploaded.map(u => _issPhotoStore.remove(u.id)));
        setErr('紀錄沒有寫入（內容還在，可以再按一次）');
        return;
      }
      const ok2 = await _issWrite('update', it.id, { updatedAt: now, updatedBy: me.username });
      if (!ok2) showToast('紀錄已新增，但問題的最後更新時間沒更新', 'error', 5000);
      else showToast('已新增紀錄', 'success');
      if (_issComposer === st) _issComposerClose();
      if (this.route === 'issues') this.render();
      _issFlushCloudRender();
    } finally {
      st.saving = false;
      if (_issComposer === st) _issComposerSync();
    }
  },

  // 刪除紀錄：作者本人或管理員；App.openModal 確認；軟刪除，照片保留；不更新問題的「最後更新」
  openIssueNoteDeleteModal(noteId) {
    const n = _issNotes.find(x => x.id === noteId && x.deleted !== true);
    if (!n) { showToast('找不到這則紀錄（可能已被刪除）', 'error'); return; }
    if (!_issCanDeleteNote(n)) { showToast('只有紀錄作者或管理員可以刪除', 'error'); return; }
    let saving = false;
    const resolve = _issResolver();
    this.openModal({
      title: '刪除紀錄',
      bodyHtml: `
      <div class="iss-modal-target">${escapeHtml(_issName(n.createdBy, resolve) + '・' + _issFmt(n.createdAt))}</div>
      <p class="iss-modal-note">${escapeHtml(_issNoteSummary(n) || '（空白紀錄）')}</p>
      <p class="iss-modal-note">確定要刪除這則紀錄嗎？刪除後時間軸上不再顯示。</p>`,
      saveLabel: '刪除',
      onMount: () => { const b = document.getElementById('modal-save'); if (b) b.classList.add('iss-btn-confirm-danger'); },
      onSave: () => {
        if (saving) return false;
        const me = _issMe();
        saving = true; _issSaveBtnBusy(true);
        _issNoteWrite('update', n.id, { deleted: true, deletedAt: Date.now(), deletedBy: me.username }).then(ok => {
          saving = false; _issSaveBtnBusy(false);
          if (!ok) return;
          this.closeModal();
          showToast('已刪除紀錄', 'success');
          if (this.route === 'issues') this.render();
        });
        return false;
      },
    });
  },

  // 照片放大檢視：版面沿用老闆任務附圖的 .tiv-*（css/daily-adjustments.css），行為一樣（點圖切換原始尺寸）。
  //   daily.js 的 openTaskImagesModal 寫死讀 ec.bossTasks，不能直接共用，所以另寫一個。所有人都能看（同老闆任務）。
  openIssueImagesModal(id, startIdx) {
    const it = _issList.find(x => x.id === id && x.deleted !== true);
    const ids = (it && Array.isArray(it.images)) ? it.images.filter(x => typeof x === 'string' && x) : [];
    if (!ids.length) { showToast('這筆問題沒有照片', 'info'); return; }
    this._issOpenPhotoViewer('問題照片 · ' + (it.title || ''), ids, startIdx);
  },
  // 紀錄的照片：同一個檢視彈窗，只是照片清單換成那則紀錄的
  openIssueNoteImagesModal(noteId, startIdx) {
    const n = _issNotes.find(x => x.id === noteId && x.deleted !== true);
    const ids = (n && Array.isArray(n.images)) ? n.images.filter(x => typeof x === 'string' && x) : [];
    if (!ids.length) { showToast('這則紀錄沒有照片', 'info'); return; }
    const it = _issList.find(x => x.id === n.issueId);
    this._issOpenPhotoViewer('紀錄照片 · ' + ((it && it.title) || ''), ids, startIdx);
  },
  _issOpenPhotoViewer(title, ids, startIdx) {
    this.openModal({
      title,
      width: 'min(1400px, 94vw)',
      hideFooter: true,
      bodyHtml: `<div id="iss-viewer" class="tiv-body"><div class="tiv-loading">載入中…</div></div>`,
      onMount: () => {
        const box = document.getElementById('iss-viewer');
        if (!box) return;
        Promise.all(ids.map(pid => _issPhotoStore.get(pid))).then(datas => {
          if (!document.body.contains(box)) return;   // 讀圖期間彈窗已關 / 換成別的彈窗
          const okList = datas.map((d, i) => ({ d, i })).filter(x => x.d);
          if (!okList.length) { box.innerHTML = `<div class="tiv-loading">照片讀取失敗，或已被刪除</div>`; return; }
          const missing = ids.length - okList.length;
          box.innerHTML = (missing ? `<div class="tiv-warn">有 ${missing} 張照片讀取失敗或已不存在</div>` : '')
            + okList.map((x, n) => `
              <figure class="tiv-item" data-idx="${x.i}">
                <img src="${escapeHtml(x.d)}" alt="照片 ${x.i + 1}" class="tiv-img" title="點圖切換原始尺寸">
                <figcaption class="tiv-cap">${(() => { const p = _issPhotoPart.get(ids[x.i]); return p && p.n > 1 ? escapeHtml('長圖 ' + p.i + '/' + p.n) : escapeHtml((n + 1) + ' / ' + okList.length); })()} · 點圖切換原始尺寸</figcaption>
              </figure>`).join('');
          box.querySelectorAll('.tiv-img').forEach(im => im.addEventListener('click', () => im.classList.toggle('is-full')));
          const target = box.querySelector(`.tiv-item[data-idx="${Number(startIdx) || 0}"]`);
          if (target && typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'start' });
        });
      },
    });
  },
});

// #main-content 的點擊委派（具名函式，bindIssues 只掛一次）
function _issOnClick(e) {
  if (App.route !== 'issues') return;
  const btn = e.target && e.target.closest ? e.target.closest('[data-iss-act]') : null;
  if (!btn || btn.disabled) return;
  const act = btn.dataset.issAct, id = btn.dataset.id || '';
  switch (act) {
    case 'card':
      // 點一張＝套用、再點同一張＝取消、點另一張＝換過去（同時最多一張）
      if (ISS_CARDS.some(c => c.key === btn.dataset.card)) { _issCard = (_issCard === btn.dataset.card) ? null : btn.dataset.card; App.render(); }
      break;
    case 'mine':    _issMine = !_issMine; App.render(); break;
    case 'new':     App.openIssueModal(null); break;
    case 'claim':   App._issClaim(id); break;
    case 'assign':  App.openIssueAssignModal(id); break;
    case 'edit':    App.openIssueModal(id); break;
    case 'start':   App._issSetStatus(id, 'doing'); break;
    case 'reopen':  App._issSetStatus(id, 'open'); break;
    case 'resolve': App.openIssueResolveModal(id); break;
    case 'delete':  App.openIssueDeleteModal(id); break;
    case 'photo':   App.openIssueImagesModal(id, btn.dataset.idx); break;
    case 'notes-toggle':
      if (_issNotesOpen.has(id)) _issNotesOpen.delete(id); else _issNotesOpen.add(id);
      App.render();
      break;
    case 'note-open':   App._issNoteOpen(id); break;
    case 'note-cancel': _issComposerClose(); App.render(); _issFlushCloudRender(); break;
    case 'note-add':    App._issNoteSubmit(); break;
    case 'note-del':    App.openIssueNoteDeleteModal(id); break;
    case 'note-photo':  App.openIssueNoteImagesModal(id, btn.dataset.idx); break;
  }
}
// 紀錄輸入框：Ctrl+Enter（Mac Cmd+Enter）送出；input 即時記住草稿；失焦後補做打字中延後的重畫
function _issOnKeydown(e) {
  if (App.route !== 'issues' || !e.target || e.target.id !== 'iss-note-text') return;
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); App._issNoteSubmit(); }
}
function _issOnInput(e) {
  if (App.route !== 'issues' || !e.target || e.target.id !== 'iss-note-text' || !_issComposer) return;
  _issComposer.text = String(e.target.value || '');
  _issComposerSync();
}
function _issOnFocusout(e) {
  if (!e.target || e.target.id !== 'iss-note-text' || !_issPendingCloudRender) return;
  // 延後一下：失焦可能是因為正要按「新增 / 取消」，立刻重畫會把那顆按鈕換掉、點擊就落空
  setTimeout(_issFlushCloudRender, 300);
}
// #main-content 的 change 委派（只給篩選列的區塊下拉；跟 _issOnClick 一起在 bindIssues 掛一次）
function _issOnChange(e) {
  if (App.route !== 'issues') return;
  const el = e.target;
  if (!el || !el.dataset || el.dataset.issAct !== 'area') return;
  const v = String(el.value || '');
  _issArea = (v === '' || ISS_AREAS.some(a => a.key === v)) ? v : '';
  App.render();
}

/* ---------- 第 5 塊：匯入舊 Google 試算表「辦公室儀表板調整需求表」（只給管理員，Console 打 __issuesImportLegacy()） ----------
 * 資料不進程式碼：使用者自己從試算表「檔案 → 下載 → CSV」存檔，在彈窗裡選檔 → 解析 → 預覽 → 按「寫入 N 筆」才寫。
 * 每列一份 issues doc，id 固定 'iss-legacy-r' + 試算表列號（可重跑；已存在的一律略過、不覆蓋）。
 * 試算表列號＝CSV 記錄序號（欄位內換行不算新列）。表頭不一定在第 1 列（實際下載的檔前面有說明文字列，
 *   而且說明文字裡就含「完成日期」），所以在前 10 列找「8 個關鍵字都各自命中不同欄」的那一列。
 * 下面三個 _issLegacy* 是純函式（不碰 DOM、不碰雲端），工具與測試共用。 */
const ISS_LEGACY_KEYS = Object.freeze(['提出日期', '需求人員', '調整區塊', '調整內容', '處理人員', '完成日期', '調整前備註', '調整完成備註']);
const ISS_LEGACY_HEADER_SCAN = 10;
const ISS_LEGACY_YEAR = 2026;
const ISS_LEGACY_NO_RESOLUTION = '已完成（舊需求表無完成備註）';

// RFC 4180：雙引號包住的欄位可含逗號、換行，"" 代表一個 "；CRLF / LF / 單獨 CR 都當換行；去 BOM。
//   回 { ok:true, rows:[{ row: 試算表列號（從 1）, cells }] } 或 { ok:false, error }
function _issLegacyParseCsv(text) {
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
// 在前 10 列找表頭：8 個關鍵字依序各找一個「包含關鍵字、還沒被用過」的欄。
//   回 { ok:true, headerRow, col:{ 關鍵字: 欄位索引 } } 或 { ok:false, missing:[最接近的那列缺的關鍵字] }
function _issLegacyFindHeader(rows) {
  let best = null;
  for (const r of (rows || []).slice(0, ISS_LEGACY_HEADER_SCAN)) {
    const used = new Set(), col = {}, missing = [];
    for (const k of ISS_LEGACY_KEYS) {
      const j = r.cells.findIndex((c, x) => !used.has(x) && String(c).includes(k));
      if (j < 0) missing.push(k); else { used.add(j); col[k] = j; }
    }
    if (!missing.length) return { ok: true, headerRow: r.row, col };
    if (!best || missing.length < best.missing.length) best = { missing };
  }
  return { ok: false, missing: best ? best.missing : ISS_LEGACY_KEYS.slice() };
}
const _issLegacyNames = s => String(s == null ? '' : s).split(/[,，、/／;；\s]+/).map(x => x.trim()).filter(Boolean);
// 「M/D」（或「YYYY/M/D」）→ 台灣時間當天 12:00 的毫秒數（台灣 UTC+8 → UTC 04:00）；空白回 null；看不懂回 NaN
function _issLegacyDate(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return null;
  const m = /^(?:(\d{4})\/)?(\d{1,2})\/(\d{1,2})$/.exec(s);
  if (!m) return NaN;
  const y = m[1] ? +m[1] : ISS_LEGACY_YEAR, mo = +m[2], d = +m[3];
  const t = Date.UTC(y, mo - 1, d, 4, 0, 0);
  const chk = new Date(t);
  return (chk.getUTCFullYear() === y && chk.getUTCMonth() === mo - 1 && chk.getUTCDate() === d) ? t : NaN;
}
function _issLegacyArea(s) {
  const v = String(s == null ? '' : s);
  if (v.includes('首頁')) return 'dashboard';
  if (v.includes('淨利表')) return 'profit';
  if (v.includes('洞察表')) return 'insight';
  if (v.includes('工作日誌')) return 'daily';
  if (v.toUpperCase().includes('KPI')) return 'kpi';
  return 'other';
}
// 逐列套對應規則。users＝完整帳號清單（給 makeUserIdentityResolver：trim、不分大小寫，比 username 再比姓名，同名不猜）。
//   回 { items:[issues doc], skipped:[{ row, reason }], unmatched:{ 原字: 次數 }, warnings:[文字], preview:[{ row, date, who, whoOk, area, title, status, resolution }] }
function _issLegacyMap(rows, header, users, now) {
  const mk = window.makeUserIdentityResolver;
  const resolve = typeof mk === 'function' ? mk(Array.isArray(users) ? users : []) : null;
  const match = raw => { if (!raw || !resolve) return null; const id = resolve(raw); return (id && id.ok) ? id.username : null; };
  const out = { items: [], skipped: [], unmatched: {}, warnings: [], preview: [] };
  const miss = name => { out.unmatched[name] = (out.unmatched[name] || 0) + 1; };
  const t0 = Number(now) || Date.now();
  for (const r of rows) {
    if (r.row <= header.headerRow) continue;
    const get = k => String(r.cells[header.col[k]] == null ? '' : r.cells[header.col[k]]).replace(/\r\n?/g, '\n');
    const whoRaw = get('需求人員').trim(), content = get('調整內容').trim();
    if (r.cells.every(c => !String(c).trim())) { out.skipped.push({ row: r.row, reason: '整列空白' }); continue; }
    if (/^e\.g\./i.test(whoRaw)) { out.skipped.push({ row: r.row, reason: '範例列（需求人員以 e.g. 開頭）' }); continue; }
    if (!content) { out.skipped.push({ row: r.row, reason: '調整內容空白' }); continue; }
    const requesters = _issLegacyNames(whoRaw), handlerRaw = get('處理人員').trim(), handlers = _issLegacyNames(handlerRaw);
    const createdBy = match(requesters[0]), assignee = match(handlers[0]);
    if (requesters[0] && !createdBy) miss(requesters[0]);
    if (handlers[0] && !assignee) miss(handlers[0]);
    const line1 = content.split('\n')[0].trim(), chars = Array.from(line1);
    const title = chars.length > 40 ? chars.slice(0, 40).join('') + '…' : line1;
    const before = get('調整前備註').trim();
    const desc = (requesters.length > 1 ? '需求人員：' + requesters.join('、') + '\n\n' : '') + content
      + (before ? '\n\n【調整前備註】\n' + before : '');
    const tCreate = _issLegacyDate(get('提出日期')), tDone = _issLegacyDate(get('完成日期'));
    if (Number.isNaN(tCreate)) out.warnings.push('第 ' + r.row + ' 列提出日期看不懂，改用完成日期或匯入時間');
    if (Number.isNaN(tDone)) out.warnings.push('第 ' + r.row + ' 列完成日期看不懂，當成未完成');
    const done = Number.isFinite(tDone);
    const createdAt = Number.isFinite(tCreate) ? tCreate : (done ? tDone : t0);
    const resolution = done ? (get('調整完成備註').trim() || ISS_LEGACY_NO_RESOLUTION) : '';
    const doc = {
      id: 'iss-legacy-r' + r.row, title, area: _issLegacyArea(get('調整區塊')),
      priority: (get('調整區塊') + '\n' + content).includes('優先') ? 'urgent' : 'normal',
      desc, status: done ? 'done' : 'open', resolution,
      createdAt, createdBy, updatedAt: done ? tDone : createdAt, updatedBy: createdBy,
      resolvedAt: done ? tDone : null, resolvedBy: done ? assignee : '',
      assignee, images: [], thumbs: {}, deleted: false,
      source: 'legacy-sheet', legacyRow: r.row, legacyRequester: whoRaw, legacyHandler: handlerRaw,
    };
    out.items.push(doc);
    out.preview.push({
      row: r.row, date: get('提出日期').trim() || get('完成日期').trim(), who: whoRaw, whoOk: !!createdBy,   // 空白也算對不到（卡片會顯示「舊需求表未填」）
      area: _issAreaLabel(doc.area), title, status: ISS_STATUS_LABEL[doc.status], resolution: Array.from(resolution).slice(0, 20).join(''),
    });
  }
  return out;
}

// 匯入彈窗的畫面（狀態 st 由 _issOpenLegacyImport 管；每次狀態變了整塊重畫）
function _issLegacyPreviewHtml(st) {
  if (st.error) return `<div class="iss-form-err">${escapeHtml(st.error)}</div>`;
  if (!st.plan) return '';
  const p = st.plan, res = st.results || {};
  const toWrite = p.items.filter(d => !st.exists.has(d.id)).length;
  const unm = Object.entries(p.unmatched).sort((a, b) => b[1] - a[1]);
  const head = `
      <div class="iss-imp-summary">讀到 ${escapeHtml(String(p.items.length + p.skipped.length))} 列資料：要寫入 <b>${escapeHtml(String(toWrite))}</b> 筆、已存在略過 ${escapeHtml(String(p.items.length - toWrite))} 筆、跳過 ${escapeHtml(String(p.skipped.length))} 列（表頭在第 ${escapeHtml(String(st.headerRow))} 列）</div>
      ${unm.length ? `<div class="iss-imp-warn">對不到帳號（提出人 / 負責人會存成空白，畫面顯示原字）：${unm.map(([n, c]) => escapeHtml(n) + ' ×' + escapeHtml(String(c))).join('、')}</div>` : ''}
      ${p.skipped.length ? `<div class="iss-imp-skip">跳過：${p.skipped.map(s => '第 ' + escapeHtml(String(s.row)) + ' 列（' + escapeHtml(s.reason) + '）').join('、')}</div>` : ''}
      ${p.warnings.length ? `<div class="iss-imp-warn">${p.warnings.map(w => escapeHtml(w)).join('<br>')}</div>` : ''}
      ${st.summary ? `<div class="iss-imp-summary iss-imp-done">${escapeHtml(st.summary)}</div>` : ''}`;
  const rows = p.preview.map((v, i) => {
    const id = p.items[i].id;
    const r = res[id] || (st.exists.has(id) ? { cls: 'skip', text: '已存在，略過' } : { cls: '', text: '' });
    return `<tr${r.cls ? ` class="iss-imp-r-${r.cls}"` : ''}>
          <td>${escapeHtml(String(v.row))}</td><td>${escapeHtml(v.date)}</td>
          <td${v.whoOk ? '' : ' class="iss-imp-bad"'}>${escapeHtml(v.who || '（空白）')}</td>
          <td>${escapeHtml(v.area)}</td><td>${escapeHtml(v.title)}</td><td>${escapeHtml(v.status)}</td>
          <td>${escapeHtml(v.resolution)}</td><td class="iss-imp-result">${escapeHtml(r.text)}</td></tr>`;
  }).join('');
  return head + `
      <div class="iss-imp-scroll"><table class="iss-imp-table">
        <thead><tr><th>列號</th><th>日期</th><th>提出人</th><th>區塊</th><th>標題</th><th>狀態</th><th>完成說明</th><th>結果</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
}

Object.assign(App, {
  _issOpenLegacyImport() {
    const st = { phase: 'pick', plan: null, error: '', exists: new Set(), results: {}, summary: '', headerRow: 0 };
    const draw = () => {
      const out = document.getElementById('iss-imp-out');
      if (out) out.innerHTML = _issLegacyPreviewHtml(st);
      const b = document.getElementById('modal-save');
      if (!b) return;
      if (st.phase === 'done') { b.textContent = '關閉'; b.disabled = false; return; }
      const n = st.plan ? st.plan.items.filter(d => !st.exists.has(d.id)).length : 0;
      b.textContent = '寫入 ' + n + ' 筆';
      b.disabled = st.phase !== 'ready' || n === 0;
    };
    const load = (text) => {
      st.error = ''; st.plan = null; st.results = {}; st.summary = '';
      const parsed = _issLegacyParseCsv(text);
      if (!parsed.ok) { st.error = parsed.error; st.phase = 'pick'; draw(); return; }
      const header = _issLegacyFindHeader(parsed.rows);
      if (!header.ok) { st.error = '找不到表頭：前 ' + ISS_LEGACY_HEADER_SCAN + ' 列都沒有同時包含這些欄位 → 缺「' + header.missing.join('」「') + '」'; st.phase = 'pick'; draw(); return; }
      st.headerRow = header.headerRow;
      st.plan = _issLegacyMap(parsed.rows, header, Store.get(Store.KEYS.users, []), Date.now());
      st.exists = new Set(_issList.map(x => x.id));   // 含軟刪除的：刪過的舊資料也不會被重新匯入
      st.phase = 'ready';
      draw();
    };
    this.openModal({
      title: '匯入舊需求表（CSV）',
      width: 'min(1100px, 94vw)',
      saveLabel: '寫入 0 筆',
      bodyHtml: `
      <p class="iss-modal-note">選從 Google 試算表「檔案 → 下載 → 逗號分隔值（.csv）」存下來的檔案。只會新增，已存在的問題一律略過、不覆蓋。</p>
      <div class="field"><input type="file" id="iss-imp-file" class="iss-imp-file" accept=".csv,text/csv"></div>
      <div id="iss-imp-out" class="iss-imp-out"></div>`,
      onMount: () => {
        const inp = document.getElementById('iss-imp-file');
        if (inp) inp.addEventListener('change', () => {
          const f = inp.files && inp.files[0];
          if (!f || st.phase === 'writing' || st.phase === 'done') return;
          const r = new FileReader();
          r.onload = () => load(String(r.result || ''));
          r.onerror = () => { st.error = '讀檔失敗'; draw(); };
          r.readAsText(f, 'utf-8');
        });
        draw();
      },
      onSave: () => {
        if (st.phase === 'done') return true;   // 寫完後按「關閉」
        if (st.phase !== 'ready' || !st.plan) return false;
        if (!_issIsAdmin()) { st.error = '只有管理員可以匯入'; draw(); return false; }
        const be = _issBackend();
        if (!be || typeof be.create !== 'function') { st.error = '雲端尚未就緒，請稍後再試'; draw(); return false; }
        st.phase = 'writing'; draw();
        (async () => {
          const n = { ok: 0, blocked: 0, fail: 0, skip: 0 };
          for (const d of st.plan.items) {
            // 寫入當下再查一次：中途雲端推播可能已經帶進同一筆
            if (st.exists.has(d.id) || _issList.some(x => x.id === d.id)) { st.results[d.id] = { cls: 'skip', text: '已存在，略過' }; n.skip++; draw(); continue; }
            try {
              const r = await be.create(d.id, d);
              if (r && r.ok) { st.results[d.id] = { cls: 'ok', text: '成功' }; n.ok++; }
              else { st.results[d.id] = { cls: 'fail', text: '未寫入雲端' }; n.blocked++; }
            } catch (e) {
              st.results[d.id] = { cls: 'fail', text: '失敗：' + ((e && e.message) || e) }; n.fail++;
            }
            draw();
          }
          st.summary = '完成：成功 ' + n.ok + ' 筆、未寫入雲端 ' + n.blocked + ' 筆、失敗 ' + n.fail + ' 筆、已存在略過 ' + n.skip + ' 筆、跳過 ' + st.plan.skipped.length + ' 列';
          st.phase = 'done';
          draw();
          if (this.route === 'issues') this.render();
        })();
        return false;
      },
    });
  },
});
window.__issuesImportLegacy = function () {
  const me = App.currentUser;
  if (!me || me.role !== 'admin') { console.warn('[issues] 只有管理員可以匯入舊需求表'); return false; }
  if (!_issLoaded) { console.warn('[issues] 問題清單還沒載入（先進一次「問題追蹤」頁），為了判斷哪些已經匯入過，這次不執行'); return false; }
  App._issOpenLegacyImport();
  return true;
};

/* ---------- 問題照片的用量 / 孤兒稽核（只給 Console 用，比照 daily.js 的 __taskImageAudit） ----------
 * 為什麼不併進 __taskImageAudit：那組寫死 task_images 與 ec.bossTasks，要算進來就得改老闆任務的稽核；分開算也看得出各自用量。
 * 孤兒＝issue_images 裡、沒有任何問題或後續處理紀錄（兩者都含軟刪除的，軟刪除保留照片）的 images 指向的圖。
 * 稽核只報告；清理要先跑稽核、且帶確認字串 __issueImageCleanup('確定刪除') 才會刪。
 * Firestore 免費額度 1 GiB 由所有 collection 共用，總用量只有 Firebase Console 看得到；這裡只算 issue_images。 */
const ISS_IMG_REST_BASE = 'https://firestore.googleapis.com/v1/projects/yc-dashboard-9aa6c/databases/(default)/documents/issue_images';
async function _issImgListAll() {
  const out = [];
  let token = '';
  for (let page = 0; page < 50; page++) {
    const resp = await fetch(ISS_IMG_REST_BASE + '?pageSize=300' + (token ? '&pageToken=' + encodeURIComponent(token) : ''));
    if (!resp.ok) throw new Error('REST 讀取失敗：' + resp.status);
    const j = await resp.json();
    (j.documents || []).forEach(d => {
      const f = d.fields || {};
      out.push({
        id:        String(d.name || '').split('/').pop(),
        issueId:   (f.issueId && f.issueId.stringValue) || '',
        bytes:     Number((f.bytes && (f.bytes.integerValue || f.bytes.doubleValue)) || 0),
        createdAt: Number((f.createdAt && (f.createdAt.integerValue || f.createdAt.doubleValue)) || 0),
        createdBy: (f.createdBy && f.createdBy.stringValue) || '',
      });
    });
    token = j.nextPageToken || '';
    if (!token) break;
  }
  return out;
}
let _issImgAuditResult = null;
window.__issueImageAudit = async function () {
  if (_issMock) { console.log('模擬模式中，照片只在記憶體，不需要稽核'); return null; }
  if (!_issLoaded) { console.log('問題清單還沒載入（先進一次「問題追蹤」頁），為了不把全部照片誤判成孤兒，這次不執行'); return null; }
  if (!_issNotesLoaded) { console.log('後續處理紀錄還沒載入，為了不把紀錄的照片誤判成孤兒，這次不執行'); return null; }
  console.log('掃描 issue_images 中…');
  const imgs = await _issImgListAll();
  const referenced = new Set();
  _issList.forEach(it => { (Array.isArray(it && it.images) ? it.images : []).forEach(pid => referenced.add(pid)); });   // 含軟刪除
  _issNotes.forEach(n => { (Array.isArray(n && n.images) ? n.images : []).forEach(pid => referenced.add(pid)); });     // 紀錄照片也算（含軟刪除的紀錄）
  const orphans = imgs.filter(im => !referenced.has(im.id));
  const mb = list => list.reduce((s, i) => s + i.bytes, 0) / 1048576;
  console.log('issue_images 總計 ' + imgs.length + ' 張、' + mb(imgs).toFixed(1) + ' MB');
  console.log('使用中     ' + (imgs.length - orphans.length) + ' 張');
  console.log('孤兒       ' + orphans.length + ' 張、' + mb(orphans).toFixed(1) + ' MB');
  if (orphans.length) {
    console.table(orphans.map(o => ({ id: o.id, issueId: o.issueId, KB: Math.round(o.bytes / 1024), 建立: _issFmt(o.createdAt), 上傳者: o.createdBy })));
    console.log("確認上表無誤後，執行 __issueImageCleanup('確定刪除') 才會實際刪除");
  } else {
    console.log('沒有孤兒，不需要清理');
  }
  _issImgAuditResult = orphans;
  return { total: imgs.length, totalMB: +mb(imgs).toFixed(1), orphans: orphans.length };
};
window.__issueImageCleanup = async function (confirmText) {
  if (!Array.isArray(_issImgAuditResult)) { console.log('請先執行 __issueImageAudit() 檢視要刪什麼'); return; }
  if (confirmText !== '確定刪除') { console.log("要實際刪除，請執行 __issueImageCleanup('確定刪除')（" + _issImgAuditResult.length + ' 張，無法復原）'); return; }
  let okN = 0, failN = 0;
  for (const o of _issImgAuditResult) { if (await _issPhotoStore.remove(o.id)) okN++; else failN++; }
  console.log('清理完成：成功 ' + okN + ' 張、失敗 ' + failN + ' 張；建議再跑一次 __issueImageAudit() 確認');
  _issImgAuditResult = null;
};

/* ---------- 本機模擬開關：__issuesMock(true / false) ----------
 * 只在 localhost / 127.0.0.1 / [::1] / *.localhost 生效；正式站呼叫只印警告、回 false、什麼都不改。
 * 開啟後資料來源換成記憶體 mock（介面同 __cloudIssues），不碰 Firestore / Store / localStorage，重整就消失。 */
function _issMakeMock() {
  const items = new Map(), listeners = new Set();
  const snap = () => ({ docs: [...items.values()].map(v => ({ id: v.id, data: () => ({ ...v }) })) });
  const emit = () => { const s = snap(); listeners.forEach(cb => { try { cb(s); } catch (e) { console.error(e); } }); };
  const api = {
    subscribe: (cb) => { listeners.add(cb); cb(snap()); return () => listeners.delete(cb); },
    getDoc: (id) => Promise.resolve({ exists: () => items.has(id), data: () => (items.has(id) ? { ...items.get(id) } : undefined) }),
    create: (id, data) => { items.set(id, { ...(data || {}), id }); emit(); return Promise.resolve({ ok: true }); },
    update: (id, fields) => {
      if (!items.has(id)) return Promise.reject(new Error('模擬資料找不到 ' + id));
      items.set(id, { ...items.get(id), ...(fields || {}) }); emit(); return Promise.resolve({ ok: true });
    },
  };
  // 紀錄：介面同 __cloudIssueNotes，只在記憶體
  const notes = new Map(), notesListeners = new Set();
  const notesSnap = () => ({ docs: [...notes.values()].map(v => ({ id: v.id, data: () => ({ ...v }) })) });
  const notesEmit = () => { const s = notesSnap(); notesListeners.forEach(cb => { try { cb(s); } catch (e) { console.error(e); } }); };
  const notesApi = {
    subscribe: (cb) => { notesListeners.add(cb); cb(notesSnap()); return () => notesListeners.delete(cb); },
    getDoc: (id) => Promise.resolve({ exists: () => notes.has(id), data: () => (notes.has(id) ? { ...notes.get(id) } : undefined) }),
    create: (id, data) => { notes.set(id, { ...(data || {}), id }); notesEmit(); return Promise.resolve({ ok: true }); },
    update: (id, fields) => {
      if (!notes.has(id)) return Promise.reject(new Error('模擬紀錄找不到 ' + id));
      notes.set(id, { ...notes.get(id), ...(fields || {}) }); notesEmit(); return Promise.resolve({ ok: true });
    },
  };
  // photos：模擬模式的照片（id → 同 issue_images 的 doc 內容，data 是 dataURL），只在記憶體（問題與紀錄的照片共用）
  return { items, listeners, api, photos: new Map(), notes, notesApi };
}
window.__issuesMock = function (on) {
  if (!_issIsLocalHost()) {
    console.warn('[issues] 模擬模式只在 localhost 可用');
    return false;
  }
  const want = !!on;
  if (want === !!_issMock) return want;
  _issComposerClose();      // 資料來源換了，草稿不跨模擬 / 雲端
  _issResetSub();
  _issPhotoCache.clear();   // 模擬 / 雲端的照片不混用
  _issPhotoPart.clear();
  _issMock = want ? _issMakeMock() : null;
  console.warn(want ? '[issues] 模擬模式已開啟：資料只在本機記憶體' : '[issues] 模擬模式已關閉，改回雲端');
  if (App.route === 'issues') App.render();
  return want;
};
