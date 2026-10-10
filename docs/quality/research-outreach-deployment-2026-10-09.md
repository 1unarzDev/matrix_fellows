# Research outreach production rollout

October 9, 2026, America/Chicago. The owner authorized deployment and admin promotion for exactly three named confirmed accounts after the implementation report. Runtime source: `a2dd7b3` on `codex/research-outreach`. A detached clean release worktree excluded unrelated catalog/import/auth-email edits.

## Applied and deployed

The live ledger matched 001–028 and both October 8 migrations. Eleven reviewed research migrations applied in one transaction with a ledger assertion, research-pause assertion, empty-message reconciliation guard and exact ledger inserts. The ledger reached 41 entries. A subsequent additive `20261010033444_research_immutable_search_path.sql` pins the trigger-only immutable-evidence helper's search path and brings the ledger to 42; its full-chain focused persistence/enrichment tests passed fifteen checks with one optional browser check skipped. No application or Worker source changed for this database hardening.

Application version: `507cd140-ea7e-425c-8feb-0b71d7520db5` on `https://matrixfellows.com`. Outreach Worker version: `5948632a-c2d5-468f-a648-c530cc226638`, with the existing Monday/Wednesday/Friday discovery and fifteen-minute drain schedules and Workflow binding. Both deployment commands completed successfully. The release build and dependency install completed in the clean worktree.

All three requested accounts were verified by exact confirmed Auth email and existing enabled membership. One was already admin; exactly two role changes were made with `admin_provisioned` audit records. The remaining account's member role was untouched. This is a targeted provisioning operation, not a new self-promotion path.

## Post-rollout verification

Dashboard and workspace return HTTP 200 with a normal browser user agent. A headless browser reached the sign-in screen without page errors. Anonymous workspace/research/relationship/profile requests return 401. Post-migration SQL confirms owner-private officer proposal policy, revision visibility through that policy, RLS on every new research/relationship table, and no anonymous bootstrap execution. A transaction using the remaining member's authenticated database identity confirms officer=false and no approval/bootstrap RPC execution; a requested admin's identity confirms officer=true. These checks do not impersonate an Auth login or establish a real authenticated browser session.

Before/after profiles, proposals, revisions, outbox and suppressions remain zero. Existing IDs and membership identities are preserved. Research remains paused and AI disabled, as before rollout. OAuth client-secret names remain absent on the application. This deployment does not claim live model generation, scheduled source persistence, OAuth consent, provider submission or delivery. No real email was submitted and inbox reading remains disconnected.

The Supabase security advisor identified one new mutable search-path warning, repaired by the follow-up migration. Older findings remain: the intentionally filtered `outreach_ready_targets` security-definer view, existing security-definer helper execution findings, and disabled leaked-password protection. The ready-target view's member/assignment predicates were retained; changing legacy auth/provider policy was outside this targeted rollout.

## Recovery and local evidence

Pre-rollout public schema/data and exact migration ledger were exported to a mode-0700 directory `/home/lunarz/msers-release-backups/20261009-outreach`, with mode-0600 files. This is a logical public-schema backup, not a complete Auth/storage/PITR backup. The physical-backup inventory returned no listed backups and PITR disabled. The data dump warns of circular foreign keys; restoration into a compatible schema requires an authorized maintenance session with controlled trigger/constraint handling. No automatic destructive restore was attempted.

Prior application version was `98c29145-eed6-4d1a-a33e-6de81c6c7611`; prior outreach Worker version was `77711be2-7adf-4c18-b3d5-4c2f3c582c88`. Keep research paused during any recovery; preserve additive evidence/history and officer restrictions rather than reactivating an incompatible older member-drafting binary. Prefer a forward repair where schema compatibility is uncertain.

Local evidence: `/tmp/msers-deploy-app.log`, `/tmp/msers-deploy-worker.log`, `/tmp/msers-deploy-migrations.log`, `/tmp/msers-deploy-db-verification.json`, `/tmp/msers-deploy-hardening-tests.log`, `/tmp/msers-deploy-advisors-final.json`, and `/tmp/msers-deployed-dashboard.png`. Backup files remain outside the repository and contain private database data.

The [activation brief](../operations/research-outreach-activation.md) remains the configuration/live-validation guide. This deployment supersedes its earlier statement that rollout authorization and unapplied schema were pending. Gemini activation and provider-specific mailbox validation remain separate work; real email still requires approval of its exact recipient/sender/subject/body revision.
