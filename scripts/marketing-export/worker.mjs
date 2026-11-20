// UNDEPLOYED CANDIDATE. No routes, bindings, credentials or deploy scripts supplied.
// Required future bindings: a dedicated marketing-only KV namespace and a separately
// approved server-side read credential. Neither grants Firestore access.
import { MAX_SNAPSHOT_BYTES, snapshotKey, taipeiDate, validDate, validateSnapshot } from './contract.mjs';
const STORAGE_DEADLINE_MS = 3000;

function reply(body, status) {
  return new Response(JSON.stringify(body), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    ...(status === 405 ? { Allow: 'GET' } : {}),
  } });
}

const credentialFormat = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{32,256}$/.test(value);
async function sameCredential(provided, expected) {
  if (!credentialFormat(provided)) return false;
  const encode = (value) => new TextEncoder().encode(value);
  const [left, right] = await Promise.all([provided, expected].map((value) => crypto.subtle.digest('SHA-256', encode(value))));
  const a = new Uint8Array(left), b = new Uint8Array(right);
  let different = 0;
  for (let i = 0; i < a.length; i++) different |= a[i] ^ b[i];
  return different === 0;
}

function cancelQuietly(target) {
  // Cancellation is best effort. An unresponsive underlying cancel() must never
  // extend the request deadline or create an unhandled rejection.
  try { Promise.resolve(target?.cancel()).catch(() => {}); } catch { /* no diagnostics with private values */ }
}

async function readBoundedJson(stream, signal) {
  if (!stream || typeof stream.getReader !== 'function') throw new Error('invalid_storage');
  const reader = stream.getReader();
  const abort = () => cancelQuietly(reader);
  signal.addEventListener('abort', abort, { once: true });
  const chunks = [];
  let length = 0;
  try {
    for (;;) {
      if (signal.aborted) throw new Error('deadline');
      const { done, value } = await reader.read();
      if (signal.aborted) throw new Error('deadline');
      if (done) break;
      if (!(value instanceof Uint8Array)) throw new Error('invalid_storage');
      length += value.byteLength;
      if (length > MAX_SNAPSHOT_BYTES) throw new Error('too_large');
      chunks.push(value);
    }
  } finally {
    signal.removeEventListener('abort', abort);
    cancelQuietly(reader);
    try { reader.releaseLock(); } catch { /* pending read will settle separately */ }
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

export function createExportHandler({ now = () => Date.now(), storageTimeoutMs = STORAGE_DEADLINE_MS } = {}) {
  // Tests may shorten the deadline. No caller or environment can extend it.
  const timeoutMs = Number.isFinite(storageTimeoutMs)
    ? Math.max(1, Math.min(STORAGE_DEADLINE_MS, storageTimeoutMs)) : STORAGE_DEADLINE_MS;
  return async function handle(request, env = {}) {
    // No environment approval flag, CORS rule or field mask is an access boundary.
    if (!credentialFormat(env.MARKETING_READ_KEY) || typeof env.MARKETING_SNAPSHOTS?.get !== 'function') {
      return reply({ error: 'not_configured' }, 503);
    }
    let authorized = false;
    try { authorized = await sameCredential(request.headers.get('X-API-Key'), env.MARKETING_READ_KEY); } catch { /* fail closed */ }
    if (!authorized) return reply({ error: 'unauthorized' }, 401);
    if (request.method !== 'GET') return reply({ error: 'method_not_allowed' }, 405);
    let url;
    try { url = new URL(request.url); } catch { return reply({ error: 'invalid_request' }, 400); }
    if (url.protocol !== 'https:' || url.username || url.password || url.hash || request.body !== null) return reply({ error: 'invalid_request' }, 400);
    if (url.pathname !== '/marketing/daily') return reply({ error: 'not_found' }, 404);
    const entries = [...url.searchParams.entries()];
    const date = url.searchParams.get('date');
    let today;
    try { today = taipeiDate(now()); } catch { return reply({ error: 'invalid_clock' }, 503); }
    if (!today) return reply({ error: 'invalid_clock' }, 503);
    if (entries.length !== 1 || entries[0][0] !== 'date' || !validDate(date) || date > today) return reply({ error: 'invalid_date' }, 400);
    const controller = new AbortController();
    let timer;
    const deadline = new Promise((resolve) => {
      timer = setTimeout(() => {
        controller.abort();
        resolve(reply({ error: 'storage_unavailable' }, 503));
      }, timeoutMs);
    });
    const read = async () => {
      let stream;
      try {
        // The only storage operation. Exact date, fixed prefix, no list or fallback.
        // A KV binding itself is NOT read-only; this HTTP API has no write route.
        stream = await env.MARKETING_SNAPSHOTS.get(snapshotKey(date), 'stream');
      } catch { return reply({ error: 'storage_unavailable' }, 503); }
      // KV.get has no abort API. Discard and cancel any late result after timeout.
      if (controller.signal.aborted) {
        cancelQuietly(stream);
        return reply({ error: 'storage_unavailable' }, 503);
      }
      if (stream === null) return reply({ error: 'snapshot_missing' }, 404);
      try {
        return reply(validateSnapshot(await readBoundedJson(stream, controller.signal), date), 200);
      } catch {
        // Never echo stored data, upstream messages, URLs or credentials in errors.
        return reply({ error: 'invalid_snapshot' }, 502);
      }
    };
    try {
      return await Promise.race([read(), deadline]);
    } finally { clearTimeout(timer); }
  };
}

export default { fetch: createExportHandler() };
