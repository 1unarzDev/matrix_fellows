# Dashboard surfaces — October 11, 2026

Inspected clean base: `46cdf154de772dcb7bcd8b5f894a386cd9df5d15`.

The Opportunities mode controls and search now share one glass dock, separated by a fine rule. Discover/My plan uses an outlined active state; plan views use an underline. Search and inner timeline/calendar/board cards are transparent. The board has no surrounding second panel and no repeated “Stage” headings; its lane accents retain distinct colors.

Timeline date markers now align with the spine. Tasks use gold circles and opportunity milestones use lavender diamonds. The same opportunity saved and pursued renders its reviewed dates once in calendar and timeline. Identical duplicate milestones are removed conservatively; distinct wording, fact identity, times, and conflicts remain separate. Date-only wording avoids repeating the date already shown in the rail, while precise cutoff/timezone wording remains intact.

The added grain, pale fills, and list-container treatment from the recent outreach surface changes have been removed. Candidate cards use their earlier styling and the original shared workspace panels remain in place. Existing draft labeling and authorization behavior are preserved.

Outbox expansion previously used native `details`, which jumped directly to its final height. It now uses an accessible button and an animated grid disclosure, with reversible expansion, restrained hover feedback, keyboard operation, inert collapsed content, and reduced-motion support. Mail authorization and reconciliation behavior are unchanged.

## Verification

- Unit suite: 70 files, 399 passed, 1 skipped.
- Application/Worker typecheck, production build, documentation links, and diff whitespace checks passed.
- Worker packaging dry run passed against `wrangler.jsonc`.
- Desktop and mobile browser checks exercised discovery pagination, save → reviewed plan → task editing → calendar/timeline/board → reload, milestone deduplication/spine alignment, and outbox hover/expansion/reversal/keyboard/reduced motion.
- Tests used the actual production build on local Wrangler with synthetic API fixtures. They establish UI behavior, not new live database or mail-provider verification. No email was submitted.
- Independent visual review caught and corrected overlapping mobile search padding and retained `min-width: 0` for candidate lists after the styling revert. Final screenshots were inspected at desktop and mobile widths.

Preview command: `npx wrangler dev --local --config wrangler.jsonc --port 3191 --inspector-port 9391 --host localhost --local-upstream localhost --persist-to /tmp/matrix-preview-state`. The explicit localhost settings prevent the production-domain HTTPS redirect from interfering with local preview requests.

Captures: `/tmp/matrix-dashboard-evidence/opportunities-{discover,timeline,board}-final-{desktop,mobile}.png` and `/tmp/matrix-dashboard-evidence/outbox-{desktop,mobile}.png`. Recordings: `test-results/final-surfaces`, `test-results/final-surfaces-mobile`, and `test-results/final-surfaces-desktop` (ignored local artifacts).

## Rollout

This release changes UI and display composition only. No migration, secret change, mailbox consent, or research-provider activation is required. Deploy the built application using `wrangler.jsonc` with `--keep-vars` to preserve remotely managed configuration. The preceding application version was `04dca2d7-bc92-4d7f-9615-29e045d447cf`; application rollback does not roll back database data.
