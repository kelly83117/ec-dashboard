import test from 'node:test';
import assert from 'node:assert/strict';
import { AD_PLATFORM_IDS, PLATFORMS, buildWritePlan, projectMarketingDate, snapshotKey, taipeiDate, validDate, validateSnapshot } from '../contract.mjs';
import { DATE, syntheticPlatforms } from './fixtures.mjs';

globalThis.fetch = () => { throw new Error('Network forbidden in offline tests'); };

test('zero is preserved; requested missing date never borrows history', () => {
  const input = syntheticPlatforms();
  const snapshot = projectMarketingDate(input, DATE);
  assert.equal(snapshot.platforms[0].revenue, 0);
  assert.equal(snapshot.platforms[0].adSpend, 0);
  const missing = projectMarketingDate(input, '2026-11-11');
  assert(missing.platforms.every((row) => row.revenue === null && row.adSpend === null));
  assert.equal(missing.businessDate, '2026-11-11');
});

test('seven present stores yield ten rows and three unknown revenue values', () => {
  const snapshot = projectMarketingDate(syntheticPlatforms().slice(0, 7), DATE);
  assert.equal(snapshot.platforms.length, 10);
  assert(snapshot.platforms.slice(7).every((row) => row.revenue === null));
});

test('sparse historical rows remain missing, never backfilled to zero', () => {
  const rows = syntheticPlatforms();
  rows[7].daily = { '2026-11-10': 3 };
  rows[8].daily = {};
  rows[9].daily = { [DATE]: null };
  delete rows[1].dailyAdSpend[DATE];
  const snapshot = projectMarketingDate(rows, DATE);
  assert(snapshot.platforms.slice(7).every((row) => row.revenue === null));
  assert.equal(snapshot.platforms[1].adSpend, null);
});

test('allowlisted rows only, null freshness and no invented attribution', () => {
  const rows = syntheticPlatforms();
  const snapshot = projectMarketingDate(rows, DATE);
  assert.equal(snapshot.sourceUpdatedAt, null);
  assert.equal(snapshot.timezone, 'Asia/Taipei');
  assert.equal(snapshot.currency, 'TWD');
  assert.equal(snapshot.revenueBasis, 'reported_revenue_unverified');
  assert(snapshot.platforms.every((row) => row.adAttributedRevenue === null && row.attribution === null));
  assert(snapshot.platforms.filter((row) => !AD_PLATFORM_IDS.includes(row.id)).every((row) => row.adSpend === null));
  assert(!JSON.stringify(snapshot).includes('dailyBy'));
});

test('reject complete source objects or extra metadata without evaluating it', () => {
  const rows = syntheticPlatforms();
  Object.defineProperty(rows[0], 'dailyBy', { enumerable: true, get() { throw new Error('Forbidden metadata accessed'); } });
  assert.throws(() => projectMarketingDate(rows, DATE), /invalid_source/);
  for (const field of ['employee', 'notes', 'icon', 'today']) {
    const input = syntheticPlatforms();
    input[0][field] = 'synthetic sentinel';
    assert.throws(() => projectMarketingDate(input, DATE), /invalid_source/);
  }
});

test('projection does not mutate source or retain object references', () => {
  const rows = syntheticPlatforms();
  const before = structuredClone(rows);
  const snapshot = projectMarketingDate(rows, DATE);
  snapshot.platforms[1].revenue = 555;
  assert.deepEqual(rows, before);
});

test('reject mixed document, unknown or duplicate store, invalid containers', () => {
  for (const input of [{ 'ec.platforms': syntheticPlatforms(), 'ec.users': [] }, null, {}, [null], [false], [new Date()], Array(1)]) {
    assert.throws(() => projectMarketingDate(input, DATE));
  }
  assert.throws(() => projectMarketingDate([{ name: 'synthetic-unknown' }], DATE), /scope_changed/);
  assert.throws(() => projectMarketingDate([syntheticPlatforms()[0], syntheticPlatforms()[0]], DATE), /scope_changed/);
  assert.throws(() => projectMarketingDate([...syntheticPlatforms(), syntheticPlatforms()[0]], DATE));
});

test('new ad scope cannot silently pass', () => {
  const rows = syntheticPlatforms();
  rows[4].dailyAdSpend = { [DATE]: 0 };
  assert.throws(() => projectMarketingDate(rows, DATE), /scope_changed/);
});

