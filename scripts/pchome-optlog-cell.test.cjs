#!/usr/bin/env node
// PChome 總表「優化紀錄」欄（2026-11-19）的 node 測試（只讀，不寫檔、不連網路）。
//
//   node scripts/pchome-optlog-cell.test.cjs
//   PCHOME_BACKUP_JSON=<v3 備份檔> node scripts/pchome-optlog-cell.test.cjs   ← 另外用真實優化紀錄跑一遍（不印內容）
//
// 測 js/profit.js 的 PCH-OLCELL-PURE 區塊：「最近一筆」的挑選、格子文字產生、空白不存；
// 以及欄位定義（預設顯示、舊的欄位偏好會補到最右邊、不排序、匯出不含這欄）。
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (cond, name, extra) => { if (cond) pass++; else { fail++; console.error('✗ ' + name + (extra ? '\n    ' + extra : '')); } };
const eq = (a, b, name) => ok(JSON.stringify(a) === JSON.stringify(b), name, '實際 ' + JSON.stringify(a) + '\n    預期 ' + JSON.stringify(b));

const src = fs.readFileSync(path.join(ROOT, 'js/profit.js'), 'utf8').replace(/\r\n/g, '\n');
const a = src.indexOf('// PCH-OLCELL-PURE-BEGIN'), b = src.indexOf('// PCH-OLCELL-PURE-END');
if (a < 0 || b < a) throw new Error('找不到 PCH-OLCELL-PURE 區塊');
const P = new Function(src.slice(a, b) + '\nreturn { pchomeOptlogLatest, pchomeOptlogCellNote, pchomeOptlogCellLeave, pchomeOptlogCellView, pchomeOptlogCellInnerHTML };')();
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const TYPES = ['商品內容優化', '調價', '上下架', '相關商品', '影片', '五星好評', '做活動', '其他'];
const nameOf = u => ({ xinyu: '心雨' })[u] || u;
const deps = { esc, types: TYPES, nameOf };
const E = (id, date, time, type, note, by) => ({ id, date, time, shop: '轉單', sku: 'S1', by, type, note });

// ── 「最近一筆」的挑選 ──
eq(P.pchomeOptlogLatest([]), null, '空陣列 → null');
eq(P.pchomeOptlogLatest(undefined), null, 'undefined → null');
eq(P.pchomeOptlogLatest({}), null, '不是陣列 → null');
{ const l = [E('a', '2026-11-18', '10:00', '調價', 'A'), E('b', '2026-11-19', '09:00', '做活動', 'B'), E('c', '2026-11-17', '23:59', '其他', 'C')];
  ok(P.pchomeOptlogLatest(l).id === 'b', '日期最新的那筆（不是陣列最後一筆）'); }
{ const l = [E('a', '2026-11-19', '15:30', '調價', 'A'), E('b', '2026-11-19', '09:00', '做活動', 'B')];
  ok(P.pchomeOptlogLatest(l).id === 'a', '同一天比時間'); }
{ const l = [E('a', '2026-11-19', '09:00', '調價', 'A'), E('b', '2026-11-19', '09:00', '做活動', 'B')];
  ok(P.pchomeOptlogLatest(l).id === 'b', '同日期同時間 → 陣列裡後面那筆'); }
{ const l = [E('a', '2026-11-19', '', '調價', 'A'), E('b', '2026-11-19', '08:00', '做活動', 'B')];
  ok(P.pchomeOptlogLatest(l).id === 'b', '沒有時間的排在同一天有時間的前面'); }
{ const l = [E('a', '2026-11-19', '08:00', '調價', 'A'), { id: 'x' }, null, 'bad'];
  ok(P.pchomeOptlogLatest(l).id === 'a', '沒有日期的、null、不是物件的不會被挑到'); }
{ const l = [E('a', '2026-09-30', '10:00', '調價', 'A'), E('b', '2026-10-01', '10:00', '調價', 'B'), E('c', '2025-12-31', '10:00', '調價', 'C')];
  ok(P.pchomeOptlogLatest(l).id === 'b', '跨月、跨年照字串順序'); }
{ const l = [E('a', '2026-11-18', '10:00', '調價', 'A'), E('b', '2026-11-19', '09:00', '做活動', 'B')], copy = JSON.stringify(l);
  P.pchomeOptlogLatest(l); P.pchomeOptlogCellView(l, nameOf); ok(JSON.stringify(l) === copy, '不改動傳進來的陣列'); }

