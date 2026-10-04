# Partnership workspace

The private `/dashboard` (`/workspace` remains an alias) supports verified named
members, separate from the shared-PIN content editor. Discovery and research
remain officer/admin-only. Public membership responses are not an outreach profile source.
Research discovers candidates and creates evidence/proposal suggestions; its
code has no sending path. Every message requires its owner's exact approval and
send confirmation. Members may send personal inquiries only to ready,
unsuppressed contacts explicitly assigned by an officer. Assignment is rechecked
at creation, editing, approval, and transactional send claim. Revocation blocks
approved but unclaimed sends, not messages already submitted to a provider.
The pilot Worker uses a privileged Supabase service credential: it is not an
isolated database principal. Protect it accordingly; a scoped research broker is
required before allowing untrusted executable agent code.

## Configure identity and storage

Apply the additive outreach migrations in filename order. Use named Supabase
Auth accounts, enable email-confirmed member registration, and configure Google, Azure/Microsoft
and email magic-link providers as credentials become available. Invite/pre-create the actual officers in
Supabase Auth, then insert their UUID and exact confirmed email in
`outreach_members`; role is `officer` or `admin`. This is not the legacy `editors`
allowlist. Removing/disabling membership revokes subsequent workspace API access.
Verified signup creates only a member; it does not approve club participation,
parental permission, or officer access. Disabled accounts cannot re-enroll.

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

Deploy independently using `npm run deploy:outreach`, after verifying credentials
and the worker dry run. The opportunity-import Worker is unchanged. Supply the
outreach Worker's Supabase URL/service key; these never reach the browser.

The deployed worker is enabled; the database pause switch starts paused. Cron schedules one rotated
reviewed institutional directory on Monday/Wednesday/Friday at 16:00 UTC; a
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

Source acquisition is limited to reviewed exact HTTPS hosts inside UTA, UTD,
UTSW and specific first-party faculty/lab sites. No redirects, arbitrary URL
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
Free quota is availability, not a service-level guarantee. Quota exhaustion
disables model execution; it does not rotate keys or enable billing.

Only officer-reviewed `ai_excerpt` text with `ai_reviewed=true` can enter a model
request, and it must match the acquired source. Review is mandatory: lexical
filters alone cannot prove text contains no personal information. Never submit
private officer/student profiles, researcher contact data, confidential projects,
parent records, student IDs or raw pages to unpaid AI. Profiles tailor proposals
locally. Google Search grounded output is not mined into the candidate database.

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
