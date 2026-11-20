import { type APIRequestContext } from '@playwright/test';
import { RunTestResponseSchema, TestResultSchema, TestStatusSchema, type TestResult } from './schemas';

export interface RunOptions {
  location?: string;
  runs?: number;
  mobile?: boolean;
  label?: string;
}

/**
 * Minimal WebPageTest API client: submit → poll → fetch result.
 * The API key travels in the X-WPT-API-KEY header, never in the URL, so it can't leak into logs or reports.
 */
export class WptClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly apiKey: string,
  ) {}

  private get headers() {
    return { 'X-WPT-API-KEY': this.apiKey };
  }

  async runTest(url: string, options: RunOptions = {}) {
    const params: Record<string, string | number> = {
      url,
      f: 'json',
      runs: options.runs ?? 3,
      fvonly: 1, // first view only: cold-cache experience
      lighthouse: 0,
    };
    if (options.location) params.location = options.location;
    if (options.mobile) params.mobile = 1;
    if (options.label) params.label = options.label;

    const response = await this.request.post('/runtest.php', { params, headers: this.headers });
    const body = await response.json();
    return RunTestResponseSchema.parse(body).data;
  }

  /** Polls until the test finishes. WebPageTest returns 1xx while queued/running and 200 when done. */
  async waitForCompletion(testId: string, { timeoutMs = 10 * 60_000, intervalMs = 10_000 } = {}) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const response = await this.request.get('/testStatus.php', { params: { test: testId, f: 'json' }, headers: this.headers });
      const status = TestStatusSchema.parse(await response.json());
      if (status.statusCode === 200) return;
      if (status.statusCode >= 400) throw new Error(`Test ${testId} failed: ${status.statusCode} ${status.statusText}`);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error(`Test ${testId} did not finish within ${timeoutMs / 1000}s`);
  }

  async getResult(testId: string): Promise<TestResult> {
    const response = await this.request.get('/jsonResult.php', { params: { test: testId }, headers: this.headers });
    return TestResultSchema.parse(await response.json());
  }
}