// ── 格子文字 ──
eq(P.pchomeOptlogCellView([], nameOf), null, '沒有紀錄 → null');
{ const v = P.pchomeOptlogCellView([E('a', '2026-11-18', '10:00', '調價', '舊的', 'xinyu'), E('b', '2026-11-19', '09:05', '做活動', '雙 11 加碼', 'xinyu')], nameOf);
  eq([v.n, v.type, v.note, v.md, v.by, v.meta], [2, '做活動', '雙 11 加碼', '11/19', '心雨', '11/19 心雨'], '類型、內容、MM/DD、記錄人、筆數');
  ok(v.title === '【做活動】雙 11 加碼\n2026-11-19 09:05 · 心雨', 'title 是全文＋日期時間＋記錄人', JSON.stringify(v.title)); }
{ const v = P.pchomeOptlogCellView([E('a', '2026-11-19', '09:05', '', '', '')], nameOf);
  eq([v.type, v.note, v.by, v.meta], ['其他', '', '', '11/19'], '沒有類型 → 其他；沒有記錄人 → 只有日期'); }
{ const v = P.pchomeOptlogCellView([E('a', '2026-11-19', '09:05', '調價', 'x', 'nobody')], nameOf);
  ok(v.by === 'nobody', '帳號對不到姓名 → 顯示帳號'); }
{ const v = P.pchomeOptlogCellView([E('a', '2026-11-19', '09:05', '調價', 'x', 'u'), null, 'bad'], nameOf);
  ok(v.n === 1, '筆數不算壞掉的元素'); }

