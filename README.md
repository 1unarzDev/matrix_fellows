# Matrix Fellows

A Nuxt 4 research-society website with a continuous Three.js/GSAP journey, Tailwind v4 styling, a Supabase owner editor, and a scheduled Cloudflare opportunity importer.

The cinematic homepage now links to an SSR opportunity catalog at
`/opportunities`, with crawlable detail pages, RLS-protected lexical/fuzzy
search, explicit eligibility/preparation/cost fields, and device-local saves.
It also previews a route-split research library at `/guides`; eleven concise,
Git-reviewed Markdown guides remain fully readable in server-rendered HTML.

For system design, rendering/performance details, operational runbooks, visual
research, and validation history, use the [documentation index](docs/README.md).

## Run locally

Use Node **22.18+** (or current Node 24/26).

```sh
npm install
npm run dev
```

Open http://localhost:3000. Without credentials, the whole website works with labeled meeting/project placeholders and verified official discovery links. No signup destinations or event deadlines are invented.

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

The unit tests execute the actual SQL migration in an embedded PostgreSQL engine to verify anonymous/non-owner access, draft separation, and preservation of imported overrides. Browser tests cover desktop/mobile navigation, search, expansion, the editor entrance, reduced motion, and WebGL failure. They do not simulate successful external email delivery.

## Content and owner setup

1. Create a Supabase project and run `supabase/migrations/001_matrix_fellows.sql` in its SQL editor (or through the Supabase migration CLI).
2. Create the owner's user in **Authentication → Users**. Disable public signup. Add its UUID to the private allowlist:

   ```sql
   insert into public.editors (user_id) values ('YOUR-OWNER-USER-UUID');
   ```

