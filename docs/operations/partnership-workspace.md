# Partnership workspace

The private `/dashboard` (`/workspace` remains an alias) is the adult member and
research workspace. Verified members maintain their own private research profiles,
links, corrections and planning. Controlled officer/admin appointment grants discovery,
drafting, revisions, approval, sending and new mailbox connection privileges.
All drafts remain private to their current authorized owner. Assigning a contact does
not grant member drafting rights. Historical member correspondence is retained under
restricted access; demoted owners can disconnect their mailbox and reconcile their
own uncertain submission without regaining drafting or sending access.

First verified entry idempotently creates a canonical self-profile and narrowly imports
matching normalized join answers as self-reported name, interests and goals. No browser
identity or email can select another response. Administrative school/guardian/feedback
fields never enter enrichment. Legacy unresolved profiles remain separate. Research
links produce immutable evidence, candidate project facts and separately attributable
self-reported contributions. Shared officer projections require explicit member sharing;
internal society capacity does not publish a member directory or become organization
accomplishments. Source refresh does not overwrite corrections or editor text.

Officer review selects a target/contact, shareable member/project and bounded research
angle. A persisted match plan reaches the local writer, which uses reviewed technical
Gemini analysis when available and labels local drafting accurately. Preview revisions
preserve edits made in flight. Every message and follow-up requires an owner's exact
approval and send confirmation from their own connected mailbox. Ownership handoff
retains authorship, discards earlier approval and never transfers mailbox tokens.
Manual relationship events and promises create canonical planner follow-up tasks.
Automatic inbox reading remains disconnected.

The pilot Worker uses a privileged Supabase service credential: it is not an
isolated database principal. Protect it accordingly; a scoped research broker is
required before allowing untrusted executable agent code.

## Configure identity and storage

Use the reviewed ledger-specific migration procedure in the [activation brief](research-outreach-activation.md); do not issue a blanket migration push. Use named Supabase
Auth accounts, enable email-confirmed member registration, and configure Google, Azure/Microsoft
and email magic-link providers as credentials become available. Invite/pre-create the actual officers in
Supabase Auth, then insert their UUID and exact confirmed email in
`outreach_members`; role is `officer` or `admin`. This is not the legacy `editors`
allowlist. Removing/disabling membership revokes subsequent workspace API access.
Verified signup creates only a member; it does not appoint an officer. Disabled accounts cannot re-enroll.

Allow the actual site origin's `/api/workspace/auth/callback` in Supabase redirect
settings. Local tests need the localhost equivalent. Configure dependable Auth
email delivery; Resend may serve permitted transactional login emails, **not cold
partnership outreach**. Domain ownership does not itself create a mailbox.

Frontend Worker server-only configuration:

- Existing Supabase URL, anon key, service-role key and canonical site URL.
- `NUXT_WORKSPACE_SESSION_SECRET`: a separately generated secret of at least
  32 characters; never reuse the PIN secret.
- `NUXT_WORKSPACE_MAILBOX_ENCRYPTION_KEY`: a separately generated encryption
  secret of at least 32 characters. Changing it requires mailbox reconnection.
- Google/Microsoft OAuth client IDs/secrets and Microsoft tenant (`common` for
  personal and organization accounts, subject to tenant policy).

Use Wrangler secret provisioning, not public runtime config, Git or shell history.
Production must use HTTPS. Login sessions and mailbox authorization are distinct.

## Connect mail

Register provider web application callbacks at
`/api/workspace/mailboxes/callback`. Request Gmail sending permission only, or
Microsoft delegated `Mail.Send`/offline access with identity scopes. Provider app
consent/verification, Google test-user restrictions and school/organization tenant
policy may prevent connection; the UI must show reconnection/setup errors rather
than pretending email is configured.

Only the connected account owner can send. A future society address must be a
real authorized mailbox; no arbitrary `From` alias or Resend cold-outreach path.
Tokens remain encrypted on the server. Disconnecting removes local authorization;
officers should also revoke the application at the provider when appropriate.

