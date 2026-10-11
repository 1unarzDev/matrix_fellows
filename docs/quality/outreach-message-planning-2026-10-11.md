# Outreach message planning audit — October 11, 2026

The candidate dossier’s **Plan the first message** control now uses an independent
animated disclosure rather than native `details`. The region interpolates its height,
opacity, and content position, preserves the form when a choice changes, supports
keyboard and reduced-motion behavior, and reveals the suggested plan in a second
smooth section.

The flow now names the representation explicitly:

1. **Matrix Fellows** — start a society-level conversation from reviewed organization
   context; the connected officer mailbox sends it.
2. **A member** — write on a named member’s behalf using only their shareable profile;
   the officer remains the sender. Optional project context is visibly member-scoped.
3. Build a **Suggested approach** from selected target, member/project, evidence-backed
   angle, and saved participation preferences.
4. Review the first ask, possible contribution, source quotation, access caveats,
   unresolved checks, and known prior outreach before creating an editable draft.

Draft creation remains separate from approval and sending. Candidates without a ready
status, verified contact email, or supporting quotation receive a clear next action
instead of a misleading draft button. The former “Personal inquiry,” “Saved match,”
“Connection plan ready,” and draft-tone controls were removed or replaced with wording
that describes the actual officer workflow.

The audit also found and repaired stale-context races. A late match response can no
longer attach target A’s plan to target B. Project loading is tied to the selected member
and scope. A saved match is reusable only when target/profile versions, project, angle,
and saved participation preferences still match; changing any of those requires a
fresh plan. Member-only projects cannot be supplied to society drafts.

## Verification

- Unit suite: 72 files, 406 passed, 1 skipped.
- New unit coverage checks exact match context, changed angle/version, withdrawn
  participation preferences, society context, and hidden member-project rejection.
- New desktop/mobile browser coverage opens the disclosure, selects representation,
  builds a source-backed suggestion, creates an editable draft, captures screenshots,
  and checks no horizontal overflow. Both projects passed.
- Typecheck, production build, documentation links, diff whitespace, and application
  Wrangler dry run passed.
- Screenshots: `/tmp/matrix-dashboard-evidence/message-plan-{desktop,mobile}.png`.
  These use synthetic fixtures and prove UI behavior, not live provider or email delivery.

No migration, provider credential, mailbox consent, or sending behavior changed.

Released at commit `fdde457`, pushed to `origin/main`, as Worker version
`da66a8cc-d39f-4fca-abf1-7de261cd962a`. The production dashboard and published
`workspace.BYp2tgfm.css` asset returned HTTP 200; the asset contains the message-plan
disclosure, choice cards, and result selectors. This smoke check does not imply live
Gemini execution, mailbox consent, or delivery.
