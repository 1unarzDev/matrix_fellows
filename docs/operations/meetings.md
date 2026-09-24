# Meeting schedule and administration

Matrix Fellows meetings are published through `public.meetings`, one shared schedule
used by the homepage hero, homepage calendar, and SSR `/meetings` archive. The checked-in
schedule and `SiteContent.meeting` remain a read-only outage fallback; they are not
overwritten by the meeting editor.

## Setup and security

1. Apply `supabase/migrations/019_meeting_management.sql` to the Matrix Fellows project
   (`xlnjzzbsxzadrvbrggau`). The migration is additive and idempotently backfills the two
   existing gatherings.
   Apply `020_calendar_opportunity_selections.sql` as well. It adds the independent,
   idempotently seeded inclusion registry for opportunity dates; it does not copy or own dates.
2. Configure these frontend Worker secrets:
   - `NUXT_MEETING_ADMIN_PIN`: the eight-digit organizer PIN; never place it in client code.
   - `NUXT_MEETING_ADMIN_SESSION_SECRET`: at least 32 cryptographically random bytes.
3. Retain the existing `NUXT_SUPABASE_SERVICE_ROLE_KEY`. It is used only inside server
   endpoints and must never be exposed as public runtime configuration.

The PIN unlocks the complete organizer editor, including meeting CRUD, site content,
opportunity review, source controls, and private membership responses. A successful unlock creates an HttpOnly,
SameSite=Strict, two-hour signed session. Five failed attempts in 15 minutes create a
15-minute server-side lockout keyed by a one-way HMAC of the network address.

Public visitors can select only published meetings. The organizer endpoints use the server-held
service role only after validating the signed session. All mutation endpoints require the
configured site origin, bounded typed input, and a valid organizer session. Locking the editor
clears the cookie and returns keyboard focus to the PIN input.

## Organizer workflow

Open **Member admin** and enter the meeting PIN. The meeting studio supports:

- scheduling a meeting with a stable generated ID;
- changing its date, time label, confirmed/pending state, location, timezone, summary,
  meeting points, resource links, and optional RSVP URL;
- hiding a row from the public schedule without deleting it;
- editing past or future entries; and
- deletion with an explicit inline confirmation.

The homepage chooses the earliest published meeting whose date has not passed in the meeting's
recorded timezone. If every meeting is in the past, it shows the most recent past gathering
without calling it upcoming. Confirmed meetings use a circular status signal; tentative meetings
use a diamond and the text `Projected · not confirmed`.

The **Calendar opportunities** editor view controls which published catalog routes appear and
whether to include deadline milestones, event/presentation/program milestones, or both. Routes
without a verified current-cycle milestone remain selectable and visibly say **Awaiting official
date**, but create no calendar marker. This is intentional for Davidson Fellows, Texas JSHS, RSI,
MITES, Clark Scholars, and other cycles that have not announced exact current dates.

Do not type opportunity dates into the meeting editor or selection table. The scheduled
opportunity Worker owns `Opportunity.milestones`, including source evidence, date precision,
timezone wording, conflict/tentative flags, and the two-observation confirmation lifecycle. When
the monitor confirms a changed date, the calendar projection moves automatically while the
organizer's inclusion settings survive. Correct source facts through the opportunity review
workflow; use the calendar editor only for inclusion.

## Public behavior and fallback

- `/meetings` remains canonical, dynamically SSR-rendered, and crawlable without client JavaScript.
  It is intentionally not prerendered because monitored opportunity dates and organizer selections
  must update independently of a frontend deployment.
- Calendar and detail transitions respect reduced-motion preferences.
- Meeting-date dialogs trap and restore focus, make the background inert, and close with Escape.
- Meetings use the strongest gold signal. Submission deadlines use violet diamonds; actual
  competition, presentation, and program dates use cool-blue points. Tentative source dates keep
  the same semantic shape with reduced/dashed treatment.
- Multiple items on one day share one accessible dialog with a compact item switcher. Opportunity
  panels show requirements, official evidence, original timezone/precision, last verification,
  catalog details, and a submission portal only when one is explicitly registered.
- Database failures preserve the last checked-in schedule rather than returning an empty calendar.
- The 30-second public-content cache means a saved meeting may take roughly 30 seconds to appear.

After a schema or UI change, run meeting unit/database tests, typecheck, build, docs checks, and
browser coverage. Verify narrow layouts at 320, 360, 390, and 430 CSS pixels; emulation is not a
claim of physical-device performance.