Approval binds message revision, recipient and mailbox identity. Edits invalidate
approval. Gmail success and Outlook HTTP 202 are provider acceptance, not delivery.
Network failure after submission is uncertain: check Sent mail and reconcile,
**never blindly retry**. No automatic follow-ups, inbox scraping or tracking pixels.

## Bounded research

Open **Outreach → Research runs** for schedule controls, reviewed discovery sources,
and recent job activity. Research runs is a collapsible panel within Outreach;
older `?section=research` links open that panel. Officers can queue runs and view
activity. Only admins can change limits/Gemini settings, pause/resume scheduling,
review sources, or retry failed stages. Ordinary members do not receive these
controls. Expanding the panel loads current settings; actions synchronize in the
background without leaving the candidate workspace.

Deploy independently using `npm run deploy:outreach`, after verifying credentials
and the worker dry run. The opportunity-import Worker is unchanged. Supply the
outreach Worker's Supabase URL/service key; these never reach the browser.

The deployed worker is enabled; the database pause switch starts paused. Cron prioritizes coverage gaps and source freshness across
reviewed institutional directories on Monday/Wednesday/Friday at 16:00 UTC; a
15-minute drain resumes durable queued research. Default review capacity is 45,
new admissions at most 15/week, batch limit 5, concurrent leases 2, retries 3.
Import the reviewed starter candidates from the workspace first. This also
installs the reviewed source registry, including the UTA CSE discovery directory;
repeat imports preserve disabled sources and reviewed excerpts. Target-specific
research selects its exact reviewed source before a directory host permission.
The database's admission/lease procedures serialize capacity checks. Suppression
survives rediscovery. Worker-owned acquisition snapshots never replace officer
dossiers or ratings. Each external stage rechecks the live lease and permissions;
Workflow step retries are disabled, with bounded database retries instead.

Target acquisition is limited to reviewed exact HTTPS institutional and faculty/lab hosts.
Member artifacts use a separate bounded GitHub/DOI/GitHub Pages/institutional-PDF adapter policy. No redirects, arbitrary URL
fetch endpoint, private-network hosts or general-purpose crawler. HTML is capped
at 500 KiB, extracted text at 20,000 characters. Research acquires a target page
and at most two relevant first-party linked pages, with public contact suggestions
kept separate from verified recipients. It is evidence acquisition, not automatic
verification of comprehensive backgrounds, mentoring availability or eligibility.
Source registration remains code-reviewed in this pilot. Logs must not contain tokens or
model request bodies. Add institutions only after access/terms/source review.

Gemini is optional. To activate, explicitly set `OUTREACH_ENABLED=true`,
`GEMINI_TERMS_CONFIRMED=true`, `GEMINI_FREE_PROJECT_CONFIRMED=true`, configure
`GEMINI_API_KEY`, and enable AI/terms in workspace settings. The owner has confirmed
permitted use and configured free project `matrix-fellows` (number `175603254773`).
No paid fallback is implemented.
The current owner-specified adult dashboard supersedes earlier member-draft and
student-audience release assumptions. The authoritative Worker configuration uses
`GEMINI_PROVIDER_MODE=unpaid_public`, terms/free-project confirmations, database
`paused`/`ai_enabled`/`terms_confirmed`, and snapshot-bound reviewed excerpts. The
unwired `GEMINI_AUDIENCE_AUTHORIZED` gate is superseded; there is no parallel age
permission or age-verification system. This operating scope does not certify every
historical account's age or override Google's terms. Authorized-context mode has an
adapter boundary but is not silently enabled or billed. Recheck provider terms at
activation. No paid fallback is implemented.
Free quota is availability, not a service-level guarantee. Quota exhaustion
disables model execution; it does not rotate keys or enable billing.

Only officer-reviewed `ai_excerpt` text with `ai_reviewed=true` can enter a model
request, and it must match the acquired source. Review is mandatory: lexical
filters alone cannot prove text contains no personal information. Never submit
private member/officer profiles, researcher contact data, confidential projects,
parent records, student IDs or raw pages to unpaid AI. Profiles tailor proposals
locally. Google Search grounded output is not mined into the candidate database.

