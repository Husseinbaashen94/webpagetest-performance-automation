import { z } from 'zod';

/** GET /getLocations.php?f=json: the public list of test agents. */
export const LocationsResponseSchema = z.object({
  statusCode: z.literal(200),
  statusText: z.string(),
  data: z.record(
    z.string(),
    z
      .object({
        Label: z.string(),
        location: z.string(),
        Browsers: z.string(),
        status: z.string().optional(),
        group: z.string().optional(),
        default: z.boolean().optional(),
        PendingTests: z.object({ Total: z.number(), Testing: z.number().optional() }).passthrough().optional(),
      })
      .passthrough(),
  ),
});

/** POST /runtest.php?f=json: test submitted. */
export const RunTestResponseSchema = z.object({
  statusCode: z.literal(200),
  data: z
    .object({
      testId: z.string().min(1),
      jsonUrl: z.string().url(),
      userUrl: z.string().url(),
    })
    .passthrough(),
});

/** GET /testStatus.php?f=json: 1xx while queued or running, 200 when complete, 4xx on failure. */
export const TestStatusSchema = z.object({
  statusCode: z.number(),
  statusText: z.string(),
});

/**
 * The subset of a first-view median run that the budgets read.
 * Metric names follow the WebPageTest JSON result format.
 */
export const FirstViewSchema = z
  .object({
    TTFB: z.number(),
    firstContentfulPaint: z.number(),
    SpeedIndex: z.number(),
    TotalBlockingTime: z.number().optional(),
    'chromeUserTiming.LargestContentfulPaint': z.number().optional(),
    'chromeUserTiming.CumulativeLayoutShift': z.number().optional(),
    bytesIn: z.number(),
    requestsFull: z.number(),
    fullyLoaded: z.number(),
  })
  .passthrough();

/** GET /jsonResult.php?test=ID: the full result. */
export const TestResultSchema = z.object({
  statusCode: z.literal(200),
  data: z
    .object({
      id: z.string(),
      url: z.string(),
      summary: z.string().url().optional(),
      location: z.string().optional(),
      median: z.object({ firstView: FirstViewSchema }).passthrough(),
    })
    .passthrough(),
});

export type FirstView = z.infer<typeof FirstViewSchema>;
export type TestResult = z.infer<typeof TestResultSchema>;
