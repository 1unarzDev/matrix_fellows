# Living opportunity catalog

The researched catalog and evidence live in `docs/research/*-catalog.json`, with source-by-source notes in `high-school-programs.md` and `high-school-competitions.md`. These are curated starting observations, **not recurring date templates**. Historical dates are deliberately retained and labeled as past. No date is advanced by adding a year.

## Runtime and interfaces

```text
Official pages + linked application/calendar pages
    → bounded HTTPS fetch on reviewed hosts
    → Workers AI structured extraction (one correction retry)
    → exact quote + date + lifecycle validation
    → two matching observations, at least six hours apart
    → published listing + preserved owner overrides + historical timeline
```

`workers/monitoring.ts` exposes `runMonitoring`, `observeMonitor`, and `discoverUrl`. Acquisition, model output, validation, and publication are internal seams. The same pure validation functions are exercised by regression tests. `shared/utils/opportunity-lifecycle.ts` derives the current display state and next checkpoint from the clock, so expired checkpoints cannot remain labeled upcoming between imports.

The Supabase claim RPC locks due jobs with `SKIP LOCKED` to prevent overlapping runners claiming the same job. Runs process at most eight monitors, with a 24-hour normal recheck interval and six-hour confirmation interval. The Worker wakes at 11:00 UTC and every three hours at :15 UTC. Capacity is 72 jobs/day; as the catalog grows, increase capacity deliberately with consideration for AI usage. This is a queue, not a promise that every page changes or can be checked at an exact time.

Workers AI binding: `AI`, model `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. Inference consumes Cloudflare Workers AI quota and may incur usage charges. A run has a fixed job budget, at most three documents per job and two model attempts per extraction. Source bodies are limited to 2 MB; model context uses at most 22,000 text characters per document. Fetches time out. Annual monitors follow at most three revalidated same-host HTTPS redirects, preserving ordinary organizer URL migrations. Cross-host redirects and blocked pages are surfaced for attention rather than silently trusting a different host. Legacy feed adapters still reject redirects.

## What may publish automatically

- Dates with an exact source quote that contains the actual month/day/year. Month-only announcements remain undated. The AI cannot infer a date or convert a timezone.
- After one correction retry, individually unsupported checkpoints are discarded; remaining checkpoints must still pass all evidence checks. This can produce an intentionally incomplete timeline rather than fabricated precision. Organizer pages remain the final authority.
- Calendar-only AI dates retain that precision; manually verified exact timestamps are preserved when the same checkpoint is rediscovered.
- Explicit organizer lifecycle changes. Closing applications is not evidence of permanent discontinuation. Negated discontinuation claims and explicit high-school exclusions are rejected.
- A confirmed new cycle, using links actually present on the official site. Existing timeline history is retained; new yearly URLs are never synthesized.
- Changes to directly quoted eligibility. Research overviews remain the curated introduction; status evidence and edition dates capture changing availability.

New/changed facts must be independently observed twice, at least six hours apart. This protects against transient extraction errors but is not two independent sources and cannot prove an organizer is correct. Contradictory or redesigned pages can still require human attention. The `opportunity_observations` table preserves dated evidence snapshots, including previously published observations. The owner can correct a listing or pause its monitor in **Editor → Sources**; imports never undo owner overrides or suppression.

After a validated extraction, a new fetch with the same normalized document hash reconfirms it without another AI call. The six-hour gate still applies. Changed text or a new validator version invalidates this cache. This reduces inference usage and avoids generating different wording for unchanged facts.

## Discovery and agent integration

Weekly Sunday 11:00 UTC discovery inspects the official MIT Admissions summer-program directory and follows at most three relevant links on the reviewed host allowlist. New discoveries need literal positive high-school eligibility evidence and a deduplication check; they enter the normal two-observation confirmation process before publication. This is deliberately bounded discovery, not an unrestricted web crawler. Add more first-party hubs in `workers/catalog.ts`; new domains need explicit vetting before joining the allowlist.

External authorized agents can use these HTTPS endpoints on `matrix-fellows-opportunities.lunarzdev.workers.dev`:

- `POST /agent/discover`, JSON `{ "url": "https://reviewed-official-host/program" }`: fetches the page itself and validates evidence; accepts no caller-supplied dates. At most three new discoveries per day through this endpoint.
- `POST /agent/run`: processes one due job and returns its result (200). Keep the request open with a generous timeout; work is not abandoned into a short-lived request background task. It does not bypass the scheduling lease or confirmation period.

Both require `Authorization: Bearer <AGENT_INGEST_TOKEN>`. The token is a Worker secret. Provision/rotate it with `wrangler secret put AGENT_INGEST_TOKEN --config workers/wrangler.jsonc`; do not commit it or place it in browser configuration. No public endpoint can trigger AI work without this secret. Supabase service-role credentials stay on the Worker.

## Freshness and uncertainty

Public cards expose the last confirmed timestamp, not merely the last attempted fetch. After 72 hours without confirmation, or immediately after a failed check, they show a freshness warning. Completed, awaiting-announcement, discontinued, changed, and unknown records remain searchable rather than disappearing. A discontinuation requires explicit evidence; a failed fetch never implies a program ended. Timelines default to the next checkpoint, or the latest historical checkpoint when all have passed.

No system can guarantee that organizer websites are current or available. This implementation makes uncertainty visible and retains the last confirmed facts instead of fabricating updates. The editor provides last attempt, last confirmation, next scheduled check, error details, and pause/resume controls.

## Operations and verification

1. `npm test` — schema, extraction, negative evidence, history and database authorization/confirmation tests.
2. `npm run typecheck` and `npm run build`.
3. `npx playwright test tests/e2e/opportunity-timeline.spec.ts` — desktop/mobile timeline, search, status, pagination, keyboard, and reduced-motion regressions.
4. `npx supabase db push --linked` — apply reviewed migrations to the linked Matrix Fellows project.
5. `npx tsx scripts/seed-opportunity-catalog.mjs` — explicit one-time curated publication; preserves existing listings. Also registers annual monitors and pauses the old edition-specific adapters so they cannot race the new runner.
6. `npm run deploy:imports` — deploy the Worker, AI binding and cron triggers.
7. `npm run check:live` — verify Open Graph and the public catalog after GitHub deployment.

For a cloud-runtime test, run `wrangler dev --remote --test-scheduled --config workers/wrangler.jsonc --port 8790`, request `http://localhost:8790/__scheduled`, and inspect monitor/observation status in Supabase. This uses real AI quota and the live database; it is not a mocked test. Do not equate HTTP 200 with every source succeeding—inspect per-monitor errors and observations afterward.
