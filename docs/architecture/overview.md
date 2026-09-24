# System architecture

Matrix Fellows is a server-rendered Nuxt 4 site with a client-only cinematic
renderer, Supabase-backed editable content, and a separate scheduled Cloudflare
Worker for opportunity monitoring. The page remains readable when WebGL,
JavaScript animation, Supabase, or the importer is unavailable.

## Runtime topology

```text
Browser
  ├─ SSR HTML + Tailwind UI ───────────────┐
  ├─ cinematic scroll module (client)      │
  ├─ owner editor (lazy, authenticated)    │
  └─ membership dialog (lazy)              │
                                           ▼
Nuxt Cloudflare Worker                Supabase
  ├─ GET /api/content ───────────────► published content + opportunities
  ├─ GET /api/opportunities ─────────► bounded RLS-protected catalog search
  ├─ GET /api/opportunities/:slug ───► one published opportunity route
  ├─ POST /api/join ────────────────► validated private responses
  └─ GET /api/join-sheet ───────────► token-protected Sheets synchronization

Scheduled opportunity Worker ───────► source fetch / AI extraction / validation
                                  └─► Supabase observations and publications
```

The frontend Worker and opportunity Worker deploy independently. A failed or
paused importer does not stop the public site; existing published records remain.

## Major modules and interfaces

### Page and content

[The homepage module](../../app/pages/index.vue) owns the one-page narrative, navigation, SEO metadata, editable
content projection, and the open/closed state for lazy dialogs. Its initial
`useFetch('/api/content')` runs during server rendering, so headings, projects,
meeting details, and opportunity text exist in the delivered HTML.

[The public content handler](../../server/api/content.get.ts) is the public content seam. Its interface is one
`PublicContent` response. Internally it performs the site-content, listings, and
monitor-health reads concurrently, validates every result, and falls back to
`shared/data/defaults.ts`. Callers do not need to understand Supabase tables or
failure recovery.

The homepage response deliberately contains only six opportunity previews. The
server selects a stable set of research flagships from a bounded public query,
then uses relevance-ranked, non-HOSA records only when a featured route is not
published. The full SSR catalog and detail routes live under `/opportunities`
and query bounded pages through security-invoker database functions. The
complete catalog and its vectors never enter homepage hydration; searches never
trigger source discovery.

The homepage also renders only six lightweight guide summaries. The `/guides`
index and `/guides/[slug]` pages are separate SSR route chunks. Guide source lives
as validated Markdown in `content/guides/`; `app/lib/guides.ts` lazily imports one
file, parses Markdown/MDC, and supplies Matrix prose and instructional components
to `MDCRenderer`. The static registry in `shared/data/guides.ts` owns ordering,
route generation, homepage summaries, sitemap membership, and prerender routes.
No full guide body enters the homepage payload.

Meeting content follows the same bounded pattern. The editable confirmed
meeting is combined with reviewed projected sessions by
`shared/data/meetings.ts`; the homepage renders a compact calendar/detail rail,
while `/meetings` provides an SSR archive with stable meeting IDs, agendas, and
resource links. Calendar interactions are client enhancements—the schedule and
details remain present in server-rendered HTML.

### Cinematic scroll

[The cinematic adapter](../../app/components/CinematicWorld.client.vue) connects DOM scroll and
the renderer. One ScrollTrigger timeline measures all chapters and produces a
continuous stage. It drives DOM depth choreography, accent color, and the renderer
through the small `World` interface:

```ts
interface World {
  setProgress(value: number): void
  dispose(): void
}
```

[The world module](../../app/lib/scene/world.ts) hides renderer construction, camera interpolation,
post-processing, particles, quality adaptation, resize behavior, visibility
pausing, context-loss handling, and teardown behind that interface. This is a
deliberately deep module: callers supply progress and own disposal; they do not
manage individual scenes, materials, or render passes.

Supporting scene modules keep specialized implementation local:

