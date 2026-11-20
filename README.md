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

WebPageTest's bot protection sometimes blocks cloud CI runners with a `403` "Security Verification" page. The contract tests detect that page and **skip with an explicit reason** rather than fail, since it isn't an API change. Run `npm run test:contract` locally to check the contract from a normal connection.

## Getting started

### 1. Prerequisites

| Tool | Version | Check | Install |
|------|---------|-------|---------|
| Node.js | 20.12 or newer (22 LTS recommended) | `node -v` | [nodejs.org](https://nodejs.org/) |
| Git | any recent | `git --version` | [git-scm.com](https://git-scm.com/downloads) |

For the live performance tests you also need a **WebPageTest API key**. Get one at [webpagetest.org/signup](https://www.webpagetest.org/signup). The unit and contract tests run without it.

### 2. Clone and install

```bash
git clone https://github.com/Husseinbaashen94/webpagetest-performance-automation.git
cd webpagetest-performance-automation
npm install
```

### 3. Configure (optional)

Everything works out of the box. To change a setting, copy the template and fill in only what you need:

```bash
cp .env.example .env
```

| Variable | Purpose and default |
|----------|---------------------|
| `WPT_API_KEY` | **Your WebPageTest API key.** Needed only for `npm run test:perf`. Without it those tests are skipped |
| `WPT_RUNS` | Runs per page; the median is used. Default `3` |
| `WPT_BASE_URL` | WebPageTest server. Default `https://www.webpagetest.org` |

Empty values use the default. `.env` is git-ignored, so nothing you put in it is ever committed.

### 4. Run the tests

```bash
npm run test:unit        # budget logic, no key, no network
npm run test:contract    # checks the public API shape, no key
npm run test:perf        # live lab tests for every page in budgets.json (needs WPT_API_KEY)
npm test                 # all of the above
```

To audit different pages, edit `budgets.json`. Each entry has a `name`, `url`, `location` and the `budget` limits.

**In CI:** add your key under *Settings → Secrets and variables → Actions* as a repository secret named `WPT_API_KEY`.

### 5. View the report

Run `npm run report`. Each page's test has a Markdown table of actual vs budget plus a link to the full WebPageTest result. In CI, the same table appears in the job summary.

### Troubleshooting

| Problem | Fix |
|---------|-----|
| Performance tests show as *skipped* | `WPT_API_KEY` isn't set. Add it to `.env` |
| `did not finish within 600s` | WebPageTest's queue is busy; re-run later or lower `WPT_RUNS` |
| Contract test fails on a location | That test agent was retired: pick another id from `https://www.webpagetest.org/getLocations.php?f=json` |

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
