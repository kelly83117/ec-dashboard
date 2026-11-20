// Optional offline contract check against an existing consumer module; never a URL.
// Set MARKETING_CONSUMER_MODULE to its absolute local file path to enable this test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { AD_PLATFORM_IDS, projectMarketingDate } from '../contract.mjs';
import { DATE, NOW, syntheticPlatforms } from './fixtures.mjs';

globalThis.fetch = () => { throw new Error('Network forbidden in offline tests'); };

test('existing consumer preserves zero, partial coverage and unavailable ROAS', { skip: !process.env.MARKETING_CONSUMER_MODULE }, async () => {
  const path = process.env.MARKETING_CONSUMER_MODULE;
  assert(isAbsolute(path));
  const { normalizeMarketingSnapshot } = await import(pathToFileURL(path).href);
  const input = syntheticPlatforms();
  const config = { date: DATE, now: NOW, adPlatformIds: [...AD_PLATFORM_IDS] };
  const complete = normalizeMarketingSnapshot(projectMarketingDate(input, DATE), config);
  assert.equal(complete.status, 'available');
  assert.equal(complete.coverage.revenue, 'complete');
  assert.equal(complete.platforms[0].revenue.value, 0);
  assert.equal(complete.freshness, 'unknown');
  assert.equal(complete.metrics.roas.value, null);
  assert.equal(complete.metrics.roas.reason, 'not_available_in_source');
  delete input[9].daily[DATE];
  const partial = normalizeMarketingSnapshot(projectMarketingDate(input, DATE), config);
  assert.equal(partial.coverage.revenue, 'partial');
  assert.equal(partial.metrics.revenue.value, null);
  assert.equal(partial.metrics.revenue.reported, 9);
  assert.deepEqual(partial.metrics.revenue.missing, ['friday']);
});
