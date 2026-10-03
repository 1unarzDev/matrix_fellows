# Partnership workspace checkpoint — October 3, 2026

Implemented on base `ae65184`, without changing cinematic rendering or the PIN
content editor. This is a private adult-officer pilot, not a live-mail deployment.

## Implemented and inspected

Invitation-only named login; owner-private profiles; shared society evidence;
candidate dossiers, weighted review priority, saved candidates and lightweight
planning; reviewed starter routes; local personalized drafting; revision-bound
approval; Gmail/Outlook authorization and sending; manual ambiguous-send
reconciliation; separate paused-by-default scheduled research Workflow.

The UI uses existing custom selectors and checkboxes, glass, restrained gold and
violet, subtle grain, keyboard focus, reduced-motion support and responsive studio
navigation. Desktop/mobile screenshots were inspected for login, queue, profiles,
actual draft editing and separate acquired-source/model suggestions. These are
browser-emulated views, not physical-device interaction evidence. The header
shares the catalog's orbital logo interaction, omits the redundant studio label,
and has a transparent background; desktop hover, mobile keyboard focus and
reduced-motion behavior were checked.

An independent critique loop caught and prompted fixes for snapshot overwrites,
repeated first-batch discovery, cached permission authorization, misclassified
directory news links, stale editors and changed target identities. Worker
acquisition now has its own JSON namespace; it cannot replace officer ratings or
interpretations. Target context edits invalidate email approvals; acquisition
refreshes alone do not. Updates carry the editor's opened timestamp, including
PostgREST's UTC-offset/microsecond format.

The real [UTA CSE directory](https://www.uta.edu/academics/schools-colleges/engineering/academics/departments/cse/research)
was fetched locally on October 3. With the reviewed exact-host list, extraction
yielded 14 named lab entities; its first five were Abacus Cloud and Edge Systems,
Arlington Computational Linguistics, Autonomous and Intelligent Systems,
Cyber-Physical Systems Security, and Database Exploration. News remains reading
material, not an admitted lab. This verifies extraction, not mentoring availability
or successful remote scheduled execution.

## Reproducible verification

```sh
npm test
npm run typecheck
npm run build
npx wrangler dev .output/server/index.mjs --assets .output/public --port 8795 --inspector-port 9245
TEST_BASE_URL=http://localhost:8795 npx playwright test tests/e2e/workspace.spec.ts
npx wrangler deploy --dry-run --config workers/outreach.wrangler.jsonc
npm run docs:check
```

- Unit and real PostgreSQL-compatible migration/authorization tests: 216 passed
  across 35 files. SQL tests use PGlite, not the production Supabase project.
- Production workspace browser checks: 8 passed across desktop/mobile Chromium.
  Auth rejection, no-store/noindex, sections, evidence, overflow, exact approval,
  separate confirmation, uncertain-send handling and logo interaction are covered. Private data and
  provider responses are mocked for authenticated UI flows.
- Typecheck, production build and Worker dry-run bundle passed. The dry run
  confirms Workflow binding/bundling, not Cloudflare scheduling or provider calls.
- A browser attempt while the local preview was down failed with connection
  refusal; restarting the preview resolved it. Concurrent previews also conflicted
  over local Wrangler storage; final checks used an isolated temporary persist
  directory. A mouse-hover assertion was corrected to keyboard focus for mobile,
  which properly does not advertise hover. The eight checks then passed.

Local captures are in `/tmp/workspace-*.png` and `/tmp/matrix-workspace-*.png`;
logs are `/tmp/matrix-workspace-release-*.log`. They are diagnostic artifacts,
not committed personal data or deployment assets.

## Launch gates and next step

No production migrations, OAuth grants, Gemini requests or emails were performed.
Apply migrations 023/024, configure named adult-officer accounts and OAuth
callbacks/secrets, import starters, and run controlled sign-in/mail/Workflow
checks following the [runbook](../operations/partnership-workspace.md). Keep
research paused and AI disabled until those checks pass. Do not deploy an enabled
worker merely because local mocks pass.

Research acquires at most three first-party pages and optionally analyzes a
specifically screened non-personal excerpt. Officers must still verify contact,
eligibility, openness and proposal feasibility. Priority is not a response
probability. Source expansion requires review; this is not an unrestricted crawler.
The pilot research Worker holds a privileged service credential, so database
privileges do not isolate it from private tables. Do not run untrusted executable
agents with that credential; a restricted research broker is the next security
increment if the trust model expands.
