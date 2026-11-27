/* js/pages/lsmigrate.js -- 本機資料搬家（第 1 塊：偵測＋首頁提示橫幅＋匯出；匯入是第 2 塊），以 Object.assign(App, …) 合併回 App
 *
 * 背景：12 月初網址從 kelly83117.github.io/ec-dashboard/ 搬到 playbox-tw.github.io/ec-dashboard/。
 *   localStorage 依網址（origin）分開，只存在本機、從來不上雲的資料要讓同事自己匯出、到新網址匯入。
 *   勘查：ec-backup\05_ClaudeCode回報\本機資料搬家_勘查_2026-11-27.md。
 * 🔴 只碰 localStorage：不讀雲端、不寫雲端、不經 Store、不改 firebase.js（本機防寫物件數不變）。
 *   唯一寫入是本機旗標 ec_lsmig_exported（匯出過的指紋）與 ec_lsmig_laterDay（「之後再說」的台灣日期），
 *   都是 localStorage.setItem，唯讀帳號也能用，所以 handler 刻意不放進 app.js __RO_WRITE_RE。
 * 匯出清單（白名單，其他 key 一律不匯出，尤其 ec.session、淨利表資料）：
 *   必搬 required：LSMIG_REQUIRED_KEYS 六把＋前綴 ec.d2.pricing.custom.（掃全部 key，不寫死分頁）。內容是非空陣列，或 JSON 讀不懂，才算有資料。
 *   選填 optional：LSMIG_OPTIONAL_KEYS／LSMIG_OPTIONAL_PREFIXES（版面設定），有就匯出，不影響「要不要提示」。
 * 值一律存 localStorage 的原始字串（不 parse 再 stringify），匯入時逐字還原。
 * 純函式在 LSMIG-PURE-BEGIN/END（node 測試 scripts/lsmigrate.test.cjs）。 */
const App = window.App;
const { escapeHtml, showToast } = window;

/* ═══ LSMIG-PURE-BEGIN ═══ */
const LSMIG_MOVE_DATE = '12/8';   // 搬家日期（橫幅文字用），改日期只改這裡
const LSMIG_NEW_URL = 'https://playbox-tw.github.io/ec-dashboard/';
const LSMIG_OLD_HOST = 'kelly83117.github.io';
const LSMIG_NEW_HOST = 'playbox-tw.github.io';
const LSMIG_EXPORTED_KEY = 'ec_lsmig_exported';   // { at, sig }
const LSMIG_LATER_KEY = 'ec_lsmig_laterDay';      // 'YYYY-MM-DD'（台灣日期）
const LSMIG_REQUIRED_KEYS = ['ec_d3_suppliers', 'ec_d3_calc_hist', 'ec_d3_competitors', 'ec_d3_launch', 'ec_d3_kanban', 'ec_d3_trend_logs'];
const LSMIG_REQUIRED_PREFIX = 'ec.d2.pricing.custom.';
const LSMIG_TOOL_LABELS = {
  ec_d3_suppliers: '供應商', ec_d3_calc_hist: '毛利試算紀錄', ec_d3_competitors: '競品',
  ec_d3_launch: '上架計劃', ec_d3_kanban: '看板（舊）', ec_d3_trend_logs: '熱搜紀錄',
};
const LSMIG_OPTIONAL_KEYS = ['ec_momo_moplus_otherfee', 'ec.d2.pricing.sheet', 'ec.d2.pricing.q', 'ec.d2.pricing.colpanel', 'ec.d2.pricing.filterpanel',
  'ec_colorder_user', 'ec_hcols_user', 'ec_colorder_coupang', 'ec_hcols_coupang', 'ec_health_metcols', 'ec_tagfilters_user'];
const LSMIG_OPTIONAL_PREFIXES = ['ec.d2.pricing.cols.', 'ec.d2.pricing.sort.', 'ec.d2.pricing.numfilters.', 'momo_cols|', 'pchome_cols|', 'ec_filterstate|'];

