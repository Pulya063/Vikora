# Cloudflare migration test report

Date: 2026-10-12

## Passed locally

- Cloudflare Worker TypeScript check: passed.
- Cloudflare Worker ESLint: passed with zero warnings.
- Worker Miniflare/D1 suite: 26 tests passed across 5 files. Includes atomic lead/outbox writes, rollback, SQL-injection-shaped input persistence, invalid JSON/body limits, CORS, Turnstile action/hostname, Telegram webhook authorization/replay, price confirmation, queue recovery, Notion retries and ambiguous-delivery reconciliation.
- Local D1 migrations: all four migrations applied successfully with Wrangler.
- Wrangler staging configuration dry-run: passed; generated Worker bundle was 1,147.46 KiB (195.01 KiB gzip).
- Frontend TypeScript check: passed.
- Frontend contract tests: 8 passed (quote payload/security and public API routing/legacy compatibility).
- Next.js production build: passed; all 32 static pages generated and dynamic routes compiled.
- Playwright browser suite: 4 Edge tests passed. Covered duplicate-click protection and retry keys, cancellation of stale calculator responses, 429 resubmission gating, and mobile layout without horizontal overflow at 390 px.
- Screenshots reviewed: `vikora-desktop.png` (successful form state) and `vikora-mobile.png` (390 px contacts/form layout). The mobile screenshot includes the Next.js development issue indicator from the intentionally unavailable local API test target; it is not part of the production UI.
- `git diff --check`: no whitespace errors after cleanup.

## Remaining verification

- OpenNext Cloudflare bundle: Next.js compilation succeeded, but Windows standalone tracing failed when it tried to create symlinks under `.next/standalone` (`EPERM`). OpenNext warns that Windows is not fully supported; the Linux GitHub Actions build remains the required verification before staging.
- The Cloudflare API, real Turnstile credentials, Telegram Bot API, Notion workspace/data-source schema, and production D1/Queues were not contacted. Tests use local D1 and mocked integrations.
- Python/FastAPI was not changed in this migration and remains available for rollback. No Cloudflare resource, paid plan, or deployment was created.

## CI checks configured but not run from this local host

The GitHub Actions workflow is configured to run PostgreSQL migrations and tests, Python tests, cross-language pricing tests, frontend contract/type/build checks, Worker tests and migrations, dependency audits, Chromium browser tests, and Docker builds. The browser suite was run locally in Edge; the CI Chromium run and a successful CI workflow are still required before staging deployment.
