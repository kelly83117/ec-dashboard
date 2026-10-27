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
      <div class="iss-meta">提出：${escapeHtml(_issName(it.createdBy, resolve))}・${escapeHtml(_issFmt(it.createdAt))}</div>
      ${assignee}
      ${resolution}
      ${acts.length ? `<div class="iss-actions">${acts.join('')}</div>` : ''}
    </div>`;
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
    let saving = false;
    this.openModal({
      title: it ? '編輯問題' : '提出問題',
      bodyHtml: _issFormHtml(it),
      saveLabel: it ? '儲存' : '送出',
      width: '560px',
      onSave: () => {
        if (saving) return false;
        const title = String((document.getElementById('iss-f-title') || {}).value || '').trim();
        const desc = String((document.getElementById('iss-f-desc') || {}).value || '').trim();
        const areaEl = document.querySelector('input[name="iss-f-area"]:checked');
        const prEl = document.querySelector('input[name="iss-f-pr"]:checked');
        const area = (areaEl && ISS_AREAS.some(a => a.key === areaEl.value)) ? areaEl.value : '';
        const priority = _issPrKey(prEl ? prEl.value : 'normal');
        if (!title) { _issSetErr('iss-f-err', '請填寫問題標題'); return false; }
        if (!area) { _issSetErr('iss-f-err', '請選擇區塊'); return false; }   // 區塊必填（不再自動存成「其他」）
        _issSetErr('iss-f-err', '');
        const me = _issMe(), now = Date.now();
        let job;
        if (!it) {
          const newId = _issGenId();
          job = _issWrite('create', newId, {
            id: newId, title, area, priority, desc, status: 'open', resolution: '',
            createdAt: now, createdBy: me.username, updatedAt: now, updatedBy: me.username,
            resolvedAt: null, resolvedBy: '', assignee: null, deleted: false,
          });
        } else {
          const fields = {};
          if (title !== (it.title || '')) fields.title = title;
          if (area !== (it.area || '')) fields.area = area;
          if (priority !== _issPrKey(it.priority)) fields.priority = priority;
          if (desc !== (it.desc || '')) fields.desc = desc;
          if (!Object.keys(fields).length) { this.closeModal(); return false; }
          fields.updatedAt = now; fields.updatedBy = me.username;
          job = _issWrite('update', it.id, fields);
        }
        saving = true; _issSaveBtnBusy(true);
        job.then(ok => {
          saving = false; _issSaveBtnBusy(false);
          if (!ok) return;
          this.closeModal();
          showToast(it ? '已儲存' : '已送出', 'success');
          if (this.route === 'issues') this.render();
        });
        return false;   // 等寫入完成才關窗
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
  return { items, listeners, api };
}
window.__issuesMock = function (on) {
  if (!_issIsLocalHost()) {
    console.warn('[issues] 模擬模式只在 localhost 可用');
    return false;
  }
  const want = !!on;
  if (want === !!_issMock) return want;
  _issResetSub();
  _issMock = want ? _issMakeMock() : null;
  console.warn(want ? '[issues] 模擬模式已開啟：資料只在本機記憶體' : '[issues] 模擬模式已關閉，改回雲端');
  if (App.route === 'issues') App.render();
  return want;
};
