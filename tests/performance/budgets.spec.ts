/**
 * Lab performance tests: runs each page in budgets.json on WebPageTest and fails if any
 * metric exceeds its budget. Requires WPT_API_KEY (get one at https://www.webpagetest.org/signup).
 */
import { test, expect } from '@playwright/test';
import { appendFileSync } from 'node:fs';
import { WptClient } from '../../src/WptClient';
import { evaluateBudget, formatResults, type PageBudget } from '../../src/budgets';
import budgets from '../../budgets.json';

const apiKey = process.env.WPT_API_KEY;
const runs = Number(process.env.WPT_RUNS || 3);

test.describe('Performance budgets', () => {
  test.skip(!apiKey, 'WPT_API_KEY is not set; skipping live WebPageTest runs.');

  for (const page of budgets.pages as PageBudget[]) {
    test(page.name, async ({ request }) => {
      const wpt = new WptClient(request, apiKey!);

      const submitted = await test.step('submit test', () =>
        wpt.runTest(page.url, { location: page.location, mobile: page.mobile, runs, label: page.name }),
      );
      test.info().annotations.push({ type: 'WebPageTest', description: submitted.userUrl });

      await test.step(`wait for ${runs} runs to finish`, () => wpt.waitForCompletion(submitted.testId));
      const result = await test.step('fetch result', () => wpt.getResult(submitted.testId));

      const results = evaluateBudget(result.data.median.firstView, page.budget);
      const summary = formatResults(page.name, results, submitted.userUrl);

      await test.info().attach('budget-results.md', { body: summary, contentType: 'text/markdown' });
      if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);

      for (const r of results) {
        expect.soft(r.passed, `${r.label}: ${r.actual ?? 'not measured'} vs budget ${r.limit}${r.unit}`).toBe(true);
      }
    });
  }
});
