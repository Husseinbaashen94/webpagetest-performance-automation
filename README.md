# Web Performance Budgets with WebPageTest

![Web Performance](https://github.com/Husseinbaashen94/webpagetest-performance-automation/actions/workflows/ci.yml/badge.svg)
![WebPageTest](https://img.shields.io/badge/WebPageTest-API-1A73E8)
![Playwright](https://img.shields.io/badge/Playwright%20Test-TypeScript-2EAD33?logo=playwright)

Automated **front-end performance testing** with the [WebPageTest API](https://docs.webpagetest.org/api/). Each page in `budgets.json` is loaded on real browsers in WebPageTest's lab, and the build **fails if Core Web Vitals or page weight exceed their budget**.

> Complements [k6-load-testing](https://github.com/Husseinbaashen94/k6-load-testing): k6 measures how the **server** holds up under load, and this repo measures how fast the **page** feels to one real user.

## Example output

Each run writes a table to the GitHub Actions job summary and the HTML report:

| | Metric | Actual | Budget |
|---|---|---|---|
| ✅ | Time to First Byte | 412 ms | 800 ms |
| ✅ | First Contentful Paint | 1350 ms | 1800 ms |
| ❌ | Largest Contentful Paint | 2710 ms | 2500 ms |
| ✅ | Cumulative Layout Shift | 0.034 | 0.1 |
| ✅ | Total Blocking Time | 140 ms | 200 ms |

*(Illustrative numbers.)*

## How it works

```
budgets.json ──► WptClient.runTest() ──► poll testStatus ──► jsonResult ──► evaluateBudget() ──► pass / fail + report
```

- **Budgets as config.** Pages, test locations (desktop cable or mobile 4G) and limits live in `budgets.json`, so adding a page needs no code.
- **Median of 3 runs, cold cache.** Results are less noisy than a single load.
- **Metrics:** TTFB, FCP, **LCP**, **CLS**, **TBT**, Speed Index, page weight and request count.
- **A metric that wasn't measured fails.** It never passes silently.
- **Soft assertions.** Every metric is reported even after the first one fails, so one run shows everything that's over budget.

## Three layers of tests

| Project | Needs API key? | Runs | What it checks |
|---|---|---|---|
| `unit` | No | every push | budget evaluation logic against a sample result: inclusive limits, unit conversion, missing metrics |
| `contract` | No | every push | the public API still matches the client's Zod schemas · every location and browser in `budgets.json` exists · unauthenticated test runs are refused |
| `performance` | **Yes** | weekly + manual | real WebPageTest runs for every page, with budgets enforced |

Live runs use WebPageTest API credits, so CI only runs them on a schedule or manual trigger, never on every push.

## Run it

Requires Node.js 18+.

```bash
npm install
npm run test:unit          # no key needed
npm run test:contract      # no key needed

# Live performance runs: get a key at https://www.webpagetest.org/signup
WPT_API_KEY=your-key npm run test:perf
WPT_API_KEY=your-key WPT_RUNS=5 npm run test:perf    # more runs = steadier medians
```

For CI, add the key as a repository secret named `WPT_API_KEY`. The key is sent in the `X-WPT-API-KEY` header and never in a URL, so it can't leak into logs or reports.

## Project structure

```
budgets.json                  # pages, locations, budgets
src/
├── WptClient.ts              # submit → poll → fetch result
├── budgets.ts                # evaluateBudget(), formatResults()
└── schemas.ts                # Zod contracts for API responses
tests/
├── unit/                     # budget logic
├── contract/                 # live API shape, config validity
└── performance/              # real lab runs (needs WPT_API_KEY)
fixtures/sample-first-view.json
```