for (const [label, value] of Object.entries({ string: '1', blank: '', boolean: false, undefined: undefined, negative: -1, fractional: 0.5, nan: NaN, infinity: Infinity, excessive: 1e12 + 1, object: {}, array: [] })) {
  test(`reject invalid source amount: ${label}`, () => {
    const rows = syntheticPlatforms();
    rows[0].daily[DATE] = value;
    assert.throws(() => projectMarketingDate(rows, DATE), /invalid_amount/);
  });
}

test('null metric is unknown; null map is malformed', () => {
  const rows = syntheticPlatforms();
  rows[0].daily[DATE] = null;
  assert.equal(projectMarketingDate(rows, DATE).platforms[0].revenue, null);
  rows[0].daily = null;
  assert.throws(() => projectMarketingDate(rows, DATE), /invalid_source/);
});

test('only own data fields are accepted, source accessors are rejected', () => {
  const rows = syntheticPlatforms();
  rows[0].daily = Object.assign(Object.create({ [DATE]: 12 }), {});
  assert.throws(() => projectMarketingDate(rows, DATE));
  rows[0].daily = {};
  Object.defineProperty(rows[0].daily, DATE, { get() { throw new Error('must not execute'); } });
  assert.throws(() => projectMarketingDate(rows, DATE), /invalid_source/);
});

test('strict dates and Taipei midnight boundaries', () => {
  for (const value of ['2026-02-29', '2026-13-01', '2026-11-31', '26-11-12', '../main', '', null, '2100-01-01']) assert.equal(validDate(value), false);
  assert.equal(validDate('2028-02-29'), true);
  assert.equal(taipeiDate(Date.parse('2026-11-12T15:59:59.999Z')), '2026-11-12');
  assert.equal(taipeiDate(Date.parse('2026-11-12T16:00:00Z')), '2026-11-13');
  assert.equal(taipeiDate(NaN), null);
  assert.throws(() => snapshotKey('../main'));
});

test('write plan has fixed path and serialized contract, with no I/O', () => {
  const plan = buildWritePlan(syntheticPlatforms(), DATE);
  assert.equal(plan.key, `marketing.daily.v1/${DATE}.json`);
  assert.deepEqual(JSON.parse(plan.value), projectMarketingDate(syntheticPlatforms(), DATE));
  assert.deepEqual(Object.keys(plan), ['key', 'value']);
  assert(Object.isFrozen(plan));
});

test('snapshot round trip canonicalizes row order and removes shared references', () => {
  const snapshot = projectMarketingDate(syntheticPlatforms(), DATE);
  snapshot.platforms.reverse();
  const clean = validateSnapshot(snapshot, DATE);
  assert.deepEqual(clean.platforms.map(({ id }) => id), PLATFORMS.map(({ id }) => id));
  assert.notEqual(clean.platforms[0], snapshot.platforms[9]);
});

test('reject unknown keys, wrong date, forged freshness and attribution in storage', () => {
  const mutations = [
    (s) => { s.notes = 'synthetic sensitive sentinel'; },
    (s) => { s.platforms[0].account = 'synthetic sensitive sentinel'; },
    (s) => { s.platforms[0].revenue = '10'; },
    (s) => { s.platforms[0].revenue = -1; },
    (s) => { s.platforms[0].adAttributedRevenue = 10; },
    (s) => { s.platforms[0].attribution = {}; },
    (s) => { s.platforms[4].adSpend = 0; },
    (s) => { s.sourceUpdatedAt = '2026-11-13T00:00:00Z'; },
    (s) => { s.businessDate = '2026-11-11'; },
    (s) => { s.currency = 'USD'; },
    (s) => { s.timezone = 'UTC'; },
    (s) => { s.platforms.pop(); },
    (s) => { s.platforms[1].id = s.platforms[0].id; },
    (s) => { delete s.sourceUpdatedAt; },
    (s) => { delete s.platforms[0].revenue; },
    (s) => { Object.defineProperty(s, 'source', { get() { throw new Error('must not execute'); } }); },
  ];
  for (const mutate of mutations) {
    const snapshot = projectMarketingDate(syntheticPlatforms(), DATE);
    mutate(snapshot);
    assert.throws(() => validateSnapshot(snapshot, DATE));
  }
});
