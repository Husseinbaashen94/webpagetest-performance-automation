import { type FirstView } from './schemas';

/** Budget limits per metric. Timings in ms, CLS unitless, size in KB. Omit a metric to skip it. */
export interface Budget {
  ttfb?: number;
  fcp?: number;
  lcp?: number;
  cls?: number;
  tbt?: number;
  speedIndex?: number;
  totalKB?: number;
  requests?: number;
}

export interface PageBudget {
  name: string;
  url: string;
  /** WebPageTest location:browser.connectivity, e.g. "ec2-us-east-1:Chrome.4G" */
  location?: string;
  mobile?: boolean;
  budget: Budget;
}

export interface MetricResult {
  metric: keyof Budget;
  label: string;
  actual: number | undefined;
  limit: number;
  unit: string;
  passed: boolean;
}

const metricDefinitions: Record<keyof Budget, { label: string; unit: string; read: (v: FirstView) => number | undefined }> = {
  ttfb: { label: 'Time to First Byte', unit: 'ms', read: (v) => v.TTFB },
  fcp: { label: 'First Contentful Paint', unit: 'ms', read: (v) => v.firstContentfulPaint },
  lcp: { label: 'Largest Contentful Paint', unit: 'ms', read: (v) => v['chromeUserTiming.LargestContentfulPaint'] },
  cls: { label: 'Cumulative Layout Shift', unit: '', read: (v) => v['chromeUserTiming.CumulativeLayoutShift'] },
  tbt: { label: 'Total Blocking Time', unit: 'ms', read: (v) => v.TotalBlockingTime },
  speedIndex: { label: 'Speed Index', unit: 'ms', read: (v) => v.SpeedIndex },
  totalKB: { label: 'Page weight', unit: 'KB', read: (v) => Math.round(v.bytesIn / 1024) },
  requests: { label: 'Requests', unit: '', read: (v) => v.requestsFull },
};

/**
 * Compares a WebPageTest first-view median against a budget.
 * A metric missing from the result fails: an unmeasured metric is not a passing metric.
 */
export function evaluateBudget(firstView: FirstView, budget: Budget): MetricResult[] {
  return (Object.entries(budget) as [keyof Budget, number][]).map(([metric, limit]) => {
    const definition = metricDefinitions[metric];
    const actual = definition.read(firstView);
    return {
      metric,
      label: definition.label,
      actual,
      limit,
      unit: definition.unit,
      passed: actual !== undefined && Number.isFinite(actual) && actual <= limit,
    };
  });
}

/** Renders results as a Markdown table, attached to the test report and the CI job summary. */
export function formatResults(pageName: string, results: MetricResult[], resultUrl?: string): string {
  const rows = results.map((r) => {
    const fmt = (n: number | undefined) => (n === undefined ? 'n/a' : `${Number.isInteger(n) ? n : n.toFixed(3)}${r.unit ? ` ${r.unit}` : ''}`);
    return `| ${r.passed ? '✅' : '❌'} | ${r.label} | ${fmt(r.actual)} | ${fmt(r.limit)} |`;
  });
  return [
    `### ${pageName}${resultUrl ? ` · [WebPageTest result](${resultUrl})` : ''}`,
    '',
    '|  | Metric | Actual | Budget |',
    '|---|---|---|---|',
    ...rows,
    '',
  ].join('\n');
}