// ── 格子 HTML（檢視）──
{ const h = P.pchomeOptlogCellInnerHTML([], null, deps);
  ok(h.includes('>輸入優化紀錄…</div>') && h.includes('pch-ol-empty'), '沒有紀錄 → 灰字「輸入優化紀錄…」');
  ok(h.includes('onclick="event.stopPropagation();pchomeOptlogCellEdit(this)"'), '空格子點了開編輯、不冒泡到列');
  ok(!h.includes('共 ') && !h.includes('pchomeOptlogCellOpen'), '沒有紀錄不顯示「共 N 筆」'); }
{ const long = '很長的內容'.repeat(40);
  const h = P.pchomeOptlogCellInnerHTML([E('a', '2026-11-19', '09:05', '調價', long, 'xinyu'), E('b', '2026-11-01', '09:05', '其他', '舊', 'xinyu')], null, deps);
  ok(h.includes('<span class="pch-ol-type">調價</span>') && h.includes('<span class="pch-ol-note">' + long + '</span>'), '第一行：類型標籤＋最近一筆內容（截斷交給 CSS）');
  ok(h.includes('title="【調價】' + long), 'title 有全文');
  ok(h.includes('>共 2 筆</a>') && !/<br|pch-ol-l2/.test(h), '同一行右邊「共 N 筆」（不做成兩行）');
  ok(h.includes('\n2026-11-19 09:05 · 心雨"'), 'title 有日期與記錄人');
  ok(h.includes('class="cup-pg-note-inp pch-ol-main"'), '框沿用酷澎調整欄的 class');
  ok(h.includes('onclick="event.stopPropagation();pchomeOptlogCellOpen(this)"'), '「共 N 筆」開彈窗、不冒泡');
  const main = h.slice(0, h.indexOf('<a class="pch-ol-n"'));
  ok(main.includes('pchomeOptlogCellEdit(this)') && !main.includes('pchomeOptlogCellOpen'), '第一行點了是編輯');
  const n = h.slice(h.indexOf('<a class="pch-ol-n"'));
  ok(!n.includes('pchomeOptlogCellEdit'), '「共 N 筆」本身不會開編輯'); }
{ const h = P.pchomeOptlogCellInnerHTML([E('a', '2026-11-19', '09:05', '<b>x', '"><img src=x onerror=1>\'', 'xinyu')], null, deps);
  ok(!h.includes('<img') && !h.includes('<b>x') && !/title="[^"]*">\s*<img/.test(h), '內容與類型都有跳脫'); }

// ── 格子 HTML（編輯）──
{ const h = P.pchomeOptlogCellInnerHTML([], { type: '做活動', note: '打到一半"' }, deps);
  ok(TYPES.every(t => h.includes('<option value="' + t + '"')), '下拉有全部類型');
  ok(h.includes('<option value="做活動" selected>') && (h.match(/ selected>/g) || []).length === 1, '選中傳進來的類型');
  ok(h.includes('value="打到一半&quot;"'), '草稿內容帶回輸入框（有跳脫）');
  ok(h.includes(`onkeydown="if(event.key==='Enter'&&!event.isComposing)pchomeOptlogCellSave(this);else if(event.key==='Escape')pchomeOptlogCellCancel()"`), 'Enter 存、Esc 取消（選字中的 Enter 不存）');
  ok(h.indexOf('<select') < h.indexOf('<input') && h.includes('class="cup-pg-note-inp pch-ol-inp"'), '左邊類型下拉、右邊輸入框（沿用酷澎調整欄的 class）');
  ok(h.includes('placeholder="輸入後按 Enter 或 ✓ 儲存"'), 'placeholder');
  ok(h.includes('title="儲存（Enter）" aria-label="儲存" onclick="pchomeOptlogCellSave(this)">✓</button>'), '✓ 小鈕：儲存，走同一支 pchomeOptlogCellSave');
  ok(h.includes('title="取消（Esc）" aria-label="取消" onclick="pchomeOptlogCellCancel()">✕</button>'), '✕ 小鈕：取消');
  ok((h.match(/<button/g) || []).length === 2 && h.indexOf('<input') < h.indexOf('<button'), '兩顆鈕在輸入框右邊');
  ok(!h.includes('pch-ol-warn') && !h.includes('pch-ol-hint'), '平常沒有警示');
  const w = P.pchomeOptlogCellInnerHTML([], { type: '做活動', note: '還沒存', warn: true }, deps);
  ok(w.includes('pch-ol-inp pch-ol-warn"') && w.includes('<div class="pch-ol-hint">尚未儲存：按 Enter 儲存，或按 Esc 放棄</div>') && w.includes('value="還沒存"'), '警示狀態：輸入框警示色＋提示小字，文字還在');
  ok(h.startsWith('<div class="pch-ol-row" onclick="event.stopPropagation()">'), '輸入區點了不冒泡到列');
  ok(!h.includes('pchomeOptlogCellEdit'), '編輯中不再掛開編輯'); }
{ const h = P.pchomeOptlogCellInnerHTML([], { type: '不存在的類型', note: '' }, deps);
  ok(h.includes('<option value="' + TYPES[0] + '" selected>'), '類型不在清單 → 選第一個'); }

// ── 空白不存 ──
eq(['', '   ', '\t\n', '　', null, undefined].map(P.pchomeOptlogCellNote), ['', '', '', '', '', ''], '空白、全形空白、null → 空字串（不存）');
eq(P.pchomeOptlogCellNote('  調降供貨價 \n'), '調降供貨價', '前後空白去掉');
// ── 沒存就離開 ──
eq(['', '   ', '　', null, undefined].map(P.pchomeOptlogCellLeave), ['close', 'close', 'close', 'close', 'close'], '輸入框是空的 → 點別處直接收起來');
eq(['調價', ' x '].map(P.pchomeOptlogCellLeave), ['stay', 'stay'], '有還沒存的文字 → 留在原格');
{ const i = src.indexOf('\nfunction _pchomeOlOutsideClick('), body = src.slice(i, src.indexOf('\n}\n', i));
  ok(i > 0 && !/pchomeAddOptlog|pchomeOptlogCellSave|pchomeSaveOptlog/.test(body), '點別處不會自動儲存');
  ok(/==='close'\)\{ _pchomeOlEdit=null;/.test(body) && /if\(_pchomeOlWarn\(\)\)\{ ev\.preventDefault\(\); ev\.stopImmediatePropagation\(\); \}/.test(body), '空的收起來；有字就提示並讓這一下點擊不生效');
  ok(/if\(td\.contains\(ev\.target\)\) return;/.test(body), '點原格裡面不處理');
  ok(src.includes("document.addEventListener('click', _pchomeOlOutsideClick, true);"), '用 capture 階段監聽');
  const w = src.indexOf('\nfunction _pchomeOlWarn('), wb = src.slice(w, src.indexOf('\n}\n', w));
  ok(w > 0 && !/_pchomeOlEdit=null|innerHTML/.test(wb) && /inp\.focus/.test(wb), '提示時不清草稿、不重畫輸入框，並重新取得焦點');
  const e = src.indexOf('\nfunction pchomeOptlogCellEdit('), eb = src.slice(e, src.indexOf('\n}\n', e));
  ok(/pchomeOptlogCellLeave\(_pchomeOlDraftNow\(\)\)==='stay'&&_pchomeOlWarn\(\)\) return;/.test(eb), '開別格前也先檢查原格'); }
{ const i = src.indexOf('\nfunction pchomeOptlogCellSave('), body = src.slice(i, src.indexOf('\n}\n', i));
  const iBlank = body.indexOf("if(!txt){"), iAdd = body.indexOf('pchomeAddOptlog(');
  ok(iBlank > 0 && iAdd > iBlank && /if\(!txt\)\{[^\n]*pch-ol-err[^\n]*return; \}/.test(body), '空白：標紅框後 return，在 pchomeAddOptlog 之前');
  ok(/_pchomeOlLastType=type/.test(body) && !/localStorage/.test(body), '上一次用的類型只記在記憶體'); }
