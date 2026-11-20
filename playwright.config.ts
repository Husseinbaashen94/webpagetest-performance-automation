import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

// Local settings, including WPT_API_KEY: copy .env.example to .env. Empty values fall back to the defaults.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  forbidOnly: !!process.env.CI,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.WPT_BASE_URL || 'https://www.webpagetest.org',
    extraHTTPHeaders: { 'User-Agent': 'wpt-performance-automation' },
  },
  projects: [
    // No key, no network calls: the budget logic itself.
    { name: 'unit', testDir: './tests/unit' },
    // No key needed: checks the public API still matches what the client expects.
    { name: 'contract', testDir: './tests/contract' },
    // Needs WPT_API_KEY: real lab tests against each page in budgets.json.
    {
      name: 'performance',
      testDir: './tests/performance',
      timeout: 15 * 60_000,
      // Each page is an independent WebPageTest run; run them side by side.
      fullyParallel: true,
    },
  ],
});