- [`shaders.ts`](../../app/lib/scene/shaders.ts) — shared procedural world, water, weather, particles, and transition math.
- [`oasis.ts`](../../app/lib/scene/oasis.ts) — shoreline dressing, wind, flooding visibility, async assets, and disposal.
- [`desert-geometry.ts`](../../app/lib/scene/desert-geometry.ts) — load, normalize, merge, and release compact GLB geometry.
- [`constellations.ts`](../../app/lib/scene/constellations.ts) — source-backed star and line layouts.
- [`frame-clock.ts`](../../app/lib/scene/frame-clock.ts) — testable 30 Hz pacing and mobile camera settlement.

See [performance and rendering](performance.md) before changing any of these.

### Owner editing and membership

The owner editor is lazy-loaded and talks to Supabase under row-level security.
The keyboard shortcut and footer entry are discovery mechanisms, not authorization.
Draft access and mutations are enforced by database policy.

Membership submission crosses the server seam in
[`server/api/join.post.ts`](../../server/api/join.post.ts).
The handler enforces same-origin submission, an 8 KiB body limit, schema
validation, a honeypot, and a non-reversible HMAC rate key instead of storing raw
IP addresses. Google Sheets receives a controlled synchronization view rather
than becoming the authoritative database. Setup details are in
[the membership runbook](../operations/join-form.md).

### Opportunity monitoring

[The scheduled importer](../../workers/import.ts) orchestrates monitoring. Source adapters and
official profiles are separate from the page, and structured seed data lives in
[the structured catalogs](../research/catalogs/). Validation, host allowlisting, evidence observations,
manual overrides, and freshness rules prevent a single source change or model
response from silently publishing arbitrary data. See the
[monitoring runbook](../operations/opportunity-monitoring.md).

## Failure behavior

| Failure                           | Result                                                            |
| --------------------------------- | ----------------------------------------------------------------- |
| WebGL creation or context loss    | Static atmospheric background; all HTML remains usable            |
| Reduced-motion preference         | Renderer is not initialized; spatial DOM transforms are cleared   |
| Scene chunk or asset load failure | Static fallback, or original grove without optional dressing      |
| Supabase public read failure      | Validated defaults, `unavailable` status, and `no-store` response |
| Opportunity source failure        | Previous observations remain; source health records the issue     |
| Owner/admin code unused           | Admin chunks stay out of the initial interaction path             |
| JavaScript or WebGL unavailable   | Guide and meeting text/resources remain present in SSR HTML       |
| Membership backend unavailable    | Form reports a retryable error; no false success is stored        |

## Configuration and ownership

- Public frontend configuration uses `NUXT_PUBLIC_SITE_URL`,
  `NUXT_PUBLIC_SUPABASE_URL`, and `NUXT_PUBLIC_SUPABASE_ANON_KEY`.
- Server-only membership access uses `NUXT_SUPABASE_SERVICE_ROLE_KEY` and
  `NUXT_SHEETS_SYNC_TOKEN`.
- The scheduled Worker has its own Supabase secrets and AI binding. Never expose
  service-role credentials through Nuxt public runtime config.
- Database migrations in `supabase/migrations/` define the durable data and RLS
  contract. Tests execute those migrations against embedded PostgreSQL.

## Repository map

| Path                   | Responsibility                                                          |
| ---------------------- | ----------------------------------------------------------------------- |
| `app/`                 | SSR pages, Tailwind UI, guide rendering, client animation, renderer     |
| `content/guides/`      | Validated, Git-reviewed research-guide Markdown                         |
| `server/`              | Nuxt server endpoints and request middleware                            |
| `shared/`              | Types, schemas, defaults, domain rules shared by runtimes               |
| `workers/`             | Scheduled opportunity monitoring Worker                                 |
| `supabase/migrations/` | Tables, policies, functions, and durable invariants                     |
| `tests/unit/`          | Domain, SQL, Worker, clock, weather, and schema tests                   |
| `tests/e2e/`           | Browser interaction, accessibility, mobile, and fallback coverage       |
| `scripts/`             | Deployment checks, rendering diagnostics, captures, and data tools      |
| `docs/`                | Current architecture, runbooks, design research, and historical reports |