ok(/var _pchomeOlLastType='調價';/.test(src), '類型預設「調價」');

// ── 欄位定義 ──
{ const i = src.indexOf('var PCHOME_PROFIT_COLS=['), j = src.indexOf('\n];', i);
  const COLS = new Function('return ' + src.slice(i + 'var PCHOME_PROFIT_COLS='.length, j + 2))();
  const last = COLS[COLS.length - 1];
  eq([last.k, last.label, !!last.left, !!last.nosort, last.fmt], ['optlog', '優化紀錄', true, true, undefined], '最後一欄是「優化紀錄」：靠左、不排序、不是數值篩選欄');
  eq(COLS.slice(0, -1).map(c => c.k), ['name', 'unitCost', 'supply', 'price', 'revenue', 'qty', 'fee', 'itemProfit', 'itemMargin', 'profit', 'margin', 'tags'], '原本的欄位與順序沒變');
  // 欄位偏好：pchomeLoadColCfg 的補欄規則（舊偏好沒有 optlog → 補到最右邊、預設顯示）
  const k0 = src.indexOf('\nfunction pchomeColDefKeys('), k1 = src.indexOf('\nfunction pchomeSaveColCfg(');
  const mk = stored => { const ls = { getItem: () => stored };
    return new Function('PCHOME_PROFIT_COLS', 'localStorage', "var _PCHOME_COLCFG_LS='pchome_cols|'; function pchomeColAvail(){ return PCHOME_PROFIT_COLS; }" + src.slice(k0, k1) + '\nreturn pchomeLoadColCfg("轉單");')(COLS, ls); };
  const fresh = mk(null);
  ok(fresh.order[fresh.order.length - 1] === 'optlog' && fresh.hidden.indexOf('optlog') < 0, '沒存過偏好：最右邊、預設顯示');
  const old = mk(JSON.stringify({ order: ['tags', 'margin', 'profit', 'revenue', 'qty', 'unitCost', 'supply', 'price', 'fee', 'itemProfit', 'itemMargin'], hidden: ['price'] }));
  eq([old.order[0], old.order[old.order.length - 1], old.hidden], ['tags', 'optlog', ['price']], '舊偏好（自訂順序、隱藏售價）：原樣保留，優化紀錄補在最右邊、顯示');
  const hid = mk(JSON.stringify({ order: fresh.order, hidden: ['optlog'] }));
  ok(hid.hidden.indexOf('optlog') >= 0, '隱藏後存起來的偏好讀得回來'); }
{ const i = src.indexOf('\nfunction pchomeExportExcel('), body = src.slice(i, src.indexOf('\n}\n', i));
  ok(!/優化紀錄|optlog/i.test(body), '匯出 Excel 沒有這一欄'); }
