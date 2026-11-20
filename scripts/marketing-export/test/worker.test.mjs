import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import worker, { createExportHandler } from '../worker.mjs';
import { MAX_SNAPSHOT_BYTES, buildWritePlan } from '../contract.mjs';
import { DATE, NOW, TEST_KEY, syntheticPlatforms, textStream } from './fixtures.mjs';

globalThis.fetch = () => { throw new Error('Network forbidden in offline tests'); };
const handle = createExportHandler({ now: () => NOW });
const plan = () => buildWritePlan(syntheticPlatforms(), DATE);
function setup({ text = plan().value, missing = false, error = false } = {}) {
  const reads = [];
  const env = { MARKETING_READ_KEY: TEST_KEY, MARKETING_SNAPSHOTS: {
    get: async (...args) => { reads.push(args); if (error) throw new Error('synthetic private error'); return missing ? null : textStream(text); },
    put: () => { throw new Error('Write forbidden'); }, list: () => { throw new Error('List forbidden'); },
    delete: () => { throw new Error('Delete forbidden'); },
  } };
  return { env, reads };
}
function request({ path = `/marketing/daily?date=${DATE}`, key = TEST_KEY, method = 'GET', origin = 'https://export.invalid' } = {}) {
  return new Request(origin + path, { method, headers: key === null ? {} : { 'X-API-Key': key } });
}

test('default remains disabled without actual bindings, regardless of approved flag', async () => {
  for (const env of [{}, { MARKETING_EXPORT_APPROVED: 'true' }, { MARKETING_READ_KEY: TEST_KEY }]) {
    assert.equal((await worker.fetch(request(), env)).status, 503);
  }
});

test('authenticated exact-date GET reads only one fixed key and returns no-store JSON', async () => {
  const { env, reads } = setup();
  const result = await handle(request(), env);
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), JSON.parse(plan().value));
  assert.deepEqual(reads, [[plan().key, 'stream']]);
  assert.equal(result.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(result.headers.get('Access-Control-Allow-Origin'), null);
});

test('missing, wrong and duplicated credentials deny before reading storage', async () => {
  for (const key of [null, 'wrong', 'synthetic_wrong_key_12345678901234567890', TEST_KEY + ', ' + TEST_KEY]) {
    const { env, reads } = setup();
    assert.equal((await handle(request({ key }), env)).status, 401);
    assert.equal(reads.length, 0);
  }
});

test('malformed configured key fails closed', async () => {
  const { env, reads } = setup();
  env.MARKETING_READ_KEY = 'short';
  assert.equal((await handle(request(), env)).status, 503);
  assert.equal(reads.length, 0);
});

test('no mutating, list, HEAD or OPTIONS route', async () => {
  for (const method of ['PUT', 'PATCH', 'POST', 'DELETE', 'HEAD', 'OPTIONS']) {
    const { env, reads } = setup();
    const response = await handle(request({ method }), env);
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('Allow'), 'GET');
    assert.equal(reads.length, 0);
  }
});

test('reject arbitrary path, source URL, date range, duplicate parameters and future date', async () => {
  for (const path of ['/app/main', '/revenue', '/', '/marketing/daily/',
    '/marketing/daily', '/marketing/daily?date=2026-11-14', '/marketing/daily?date=2026-02-29',
    `/marketing/daily?date=${DATE}&date=${DATE}`, `/marketing/daily?date=${DATE}&path=app/main`,
    `/marketing/daily?date=${DATE}&url=https://source.invalid`,
    '/marketing/daily?from=2026-11-11&to=2026-11-12', '/marketing/daily?date=../main']) {
    const { env, reads } = setup();
    assert([400, 404].includes((await handle(request({ path }), env)).status));
    assert.equal(reads.length, 0);
  }
});

test('HTTP is rejected and no fake freshness supplied for a current day', async () => {
  const { env, reads } = setup();
  assert.equal((await handle(request({ origin: 'http://export.invalid' }), env)).status, 400);
  assert.equal(reads.length, 0);
  const today = '2026-11-13';
  env.MARKETING_SNAPSHOTS.get = async () => textStream(buildWritePlan(syntheticPlatforms(today), today).value);
  const response = await handle(request({ path: `/marketing/daily?date=${today}` }), env);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).sourceUpdatedAt, null);
});

test('invalid clock rejects without reading', async () => {
  const { env, reads } = setup();
  assert.equal((await createExportHandler({ now: () => NaN })(request(), env)).status, 503);
  assert.equal(reads.length, 0);
});

