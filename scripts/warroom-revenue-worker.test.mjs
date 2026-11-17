// node scripts/warroom-revenue-worker.test.mjs
// 唯讀營收 API（warroom-revenue-worker.js）離線測試：用假的 Firestore 回應，不連任何網路。
import assert from 'node:assert/strict';
import worker, { __test } from '../warroom-revenue-worker.js';

const KEY = 'test-key-0123456789abcdef';
const env = { WARROOM_API_KEY: KEY, FIREBASE_PROJECT_ID: 'demo-project' };

// ---- 假 Firestore：把 JS 值轉成 REST 格式 ----
function toFs(v) {
  if (v === null) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFs) } };
  if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toFs(x)])) } };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  return { stringValue: String(v) };
}
const AT = Date.UTC(2026, 10, 16, 2, 5, 9); // 2026-11-16 10:05:09 +08:00
const platforms = [
  { name: '生活好麻吉', daily: { '2026-11-15': 170000.4 }, dailyAdSpend: { '2026-11-15': 9000 }, dailyBy: { '2026-11-15': { name: '某人', username: 'someone', at: AT } } },
  { name: '玩樂盒子', daily: { '2026-11-15': 0 }, dailyBy: {} },          // 實際 0
  { name: '森之旅', daily: {} },                                            // 沒填
  { name: '維克生活', daily: { '2026-11-15': 'abc' } },                     // 壞值
  { name: 'MOMO', daily: { '2026-11-15': 25000 } },
  { name: 'MO+', daily: { '2026-11-15': 8000 } },
  { name: '酷澎', daily: { '2026-11-15': 12000 } },
  { name: 'PChome', daily: { '2026-11-15': 3000 } },
  { name: '博客來', daily: { '2026-11-15': 1500 } },
  { name: 'Friday', daily: { '2026-11-15': 600 } },
  { name: '測試賣場', daily: { '2026-11-15': 999 } },                        // 白名單外 → 不輸出
];
const docBody = { fields: { 'ec.platforms': toFs(platforms), 'ec.users': toFs([{ username: 'x', password: 'secret-hash' }]) } };

let lastUrl = null; let fsFail = false;
globalThis.fetch = async (url) => {
  lastUrl = String(url);
  if (fsFail) return new Response('boom secret detail', { status: 503 });
  // 模擬 mask：只回要求的欄位
  const u = new URL(lastUrl);
  const masks = u.searchParams.getAll('mask.fieldPaths').map(s => s.replace(/^`|`$/g, ''));
  const fields = masks.length ? Object.fromEntries(masks.map(m => [m, docBody.fields[m]])) : docBody.fields;
  return new Response(JSON.stringify({ fields }), { status: 200 });
};

const call = (path, headers = {}) => worker.fetch(new Request('https://w.example' + path, { headers }), env);
const json = async (r) => ({ status: r.status, body: await r.json() });
let n = 0; const ok = (name) => { n++; console.log('✓', name); };

// 1. 無憑證 / 錯誤憑證
assert.equal((await call('/revenue/daily?date=2026-11-15')).status, 401); ok('無憑證 → 401');
assert.equal((await call('/revenue/daily?date=2026-11-15', { 'X-API-Key': 'wrong' })).status, 401); ok('錯誤 X-API-Key → 401');
assert.equal((await call('/revenue/daily?date=2026-11-15', { Authorization: 'Bearer wrong' })).status, 401); ok('錯誤 Bearer → 401');
assert.equal((await call('/revenue/daily?date=2026-11-15', { 'X-API-Key': KEY.slice(0, -1) })).status, 401); ok('前綴相同但較短 → 401');
assert.equal((await call('/revenue', {})).status, 401); ok('v1 /revenue 無憑證 → 401');

// 2. 日期格式
for (const [q, why] of [['', '缺 date'], ['?date=2026/11/15', '斜線'], ['?date=20261115', '無分隔'], ['?date=2026-02-30', '不存在的日期'], ['?date=2026-13-01', '月份 13'], ['?date=9999-01-01', '未來日期']]) {
  const r = await json(await call('/revenue/daily' + q, { 'X-API-Key': KEY }));
  assert.equal(r.status, 400, why); assert.ok(r.body.error);
}
ok('日期格式錯誤 / 未來 → 400');

// 3. 正常查詢（X-API-Key 與 Bearer 都可）
const a = await json(await call('/revenue/daily?date=2026-11-15', { 'X-API-Key': KEY }));
const b = await json(await call('/revenue/daily?date=2026-11-15', { Authorization: 'Bearer ' + KEY }));
assert.equal(a.status, 200); assert.deepEqual(a.body, b.body); ok('X-API-Key 與 Bearer 結果相同');
assert.ok(lastUrl.includes('mask.fieldPaths=%60ec.platforms%60'), 'Firestore 只取 ec.platforms'); ok('Firestore 只取 ec.platforms（mask）');
const by = Object.fromEntries(a.body.stores.map(s => [s.storeName, s]));
assert.equal(a.body.stores.length, 10); assert.ok(!by['測試賣場']); ok('只輸出白名單 10 個賣場');
assert.deepEqual(by['生活好麻吉'], { date: '2026-11-15', channel: 'shopee', storeCode: 'shopee_haomaji', storeName: '生活好麻吉', revenue: 170000, status: 'reported', updatedAt: '2026-11-16T10:05:09+08:00' }); ok('有填：整數、更新時間轉台灣時間');
assert.equal(by['玩樂盒子'].revenue, 0); assert.equal(by['玩樂盒子'].status, 'reported'); assert.equal(by['玩樂盒子'].updatedAt, null); ok('實際 0 → revenue 0、reported');
assert.equal(by['森之旅'].revenue, null); assert.equal(by['森之旅'].status, 'not_reported'); ok('未填 → null、not_reported');
assert.equal(by['維克生活'].status, 'invalid_value'); ok('壞值 → invalid_value');
for (const s of a.body.stores) assert.deepEqual(Object.keys(s), ['date', 'channel', 'storeCode', 'storeName', 'revenue', 'status', 'updatedAt']);
const txt = JSON.stringify(a.body);
assert.ok(!/某人|someone|password|secret|adSpend|9000/.test(txt)); ok('不輸出填寫人、帳密、廣告費');

// 4. 無資料日期
const c = await json(await call('/revenue/daily?date=2025-01-01', { 'X-API-Key': KEY }));
assert.equal(c.status, 200); assert.ok(c.body.stores.every(s => s.status === 'not_reported' && s.revenue === null)); ok('無資料日期 → 200、全部 not_reported');

// 5. Firestore 異常不外洩細節
fsFail = true;
const d = await json(await call('/revenue/daily?date=2026-11-15', { 'X-API-Key': KEY }));
assert.equal(d.status, 500); assert.deepEqual(d.body, { error: 'Internal error' }); ok('Firestore 錯誤 → 500 不帶細節');
fsFail = false;

// 6. 其他
assert.equal((await call('/nope', { 'X-API-Key': KEY })).status, 404); ok('未知路徑 → 404');
assert.equal((await worker.fetch(new Request('https://w.example/revenue/daily', { method: 'POST' }), env)).status, 405); ok('POST → 405');
assert.equal((await call('/revenue/daily/?date=2026-11-15', { 'X-API-Key': KEY })).status, 200); ok('結尾斜線也可');
assert.equal((await worker.fetch(new Request('https://w.example/revenue/daily?date=2026-11-15', { headers: { 'X-API-Key': KEY } }), { FIREBASE_PROJECT_ID: 'x' })).status, 500); ok('沒設金鑰 → 500');

console.log(`\n全部通過（${n} 項）`);
