import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateBudget, formatResults } from '../../src/budgets';
import { FirstViewSchema } from '../../src/schemas';

const sample = FirstViewSchema.parse(JSON.parse(readFileSync(join(__dirname, '../../fixtures/sample-first-view.json'), 'utf8')));

test.describe('evaluateBudget', () => {
  test('passes when every metric is within budget', () => {
    const results = evaluateBudget(sample, { ttfb: 800, fcp: 1800, lcp: 2500, cls: 0.1, tbt: 200, speedIndex: 3400 });
    expect(results.every((r) => r.passed)).toBe(true);
  });

  test('a metric exactly on the limit passes (budget is inclusive)', () => {
    const [result] = evaluateBudget(sample, { lcp: 2210 });
    expect(result.passed).toBe(true);
  });

  test('flags only the metrics over budget', () => {
    const results = evaluateBudget(sample, { lcp: 2000, cls: 0.01, ttfb: 800 });
    expect(results.filter((r) => !r.passed).map((r) => r.metric)).toEqual(['lcp', 'cls']);
  });

  test('converts page weight from bytes to KB', () => {
    const [result] = evaluateBudget(sample, { totalKB: 1000 });
    expect(result.actual).toBe(920);
    expect(result.passed).toBe(true);
  });

  test('a metric missing from the result fails instead of silently passing', () => {
    const { ['chromeUserTiming.LargestContentfulPaint']: _lcp, ...withoutLcp } = sample;
    const [result] = evaluateBudget(FirstViewSchema.parse(withoutLcp), { lcp: 2500 });
    expect(result.actual).toBeUndefined();
    expect(result.passed).toBe(false);
  });

  test('only budgeted metrics are evaluated', () => {
    expect(evaluateBudget(sample, { requests: 30 }).map((r) => r.metric)).toEqual(['requests']);
  });
});

test.describe('formatResults', () => {
  test('renders a Markdown table with pass/fail marks and a result link', () => {
    const markdown = formatResults('Home', evaluateBudget(sample, { lcp: 2000, ttfb: 800 }), 'https://www.webpagetest.org/result/abc/');
    expect(markdown).toContain('### Home · [WebPageTest result](https://www.webpagetest.org/result/abc/)');
    expect(markdown).toContain('| ❌ | Largest Contentful Paint | 2210 ms | 2000 ms |');
    expect(markdown).toContain('| ✅ | Time to First Byte | 412 ms | 800 ms |');
  });
});
