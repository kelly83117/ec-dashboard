// node scripts/warroom-revenue-worker.test.mjs
//   假資料（不連網）測 warroom-revenue-worker.js 的 /revenue/daily 與既有 /revenue。
//   LIVE=1 node scripts/warroom-revenue-worker.test.mjs 2026-11-16
//   → 另外用真的 Firestore（匿名、只讀 ec.platforms）逐賣場對帳：Worker 輸出 vs 看板首頁口徑
//     （js/pages/dashboard.js：+p.daily[日期] || 0），並印出對帳表。只讀，不寫任何東西。
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const worker = (await import(pathToFileURL(path.join(root, 'warroom-revenue-worker.js')).href)).default;

const KEY = 'test-key-aaaaaaaa', KEY2 = 'test-key-bbbbbbbb';
const env = { WARROOM_API_KEY: KEY, REVENUE_API_KEY: KEY2, FIREBASE_PROJECT_ID: 'demo-project' };
const call = (p, headers = {}, method = 'GET') =>
  worker.fetch(new Request('https://w.example' + p, { method, headers }), env);

// ---------- Firestore 假文件 ----------
function toFs(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFs) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toFs(x)])) } };
}
const AT = Date.parse('2026-11-17T01:32:44.216Z');
const sig = { name: '某人', username: 'someone', at: AT };
const platforms = [
  { name: '生活好麻吉', daily: { '2026-11-16': 100300 }, dailyAdSpend: { '2026-11-16': 5000 }, dailyBy: { '2026-11-16': sig } },
  { name: '玩樂盒子', daily: { '2026-11-16': 50601 }, dailyBy: { '2026-11-16': sig } },
  { name: '森之旅', daily: { '2026-11-16': 7089.4 }, dailyBy: {} },          // 沒有署名
  { name: '維克生活', daily: {}, dailyBy: {} },                               // 未填
  { name: 'MOMO', daily: { '2026-11-16': 24298 }, dailyBy: { '2026-11-16': sig } },
  { name: 'MO+', daily: { '2026-11-16': 6393 }, dailyBy: { '2026-11-16': sig } },
  { name: '酷澎', daily: { '2026-11-16': 17768 }, dailyBy: { '2026-11-16': sig } },
  { name: 'PChome', daily: { '2026-11-16': 1137 }, dailyBy: { '2026-11-16': sig } },
  { name: '博客來', daily: { '2026-11-16': 6055 }, dailyBy: { '2026-11-16': sig } },
  { name: 'Friday', daily: { '2026-11-16': 0 }, dailyBy: { '2026-11-16': sig } },  // 實際零營收
  { name: '新通路X', daily: { '2026-11-16': 12 }, dailyBy: {} },              // 清單外
];
let lastUrl = null, fetchCount = 0;
const fakeFetch = async (url) => {
  lastUrl = String(url); fetchCount++;
  return new Response(JSON.stringify({ fields: { 'ec.platforms': toFs(platforms) }, updateTime: '2026-11-17T07:30:17.278572Z' }), { status: 200 });
};

let pass = 0;
const t = async (name, fn) => { await fn(); pass++; console.log('  ✓', name); };

