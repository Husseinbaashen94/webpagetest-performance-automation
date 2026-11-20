/**
 * Contract tests for the public WebPageTest API. They need no API key and catch
 * breaking changes in the API before the scheduled performance runs depend on them.
 */
import { test, expect } from '@playwright/test';
import { LocationsResponseSchema } from '../../src/schemas';
import budgets from '../../budgets.json';

test.describe('WebPageTest API contract', () => {
  test('getLocations returns test agents in the expected shape', async ({ request }) => {
    const response = await request.get('/getLocations.php', { params: { f: 'json' } });
    expect(response.status()).toBe(200);

    const parsed = LocationsResponseSchema.safeParse(await response.json());
    expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues, null, 2)).toBe(true);
    expect(Object.keys(parsed.data!.data).length).toBeGreaterThan(0);
  });

  test('at least one location offers Chrome', async ({ request }) => {
    const { data } = LocationsResponseSchema.parse(await (await request.get('/getLocations.php', { params: { f: 'json' } })).json());
    expect(Object.values(data).some((l) => l.Browsers.split(',').includes('Chrome'))).toBe(true);
  });

  test('every location used in budgets.json exists and offers the requested browser', async ({ request }) => {
    const { data } = LocationsResponseSchema.parse(await (await request.get('/getLocations.php', { params: { f: 'json' } })).json());
    for (const page of budgets.pages) {
      if (!page.location) continue;
      // Format: <location>:<browser>.<connectivity>
      const [locationId, browserAndConnectivity = 'Chrome'] = page.location.split(':');
      const browser = browserAndConnectivity.split('.')[0];
      expect(data[locationId], `${page.name}: location ${locationId}`).toBeDefined();
      expect(data[locationId].Browsers.split(','), `${page.name}: browser ${browser}`).toContain(browser);
    }
  });

  test('starting a test without an API key is refused', async ({ request }) => {
    const response = await request.post('/runtest.php', { params: { url: 'https://example.com', f: 'json' } });
    const text = await response.text();
    // Whatever the exact error format, an unauthenticated call must not yield a test id.
    expect(text).not.toMatch(/"testId"\s*:\s*"[^"]+"/);
  });
});

test.describe('budgets.json', () => {
  test('every page has a valid URL and at least one budget', () => {
    expect(budgets.pages.length).toBeGreaterThan(0);
    for (const page of budgets.pages) {
      expect(() => new URL(page.url), page.name).not.toThrow();
      expect(Object.keys(page.budget).length, page.name).toBeGreaterThan(0);
    }
  });

  test('page names are unique, so each report section is unambiguous', () => {
    const names = budgets.pages.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
