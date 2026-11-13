// Entirely invented values. No production records, exports or credentials.
import { AD_PLATFORM_IDS, PLATFORMS } from '../contract.mjs';
export const DATE = '2026-11-12';
export const NOW = Date.parse('2026-11-13T00:30:00Z');
export const TEST_KEY = 'synthetic_test_only_not_a_real_secret_1234';
export function syntheticPlatforms(date = DATE) {
  return PLATFORMS.map(({ id, name }, index) => ({ name,
    daily: { [date]: index === 0 ? 0 : (index + 1) * 10 },
    ...(AD_PLATFORM_IDS.includes(id) ? { dailyAdSpend: { [date]: index === 0 ? 0 : index } } : {}),
  }));
}
export function textStream(value) {
  const bytes = new TextEncoder().encode(value);
  return new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } });
}
