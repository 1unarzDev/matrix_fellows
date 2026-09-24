# Meeting schedule and archive

Matrix Fellows meetings are published through one shared schedule used by the
homepage calendar and the SSR `/meetings` archive. The homepage remains the
cinematic introduction; the archive provides stable, crawlable meeting details
without initializing the Three.js world.

## Data ownership

The next confirmed gathering remains part of editable public content at
`SiteContent.meeting`. `buildMeetingSchedule()` in `shared/data/meetings.ts`
adapts that record to a `MeetingEvent` and combines it with reviewed projected
meetings. This preserves the existing editor and fallback contract while adding
stable IDs, summaries, status, and resource links.

Meeting states are deliberately narrow:

- `confirmed` means the club has confirmed the date and location information;
- `tentative` means the session is projected and may move;
- `past` is a display state calculated from the meeting date in its recorded
  timezone. It does not rewrite the source record.

Do not label a projected meeting confirmed merely because it appears on the
calendar. Update the source state only after club confirmation. Keep resource
links official where possible and review dates before describing deadlines in
an agenda.

## Public behavior

- `/meetings` is canonical, included in the sitemap, prerendered, and guarded by
  the same unknown-route 404 middleware as the other resource routes.
- Calendar month changes and detail transitions use transform/opacity motion;
  reduced-motion preferences remove those transitions.
- Meeting dates are ordinary buttons. Their modal traps focus, returns focus to
  the invoking date, makes the page background inert, closes with Escape, and
  restores page scrolling.
- Confirmed, projected, and past meetings use distinct labels and marker shapes;
  color is supplementary rather than the sole state indicator.
- The homepage keeps the calendar and detail panel side by side. At phone widths
  this becomes a contained horizontal comparison rail with proximity snapping,
  rather than widening the document.

## Updating the schedule

1. Update the editable confirmed meeting through the existing owner workflow,
   or revise the fallback in `shared/data/defaults.ts` when the fallback itself
   must change.
2. Add or revise projected entries in `shared/data/meetings.ts`, preserving a
   stable ID after publication.
3. Include a concise summary, actionable agenda, meeting timezone, and reviewed
   resources. Use `tentative` until the date is confirmed.
4. Run the meeting unit/browser coverage, typecheck, build, and docs link check.
5. Verify the rendered homepage rail and `/meetings` at 320, 360, 390, 430, and
   desktop widths. Local emulation is not physical-device verification.

No Supabase migration or opportunity-Worker deployment is required for changes
to the projected schedule in this implementation.