if (!process.env.LIVE) {
  globalThis.fetch = fakeFetch;
  console.log('單元測試（假資料）');

  await t('無憑證 → 401，不讀 Firestore', async () => {
    fetchCount = 0;
    const r = await call('/revenue/daily?date=2026-11-16');
    assert.equal(r.status, 401); assert.deepEqual(await r.json(), { error: 'Unauthorized' }); assert.equal(fetchCount, 0);
  });
  await t('錯誤憑證（X-API-Key / Bearer / 前綴相同）→ 401', async () => {
    for (const h of [{ 'X-API-Key': 'nope' }, { Authorization: 'Bearer nope' }, { 'X-API-Key': KEY + 'x' }, { 'X-API-Key': KEY.slice(0, -1) }, { Authorization: KEY }])
      assert.equal((await call('/revenue/daily?date=2026-11-16', h)).status, 401, JSON.stringify(h));
  });
  await t('正確憑證：X-API-Key、Bearer、REVENUE_API_KEY 都可', async () => {
    for (const h of [{ 'X-API-Key': KEY }, { Authorization: 'Bearer ' + KEY }, { 'X-API-Key': KEY2 }, { authorization: 'bearer ' + KEY2 }])
      assert.equal((await call('/revenue/daily?date=2026-11-16', h)).status, 200, JSON.stringify(h));
  });
  await t('日期格式錯誤 → 400', async () => {
    for (const q of ['', '?date=', '?date=2026-11-1', '?date=2026/11/16', '?date=20261116', '?date=2026-02-30', '?date=2026-13-01', '?date=abc', '?date=2026-11-16T00:00'])
      assert.equal((await call('/revenue/daily' + q, { 'X-API-Key': KEY })).status, 400, q);
  });
  await t('只向 Firestore 要 ec.platforms（mask）', async () => {
    await call('/revenue/daily?date=2026-11-16', { 'X-API-Key': KEY });
    assert.match(lastUrl, /\/documents\/app\/main\?mask\.fieldPaths=%60ec\.platforms%60$/);
  });
  await t('逐賣場欄位與狀態', async () => {
    const j = await (await call('/revenue/daily?date=2026-11-16', { 'X-API-Key': KEY })).json();
    assert.equal(j.date, '2026-11-16'); assert.equal(j.currency, 'TWD'); assert.equal(j.basis, 'gross_before_returns');
    assert.equal(j.sourceUpdatedAt, '2026-11-17T15:30:17+08:00');
    assert.equal(j.stores.length, 11);
    const by = Object.fromEntries(j.stores.map(s => [s.storeName, s]));
    assert.deepEqual(by['生活好麻吉'], { date: '2026-11-16', channelCode: 'shopee', storeCode: 'shopee_haomaji', storeName: '生活好麻吉', revenue: 100300, status: 'reported', updatedAt: '2026-11-17T09:32:44+08:00' });
    assert.deepEqual([by['森之旅'].revenue, by['森之旅'].updatedAt], [7089, null]);
    assert.deepEqual([by['維克生活'].revenue, by['維克生活'].status, by['維克生活'].updatedAt], [null, 'not_reported', null]);
    assert.deepEqual([by['Friday'].revenue, by['Friday'].status, by['Friday'].channelCode], [0, 'reported', 'friday']);
    assert.deepEqual([by['PChome'].channelCode, by['博客來'].storeCode], ['pchome', 'books']);
    assert.deepEqual([by['新通路X'].channelCode, by['新通路X'].storeCode, by['新通路X'].revenue], ['unknown', 'unknown', 12]);
    assert.deepEqual(j.summary, { stores: 11, reported: 10, notReported: 1, revenueReportedTotal: 100300 + 50601 + 7089 + 24298 + 6393 + 17768 + 1137 + 6055 + 0 + 12 });
  });
  await t('只輸出營收欄位（無署名人名 / 帳號 / 廣告費）', async () => {
    const txt = await (await call('/revenue/daily?date=2026-11-16', { 'X-API-Key': KEY })).text();
    for (const bad of ['某人', 'someone', 'username', 'dailyBy', 'adSpend', '5000']) assert.ok(!txt.includes(bad), bad);
    const j = JSON.parse(txt);
    for (const s of j.stores) assert.deepEqual(Object.keys(s), ['date', 'channelCode', 'storeCode', 'storeName', 'revenue', 'status', 'updatedAt']);
  });
  await t('無資料日期 → 200，全部 not_reported', async () => {
    const r = await call('/revenue/daily?date=2025-01-01', { 'X-API-Key': KEY });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(j.stores.every(s => s.status === 'not_reported' && s.revenue === null));
    assert.equal(j.summary.reported, 0);
  });
  await t('既有 /revenue 回傳形狀不變', async () => {
    const r = await call('/revenue', { 'X-API-Key': KEY });
    const j = await r.json();
    assert.deepEqual(Object.keys(j), ['asOf', 'metrics']); assert.deepEqual(Object.keys(j.metrics), ['revenue', 'adSpend']);
  });
  await t('OPTIONS 204、POST 405、未知路徑 404、沒設金鑰 500', async () => {
    assert.equal((await call('/revenue/daily', {}, 'OPTIONS')).status, 204);
    assert.equal((await call('/revenue/daily?date=2026-11-16', { 'X-API-Key': KEY }, 'POST')).status, 405);
    assert.equal((await call('/nope', { 'X-API-Key': KEY })).status, 404);
    const r = await worker.fetch(new Request('https://w.example/revenue/daily?date=2026-11-16', { headers: { 'X-API-Key': '' } }), { FIREBASE_PROJECT_ID: 'x' });
    assert.equal(r.status, 500);
  });
  await t('Firestore 失敗 → 500，不外洩細節', async () => {
    globalThis.fetch = async () => new Response('secret detail', { status: 403 });
    const r = await call('/revenue/daily?date=2026-11-16', { 'X-API-Key': KEY });
    assert.equal(r.status, 500); assert.deepEqual(await r.json(), { error: 'Internal error' });
    globalThis.fetch = fakeFetch;
  });
  console.log(`全部通過（${pass} 項）`);
} else {
  // ---------- LIVE：真 Firestore 逐賣場對帳 ----------
  const date = process.argv[2] || '2026-11-16';
  env.FIREBASE_PROJECT_ID = 'yc-dashboard-9aa6c';
  const r = await call('/revenue/daily?date=' + date, { Authorization: 'Bearer ' + KEY });
  assert.equal(r.status, 200);
  const api = await r.json();
  // 看板口徑：另讀一次原始文件，用 dashboard.js 的寫法算
  const doc = await (await fetch('https://firestore.googleapis.com/v1/projects/yc-dashboard-9aa6c/databases/(default)/documents/app/main?mask.fieldPaths=%60ec.platforms%60')).json();
  const raw = doc.fields['ec.platforms'].arrayValue.values.map(v => v.mapValue.fields);
  const board = new Map(raw.map(f => {
    const d = f.daily && f.daily.mapValue.fields && f.daily.mapValue.fields[date];
    const v = d ? Number(d.integerValue ?? d.doubleValue) : undefined;
    return [f.name.stringValue, { filled: d !== undefined, shown: +v || 0 }];
  }));
  console.log(`對帳日期 ${date}（來源文件更新 ${api.sourceUpdatedAt}）`);
  console.log('通路\t賣場代碼\t賣場\tAPI營收\t狀態\t看板顯示\t一致\t更新時間');
  let mismatch = 0;
  for (const s of api.stores) {
    const b = board.get(s.storeName) || { filled: false, shown: 0 };
    const ok = (s.revenue ?? 0) === b.shown && (s.status === 'reported') === b.filled;
    if (!ok) mismatch++;
    console.log([s.channelCode, s.storeCode, s.storeName, s.revenue, s.status, b.shown, ok ? '✓' : '✗', s.updatedAt].join('\t'));
  }
  assert.equal(api.stores.length >= board.size, true);
  console.log(`合計 API ${api.summary.revenueReportedTotal}；看板全通路總營收 ${[...board.values()].reduce((a, b) => a + b.shown, 0)}；不一致 ${mismatch} 筆`);
  if (mismatch) process.exit(1);
}
