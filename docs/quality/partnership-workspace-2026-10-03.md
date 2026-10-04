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

## Subsequent member-dashboard and remote setup cycle

The earlier checkpoint above describes the invitation-only pilot; it is retained
as historical evidence. Release `b4b0e48` opens verified member accounts while
preserving officer-only discovery/research. Members can send only personal
inquiries to explicitly assigned, ready, unsuppressed contacts. SQL approval and
send-claim checks revalidate live assignment; revocation blocks approved but
unclaimed sends. Ordinary account verification is not club/parental approval.

Supabase migrations 023, 024, and 028 were applied to
`xlnjzzbsxzadrvbrggau`; unrelated already-applied catalog migrations were not
rerun. All 18 outreach tables have RLS. Remote authenticated-role checks deny
execution of privileged enrollment/access/approval/send RPCs; anonymous REST
requests for targets, reviewed-target view, and membership returned HTTP 401.
Email confirmation is retained, signup enabled, dashboard callback allowlisted,
and the preexisting verified named editor enrolled as admin. Nine reviewed
starter candidates and ten sources are installed without overwriting reviews.

Cloudflare research Workflow `setup-e1609b6b-4111-45d0-a7aa-49068b5862f1`
completed in three seconds with three UTA SMILE first-party pages. The live
database confirms checkpoint persistence. No Gemini generation occurred; model
metadata access returned HTTP 200. Worker credentials and legal/free-use flags
are configured, but research was restored to paused and AI remains disabled.
Claiming while paused returned zero jobs. No outreach email was sent.

Production release built in an isolated checkout with its own locked dependency
install: typecheck and build pass. Unit/SQL tests pass: 225 across 37 files with
`npx vitest run --maxWorkers=2`. An initial unrestricted concurrent run timed
out initializing ten PGlite suites under build/test resource contention; the
bounded rerun passed without weakening timeouts. A symlinked dependency build
also failed Nuxt's internal import resolution; a separate `npm ci` installation
resolved it. These failed attempts are not reported as passes.

The full working-tree checks (including separate, unshipped catalog work) passed
248 tests and 16 desktop/mobile browser tests. In the clean release preview,
the first browser run passed the 12 dashboard tests but failed four PIN-editor
tests because public Supabase configuration was absent. Rerun uses explicit
dummy public configuration with mocked endpoints; no real admin PIN or member
data is used. Screenshots of mobile personal builder and desktop assignments
were visually inspected. Physical devices and real mailbox consent/delivery
remain unverified.

Remaining setup: OAuth client IDs/secrets and callback/provider registration,
dependable Auth email delivery, real email-verified sign-in, a consenting
mailbox test, and screened public AI excerpts. See the updated
[deployment runbook](../operations/partnership-workspace.md).
