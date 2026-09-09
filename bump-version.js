#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   bump-version.js — 一鍵更新全站版本號（15 處），取代手動改 + grep 驗證。

   用法：
     node bump-version.js <新版號>        例：node bump-version.js 2026-09-09-658
     node bump-version.js --check          只驗證目前 15 處一致、不改

   作用：把 index.html <meta app-version> 目前的版號，換成 <新版號>，並同步
   index.html + js/main.js 裡全部 14 個 `?v=`（共 15 處）。改完自動驗證：
     · index.html 5 處（app-version×1 + 3 CSS ?v= + main.js ?v=）
     · js/main.js 10 處（10 個 import ?v=）
     · 舊版號零殘留、全 15 處都是新版號
   任一項不符 → 非零離開、印錯誤，不留半套。

   ⚠ 只改字串、不動任何 runtime 邏輯 / 啟動順序 / 快取機制。
   ⚠ 流程（見 CLAUDE.md）：feature 分支【不要】bump；合併進 main 後才跑這支、
      單一 `chore: bump version to <新版號>` commit。這樣 PR 之間不碰版號那 15 行、
      不再互相衝突。
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;                 // 腳本放 repo 根目錄
const INDEX = path.join(ROOT, 'index.html');
const MAIN  = path.join(ROOT, 'js', 'main.js');
const EXPECT = { index: 5, main: 10 };  // 各檔應出現的版號次數（合計 15）
const VER_RE = /^\d{4}-\d{2}-\d{2}-\d+$/;                 // YYYY-MM-DD-N
const META_RE = /<meta\s+name="app-version"\s+content="([^"]+)"\s*\/?>/;

function die(msg) { console.error('❌ ' + msg); process.exit(1); }
function read(f) { try { return fs.readFileSync(f, 'utf8'); } catch (e) { die('讀不到 ' + f + '：' + e.message); } }
// 全域字面取代（版號字串不含 regex 特殊字，直接 split/join 最安全）
function replaceAll(s, from, to) { return s.split(from).join(to); }
function countOccurrences(s, sub) { return sub ? s.split(sub).length - 1 : 0; }

// ── 1. 讀目前版號（以 index.html 的 app-version 為權威來源）──
const indexSrc0 = read(INDEX);
const m = indexSrc0.match(META_RE);
if (!m) die('index.html 找不到 <meta name="app-version" content="…">，格式可能變了');
const CUR = m[1];
if (!VER_RE.test(CUR)) die('目前 app-version 格式不符 YYYY-MM-DD-N：「' + CUR + '」');

const arg = process.argv[2];

// ── 驗證輔助：檢查兩檔版號次數 + 一致 + 無其他版號殘留 ──
function verify(ver) {
  const idx = read(INDEX), main = read(MAIN);
  const cIdx = countOccurrences(idx, ver), cMain = countOccurrences(main, ver);
  const problems = [];
  if (cIdx !== EXPECT.index) problems.push(`index.html 版號出現 ${cIdx} 次（應 ${EXPECT.index}）`);
  if (cMain !== EXPECT.main) problems.push(`js/main.js 版號出現 ${cMain} 次（應 ${EXPECT.main}）`);
  // 有沒有「其他版號字串」殘留（YYYY-MM-DD-N 但不等於 ver）→ 漏改
  const others = new Set();
  for (const src of [idx, main]) for (const mm of src.matchAll(/\d{4}-\d{2}-\d{2}-\d+/g)) if (mm[0] !== ver) others.add(mm[0]);
  if (others.size) problems.push('殘留其他版號：' + [...others].join('、'));
  return { cIdx, cMain, total: cIdx + cMain, problems };
}

// ── --check 模式：只驗證、不改 ──
if (arg === '--check') {
  const v = verify(CUR);
  console.log(`目前版號：${CUR}`);
  console.log(`index.html：${v.cIdx} 處　js/main.js：${v.cMain} 處　合計：${v.total} 處`);
  if (v.problems.length) die('驗證未過：\n  - ' + v.problems.join('\n  - '));
  console.log('✅ 15 處一致、無殘留');
  process.exit(0);
}

// ── bump 模式 ──
const NEW = arg;
if (!NEW) die('請給新版號。用法：node bump-version.js 2026-09-09-658（或 --check）');
if (!VER_RE.test(NEW)) die('新版號格式需為 YYYY-MM-DD-N：「' + NEW + '」');
if (NEW === CUR) die('新版號與目前相同（' + CUR + '），無需 bump');

// 改前先確認目前是乾淨的 15 處（避免在半套狀態上再改）
const pre = verify(CUR);
if (pre.problems.length) die('改前驗證未過（目前狀態就不一致，先修）：\n  - ' + pre.problems.join('\n  - '));

// 執行取代
fs.writeFileSync(INDEX, replaceAll(read(INDEX), CUR, NEW));
fs.writeFileSync(MAIN,  replaceAll(read(MAIN),  CUR, NEW));

// 改後驗證
const post = verify(NEW);
if (post.problems.length) die('改後驗證未過（可能留半套，請 git checkout 還原後回報）：\n  - ' + post.problems.join('\n  - '));

console.log(`✅ 版號 ${CUR} → ${NEW}`);
console.log(`   index.html ${post.cIdx} 處　js/main.js ${post.cMain} 處　合計 ${post.total} 處，舊版號零殘留`);
console.log(`   下一步：git add index.html js/main.js && git commit -m "chore: bump version to ${NEW}"`);