ok((src.match(/case 'optlog': return pchomeOptlogTdHTML\(shop, x\.料號\);/g) || []).length === 2, '帳務月、日曆月兩個表格都有這一欄');
ok((src.match(/\(c\.nosort\?'':' onclick="pchomeProfitSetSort\(/g) || []).length === 2, '兩個表頭：不排序的欄不掛排序');
{ const kf = src.match(/var kf=\{name:[^\n]*\};/g) || [];
  ok(kf.length === 2 && kf.every(s => !/optlog/.test(s)), '排序用的取值表沒有加這一欄'); }

// ── 真實資料（選用）：每個有紀錄的料號都挑得出最近一筆、HTML 產得出來 ──
if (process.env.PCHOME_BACKUP_JSON) {
  const raw = JSON.parse(fs.readFileSync(process.env.PCHOME_BACKUP_JSON, 'utf8'));
  // v3 備份＝{ 'app/pchome_optlog': { fields: Firestore REST 型別值 } }
  const dec = v => { if (!v || typeof v !== 'object') return v;
    if ('stringValue' in v) return v.stringValue; if ('integerValue' in v) return Number(v.integerValue); if ('doubleValue' in v) return v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue; if ('nullValue' in v) return null; if ('timestampValue' in v) return v.timestampValue;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
    if ('mapValue' in v) { const o = {}; Object.keys(v.mapValue.fields || {}).forEach(k => { o[k] = dec(v.mapValue.fields[k]); }); return o; }
    return v; };
  const rawDoc = raw['app/pchome_optlog'];
  const doc = (rawDoc && rawDoc.fields) ? dec({ mapValue: { fields: rawDoc.fields } }) : null;
  if (!doc) { console.log('（備份裡找不到 app/pchome_optlog，略過真實資料）'); }
  else {
    const body = doc; let skus = 0, entries = 0, bad = 0;
    ['轉單', '寄倉'].forEach(shop => { const m = body[shop]; if (!m || typeof m !== 'object') return;
      Object.keys(m).forEach(sku => { const list = m[sku]; if (!Array.isArray(list) || !list.length) return; skus++; entries += list.length;
        const e = P.pchomeOptlogLatest(list), v = P.pchomeOptlogCellView(list, nameOf), h = P.pchomeOptlogCellInnerHTML(list, null, deps);
        const maxK = list.map(x => String(x.date || '') + ' ' + String(x.time || '')).sort().pop();
        if (!e || !v || v.n !== list.length || (String(e.date || '') + ' ' + String(e.time || '')) !== maxK || !h.includes('共 ' + list.length + ' 筆')) bad++; }); });
    ok(bad === 0, '真實資料：' + skus + ' 個料號、' + entries + ' 筆都對', bad + ' 個料號不對');
    console.log('真實資料：' + skus + ' 個料號、' + entries + ' 筆紀錄');
  }
}

console.log((fail ? '✗ 有失敗：' : '✓ 全過：') + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
