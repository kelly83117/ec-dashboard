// Offline source-side projection. This is NOT a source reader or an access boundary.
// Supply only already-authorized name/daily/dailyAdSpend rows, not complete
// ec.platforms objects or app/main. Validation cannot grant source authorization.
export const PLATFORMS = Object.freeze([
  ['buddy', '生活好麻吉'], ['playbox', '玩樂盒子'], ['forest', '森之旅'],
  ['vic', '維克生活'], ['momo', 'MOMO'], ['moplus', 'MO+'], ['coupang', '酷澎'],
  ['pchome', 'PChome'], ['books', '博客來'], ['friday', 'Friday'],
].map(([id, name]) => Object.freeze({ id, name })));
export const AD_PLATFORM_IDS = Object.freeze(['buddy', 'playbox', 'forest', 'vic']);
export const MAX_SNAPSHOT_BYTES = 16 * 1024;
const TOP_KEYS = ['schemaVersion', 'source', 'timezone', 'currency', 'businessDate', 'revenueBasis', 'sourceUpdatedAt', 'platforms'];
const ROW_KEYS = ['id', 'revenue', 'adSpend', 'adAttributedRevenue', 'attribution'];
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const plain = (value) => value !== null && typeof value === 'object' &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
const exact = (value, keys) => plain(value) && Reflect.ownKeys(value).length === keys.length &&
  keys.every((key) => own(value, key) && Object.getOwnPropertyDescriptor(value, key)?.get === undefined);
const fail = (code) => { throw new Error(code); };

export function validDate(date) {
  return typeof date === 'string' && /^20\d\d-\d\d-\d\d$/.test(date) &&
    Number.isFinite(Date.parse(date + 'T00:00:00Z')) &&
    new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) === date;
}

export function taipeiDate(now) {
  if (!Number.isFinite(now)) return null;
  const shifted = now + 8 * 60 * 60 * 1000;
  if (shifted < Date.UTC(2000, 0, 1) || shifted >= Date.UTC(2100, 0, 1)) return null;
  return new Date(shifted).toISOString().slice(0, 10);
}

function amount(value) {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || value < 0 || value > 1e12) fail('invalid_amount');
  return value === 0 ? 0 : value;
}

// Own-property checks preserve reported zero. Missing/null stay null; malformed
// amounts fail the entire snapshot rather than silently becoming zero or missing.
function amountAt(platform, field, date) {
  if (!platform || !own(platform, field)) return null;
  if (Object.getOwnPropertyDescriptor(platform, field)?.get) fail('invalid_source');
  const map = platform[field];
  if (!plain(map)) fail('invalid_source');
  if (!own(map, date)) return null;
  if (Object.getOwnPropertyDescriptor(map, date)?.get) fail('invalid_source');
  return amount(map[date]);
}

export function snapshotKey(date) {
  if (!validDate(date)) fail('invalid_date');
  return `marketing.daily.v1/${date}.json`;
}

export function projectMarketingDate(platforms, date) {
  if (!validDate(date)) fail('invalid_date');
  if (!Array.isArray(platforms) || platforms.length > PLATFORMS.length) fail('invalid_source');
  const byName = new Map();
  for (const platform of platforms) {
    if (!plain(platform) || !own(platform, 'name') || Object.getOwnPropertyDescriptor(platform, 'name')?.get ||
        Reflect.ownKeys(platform).some((key) => !['name', 'daily', 'dailyAdSpend'].includes(key))) fail('invalid_source');
    const name = platform.name;
    if (!PLATFORMS.some((row) => row.name === name) || byName.has(name)) fail('scope_changed');
    byName.set(name, platform);
  }
  const rows = PLATFORMS.map(({ id, name }) => {
    const platform = byName.get(name);
    const revenue = amountAt(platform, 'daily', date);
    const adSpend = amountAt(platform, 'dailyAdSpend', date);
    // A newly reported ad value outside the reviewed four-store scope needs review.
    // Do not silently broaden that scope or imply it has been verified live.
    if (!AD_PLATFORM_IDS.includes(id) && adSpend !== null) fail('scope_changed');
    return { id, revenue, adSpend, adAttributedRevenue: null, attribution: null };
  });
  return {
    schemaVersion: 'ec-marketing/v1', source: 'ec-dashboard', timezone: 'Asia/Taipei', currency: 'TWD',
    businessDate: date, revenueBasis: 'reported_revenue_unverified', sourceUpdatedAt: null, platforms: rows,
  };
}

// Strict validation before serving. Return a fresh allowlisted object, not the
// storage object. Current source has no reliable update time or attribution.
export function validateSnapshot(data, date) {
  if (!validDate(date) || !exact(data, TOP_KEYS) || data.schemaVersion !== 'ec-marketing/v1' ||
      data.source !== 'ec-dashboard' || data.timezone !== 'Asia/Taipei' || data.currency !== 'TWD' ||
      data.businessDate !== date || data.revenueBasis !== 'reported_revenue_unverified' ||
      data.sourceUpdatedAt !== null || !Array.isArray(data.platforms) || data.platforms.length !== PLATFORMS.length) fail('invalid_snapshot');
  const rows = new Map();
  for (const row of data.platforms) {
    if (!exact(row, ROW_KEYS) || !PLATFORMS.some(({ id }) => id === row.id) || rows.has(row.id) ||
        row.adAttributedRevenue !== null || row.attribution !== null ||
        (!AD_PLATFORM_IDS.includes(row.id) && row.adSpend !== null)) fail('invalid_snapshot');
    rows.set(row.id, { id: row.id, revenue: amount(row.revenue), adSpend: amount(row.adSpend),
      adAttributedRevenue: null, attribution: null });
  }
  return { schemaVersion: 'ec-marketing/v1', source: 'ec-dashboard', timezone: 'Asia/Taipei', currency: 'TWD',
    businessDate: date, revenueBasis: 'reported_revenue_unverified', sourceUpdatedAt: null,
    platforms: PLATFORMS.map(({ id }) => rows.get(id)) };
}

// A plan only. There is deliberately no filesystem, network or storage write.
// An independently authorized publisher must validate before an atomic replacement.
export function buildWritePlan(platforms, date) {
  const key = snapshotKey(date);
  const value = JSON.stringify(validateSnapshot(projectMarketingDate(platforms, date), date));
  if (new TextEncoder().encode(value).byteLength > MAX_SNAPSHOT_BYTES) fail('snapshot_too_large');
  return Object.freeze({ key, value });
}