3. Set the Auth site URL and allowed redirects to your actual website, including `https://your-domain/?admin=1` and `http://localhost:3000/?admin=1` for development. Configure your email delivery provider for production.
4. Create a local `.env` using the names in `.env.example`:

   ```dotenv
   NUXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   NUXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-PUBLISHABLE-OR-ANON-KEY
   NUXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

5. Optionally seed the introductory content and four official opportunity links. Temporarily add `SUPABASE_SERVICE_ROLE_KEY` to your local environment and run `npm run seed`. Existing records are preserved.
6. Apply the remaining additive migrations. Configure the server-only join and meeting-admin
   values documented in `docs/operations/join-form.md` and `docs/operations/meetings.md`; never
   expose the service role, Sheets token, meeting PIN, or meeting session secret as public config.
7. Open the editor with **Ctrl/⌘+Shift+E** or **Member admin** in the footer. One organizer PIN unlocks the meeting studio, content editor, opportunity tools, and private responses for a signed two-hour session. Published updates are cached for up to 30 seconds.

The shortcut is an entrance, not an authorization mechanism. Anonymous requests cannot read draft columns or private responses. Editor reads and mutations pass through typed, same-origin server endpoints that require the signed HttpOnly organizer session; the service role and PIN never reach browser code. Public server reads continue to expose only approved fields.

Editable content includes meeting time/date/timezone/location/topics, the three research projects, membership benefits, external CTA links, opportunity listings, and trusted sources. Narrative text and cinematic parameters remain in code. Blank links show forthcoming states rather than broken buttons. The initial timezone is `America/Chicago`; change it before announcing a meeting if appropriate.

## Cloudflare deployment

The frontend is a Nuxt application on **Cloudflare Workers with static assets**. This supports server-rendered content and a small read-only API without maintaining a Node backend. The separate importer is another Worker with a daily cron trigger.

Set the three `NUXT_PUBLIC_*` variables in the frontend Worker's Cloudflare environment (or non-secret `vars` in `wrangler.jsonc`). Then, from an authenticated Cloudflare CLI session:

Set `NUXT_SUPABASE_SERVICE_ROLE_KEY`, `NUXT_SHEETS_SYNC_TOKEN`,
`NUXT_MEETING_ADMIN_PIN`, and `NUXT_MEETING_ADMIN_SESSION_SECRET` with
`npx wrangler secret put NAME`; keep their values out of shell history and source control.

```sh
npm run deploy
```

Preview the built Worker locally with `npx wrangler dev --port 8787`. The provided `wrangler.jsonc` points to `.output/server/index.mjs` and `.output/public`.

For scheduled imports, set Worker-only secrets:

```sh
npx wrangler secret put SUPABASE_URL --config workers/wrangler.jsonc
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config workers/wrangler.jsonc
npm run deploy:imports
```

The cron runs at **11:00 UTC daily**. There is no public import endpoint. Use the editor's Sources tab and Cloudflare logs to see the last attempt and any error; the database also records the imported item count. No sources are enabled initially: enable only a trusted endpoint whose schema and access terms you have verified. Website deployment does not require deploying the importer immediately.

## Opportunity source contract

Adapters live in `workers/adapters.ts`, separate from the page and database orchestration. The JSON adapter accepts an array or `{ "opportunities": [...] }`:

```json
{
  "opportunities": [
    {
      "externalId": "stable-official-id",
      "title": "Example research workshop",
      "url": "https://official-source.example/workshop",
      "kind": "Workshop",
      "discipline": "Computational science",
      "description": "Official opportunity description.",
      "eventDate": null,
      "deadline": null,
      "timezone": null,
      "location": "See official source",
      "eligibility": "Check official eligibility",
      "priority": 50
    }
  ]
}
```

Required fields are `title` and an HTTPS `url`. Supply `externalId` for stable identity; otherwise the URL is used. Types are Competition, Conference, Workshop, Publication, and Program. Dates must be valid `YYYY-MM-DD` values or ISO timestamps with explicit offsets. Date-only deadlines remain visible through the full UTC calendar day. Use an offset-bearing timestamp when the precise closing time is known. Missing dates stay unknown.

RSS/Atom reads standard title, link, description/summary, and guid/id. Optional `mf:kind`, `mf:discipline`, `mf:deadline`, `mf:eventDate`, `mf:timezone`, `mf:location`, and `mf:eligibility` supply structured metadata (use `xmlns:mf="urn:matrix-fellows:opportunities"`). A feed's publication timestamp is **never** treated as a submission deadline. General news feeds should not be enabled as opportunity feeds.

Imports validate the entire feed before writing; malformed or failed sources retain previous data. Sources are limited to 500 items and 2 MB per response, use a timeout, and cannot redirect. Canonical links and stable IDs prevent duplicates. Manual field overrides and visibility survive refreshes. Expired items remain stored but are omitted from upcoming listings. Selecting an imported listing's Published checkbox off suppresses it until the owner republishes it.

The initial official links are Regeneron ISEF, Regeneron STS, JSHS, and NeurIPS. Their landing pages were checked on 6 September 2026. They are discovery links, not claims that a particular cycle is accepting submissions.

## Visual work and performance

Start with the [documentation index](docs/README.md). The current rendering and
performance approach is documented in [performance](docs/architecture/performance.md);
visual decisions live in [art direction](docs/design/art-direction.md), and third-party
provenance lives in [asset licenses](docs/legal/asset-licenses.md).

One master ScrollTrigger maps measured section positions to a continuous 0–5 progression. Camera position/target, terrain/water/atmosphere, particle motion, and constellation visibility follow it. Native scrolling and anchor navigation use the same state. The canvas initializes after HTML; Three.js and the palm loader are lazy chunks. Teardown disposes resources and all event/timeline subscriptions. Reduced motion and WebGL failure retain a static gradient and all page content.

`npm run capture` captures desktop and mobile-emulated chapter screenshots and frame measurements in `test-results/visual`. The default uses a hardware EGL context where available; set `SOFTWARE_GPU=1` for software rendering. Inspect canvas `data-fps`, `data-pixel-ratio`, and `data-progress` in developer tools. These are diagnostics, not UI.

The render loop targets 30 fps and reduces pixel ratio and particle count under sustained load. Physical midrange-phone validation is still required before making a device-wide performance claim. Do not compare SwiftShader/software rendering results with actual GPU performance.

To regenerate the palm GLB from the included source, start the dev server and run `node scripts/prepare-palm.mjs`. This is a development conversion tool; FBXLoader and GLTFExporter are not part of the live site.
