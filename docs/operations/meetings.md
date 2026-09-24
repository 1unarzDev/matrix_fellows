# Meeting schedule and administration

Matrix Fellows meetings are published through `public.meetings`, one shared schedule
used by the homepage hero, homepage calendar, and SSR `/meetings` archive. The checked-in
schedule and `SiteContent.meeting` remain a read-only outage fallback; they are not
overwritten by the meeting editor.

## Setup and security

1. Apply `supabase/migrations/019_meeting_management.sql` to the Matrix Fellows project
   (`xlnjzzbsxzadrvbrggau`). The migration is additive and idempotently backfills the two
   existing gatherings.
2. Configure these frontend Worker secrets:
   - `NUXT_MEETING_ADMIN_PIN`: the eight-digit organizer PIN; never place it in client code.
   - `NUXT_MEETING_ADMIN_SESSION_SECRET`: at least 32 cryptographically random bytes.
3. Retain the existing `NUXT_SUPABASE_SERVICE_ROLE_KEY`. It is used only inside server
   endpoints and must never be exposed as public runtime configuration.

The PIN unlocks meeting CRUD only. A successful unlock creates an HttpOnly,
SameSite=Strict, two-hour signed session. Five failed attempts in 15 minutes create a
15-minute server-side lockout keyed by a one-way HMAC of the network address. The broader
content editor and private membership responses still require Supabase owner authentication.

Public visitors can select only published meetings. Existing Supabase editors can also manage
meeting rows under RLS, while the focused PIN endpoints use the server-held service role. All
mutation endpoints require the configured site origin, bounded typed input, and a valid signed
meeting session.

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

## Public behavior and fallback

- `/meetings` remains canonical, prerendered, and crawlable without client JavaScript.
- Calendar and detail transitions respect reduced-motion preferences.
- Meeting-date dialogs trap and restore focus, make the background inert, and close with Escape.
- Database failures preserve the last checked-in schedule rather than returning an empty calendar.
- The 30-second public-content cache means a saved meeting may take roughly 30 seconds to appear.

After a schema or UI change, run meeting unit/database tests, typecheck, build, docs checks, and
browser coverage. Verify narrow layouts at 320, 360, 390, and 430 CSS pixels; emulation is not a
claim of physical-device performance.
