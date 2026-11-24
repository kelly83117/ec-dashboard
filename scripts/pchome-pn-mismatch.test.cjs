#!/usr/bin/env node
// PChome 淨利表「商品編號 對帳 ≠ 清單」判斷（#527）的 node 測試（只讀，不寫檔、不連網路）。
//
//   node scripts/pchome-pn-mismatch.test.cjs
//   PCHOME_BACKUP_JSON=<v3 備份檔> node scripts/pchome-pn-mismatch.test.cjs   ← 另外用真實商品主檔：單頁料號新舊判斷逐筆相同、雙頁料號任一編號都合法（不印內容）
//
// 測 js/profit.js 的 PCH-PNMIS-PURE 區塊 pchomePnMismatch(reconPN, 主檔商品編號)。
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (cond, name, extra) => { if (cond) pass++; else { fail++; console.error('✗ ' + name + (extra ? '\n    ' + extra : '')); } };
const eq = (a, b, name) => ok(JSON.stringify(a) === JSON.stringify(b), name, '實際 ' + JSON.stringify(a) + '\n    預期 ' + JSON.stringify(b));

const src = fs.readFileSync(path.join(ROOT, 'js/profit.js'), 'utf8').replace(/\r\n/g, '\n');
const a = src.indexOf('/* ═══ PCH-PNMIS-PURE-BEGIN'), b = src.indexOf('/* ═══ PCH-PNMIS-PURE-END');
if (a < 0 || b < a) throw new Error('找不到 PCH-PNMIS-PURE 區塊');
const { pchomePnMismatch: M } = new Function(src.slice(a, b) + '\nreturn { pchomePnMismatch };')();
ok(/var pnMismatch=pchomePnMismatch\(reconPN, p&&p\.商品編號\)/.test(src), 'pchomeProfitCalc 用這支判斷');

// 舊判斷（改版前 pchomeProfitCalc 的寫法），拿來比單頁料號逐字相同
const OLD = (reconPN, pn) => { const listPN = pn ? String(pn).trim() : ''; return !!(reconPN && listPN && reconPN !== listPN); };

// ── 雙頁料號：任一個商品編號都合法 ──
const dual = ['DEBQEJ-A900KDYHE-002', 'DEBQEJ-A900KFR9M-002'];
eq(M('DEBQEJ-A900KDYHE-002', dual), false, '雙頁：對帳是第一頁 → 不報');
eq(M('DEBQEJ-A900KFR9M-002', dual), false, '雙頁：對帳是第二頁 → 不報');
eq(OLD('DEBQEJ-A900KDYHE-002', dual), true, '（舊判斷這裡會誤報，F394-04 的情況）');
eq(M(' DEBQEJ-A900KFR9M-002 ', [' DEBQEJ-A900KDYHE-002', 'DEBQEJ-A900KFR9M-002 ']), false, '雙頁：前後空白不影響');

// ── 真的不一致：仍要報 ──
eq(M('DEBQEJ-A900KZZZZ-002', dual), true, '雙頁：對帳的編號兩頁都不是 → 報');
eq(M('DAAC0A-A900KGP4E-001', ['DAAC0A-A900KGP4E-000']), true, '單頁：規格碼不同 → 報');
eq(M('X-Y-001', 'X-Z-001'), true, '單頁（字串）：不同 → 報');

// ── 單頁：跟舊判斷逐字相同 ──
const cases = [
  ['A-B-001', ['A-B-001']], ['A-B-001', ['A-B-002']], ['A-B-001', 'A-B-001'], ['A-B-001', 'A-C-001'],
  ['', ['A-B-001']], ['A-B-001', []], ['A-B-001', null], ['A-B-001', undefined], ['A-B-001', ''], ['', ''], [null, ['A-B-001']],
  ['A-B-001', [' A-B-001 ']], ['A-B-001', ' A-B-001 '],
];
cases.forEach(([r, pn]) => eq(M(r, pn), OLD(r, pn), '單頁同舊判斷：' + JSON.stringify([r, pn])));

// ── 兩邊任一邊空白不判 ──
eq(M('', dual), false, '對帳沒有商品編號 → 不判');
eq(M('A-B-001', ['', '  ']), false, '主檔只有空白 → 不判');
{ const L = dual.slice(); M('Q', L); eq(L, dual, '不改動傳進來的陣列'); }

// ── 真實商品主檔（選用）──
const bk = process.env.PCHOME_BACKUP_JSON;
if (bk) {
  const d = JSON.parse(fs.readFileSync(bk, 'utf8'));
  // v3 備份是 Firestore REST 型別格式（同 pchome-page-merge.test.cjs 的 dec）
  const dec = v => { if (v == null) return v; if ('stringValue' in v) return v.stringValue; if ('integerValue' in v) return Number(v.integerValue); if ('doubleValue' in v) return v.doubleValue; if ('booleanValue' in v) return v.booleanValue; if ('nullValue' in v) return null; if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec); if ('mapValue' in v) { const o = {}, f = v.mapValue.fields || {}; for (const k in f) o[k] = dec(f[k]); return o; } return v; };
  const doc = d['app/pchome_products'];
  const list = doc && doc.fields && doc.fields.list ? dec(doc.fields.list) : null;
  if (!Array.isArray(list)) { fail++; console.error('✗ 備份檔裡找不到 app/pchome_products.list'); }
  else {
    let single = 0, dualN = 0;
    list.forEach(p => { const arr = (Array.isArray(p.商品編號) ? p.商品編號 : [p.商品編號]).map(v => String(v == null ? '' : v).trim()).filter(Boolean);
      if (arr.length <= 1) { single++; [arr[0] || '', 'ZZ-NOPE-999'].forEach(r => ok(M(r, p.商品編號) === OLD(r, p.商品編號), '真實單頁同舊判斷')); }
      else { dualN++; arr.forEach(r => ok(M(r, p.商品編號) === false, '真實雙頁任一編號合法')); ok(M('ZZ-NOPE-999', p.商品編號) === true, '真實雙頁不相干編號要報'); } });
    console.log('真實商品主檔：單頁 ' + single + ' 筆、雙頁 ' + dualN + ' 筆');
  }
}

console.log((fail ? '❌' : '✅') + ' pchome-pn-mismatch：' + pass + ' 通過、' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
