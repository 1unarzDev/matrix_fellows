# Outreach research controls — October 11, 2026

Research runs now lives inside Outreach as an accessible, animated disclosure above
candidate review. The separate navigation entry is removed from desktop, mobile,
and the command menu. Existing officer/admin `?section=research` links open Outreach
with the controls expanded. Ordinary members fall back to Today without requesting
research settings.

The disclosure uses the original shared workspace glass surface. Schedule controls,
source review, and job history have transparent interiors with restrained separators;
admin limits/Gemini settings and the source/job inventories expand independently.
An independent agent reviewed desktop/mobile captures and identified a divider too
close to the schedule buttons; the final version adds 20px of separation.

All prior research controls remain available, including source-ID filtering,
pagination, immutable snapshot detail/review, and failed-stage retries. Initial
legacy-link loading and disclosure-open loading now work after the account role
resolves. A request version prevents a delayed source page from replacing a newer
page; retry refresh waits for the mutation to complete. Scheduling, provider gates,
API permissions, approval, and sending mechanics are unchanged.

## Verification

- Unit suite: 70 files, 399 passed, 1 skipped.
- Application/Worker typecheck, production build, documentation links, diff whitespace,
  and application Wrangler packaging dry run passed.
- Final production-preview checks: 16 passed across desktop/mobile, including draft
  autosave, conflict preservation, and outbox motion. An existing mobile autosave
  test initially timed out on hidden desktop navigation; it now uses the custom
  mobile dropdown, and its focused rerun passed.
- New production-preview browser checks cover admin queue/pause/resume/settings,
  reviewed-source hash submission, source pagination, stage retry, officer restrictions,
  ordinary-member exclusion, legacy links, keyboard/reduced motion, and late pagination
  responses. Desktop/mobile screenshots were inspected; videos are retained.
- Preview tests use synthetic API fixtures against the built application. These prove
  UI integration, not new live database or Gemini/provider execution. No email was submitted.

Captures: `/tmp/matrix-dashboard-evidence/research-{controls,outreach,collapsed}-{desktop,mobile}.png`.
Videos and browser traces are under the ignored `test-results/research-integration-final-desktop`
and `test-results/research-integration-final-mobile` directories. The corrected mobile
autosave recording is under `test-results/research-mobile-autosave-final`.

## Rollout

No migration, credential change, research-worker rollout, or provider activation is
needed. Deploy the built application to Worker `matrix-fellows` at `matrixfellows.com`
using `wrangler.jsonc` with `--keep-vars`. The previous application version is
`802bce22-b313-4fa6-b353-a51aa065c891`; restoring it restores the standalone Research
runs UI without changing research jobs, source evidence, or database settings.
