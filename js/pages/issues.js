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
  // 訂閱當下同步回呼（模擬模式會這樣）時不重畫：呼叫端 viewIssues 正在 render，重畫會遞迴
  if (!_issSubscribing && typeof App.renderFromCloud === 'function') App.renderFromCloud('issues');
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
}
// 寫入統一包一層：回傳 true＝確定寫入；false＝失敗或被防護擋下（no-op 回 undefined）
async function _issWrite(kind, id, payload) {
  const be = _issBackend();
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
  async upload(ownerId, item) {
    if (!_issCanCreate()) throw new Error(ISS_RO_MSG);
    const id = _issPhotoGenId();
    const data = {
      issueId: ownerId || '', data: item.dataUrl, mime: item.mime || '', bytes: item.bytes || 0,
      createdAt: Date.now(), createdBy: (_issMe() && _issMe().username) || '',
    };
    if (item.part) { data.part = { i: item.part.i, n: item.part.n }; _issPhotoPart.set(id, data.part); }   // 長圖分段：第幾段 / 共幾段
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
//   opts：{ root（含 .ti-list / .ti-status / [data-iss-photo="pick"] 的容器）, max, existing:[{ id, thumb }] }
//   回傳：{ items(), added(), removed(), busy(), destroy() }；items 依顯示順序，既有的 { key, id, thumb, isNew:false }、新的 { key, dataUrl, thumb, bytes, mime, isNew:true }
// paste 監聽綁在 document（焦點不在輸入框時貼上事件只到 body，綁在彈窗上收不到；同老闆任務 daily.js），三道保險不殘留到別頁：
//   ① 送出成功 / 取消 / ✕ → 呼叫端 destroy()
//   ② 點背景關窗不會呼叫 onCancel（modal.js closeModalOnBackdrop）→ 每次觸發先檢查「彈窗開著、照片區還在畫面上」，不在就自己 destroy、不處理
//   ③ 開新的挑選元件前，先 destroy 上一個（_issActivePicker）
let _issActivePicker = null;
function _issPhotoPicker(opts) {
  if (_issActivePicker) _issActivePicker.destroy();
  const root = opts.root, max = opts.max || ISS_PHOTO_MAX;
  const listEl = root.querySelector('.ti-list'), statusEl = root.querySelector('.ti-status');
  let items = (opts.existing || []).map(e => ({ key: e.id, id: e.id, thumb: e.thumb || '', isNew: false }));
  const removed = [];
  let pending = 0, seq = 0, destroyed = false;
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
          draw();
          setStatus('已加入（' + c.note + '）');
          continue;
        }
        items.push({ key: 'new-' + (++seq), dataUrl: c.dataUrl, thumb: c.thumb, bytes: c.bytes, mime: c.mime, isNew: true });
        draw();
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
    if (destroyed || !_issModalOpen() || !document.body.contains(root)) { api.destroy(); return; }   // 保險 ②
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
      draw(); setStatus('');
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
    addFiles,
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
        <div class="iss-resolution-label">${escapeHtml(label)}・${escapeHtml(_issName(it.resolvedBy, resolve))}・${escapeHtml(_issFmt(it.resolvedAt))}</div>
        <div class="iss-resolution-text">${escapeHtml(it.resolution)}</div>
      </div>`;
  let resolution = '';
  if (st === 'done') resolution = resolvedLine('完成說明', '');
  else if (String(it.resolution || '').trim()) resolution = resolvedLine('上次完成說明', ' iss-resolution-prev');
  // 負責人：已指派顯示姓名；未指派且未解決＝醒目標籤；未指派但已解決＝「—」（未指派只對未解決的有意義）
  const hasAsg = _issHasAssignee(it);
  const assignee = hasAsg
    ? `<div class="iss-assignee">負責人：${escapeHtml(_issAssigneeName(it.assignee, resolve))}</div>`
    : (st !== 'done' ? `<div class="iss-assignee"><span class="iss-tag iss-unassigned">未指派</span></div>` : `<div class="iss-assignee">負責人：—</div>`);
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
      </div>
      <div class="iss-title">${escapeHtml(it.title)}</div>
      ${String(it.desc || '').trim() ? `<div class="iss-desc">${escapeHtml(it.desc)}</div>` : ''}
      ${_issPhotosHtml(it)}
      <div class="iss-meta">提出：${escapeHtml(_issName(it.createdBy, resolve))}・${escapeHtml(_issFmt(it.createdAt))}</div>
      ${assignee}
      ${resolution}
      ${acts.length ? `<div class="iss-actions">${acts.join('')}</div>` : ''}
    </div>`;
}
// 卡片縮圖列：只用問題文件裡的 thumbs（小縮圖），點了開放大檢視才讀全尺寸圖；沒有縮圖的顯示 📷
function _issPhotosHtml(it) {
  const ids = Array.isArray(it.images) ? it.images.filter(x => typeof x === 'string' && x) : [];
  if (!ids.length) return '';
  const thumbs = (it.thumbs && typeof it.thumbs === 'object') ? it.thumbs : {};
  return `<div class="iss-photos">${ids.map((pid, i) => {
    const t = typeof thumbs[pid] === 'string' ? thumbs[pid] : '';
    return `<button type="button" class="iss-photo" data-iss-act="photo" data-id="${escapeHtml(it.id)}" data-idx="${i}" title="點開放大（${i + 1} / ${ids.length}）">`
      + (t ? `<img src="${escapeHtml(t)}" alt="照片 ${i + 1}">` : '<span class="iss-photo-missing">📷</span>') + '</button>';
  }).join('')}</div>`;
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
    //   click 與 change（只給區塊下拉）在同一個 if 裡一起掛，共用同一個旗標。
    if (main && !main.__issBound) {
      main.addEventListener('click', _issOnClick);
      main.addEventListener('change', _issOnChange);
      main.__issBound = true;
    }
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

  // 照片放大檢視：版面沿用老闆任務附圖的 .tiv-*（css/daily-adjustments.css），行為一樣（點圖切換原始尺寸）。
  //   daily.js 的 openTaskImagesModal 寫死讀 ec.bossTasks，不能直接共用，所以另寫一個。所有人都能看（同老闆任務）。
  openIssueImagesModal(id, startIdx) {
    const it = _issList.find(x => x.id === id && x.deleted !== true);
    const ids = (it && Array.isArray(it.images)) ? it.images.filter(x => typeof x === 'string' && x) : [];
    if (!ids.length) { showToast('這筆問題沒有照片', 'info'); return; }
    this.openModal({
      title: '問題照片 · ' + (it.title || ''),
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
                <figcaption class="tiv-cap">${(() => { const p = _issPhotoPart.get(ids[x.i]); return p && p.n > 1 ? escapeHtml('長圖 ' + p.i + '/' + p.n) + ' · ' : ''; })()}${n + 1} / ${okList.length} · 點圖切換原始尺寸</figcaption>
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
  }
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

/* ---------- 問題照片的用量 / 孤兒稽核（只給 Console 用，比照 daily.js 的 __taskImageAudit） ----------
 * 為什麼不併進 __taskImageAudit：那組寫死 task_images 與 ec.bossTasks，要算進來就得改老闆任務的稽核；分開算也看得出各自用量。
 * 孤兒＝issue_images 裡、沒有任何問題（含軟刪除的，軟刪除保留照片）的 images 指向的圖。
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
  console.log('掃描 issue_images 中…');
  const imgs = await _issImgListAll();
  const referenced = new Set();
  _issList.forEach(it => { (Array.isArray(it && it.images) ? it.images : []).forEach(pid => referenced.add(pid)); });   // 含軟刪除
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
  // photos：模擬模式的照片（id → 同 issue_images 的 doc 內容，data 是 dataURL），只在記憶體
  return { items, listeners, api, photos: new Map() };
}
window.__issuesMock = function (on) {
  if (!_issIsLocalHost()) {
    console.warn('[issues] 模擬模式只在 localhost 可用');
    return false;
  }
  const want = !!on;
  if (want === !!_issMock) return want;
  _issResetSub();
  _issPhotoCache.clear();   // 模擬 / 雲端的照片不混用
  _issPhotoPart.clear();
  _issMock = want ? _issMakeMock() : null;
  console.warn(want ? '[issues] 模擬模式已開啟：資料只在本機記憶體' : '[issues] 模擬模式已關閉，改回雲端');
  if (App.route === 'issues') App.render();
  return want;
};
