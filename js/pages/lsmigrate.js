/* js/pages/lsmigrate.js -- 本機資料搬家（第 1 塊：偵測＋首頁提示橫幅＋匯出；第 2 塊：匯入＋新網址提示），以 Object.assign(App, …) 合併回 App
 *
 * 第 2 塊（匯入）：側欄「📦 資料搬家」視窗下半部。選檔 → lsmigParseFile（schema ec-local-migrate、v 1；白名單外的 key 忽略並列出）→
 *   lsmigPlanImport 算完整計畫（不寫）→ 預覽表 → 按「匯入」：先存「_匯入前備份」（showSaveFilePicker；按取消 ⇒ 改問「下載備份並繼續／取消匯入」；不支援時改下載＋手動確認）
 *   → 照當下重算的計畫 lsmigApplyPlan（只用 setItem、逐把讀回比對、失敗回滾）→ 結果摘要＋「重新整理」鈕。
 *   合併：不刪任何東西；訂價表自訂列依 __id（同 __id 不同內容＝衝突、保留這台）；商開工具整筆 JSON 相同＝重複；選填這台有就不蓋；檔案讀不懂的不寫。
 *   新網址提示 lsMigrateHintHtml：offices.js 在商開分頁（資料是空的）與訂價表（沒有任何自訂列）上方加一行小字。
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

/* ── 第 2 塊：匯入（純函式；不讀不寫任何東西，storage 由呼叫端傳入） ── */
// 讀搬家檔：{ ok:false, why:'json'|'schema' } 或 { ok:true, entries:[[key, 原字串, 'required'|'optional']], ignored:[key…], meta }
//   只收白名單 key（依 key 本身分類，不管它在檔案的哪一區），值不是字串的也算忽略。
function lsmigParseFile(text) {
  let o;
  try { o = JSON.parse(String(text == null ? '' : text).replace(/^﻿/, '')); } catch (e) { return { ok: false, why: 'json' }; }
  if (!o || typeof o !== 'object' || o.schema !== 'ec-local-migrate' || o.v !== 1) return { ok: false, why: 'schema' };
  const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
  if (!isObj(o.required) && !isObj(o.optional)) return { ok: false, why: 'schema' };
  const entries = [], ignored = [], seen = new Set();
  ['required', 'optional'].forEach(sec => {
    const m = isObj(o[sec]) ? o[sec] : {};
    Object.keys(m).sort().forEach(k => {
      const kind = lsmigClassify(k);
      if (!kind || typeof m[k] !== 'string' || seen.has(k)) { ignored.push(k); return; }
      seen.add(k); entries.push([k, m[k], kind]);
    });
  });
  return { ok: true, entries, ignored, meta: { fromOrigin: String(o.fromOrigin || ''), exportedAt: String(o.exportedAt || ''), exportedBy: String(o.exportedBy || '') } };
}
function lsmigItemLabel(key, kind) {
  if (kind === 'optional') return '版面設定 ' + key;
  if (key.startsWith(LSMIG_REQUIRED_PREFIX)) return '訂價表「' + key.slice(LSMIG_REQUIRED_PREFIX.length) + '」自訂列';
  return LSMIG_TOOL_LABELS[key] || key;
}
// 匯入計畫。current＝{ key: 這台目前的原字串 | null }。每一項：
//   { key, kind, label, unit, fileCount, curCount, afterCount, action, added, dup, conflict, write:字串|null }
//   action：'new'（這台沒有，寫入原字串）'same'（逐字相同）'merge'（合併）'fileEmpty' 'bad'（檔案讀不懂，不寫）'curBad'（這台讀不懂，不寫）
//           'optKeep'（選填，這台已有不蓋）'optNew'（選填，補上）
//   規則：訂價表自訂列依 __id 合併（同 __id 內容不同＝衝突、保留這台）；商開工具整筆 JSON 相同＝重複；這台原有的在前，新的接在後面。
function lsmigPlanImport(entries, current) {
  const items = [];
  (entries || []).forEach(([k, raw, kind]) => {
    const cur = current && current[k] != null ? String(current[k]) : null;
    const isPricing = k.startsWith(LSMIG_REQUIRED_PREFIX);
    const it = { key: k, kind, label: lsmigItemLabel(k, kind), unit: isPricing ? '列' : '筆', fileCount: null, curCount: null, afterCount: null,
      action: '', added: 0, dup: 0, conflict: 0, write: null };
    if (kind === 'optional') {
      if (cur != null) it.action = 'optKeep'; else { it.action = 'optNew'; it.write = raw; }
      items.push(it); return;
    }
    const fi = lsmigInspect(raw), ci = lsmigInspect(cur);
    it.fileCount = fi.count; it.curCount = ci.count;
    if (fi.state === 'bad') { it.action = 'bad'; it.afterCount = ci.count; items.push(it); return; }
    if (fi.state === 'empty') { it.action = 'fileEmpty'; it.afterCount = ci.count; items.push(it); return; }
    if (cur === raw) { it.action = 'same'; it.dup = fi.count; it.afterCount = ci.count; items.push(it); return; }
    if (ci.state === 'bad') { it.action = 'curBad'; it.afterCount = null; items.push(it); return; }
    if (ci.state === 'empty') { it.action = 'new'; it.added = fi.count; it.afterCount = fi.count; it.write = raw; items.push(it); return; }
    const curArr = JSON.parse(cur), fileArr = JSON.parse(raw), out = curArr.slice();
    const curStr = new Set(curArr.map(r => JSON.stringify(r)));
    const curById = new Map();
    if (isPricing) curArr.forEach(r => { if (r && typeof r === 'object' && r.__id != null) curById.set(String(r.__id), JSON.stringify(r)); });
    fileArr.forEach(r => {
      const s = JSON.stringify(r);
      if (isPricing && r && typeof r === 'object' && r.__id != null) {
        const id = String(r.__id);
        if (curById.has(id)) { if (curById.get(id) === s) it.dup++; else it.conflict++; return; }
        curById.set(id, s); out.push(r); it.added++; return;
      }
      if (curStr.has(s)) { it.dup++; return; }
      out.push(r); it.added++;
    });
    it.action = 'merge'; it.afterCount = out.length;
    if (it.added > 0) it.write = JSON.stringify(out);
    items.push(it);
  });
  return items;
}
// 照計畫寫入：只用 setItem；每把寫完讀回比對，任何一把不一致或丟錯 ⇒ 停止，已寫的改回原值（原本沒有就移除）。
//   回 { ok:true, written:[key…] } 或 { ok:false, failedKey, error, rolledBack:[key…], rollbackFailed:[key…] }
function lsmigApplyPlan(items, storage) {
  const done = [];   // [key, 原值]
  for (const it of (items || [])) {
    if (it.write == null) continue;
    let prev = null;
    try {
      prev = storage.getItem(it.key);
      storage.setItem(it.key, it.write);
      done.push([it.key, prev]);
      if (storage.getItem(it.key) !== it.write) throw new Error('寫入後讀回不一致');
    } catch (e) {
      const rolledBack = [], rollbackFailed = [];
      done.slice().reverse().forEach(([k, p]) => {
        try { if (p == null) storage.removeItem(k); else storage.setItem(k, p); if (storage.getItem(k) === p) rolledBack.push(k); else rollbackFailed.push(k); }
        catch (e2) { rollbackFailed.push(k); }
      });
      return { ok: false, failedKey: it.key, error: String((e && e.message) || e), rolledBack, rollbackFailed };
    }
  }
  return { ok: true, written: done.map(d => d[0]) };
}
// 存檔視窗（showSaveFilePicker）打不開／被取消時怎麼辦：'ask'＝改問「要不要下載備份再繼續」；'fail'＝停止。
//   AbortError＝使用者按取消（有些瀏覽器會自動取消、根本不跳視窗）；NotAllowedError／SecurityError＝瀏覽器不讓開。
function lsmigPickerFailAction(e) {
  const n = e && e.name;
  return (n === 'AbortError' || n === 'NotAllowedError' || n === 'SecurityError') ? 'ask' : 'fail';
}
// 處理方式文字＋顏色（'ok'｜'warn'｜'bad'）
function lsmigActionText(it) {
  switch (it.action) {
    case 'new': return ['寫入（這台沒有）', 'ok'];
    case 'same': return ['跳過（內容完全相同）', ''];
    case 'fileEmpty': return ['檔案裡是空的，跳過', ''];
    case 'bad': return ['讀不懂，沒有匯入（原內容仍在檔案裡）', 'bad'];
    case 'curBad': return ['這台的這把讀不懂，沒有匯入（避免蓋掉）', 'bad'];
    case 'optKeep': return ['這台已有，不蓋', ''];
    case 'optNew': return ['補上（這台沒有）', 'ok'];
    case 'merge': {
      if (it.unit === '列') {
        const seg = ['合併，新增 ' + it.added + ' 列'];
        if (it.dup) seg.push('相同 ' + it.dup + ' 列跳過');
        if (it.conflict) seg.push('衝突 ' + it.conflict + ' 列，保留這台的');
        return [seg.join('、'), it.conflict ? 'warn' : (it.added ? 'ok' : '')];
      }
      return ['合併，新增 ' + it.added + ' 筆、重複 ' + it.dup + ' 筆跳過', it.added ? 'ok' : ''];
    }
  }
  return [it.action, ''];
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
  // 側欄「📦 資料搬家」（任何網址都能用）：上半部匯出、下半部匯入（第 2 塊）
  lsMigrateOpenModal() {
    const scan = this.lsMigrateScan();
    const exp = scan.hasData
      ? `<div class="lsmig-text">這台電腦有只存在本機（沒有上雲）的資料：</div>${_lsmigDetailHtml(scan)}
         ${Object.keys(scan.optional).length ? `<div class="lsmig-text">另含版面設定 ${Object.keys(scan.optional).length} 項。</div>` : ''}
         <div class="lsmig-text">匯出成檔案後，到新網址 ${escapeHtml(LSMIG_NEW_URL)} 再匯入。</div>
         <div class="lsmig-actions"><button type="button" class="lsmig-go" onclick="App.lsMigrateExportFromModal()">匯出本機資料</button></div>
         <div id="lsmig-modal-msg"></div>`
      : '<div class="lsmig-text">這台電腦沒有需要搬的本機資料</div>';
    const imp = `<div class="lsmig-sec">
        <div class="lsmig-title">匯入本機資料</div>
        <div class="lsmig-text">選從舊網址匯出的檔案（ec本機資料_….json）。先看預覽，按「匯入」才會寫進這台電腦；這台原有的資料不會被刪。</div>
        <div class="lsmig-text">存檔視窗標題寫『警告：這個網站可以看見你編輯的內容』是 Chrome 的正常提示，按『存檔』即可。</div>
        <div class="lsmig-actions"><button type="button" class="lsmig-later" onclick="App.lsMigrateImportPick()">選擇搬家檔…</button></div>
        <div id="lsmig-import-area"></div>
      </div>`;
    _lsmigImp = null;
    this.openModal({ title: '本機資料搬家', width: '680px', hideFooter: true, bodyHtml: `<div class="lsmig-modal">${exp}${imp}</div>` });
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

  /* ── 第 2 塊：匯入 ──
   * 選檔用「不放進頁面」的 <input type=file>：唯讀帳號的介面擋板（app.js __roGuardEvent）一律擋頁面上的 input[type=file]，
   *   但匯入只寫本機、不擋唯讀，所以不能把 input 放進 DOM。事件不會冒泡到 document，擋板看不到。 */
  lsMigrateImportPick() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; if (f) this.lsMigrateImportFile(f); });
    inp.click();
  },
  // 讀檔 → 檢查 → 算計畫 → 顯示預覽（不寫任何東西）。測試也可以直接傳 File。
  async lsMigrateImportFile(file) {
    const area = document.getElementById('lsmig-import-area');
    let text = '';
    try { text = await file.text(); } catch (e) { if (area) area.innerHTML = '<div class="lsmig-warn">讀不到這個檔案</div>'; return; }
    const parsed = lsmigParseFile(text);
    if (!parsed.ok) { _lsmigImp = null; if (area) area.innerHTML = '<div class="lsmig-warn">這不是儀表板的搬家檔</div>'; return; }
    _lsmigImp = { fileName: String(file.name || ''), parsed, busy: false };
    const plan = lsmigPlanImport(parsed.entries, _lsmigCurrentFor(parsed.entries));
    if (area) area.innerHTML = _lsmigPreviewHtml(_lsmigImp, plan);
  },
  lsMigrateImportCancel() {
    _lsmigImp = null;
    const area = document.getElementById('lsmig-import-area'); if (area) area.innerHTML = '';
  },
  // 按「匯入」：有要寫的 ⇒ 先存備份（存檔視窗按取消 ⇒ 不匯入）→ 照「當下」重算的計畫寫入、讀回比對、失敗回滾 → 結果摘要
  async lsMigrateImportGo() {
    const imp = _lsmigImp, area = document.getElementById('lsmig-import-area');
    if (!imp || imp.busy || !area) return;
    imp.busy = true;
    area.querySelectorAll('button').forEach(b => { b.disabled = true; });
    try {
      let plan = lsmigPlanImport(imp.parsed.entries, _lsmigCurrentFor(imp.parsed.entries));
      if (plan.some(it => it.write != null)) {
        const saved = await _lsmigSaveBackup(this);
        if (saved === 'manual') { imp.busy = false; area.innerHTML += _lsmigManualConfirmHtml(); return; }
        if (saved === 'ask') { imp.busy = false; area.innerHTML += _lsmigAskDownloadHtml(); return; }
        if (saved !== 'ok') { imp.busy = false; area.innerHTML = `<div class="lsmig-warn">${escapeHtml(saved)}</div>`; _lsmigImp = null; return; }
        plan = lsmigPlanImport(imp.parsed.entries, _lsmigCurrentFor(imp.parsed.entries));
      }
      _lsmigCommit(imp, plan, area);
    } catch (e) {
      console.error('[本機資料搬家] 匯入失敗', e);
      area.innerHTML = `<div class="lsmig-warn">匯入失敗：${escapeHtml(String((e && e.message) || e))}（沒有寫入任何資料）</div>`;
      _lsmigImp = null;
    }
  },
  // 瀏覽器不支援存檔視窗時：先用下載存備份，使用者確認存好才繼續
  lsMigrateImportManualGo() {
    const imp = _lsmigImp, area = document.getElementById('lsmig-import-area');
    if (!imp || imp.busy || !area) return;
    imp.busy = true;
    _lsmigCommit(imp, lsmigPlanImport(imp.parsed.entries, _lsmigCurrentFor(imp.parsed.entries)), area);
  },
  // 存檔視窗被取消後，使用者選「下載備份並繼續」：下載到「下載」資料夾 → 照當下重算的計畫寫入
  lsMigrateImportDownloadGo() {
    const imp = _lsmigImp, area = document.getElementById('lsmig-import-area');
    if (!imp || imp.busy || !area) return;
    imp.busy = true;
    try {
      const b = _lsmigBackupPayload(this);
      _lsmigDownload(b.name, b.text);
      console.info('[本機資料搬家] 已下載匯入前備份', b.name);
    } catch (e) {
      _lsmigImp = null;
      area.innerHTML = `<div class="lsmig-warn">備份沒有下載成功（${escapeHtml(String((e && e.message) || e))}），已取消匯入</div>`;
      return;
    }
    _lsmigCommit(imp, lsmigPlanImport(imp.parsed.entries, _lsmigCurrentFor(imp.parsed.entries)), area);
  },
  lsMigrateImportDownloadCancel() { this.lsMigrateImportManualCancel(); },
  lsMigrateImportManualCancel() {
    const area = document.getElementById('lsmig-import-area');
    _lsmigImp = null; if (area) area.innerHTML = '<div class="lsmig-warn">沒有備份，已取消匯入</div>';
  },

  // 新網址提示（小字一行）：只在新網址、而且這一頁的資料是空的時候。which＝商開分頁的 dynamic 或 'pricing'。
  lsMigrateHintHtml(which) {
    try {
      if (_lsmigSite() !== 'new') return '';
      if (which === 'pricing') {
        if (lsmigScan(_lsmigEntries()).pricing.length) return '';
      } else {
        const k = LSMIG_HINT_KEYS[which];
        if (!k) return '';
        if (lsmigInspect(localStorage.getItem(k)).state !== 'empty') return '';
      }
      return '<div class="lsmig-hint">舊網址有商開／訂價表資料嗎？→ 到側欄「📦 資料搬家」匯入</div>';
    } catch (e) { return ''; }
  },
});

