#!/usr/bin/env node
// #501 第 2 塊：唯讀帳號介面擋板（js/app.js 的 __RO_WRITE_RE）的 node 測試（只讀，不寫檔、不連網路）。
//
//   node scripts/ro-ui-whitelist.test.cjs
//
// ① 這次補進去的寫入 handler 都要被擋；② 純試算、檢視、切換、匯出不可以被擋；
// ③ 補進去的名字在 js/profit.js 真的有這個函式、也真的有 inline handler 在用（改名時這條會紅）；
// ④ Enter 直接存的輸入框（onkeydown）有被 __roIsWriteEl 與 keydown 監聽涵蓋。
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (cond, name, extra) => { if (cond) pass++; else { fail++; console.error('✗ ' + name + (extra ? '\n    ' + extra : '')); } };

const app = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8').replace(/\r\n/g, '\n');
const src = fs.readFileSync(path.join(ROOT, 'js/profit.js'), 'utf8').replace(/\r\n/g, '\n');
const m = app.match(/const __RO_WRITE_RE = (\/.*\/);/);
if (!m) throw new Error('找不到 __RO_WRITE_RE');
const RE = new Function('return ' + m[1])();

// ── ① 這次補的：要被擋 ──
const ADDED = ['pchomeOpenSyncPreview', 'pchomeConfirmSync', 'syncAffRptToCloud', 'deleteProfitNote',
  'kpiBooksMissCostSave', 'kpiFridayMissCostSave', 'kpiCoupangMissCostSave', 'momoMoPlusCostInlineSave', 'cupAnaCostSave',
  'momoPCSave', 'momoPCSaveConfirm', 'pchomePCSave', 'pchomePCSaveConfirm', 'pchomeAddOptlogModal', 'pchomeDeleteOptlog',
  'onCupPageNoteChange'];   // 2026-11-19：酷澎合併商品頁外層列的調整欄（oninput 直接存，對每個規格呼叫 onCupNoteChange）
ADDED.forEach(n => {
  ok(RE.test(n + "('a','b')"), n + '：onclick 會被擋');
  ok(RE.test("if(event.key==='Enter')" + n + "('a','b')"), n + '：包在 Enter 判斷裡也會被擋');
  ok(new RegExp('\\n(?:async )?function ' + n + '\\s*\\(').test(src), n + '：profit.js 有這個函式');
  ok(new RegExp('on(?:click|keydown|input|change)=\\\\?["\'][^"\'>]{0,60}\\b' + n + '\\(').test(src), n + '：profit.js 有 inline handler 在用');
});
// 原本就在的優化紀錄（MOMO／酷澎共用）仍然被擋
['momoAddOptlog', 'momoEditOptlog', 'momoSaveOptlogEdit', 'momoDeleteOptlog', 'momoMissingCostSave', 'cupMissCostSave', 'syncToCloud', 'cupSyncToCloud', 'momoOpenSyncPreview', 'momoConfirmSync', 'startEdit', 'submitProfitNote', 'onCupNoteChange']
  .forEach(n => ok(RE.test(n + '(1)'), n + '：原本就擋的仍然擋'));

// ── ② 不可以被擋 ──
const ALLOW = ["cupPCInput('cost',this.value)", 'cupPCReset()', 'cupPCToOptlog()',
  "momoPCInput('cost',this.value)", 'momoPCReset()', 'momoPCToOptlog()', 'momoPCBulkApply()', "momoPCSel(this)", 'momoPCSelAll(this)', 'momoPCToggleMore()',
  "pchomePCInput('cost',this.value)", 'pchomePCReset()', 'pchomePCToOptlog()',
  'doExport(curShop)', "momoExportExcel('甲配')", "cupExportExcel('麻吉')", "pchomeExportExcel('轉單')", 'unsoldExportExcel()', 'zeroSalesExportExcel()', 'momoExportCostByOrigin()', "momoExportMissingCost('甲配')",
  "setShop('好麻吉',this)", "setMomoShop('甲配',this)", "setPChomeShop('轉單',this)", "setCoupangShop('麻吉',this)",
  "onMonthChange('好麻吉',true)", "onHalfChange('好麻吉','first',null,true)", "setSearch('好麻吉',this.value)", "setSort('好麻吉','rev','asc')",
  "cupOpenAnalysis('麻吉','X')", "momoOpenAnalysis('甲配','X')", "pchomeOpenAnalysis('轉單','X')", "openNotePopup('好麻吉|2026/11|first','E1')",
  'pchomeCloseSyncPreview()', 'momoCloseSyncPreview()', 'closeProfitNoteModal()', "momoCancelOptlogEdit('甲配','X')",
  "cupSetPageMode('麻吉','merge')", "cupTogglePage('麻吉','123')", "event.stopPropagation();cupTogglePage('麻吉','123',true)",
  "splitSearch(this)", "splitAddRow()", "splitRemoveRow(0)", "momoOpenColPicker('甲配',this)", "toggleHiddenCol('好麻吉','rev')"];
ALLOW.forEach(h => ok(!RE.test(h), '不擋：' + h));

// ── ④ onkeydown 有被涵蓋 ──
ok(/el\.getAttribute\('onkeydown'\)/.test(app.slice(app.indexOf('function __roIsWriteEl'), app.indexOf('function __roInitUIGuard'))), '__roIsWriteEl 有看 onkeydown');
{
  const g = app.slice(app.indexOf('function __roInitUIGuard'));
  ok(/addEventListener\('keydown'/.test(g), '有 keydown 監聽');
  ok(/e\.key !== 'Enter' \|\| !document\.body\.classList\.contains\('ro-readonly'\)/.test(g), 'keydown：只攔 Enter、只在唯讀時');
  ok(/#view-app \[onkeydown\]/.test(g), '裝飾（灰底／readOnly）有掃 [onkeydown]');
}
// 兩個 Enter 直接存的輸入框，模板寫法沒有變
ok(/onkeydown="if\(event\.key==='Enter'\)momoMoPlusCostInlineSave\(/.test(src), 'MO+ 內嵌成本輸入框的 Enter 寫法還在');
ok(/onkeydown="if\(event\.key===\\'Enter\\'\)pchomeAddOptlogModal\(/.test(src), 'PChome 優化紀錄輸入框的 Enter 寫法還在');

// 酷澎合併商品頁：成員列的調整欄仍然是 onCupNoteChange（後面多接一個只重畫外層那一格的 cupPageNoteSync）→ 要被擋；外層列存檔只走 onCupNoteChange
ok(RE.test("onCupNoteChange('麻吉','A1',this.value);cupPageNoteSync('麻吉','123')"), '合併模式成員列的調整欄會被擋');
ok(!RE.test("cupPageNoteSync('麻吉','123')"), 'cupPageNoteSync 本身不寫入、不擋');
{ const i = src.indexOf('\nfunction onCupPageNoteChange('), body = src.slice(i, src.indexOf('\n}\n', i));
  ok(/onCupNoteChange\(shop, r\.code, value\)/.test(body), '外層列存檔呼叫單筆的 onCupNoteChange');
  ok(!/localStorage|_markPending|_cupNote(Key|Items)Dirty|__cloud/.test(body), '外層列存檔沒有另寫寫入路徑'); }

console.log((fail ? '✗ 有失敗：' : '✓ 全過：') + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