// 'required' | 'optional' | null
function lsmigClassify(key) {
  if (typeof key !== 'string') return null;
  if (LSMIG_REQUIRED_KEYS.includes(key)) return 'required';
  if (key.startsWith(LSMIG_REQUIRED_PREFIX) && key.length > LSMIG_REQUIRED_PREFIX.length) return 'required';
  if (LSMIG_OPTIONAL_KEYS.includes(key)) return 'optional';
  if (LSMIG_OPTIONAL_PREFIXES.some(p => key.startsWith(p) && key.length > p.length)) return 'optional';
  return null;
}
// 必搬 key 的內容：{ state:'empty'|'ok'|'bad', count }。空字串、null、[] ＝空；非空陣列＝ok；讀不懂或不是陣列＝bad（算有資料、原樣匯出）。
function lsmigInspect(raw) {
  if (raw == null || raw === '') return { state: 'empty', count: 0 };
  let v;
  try { v = JSON.parse(raw); } catch (e) { return { state: 'bad', count: null }; }
  if (v == null) return { state: 'empty', count: 0 };
  if (Array.isArray(v)) return v.length ? { state: 'ok', count: v.length } : { state: 'empty', count: 0 };
  return { state: 'bad', count: null };
}
// entries＝[[key, 原始字串], …]。回傳 { required:{k:原字串}, optional:{k:原字串}, counts:{k:筆數|null},
//   tools:[{key,label,count,bad}], pricing:[{key,sheet,count,bad}], toolsN, pricingN, badKeys:[…], hasData }
function lsmigScan(entries) {
  const out = { required: {}, optional: {}, counts: {}, tools: [], pricing: [], toolsN: 0, pricingN: 0, badKeys: [], hasData: false };
  const list = (entries || []).filter(e => e && typeof e[0] === 'string' && typeof e[1] === 'string')
    .slice().sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  for (const [k, raw] of list) {
    const kind = lsmigClassify(k);
    if (kind === 'optional') { out.optional[k] = raw; continue; }
    if (kind !== 'required') continue;
    const r = lsmigInspect(raw);
    if (r.state === 'empty') continue;
    out.required[k] = raw;
    out.counts[k] = r.count;
    const bad = r.state === 'bad';
    if (bad) out.badKeys.push(k);
    if (k.startsWith(LSMIG_REQUIRED_PREFIX)) {
      out.pricing.push({ key: k, sheet: k.slice(LSMIG_REQUIRED_PREFIX.length), count: r.count, bad });
      out.pricingN += r.count || 0;
    } else {
      out.tools.push({ key: k, label: LSMIG_TOOL_LABELS[k] || k, count: r.count, bad });
      out.toolsN += r.count || 0;
    }
  }
  out.tools.sort((a, b) => LSMIG_REQUIRED_KEYS.indexOf(a.key) - LSMIG_REQUIRED_KEYS.indexOf(b.key));
  out.hasData = Object.keys(out.required).length > 0;
  return out;
}
// 必搬內容的簡單指紋（FNV-1a 32 位元 × key 排序串接＋總長度）。內容一樣 ⇒ 一樣；新增一筆 ⇒ 變。
function lsmigSig(required) {
  const keys = Object.keys(required || {}).sort();
  if (!keys.length) return '';
  let h = 0x811c9dc5, len = 0;
  const feed = s => { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } len += s.length; };
  keys.forEach(k => { feed(k); feed('\u0001'); feed(String(required[k])); feed('\u0002'); });
  return keys.length + '-' + len + '-' + (h >>> 0).toString(16).padStart(8, '0');
}
// 'old' | 'new'。只看 hostname；localhost／127.0.0.1／::1 用 ?lsmig=old|new，沒帶當新網址。
function lsmigSite(hostname, search) {
  const h = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (h === LSMIG_OLD_HOST) return 'old';
  if (h === LSMIG_NEW_HOST) return 'new';
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') {
    let p = '';
    try { p = new URLSearchParams(String(search || '')).get('lsmig') || ''; } catch (e) {}
    return p === 'old' ? 'old' : 'new';
  }
  return 'new';
}
// 台灣時間各欄位（不依賴電腦時區）
function lsmigTaipeiParts(now) {
  const d = new Date((now instanceof Date ? now.getTime() : (typeof now === 'number' ? now : Date.now())) + 8 * 3600 * 1000);
  const p2 = n => String(n).padStart(2, '0');
  return { y: String(d.getUTCFullYear()), mo: p2(d.getUTCMonth() + 1), d: p2(d.getUTCDate()), h: p2(d.getUTCHours()), mi: p2(d.getUTCMinutes()), s: p2(d.getUTCSeconds()) };
}
function lsmigTaipeiDay(now) { const t = lsmigTaipeiParts(now); return t.y + '-' + t.mo + '-' + t.d; }
function lsmigTaipeiIso(now) { const t = lsmigTaipeiParts(now); return `${t.y}-${t.mo}-${t.d}T${t.h}:${t.mi}:${t.s}+08:00`; }
function lsmigFileName(username, now) {
  const t = lsmigTaipeiParts(now);
  const u = String(username || '未登入').trim().replace(/[\\/:*?"<>|\s]+/g, '_') || '未登入';
  return `ec本機資料_${u}_${t.y}${t.mo}${t.d}-${t.h}${t.mi}.json`;
}
// 匯出物件。required／optional 的值是原始字串；counts 只給人看與匯入預覽用（讀不懂的是 null）。
function lsmigBuildExport(scan, meta) {
  meta = meta || {};
  return {
    schema: 'ec-local-migrate', v: 1,
    fromOrigin: meta.fromOrigin || '', appVersion: meta.appVersion || '',
    exportedAt: meta.exportedAt || '', exportedBy: meta.exportedBy || '',
    required: Object.assign({}, scan.required), optional: Object.assign({}, scan.optional),
    counts: Object.assign({}, scan.counts),
  };
}
// 要不要顯示首頁橫幅
function lsmigShouldShowBanner(o) {
  if (!o || o.site !== 'old' || !o.scan || !o.scan.hasData) return false;
  const sig = lsmigSig(o.scan.required);
  if (o.exported && o.exported.sig === sig) return false;
  if (o.laterDay && o.today && o.laterDay === o.today) return false;
  return true;
}
// 明細文字：「商開工具 5 筆（供應商 3、競品 2）、訂價表自訂列 2 列（商品母表 2）」
function lsmigSummaryText(scan) {
  const seg = [];
  const c = it => (it.bad ? '讀不懂' : String(it.count));
  if (scan.tools.length) seg.push(`商開工具 ${scan.toolsN} 筆（${scan.tools.map(t => t.label + ' ' + c(t)).join('、')}）`);
  if (scan.pricing.length) seg.push(`訂價表自訂列 ${scan.pricingN} 列（${scan.pricing.map(p => '「' + p.sheet + '」' + c(p)).join('、')}）`);
  return seg.join('、');
}
/* ═══ LSMIG-PURE-END ═══ */

function _lsmigEntries() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i); if (k == null) continue;
      if (!lsmigClassify(k)) continue;
      out.push([k, localStorage.getItem(k)]);
    }
  } catch (e) { console.warn('[本機資料搬家] 讀不到 localStorage', e); }
  return out;
}
function _lsmigReadJson(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
function _lsmigSite() { try { return lsmigSite(location.hostname, location.search); } catch (e) { return 'new'; } }
let _lsmigLastResult = null;   // 本分頁最近一次匯出結果（橫幅位置顯示「已下載…」用）

// 明細的 HTML（讀不懂的那把標出來）
function _lsmigDetailHtml(scan) {
  const items = scan.tools.map(t => ({ name: t.label, n: t.count, bad: t.bad, unit: '筆' }))
    .concat(scan.pricing.map(p => ({ name: '訂價表「' + p.sheet + '」自訂列', n: p.count, bad: p.bad, unit: '列' })));
  return `<ul class="lsmig-list">${items.map(it => `<li>${escapeHtml(it.name)}：${it.bad
    ? '<span class="lsmig-bad">這把讀不懂，原樣匯出</span>'
    : escapeHtml(String(it.n)) + ' ' + it.unit}</li>`).join('')}</ul>`;
}
function _lsmigResultHtml(res) {
  return `<div class="lsmig-banner lsmig-banner--done" role="status">
    <div class="lsmig-title">已下載 ${escapeHtml(res.fileName)}</div>
    ${_lsmigDetailHtml(res.scan)}
    ${Object.keys(res.scan.optional).length ? `<div class="lsmig-text">另含版面設定 ${Object.keys(res.scan.optional).length} 項。</div>` : ''}
    <div class="lsmig-warn">檔案裡有供應商電話、LINE，請不要傳到群組。</div>
    <div class="lsmig-text">搬完到新網址 ${escapeHtml(LSMIG_NEW_URL)} 再匯入。</div>
  </div>`;
}

Object.assign(App, {
  // 偵測結果（唯讀）：純 localStorage，不讀雲端
  lsMigrateScan() { return lsmigScan(_lsmigEntries()); },

  // 首頁橫幅：一律回一個 #lsmig-slot（沒有要顯示時是空的），按鈕就地換內容、不用整頁重畫
  lsMigrateBannerHtml() {
    let inner = '';
    try {
      if (_lsmigLastResult) inner = _lsmigResultHtml(_lsmigLastResult);
      else {
        const scan = this.lsMigrateScan();
        const show = lsmigShouldShowBanner({ site: _lsmigSite(), scan, exported: _lsmigReadJson(LSMIG_EXPORTED_KEY),
          laterDay: _lsmigReadJson(LSMIG_LATER_KEY), today: lsmigTaipeiDay() });
        if (show) {
          inner = `<div class="lsmig-banner" role="status">
            <div class="lsmig-title">儀表板 ${escapeHtml(LSMIG_MOVE_DATE)} 要搬到新網址，這台電腦有只存在本機的資料</div>
            <div class="lsmig-text">${escapeHtml(lsmigSummaryText(scan))}</div>
            ${scan.badKeys.length ? _lsmigDetailHtml(scan) : ''}
            <div class="lsmig-text">請按「匯出本機資料」存成檔案，搬完到新網址再匯入。也請在淨利表、工作日誌按一次「☁ 同步雲端」。</div>
            <div class="lsmig-actions">
              <button type="button" class="lsmig-go" onclick="App.lsMigrateExportFromBanner()">匯出本機資料</button>
              <button type="button" class="lsmig-later" onclick="App.lsMigrateLater()">之後再說</button>
            </div>
          </div>`;
        }
      }
    } catch (e) { console.warn('[本機資料搬家] 橫幅失敗', e); inner = ''; }
    return `<div id="lsmig-slot">${inner}</div>`;
  },

  // 匯出：回 { ok, fileName, scan } 或 { ok:false, why:'empty'|'error' }。只讀 localStorage，下載後寫本機旗標。
  lsMigrateExport() {
    const scan = this.lsMigrateScan();
    if (!scan.hasData) return { ok: false, why: 'empty', scan };
    try {
      const now = new Date();
      const user = (this.currentUser && this.currentUser.username) || '';
      let ver = '';
      try { ver = (document.querySelector('meta[name="app-version"]') || {}).content || ''; } catch (e) {}
      const obj = lsmigBuildExport(scan, { fromOrigin: location.origin, appVersion: ver, exportedAt: lsmigTaipeiIso(now), exportedBy: user });
      const fileName = lsmigFileName(user, now);
      const blob = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(() => { try { URL.revokeObjectURL(url); a.remove(); } catch (e) {} }, 2000);
      try { localStorage.setItem(LSMIG_EXPORTED_KEY, JSON.stringify({ at: Date.now(), sig: lsmigSig(scan.required) })); }
      catch (e) { console.warn('[本機資料搬家] 記不住已匯出（不影響檔案）', e); }
      const res = { ok: true, fileName, scan };
      _lsmigLastResult = res;
      console.info('[本機資料搬家] 已匯出', fileName, scan.counts);
      return res;
    } catch (e) {
      console.error('[本機資料搬家] 匯出失敗', e);
      return { ok: false, why: 'error', error: String((e && e.message) || e) };
    }
  },
  lsMigrateExportFromBanner() {
    const r = this.lsMigrateExport();
    const slot = document.getElementById('lsmig-slot');
    if (r.ok) { if (slot) slot.innerHTML = _lsmigResultHtml(r); }
    else if (r.why === 'empty') { if (slot) slot.innerHTML = ''; showToast('這台電腦沒有需要搬的本機資料'); }
    else showToast('匯出失敗：' + (r.error || ''), 'error');
  },
  lsMigrateLater() {
    try { localStorage.setItem(LSMIG_LATER_KEY, JSON.stringify(lsmigTaipeiDay())); } catch (e) {}
    const slot = document.getElementById('lsmig-slot');
    if (slot) slot.innerHTML = '';
  },
  // 登入頁的小連結：結果寫在 #login-lsmig-msg
  lsMigrateLoginExport() {
    const r = this.lsMigrateExport();
    const box = document.getElementById('login-lsmig-msg');
    if (!box) return;
    if (r.ok) box.innerHTML = _lsmigResultHtml(r);
    else if (r.why === 'empty') box.innerHTML = '<div class="lsmig-text">這台電腦沒有需要搬的本機資料</div>';
    else box.innerHTML = `<div class="lsmig-warn">匯出失敗：${escapeHtml(r.error || '')}</div>`;
  },
  // 側欄帳號區的入口（任何網址都能用）：先看明細再匯出。第 2 塊在同一個視窗加「匯入」。
  lsMigrateOpenModal() {
    const scan = this.lsMigrateScan();
    const body = scan.hasData
      ? `<div class="lsmig-text">這台電腦有只存在本機（沒有上雲）的資料：</div>${_lsmigDetailHtml(scan)}
         ${Object.keys(scan.optional).length ? `<div class="lsmig-text">另含版面設定 ${Object.keys(scan.optional).length} 項。</div>` : ''}
         <div class="lsmig-text">匯出成檔案後，到新網址 ${escapeHtml(LSMIG_NEW_URL)} 再匯入。</div>
         <div class="lsmig-actions"><button type="button" class="lsmig-go" onclick="App.lsMigrateExportFromModal()">匯出本機資料</button></div>
         <div id="lsmig-modal-msg"></div>`
      : '<div class="lsmig-text">這台電腦沒有需要搬的本機資料</div>';
    this.openModal({ title: '本機資料搬家', width: '520px', hideFooter: true, bodyHtml: `<div class="lsmig-modal">${body}</div>` });
  },
  lsMigrateExportFromModal() {
    const r = this.lsMigrateExport();
    const box = document.getElementById('lsmig-modal-msg');
    if (r.ok) {
      if (box) box.innerHTML = _lsmigResultHtml(r);
      const slot = document.getElementById('lsmig-slot');   // 首頁橫幅同步換成「已下載」
      if (slot && slot.innerHTML) slot.innerHTML = _lsmigResultHtml(r);
    } else if (box) box.innerHTML = r.why === 'empty' ? '<div class="lsmig-text">這台電腦沒有需要搬的本機資料</div>'
      : `<div class="lsmig-warn">匯出失敗：${escapeHtml(r.error || '')}</div>`;
  },
});

// 唯讀觀測點（不以 __cloud 開頭）：Console 打 __lsMigrateState() 看偵測結果，不回傳內容
window.__lsMigrateState = function () {
  const s = lsmigScan(_lsmigEntries());
  return { site: _lsmigSite(), hasData: s.hasData, toolsN: s.toolsN, pricingN: s.pricingN, counts: s.counts, badKeys: s.badKeys,
    optionalKeys: Object.keys(s.optional), sig: lsmigSig(s.required), exported: _lsmigReadJson(LSMIG_EXPORTED_KEY), laterDay: _lsmigReadJson(LSMIG_LATER_KEY) };
};