Current enabled-source coverage and bounds are recorded in the
[activation brief](research-outreach-activation.md). Source review and job lists are
paginated, with snapshot detail by ID and fenced stage retry. Daily conservative
resource reservations cap source requests/bytes and model requests/tokens; interrupted
calls retain unknown-cost charges. Admission defaults remain 45 review targets,
15/week, five/batch, two leases and three database-governed attempts. Search is not
configured and does not silently use Google grounding as a candidate database.

## Verification and launch

Run typecheck, unit/SQL authorization tests, production build, workspace browser
checks, and `wrangler deploy --dry-run --config workers/outreach.wrangler.jsonc`.
Then verify real email-confirmed sign-in, provider consent, encrypted connection,
controlled sending to a consenting test address, quota pause, cron and workflow
completion in the configured preview. Unit mocks are not successful delivery
evidence. Keep AI/sending inactive until those live setup checks pass.

## Deployed setup checkpoint · October 3, 2026

Supabase project `xlnjzzbsxzadrvbrggau`: migrations 023, 024, and 028 applied.
All 18 outreach tables have RLS; authenticated users cannot execute enrollment,
assignment-access, approval, or send-claim service RPCs directly. Public signup
is enabled with email confirmation retained. Callback allowlist includes
`https://matrixfellows.com/api/workspace/auth/callback`; legacy admin redirect retained.
Only existing verified named editor `lunarzdev@outlook.com` was bootstrapped
as dashboard admin. Other accounts receive no elevated role automatically.

Frontend session/encryption secrets provisioned without rotating existing secrets.
Research Worker `matrix-fellows-outreach` and Workflow `matrix-outreach-research`
deployed with Supabase/Gemini credentials and bounded cron schedules. Gemini
model metadata returned HTTP 200; this is not a generation/quota/billing test.
The supplied Google project identity is owner-reported, not independently
established by that key check.

Nine starter candidates and ten reviewed source routes installed. Repeat setup:
`npx tsx scripts/setup-partnership-workspace.mts` (authenticated Supabase CLI;
preserves existing candidates and source reviews). The dashboard's import action
uses the same reviewed registry.

Controlled live Workflow `setup-e1609b6b-4111-45d0-a7aa-49068b5862f1`
completed UTA SMILE acquisition with three first-party pages and persisted its
snapshot without a model request. Research returned to paused; a live paused
claim returned zero jobs. Terms confirmation is stored; AI remains disabled
pending explicitly screened public excerpts. No outreach emails were sent.

Remaining operator setup: Google/Microsoft OAuth client credentials and provider
callback/consent registration, reliable Auth SMTP, real sign-in and consenting
mailbox test. Default Supabase mail delivery may restrict recipients without
custom SMTP. Neither OAuth login nor mailbox sending is claimed operational.

Record declines/opt-outs immediately. Coordinate outreach per laboratory, not
just email address. Recheck affiliation/contact evidence before approval. Propose
small useful tasks; never barter labor for guaranteed authorship or bypass minor
safety, access, licensing or institutional application requirements.

## Primary constraints and strategy sources

- [Gemini API terms](https://ai.google.dev/gemini-api/terms): age/use, unpaid-data
  handling and Search-grounding restrictions; reviewed October 3, 2026.
- [Resend acceptable use](https://resend.com/legal/acceptable-use): explicitly
  prohibits cold outreach; reviewed October 3, 2026.
- [Caltech mentor guidance](https://sfp.caltech.edu/undergraduate-research/getting-started/finding_a_mentor): targeted fit and introductions, not mass mail.
- [Mentoring retrospective](https://www.cs.cornell.edu/~asampson/blog/undergrads.html): scoped, non-critical-path projects; anecdotal evidence, not response probabilities.
- [ICMJE contribution guidance](https://www.icmje.org/recommendations/browse/roles-and-responsibilities/defining-the-role-of-authors-and-contributors.html): contribution is not guaranteed authorship.
- [UTSW school visits](https://www.utsouthwestern.edu/education/nondegree-programs/stars/programs/student-tours.html): approved school-facing route, not unrestricted lab access.
