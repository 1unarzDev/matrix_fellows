# Membership form & Google Sheets

## Architecture

The homepage's lazy dialog and the dedicated, server-rendered `/join` route use
the same `JoinForm.vue` flow, draft state, field controls and validation. The
route adds a lightweight CSS atmosphere but does not initialize the cinematic
renderer; the dialog remains lazy so the route does not add code to homepage
startup. Both presentations submit to `POST /api/join`. The server validates the
payload, checks the site origin, limits request bodies to 8 KB, applies a honeypot and a
database-backed IP rate limit, then stores the response in Supabase. Raw IPs are
never stored; short-lived HMAC keys expire from the rate-limit table on subsequent
submissions. The service key stays server-side. This is basic abuse protection,
not a CAPTCHA; add Turnstile if targeted spam becomes a problem.

The `/join` page has its own canonical metadata and a 1200 × 630 social image at
`public/og/join.png`. Regenerate the image from the running route with
`node scripts/capture-join-og.mjs`, then inspect the result rather than assuming
that correct dimensions imply a legible social crop.

Responses are unique by normalized email and request ID. Retrying after an
interrupted response cannot create duplicates. Duplicate emails get the same
success response, not a public membership lookup. The first response is preserved.

Only accounts in `public.editors` can read responses or analytics. The Responses
tab provides 20-row pages, summary counts, and permanent deletion with confirmation.
The sponsor CSV omits personal information and suppresses group counts below five.
Totals are response counts, not independently verified membership or attendance.

## Server setup

1. Apply migrations `004_join_responses.sql`, `005_lean_join_form.sql`,
   `006_shared_network_join_limit.sql`, `007_join_feedback.sql`, and
   `016_join_parent_permission.sql` to the Matrix Fellows project
   (`xlnjzzbsxzadrvbrggau`). Do not apply them to other projects. Migration 016
   appends fields and preserves existing responses with explicit legacy defaults.
2. Set these **server secrets**, not public runtime settings:
   - `NUXT_SUPABASE_SERVICE_ROLE_KEY`: existing project service-role key.
   - `NUXT_SHEETS_SYNC_TOKEN`: at least 32 cryptographically random bytes, hex encoded.
3. Keep `NUXT_PUBLIC_SITE_URL=https://matrixfellows.com` in production; this is the
   allowed browser origin. The form fails closed if storage is not configured.

## Connect the provided sheet (one-time owner authorization)

Destination: https://docs.google.com/spreadsheets/d/1zOpBa4Z3RACdbAthXltReQa8bdWU2yRPHZiqqQlWkk4/edit

If already installed, replace the Apps Script code with the latest `Code.gs`.
It appends feedback, student ID, other-interest, parent/guardian contact, and
permission columns to the original layout. It fills missing feedback cells without
overwriting existing organizer edits. The existing token and scheduled trigger can
stay unchanged.

1. Set Google Drive sharing to **Restricted**. Grant access only to organizers who
   need raw responses. An editing link is not service authentication.
2. Open **Extensions → Apps Script**. Paste `integrations/google-sheets/Code.gs`.
3. Under **Project Settings → Script properties**, add `MATRIX_SYNC_TOKEN` with the
   same value as the Worker secret `NUXT_SHEETS_SYNC_TOKEN`. Never put it in a cell,
   source control, a query string, or a public message. If generated during setup,
   the ignored local `.env.join` file contains the token for this step.
4. Run `installMatrixSync` once and authorize access using your organizer account.
   It creates the dedicated **Matrix Fellows responses** tab and one 15-minute
   trigger. Existing tabs are not overwritten. Re-running installation replaces
   only this script's own sync trigger.
5. Check **Executions** for success and Script Properties for `MATRIX_LAST_SUCCESS`.
   Submit a real, consented test response via the site, run `syncMatrixResponses`,
   and confirm exactly one row. Run it again to verify there is no duplicate.
   Remove the test from both the admin dashboard and sheet afterward if desired.

No Google password, Google OAuth refresh token, or Supabase service key is placed
in Apps Script. The scoped sync token permits reading only membership responses.
Anyone who can edit the script can access that token and the responses: restrict
sheet editors accordingly. Rotate the Worker token and Script Property together
if access changes. Google trigger failures are visible in Apps Script Executions
and Google may email the installing account. Database capture keeps working if
Sheets is disconnected.

The sync rechecks all IDs and appends only missing rows, with a lock preventing
overlapping runs. This handles retries and out-of-order database commits. It is
intended for club-scale datasets; it raises an actionable error rather than silently
truncating if a scan exceeds four minutes. It does not overwrite manually edited
rows or propagate deletions. Do not remove or rename the ID/header columns.

## Privacy and sponsor sharing

The form discloses database/organizer-sheet storage and requires contact consent.
It collects the student's full name, student email, grade, interests, experience,
research goals, student ID, parent/guardian full name and email, and a permission
confirmation. The permission field records that the **student confirmed** their
parent or guardian gave permission; it is not an electronic parent signature or
independent identity verification. The optional feedback field is limited to 1,000
characters.

Student ID, parent/guardian contact, feedback, and all individual answers are private
organizer data. They are excluded from sponsor exports. Share the admin's **sponsor
summary CSV**, never the raw organizer sheet. No response is automatically sent to
a sponsor. Review even aggregate summaries before external sharing.

For removal requests, delete the response in admin **and** its row in Google
Sheets, and remove any downloaded copies. Deleting a sheet row alone causes it
to return during the next sync while the database record still exists. Review
retention at least each school year, with particular attention to student IDs and
parent/guardian contact details, and remove data no longer needed. Google
version history and backups have separate retention controls; disclose this when
responding to removal requests.