let _lsmigImp = null;   // { fileName, parsed, busy }：目前預覽中的搬家檔（只在記憶體）
const LSMIG_HINT_KEYS = { 'supplier-mgmt': 'ec_d3_suppliers', 'profit-calc': 'ec_d3_calc_hist', 'product-kanban': 'ec_d3_kanban',
  'competitor-track': 'ec_d3_competitors', 'launch-plan': 'ec_d3_launch', 'trend-radar': 'ec_d3_trend_logs' };
function _lsmigCurrentFor(entries) {
  const cur = {};
  (entries || []).forEach(([k]) => { try { cur[k] = localStorage.getItem(k); } catch (e) { cur[k] = null; } });
  return cur;
}
const _lsmigNum = n => (n == null ? '—' : escapeHtml(String(n)));
function _lsmigPreviewHtml(imp, plan) {
  const m = imp.parsed.meta, writes = plan.filter(it => it.write != null).length;
  const rows = plan.map(it => {
    const [txt, cls] = lsmigActionText(it);
    return `<tr><td>${escapeHtml(it.label)}</td><td class="num">${_lsmigNum(it.fileCount)}</td><td class="num">${_lsmigNum(it.curCount)}</td>
      <td class="num">${_lsmigNum(it.afterCount)}</td><td class="lsmig-act${cls ? ' lsmig-act--' + cls : ''}">${escapeHtml(txt)}</td></tr>`;
  }).join('');
  return `<div class="lsmig-preview">
    <div class="lsmig-text">檔案：${escapeHtml(imp.fileName)}${m.exportedAt ? '　匯出時間 ' + escapeHtml(m.exportedAt) : ''}${m.fromOrigin ? '　來自 ' + escapeHtml(m.fromOrigin) : ''}</div>
    <div class="table-wrap"><table class="lsmig-table">
      <thead><tr><th>項目</th><th class="num">檔案</th><th class="num">這台目前</th><th class="num">匯入後</th><th>處理方式</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5">檔案裡沒有可以匯入的資料</td></tr>'}</tbody></table></div>
    ${imp.parsed.ignored.length ? `<div class="lsmig-text">忽略 ${imp.parsed.ignored.length} 把（不在搬家清單裡，不會寫入）</div>` : ''}
    <div class="lsmig-text">${writes ? `會寫入 ${writes} 把。按「匯入」會先存一份這台目前資料的備份（存檔視窗請按「存檔」），存好才寫入。` : '沒有需要寫入的資料（全部跳過）。'}</div>
    <div class="lsmig-actions">
      <button type="button" class="lsmig-go" onclick="App.lsMigrateImportGo()">匯入</button>
      <button type="button" class="lsmig-later" onclick="App.lsMigrateImportCancel()">取消</button>
    </div>
  </div>`;
}
function _lsmigAskDownloadHtml() {
  return `<div class="lsmig-banner" id="lsmig-ask-download">
    <div class="lsmig-text">沒有存到備份。要改成下載備份到「下載」資料夾後繼續匯入嗎？</div>
    <div class="lsmig-actions">
      <button type="button" class="lsmig-go" onclick="App.lsMigrateImportDownloadGo()">下載備份並繼續</button>
      <button type="button" class="lsmig-later" onclick="App.lsMigrateImportDownloadCancel()">取消匯入</button>
    </div></div>`;
}
function _lsmigManualConfirmHtml() {
  return `<div class="lsmig-banner" id="lsmig-manual-confirm">
    <div class="lsmig-text">已開始下載備份檔。確認備份檔已經存好，再按「繼續匯入」。</div>
    <div class="lsmig-actions">
      <button type="button" class="lsmig-go" onclick="App.lsMigrateImportManualGo()">備份已存好，繼續匯入</button>
      <button type="button" class="lsmig-later" onclick="App.lsMigrateImportManualCancel()">取消</button>
    </div></div>`;
}
// 匯入前備份的內容（同 schema，多 backupBeforeImport:true）與檔名
function _lsmigBackupPayload(app) {
  const now = new Date();
  const user = (app.currentUser && app.currentUser.username) || '';
  let ver = '';
  try { ver = (document.querySelector('meta[name="app-version"]') || {}).content || ''; } catch (e) {}
  const scan = lsmigScan(_lsmigEntries());
  const obj = lsmigBuildExport(scan, { fromOrigin: location.origin, appVersion: ver, exportedAt: lsmigTaipeiIso(now), exportedBy: user });
  obj.backupBeforeImport = true;
  return { name: lsmigFileName(user, now).replace(/.json$/, '_匯入前備份.json'), text: JSON.stringify(obj, null, 1) };
}
function _lsmigDownload(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { try { URL.revokeObjectURL(url); a.remove(); } catch (e) {} }, 2000);
}
// 存「匯入前備份」：回 'ok'、'ask'（存檔視窗被取消／打不開 ⇒ 改問要不要下載）、'manual'（不支援存檔視窗、已改用下載）或失敗原因文字。
//   🔴 showSaveFilePicker 必須在按鈕的同一個使用者動作裡呼叫（前面不可以有 await）。
async function _lsmigSaveBackup(app) {
  const b = _lsmigBackupPayload(app);
  if (typeof window.showSaveFilePicker === 'function') {
    let handle;
    try {
      handle = await window.showSaveFilePicker({ suggestedName: b.name, types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] });
    } catch (e) {
      console.info('[本機資料搬家] 存檔視窗沒有存到備份：', e && e.name);
      if (lsmigPickerFailAction(e) === 'ask') return 'ask';
      return '備份沒有存成功（' + String((e && e.message) || e) + '），已取消匯入';
    }
    try {
      const w = await handle.createWritable(); await w.write(b.text); await w.close();
      console.info('[本機資料搬家] 已存匯入前備份', b.name);
      return 'ok';
    } catch (e) { return '備份沒有存成功（' + String((e && e.message) || e) + '），已取消匯入'; }
  }
  _lsmigDownload(b.name, b.text);
  return 'manual';
}
function _lsmigCommit(imp, plan, area) {
  const r = lsmigApplyPlan(plan, localStorage);
  _lsmigImp = null;
  if (!r.ok) {
    console.error('[本機資料搬家] 匯入失敗', r);
    area.innerHTML = `<div class="lsmig-warn">匯入失敗：「${escapeHtml(lsmigItemLabel(r.failedKey, lsmigClassify(r.failedKey)))}」${escapeHtml(r.error)}。</div>
      <div class="lsmig-text">已寫入的 ${r.rolledBack.length} 把已改回原值${r.rollbackFailed.length ? `；<span class="lsmig-bad">${r.rollbackFailed.length} 把沒改回去（${escapeHtml(r.rollbackFailed.join('、'))}），請用匯入前備份檔處理並通知 Keani</span>` : ''}。</div>`;
    return;
  }
  console.info('[本機資料搬家] 匯入完成', r.written);
  const rows = plan.map(it => {
    const [txt, cls] = lsmigActionText(it);
    const skip = it.action === 'merge' ? it.dup : (it.write == null ? (it.fileCount == null ? '—' : it.fileCount) : 0);
    const noCount = it.action === 'bad' || it.action === 'curBad' || it.action === 'fileEmpty';
    return `<tr><td>${escapeHtml(it.label)}</td><td class="num">${it.kind === 'optional' ? (it.write != null ? '補上' : '—') : (noCount ? '—' : _lsmigNum(it.added))}</td>
      <td class="num">${it.kind === 'optional' ? (it.write == null ? '不蓋' : '—') : _lsmigNum(skip)}</td><td class="num">${it.conflict ? _lsmigNum(it.conflict) : '—'}</td>
      <td class="lsmig-act${cls ? ' lsmig-act--' + cls : ''}">${escapeHtml(txt)}</td></tr>`;
  }).join('');
  area.innerHTML = `<div class="lsmig-banner lsmig-banner--done" role="status">
    <div class="lsmig-title">${r.written.length ? `匯入完成，寫入 ${r.written.length} 把` : '沒有需要寫入的資料，全部跳過'}</div>
    <div class="table-wrap"><table class="lsmig-table">
      <thead><tr><th>項目</th><th class="num">新增</th><th class="num">跳過</th><th class="num">衝突</th><th>處理方式</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    ${r.written.length ? '<div class="lsmig-text">按「重新整理」讓商開工具、訂價表讀到新資料。</div><div class="lsmig-actions"><button type="button" class="lsmig-go" onclick="location.reload()">重新整理</button></div>' : ''}
  </div>`;
}

// 唯讀觀測點（不以 __cloud 開頭）：Console 打 __lsMigrateState() 看偵測結果，不回傳內容
window.__lsMigrateState = function () {
  const s = lsmigScan(_lsmigEntries());
  return { site: _lsmigSite(), hasData: s.hasData, toolsN: s.toolsN, pricingN: s.pricingN, counts: s.counts, badKeys: s.badKeys,
    optionalKeys: Object.keys(s.optional), sig: lsmigSig(s.required), exported: _lsmigReadJson(LSMIG_EXPORTED_KEY), laterDay: _lsmigReadJson(LSMIG_LATER_KEY) };
};
