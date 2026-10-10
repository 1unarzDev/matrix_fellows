# Research outreach implementation

Started October 9, 2026. Base: `bc233597e7ec0a1cb075d2211fa02f559105d0b7`.
Branch: `codex/research-outreach`. Existing uncommitted catalog/import/auth-email work is preserved and excluded from feature commits. Migrations 025–027 are present as untracked opportunity work; the remote ledger was later queried read-only and includes those entries; no remote migrations were changed.

The dashboard is for adults. Existing member/officer/admin roles remain authoritative; drafts, AI outreach, approval, send and new mailbox consent require live officer/admin checks. Members retain private profiles, research links and planning. No age-verification subsystem. Public historical school affiliations and opportunity eligibility remain factual.

## Shared contracts and owners

- Profiles agent (`codex/research-profiles`): additive profiles migration, new research types, authenticated bootstrap, artifact evidence and dedicated profile component. Nullable `outreach_profiles.subject_user_id` is never guessed for legacy profiles. `outreach_members.primary_profile_id` identifies the stable self-profile. Bootstrap derives identity from verified server authentication and only narrowly imports join fields. Shareable projections expose accepted, consenting research context, never raw private join records.
- Research agent (`codex/research-execution`): authoritative providers, bounded persistent stages/budgets, additional source coverage, context compiler and contribution plan/writer utilities. Unpaid inputs contain only explicitly reviewed nonpersonal technical excerpts. Identity/signatures/private member details are assembled locally. Research analysis must reach the selected plan and writer.
- Relationships agent (`codex/research-relationships`): officer-only API/RLS boundary, owner-private drafts, explicit owner handoff, relationships/manual outcomes/follow-ups, transactional approval/send protection. `created_by` is immutable authorship; current owner and relationship owner are separate; mailbox ownership never transfers.
- Lead: aggregate/auth/storage contracts, dashboard navigation/integration, current documentation, review and full verification. Agents use separate worktrees; all schema fragments are coordinated with profile owner and ordered additive migrations.

Claims separate origin, support, adoption and sharing. Snapshots and profile projections are immutable. Proposals freeze consumed evidence IDs/versions; background evidence never replaces editor text. Withdrawals prevent future applicable use and preserve sent/uncertain records. Manual follow-up tasks reuse dashboard tasks. Reply synchronization remains disconnected.

## Verification and release boundaries

Baseline unit tests running against the actual dirty checkout, using two workers. No production deployment, migration push, billing change, secret rotation, role provisioning or email submission authorized. Final activation brief will name reviewed migration order, invariant checks, configuration, callbacks and remaining credential-specific checks. Historical quality reports remain historical.

## Integration progress

- Checkout reconciled; no applicable AGENTS.md found in workspace or parent instructions.
- Three clean feature worktrees created from recorded base; integration branch created without resetting user changes.
- Supabase/Postgres skills loaded; current changelog and RLS documentation retrieved.
- Integrated identity/profile slice: verified bootstrap, primary profile, narrow join prefill, bounded artifact acquisition, source-backed candidate facts, explicit contribution attribution and corrections.
- Integrated research slice: authoritative adapters, independent fenced stages, immutable source reviews, conservative resource reservations, coverage/freshness prioritization, persistent practical matching and officer review.
- Integrated proposal slice: selected shared member/project/technical option, frozen match and consumed context, truthful officer representation, local/private revisions and sentence supports. Shared source analysis reaches the plan/writer.
- Integrated relationship/send slice: owner-private officer drafts, preserved author, handoff with fresh mailbox approval, stable aliases, manual events/tasks, separately approved follow-ups and narrow demotion reconciliation. Independent review reproduced and repaired consumed-claim and alias duplicate failures.
- Full UI/handler/PostgreSQL journey and final release gates recorded in the [completion report](../quality/research-outreach-completion.md). Live generation, OAuth and delivery remain separate activation checks.