test('missing snapshot returns 404 without lookback', async () => {
  const { env, reads } = setup({ missing: true });
  assert.equal((await handle(request(), env)).status, 404);
  assert.deepEqual(reads, [[plan().key, 'stream']]);
});

test('storage failure does not expose exception or retry another source', async () => {
  const { env, reads } = setup({ error: true });
  const response = await handle(request(), env);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'storage_unavailable' });
  assert.equal(reads.length, 1);
});

test('oversize, invalid JSON, wrong-date and extra-field snapshots fail closed', async () => {
  const wrongDate = JSON.parse(plan().value); wrongDate.businessDate = '2026-11-11';
  const extra = JSON.parse(plan().value); extra.employee = 'synthetic sensitive sentinel';
  for (const text of ['{', 'null', ' '.repeat(MAX_SNAPSHOT_BYTES + 1), JSON.stringify(wrongDate), JSON.stringify(extra)]) {
    const { env } = setup({ text });
    const response = await handle(request(), env);
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: 'invalid_snapshot' });
  }
});

test('invalid UTF-8 is rejected instead of replacement-decoded', async () => {
  const { env } = setup();
  env.MARKETING_SNAPSHOTS.get = async () => new ReadableStream({ start(c) { c.enqueue(new Uint8Array([255])); c.close(); } });
  assert.equal((await handle(request(), env)).status, 502);
});

test('incremental byte limit cancels oversized stream', async () => {
  const { env } = setup();
  let cancelled = false;
  env.MARKETING_SNAPSHOTS.get = async () => new ReadableStream({
    pull(c) { c.enqueue(new Uint8Array(8192)); }, cancel() { cancelled = true; },
  });
  assert.equal((await handle(request(), env)).status, 502);
  assert.equal(cancelled, true);
});

async function mustFinish(promise) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Request did not meet bounded deadline')), 500);
    })]);
  } finally { clearTimeout(timer); }
}

test('hanging KV.get reaches the whole-operation deadline', async () => {
  const { env } = setup();
  env.MARKETING_SNAPSHOTS.get = () => new Promise(() => {});
  const response = await mustFinish(createExportHandler({ now: () => NOW, storageTimeoutMs: 20 })(request(), env));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'storage_unavailable' });
});

test('hanging stream read and unresponsive cancellation cannot hang the response', async () => {
  const { env } = setup();
  let cancelled = false;
  env.MARKETING_SNAPSHOTS.get = async () => new ReadableStream({
    pull() { return new Promise(() => {}); },
    cancel() { cancelled = true; return new Promise(() => {}); },
  });
  const response = await mustFinish(createExportHandler({ now: () => NOW, storageTimeoutMs: 20 })(request(), env));
  assert.equal(response.status, 503);
  assert.equal(cancelled, true);
});

test('size rejection does not await an unresponsive cancel promise', async () => {
  const { env } = setup();
  let cancelled = false;
  env.MARKETING_SNAPSHOTS.get = async () => new ReadableStream({
    pull(c) { c.enqueue(new Uint8Array(MAX_SNAPSHOT_BYTES + 1)); },
    cancel() { cancelled = true; return new Promise(() => {}); },
  });
  const response = await mustFinish(createExportHandler({ now: () => NOW, storageTimeoutMs: 100 })(request(), env));
  assert.equal(response.status, 502);
  assert.equal(cancelled, true);
});

test('late get result after timeout is cancelled without reading', async () => {
  const { env } = setup();
  let resolveGet, cancelled = false;
  env.MARKETING_SNAPSHOTS.get = () => new Promise((resolve) => { resolveGet = resolve; });
  const response = await mustFinish(createExportHandler({ now: () => NOW, storageTimeoutMs: 20 })(request(), env));
  assert.equal(response.status, 503);
  resolveGet({ cancel() { cancelled = true; return new Promise(() => {}); }, getReader() { throw new Error('Late read forbidden'); } });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(cancelled, true);
});

test('candidate runtime has no source client, generic fetch, storage write or env approval gate', async () => {
  for (const file of ['../contract.mjs', '../worker.mjs']) {
    const code = await readFile(new URL(file, import.meta.url), 'utf8');
    assert(!/\bfetch\s*\(/.test(code));
    assert(!/https:\/\/firestore|firebase-admin|FIREBASE_PROJECT_ID/.test(code));
    assert(!/\.(put|delete|list)\s*\(/.test(code));
    assert(!/env\.\w*APPROVED/.test(code));
  }
});
