# Research outreach activation

October 9, 2026. Branch `codex/research-outreach`; implementation version is the final commit named in the completion report. Base `bc233597e7ec0a1cb075d2211fa02f559105d0b7`. No production rollout or real message submission is authorized by the implementation brief. See [completion evidence](../quality/research-outreach-completion.md).

## Read-only inventory

The linked migration ledger was inspected read-only: 001–028 (including the separately present 025–027 opportunity migrations) and both October 8 dashboard migrations are already recorded remotely. The new research migrations below are not applied. Database research settings were paused, AI disabled and terms confirmed. Aggregate profiles/proposals/outbox/mailboxes were empty. Session, encryption, Supabase and outreach Gemini secret names were present; frontend Google/Microsoft OAuth client secret names were absent. Secret values were neither requested nor printed. Configuration existence does not prove live generation or successful provider consent.

## Reviewed additive rollout

Keep research paused and prevent new approval/send claims during the application/database transition. Re-read the exact migration ledger immediately before rollout; stop on unexpected entries rather than replaying historical migrations. Apply only these reviewed new files in order:

1. `20261009170000_research_profiles.sql`
2. `20261009172000_officer_relationships.sql`
3. `20261010015431_research_execution.sql`
4. `20261010020426_research_evidence_approval_guard.sql`
5. `20261010020659_research_matches_and_projection_guards.sql`
6. `20261010021349_research_project_enrichment.sql`
7. `20261010023000_research_preferences.sql`
8. `20261010024500_relationship_alias_duplicate_guard.sql`
9. `20261010025500_selected_society_context.sql`
10. `20261010030000_officer_voice_preferences.sql`
11. `20261010031000_provider_retry_metadata.sql`

These retain legacy IDs and introduce canonical self-profile references without guessing unresolved legacy subjects. Unsubmitted legacy approvals are quarantined; submitted/uncertain snapshots remain immutable. Before rollout, take a restorable database backup or verify the project's PITR/backup coverage and restoration procedure; no backup was created during local implementation. Export counts of profiles, revisions, proposals by status, outbox by status, suppressions, jobs and memberships, plus legacy approved/queued/uncertain rows. Reconcile legacy approval ownership and submitted outcomes explicitly.

After application, compare those counts: no historical profile/revision/outbox/suppression should disappear; no legacy subject should be inferred; active primary profiles must reference their own subject; roles must remain unchanged. Confirm owner-private officer proposal/revision policies, denied member mutations and privileged-only RPC execution using the migration-chain regression tests as the invariant specification. Check pending/uncertain outbox rows before unpausing. Deploy the matching application and outreach Worker together after schema checks. Do not replace the separate opportunity importer.

Rollback is a pause and application/Worker rollback to a compatible release, preserving additive data and immutable send outcomes. Do not drop evidence/history tables or revert to member drafting policies. For an incompatible old binary, leave privileged actions and research paused until a forward repair is available. Model disablement and research pause do not erase profiles or manual relationships.

## Configuration

Application server-only names: `NUXT_WORKSPACE_SESSION_SECRET`, `NUXT_WORKSPACE_MAILBOX_ENCRYPTION_KEY`, `NUXT_SUPABASE_SERVICE_ROLE_KEY`, `NUXT_GOOGLE_OAUTH_CLIENT_ID`, `NUXT_GOOGLE_OAUTH_CLIENT_SECRET`, `NUXT_MICROSOFT_OAUTH_CLIENT_ID`, `NUXT_MICROSOFT_OAUTH_CLIENT_SECRET`, `NUXT_MICROSOFT_OAUTH_TENANT` (default `common`). Existing public names are `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_ANON_KEY` and `NUXT_PUBLIC_SITE_URL`. Use the established secure secret provisioning path; do not paste keys in chat.

Authentication callback: `https://matrixfellows.com/api/workspace/auth/callback`. Mailbox callback registered separately with each enabled provider: `https://matrixfellows.com/api/workspace/mailboxes/callback`. Isolated local callbacks must use their actual preview origin. Sending consent grants Gmail send or Microsoft delegated `Mail.Send`, not general inbox reading.

Worker secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`. Variables: `OUTREACH_ENABLED`, `GEMINI_MODEL` (selected default `gemini-2.5-flash`), `GEMINI_PROVIDER_MODE=unpaid_public`, `GEMINI_TERMS_CONFIRMED`, `GEMINI_FREE_PROJECT_CONFIRMED`. Execution also requires database `paused=false`, `ai_enabled=true`, `terms_confirmed=true` and a reviewed exact source excerpt whose snapshot hash still matches. A key/model alone cannot activate generation. The deprecated unwired audience flag is not used. Reconfirm current Gemini terms/model availability before activation; do not enable billing as a fallback.

Unpaid payloads contain reviewed nonpersonal technical excerpts only. Member identity, contribution, availability, officer voice and full drafts stay local. Authorized-context adapter support does not constitute paid-mode activation or identical personalization depth. Full private draft rewrite uses the local path. Arbitrary executable research agents have no production access; a narrowly privileged broker is required before introducing them.

## Source coverage and limitations

Curated institutional sources cover UTA, UTD and UTSW with reviewed additions in UNT/SMU/TCU. They are research leads, not assertions of recruitment or comprehensive faculty coverage. Scheduled work considers current review capacity, topic/project needs and recent source work; default discovery cron remains `0 16 * * 1,3,5`, queue drain `*/15 * * * *`.

Supported member acquisition: bounded GitHub repository metadata and pinned README, DOI metadata/abstract, approved institutional HTML, single-label GitHub Pages portfolios, and text-bearing institutional PDFs. HTTPS endpoints, redirects, byte/time/request limits and content outcomes remain adapter-specific. Code is never executed. PDFs are bounded to reviewed institutional root/www hosts, 512,000 bytes, twelve pages, eight seconds and 12,000 text characters; snapshots retain page spans. Scanned/image-only, private, oversized and unsupported-host documents remain references or show a specific failed processing state. No rendering, source code, PDF document scripts, or external fonts are executed. There is no configured persistent web-search provider, graph database or vector service. Capacity derives from adopted shared claims; source project facts do not establish a member's authorship or universal skill.

## Activation validation

After authorized rollout, verify one real confirmed sign-in, concurrent primary-profile entry and harmless persisted profile/task changes. Then acquire one permitted source through the deployed Workflow; review its immutable technical excerpt, generate one allowed Gemini result, and verify matching/local identity assembly. Observe scheduled work, quota wait/resume, source disable/pause and stale-lease fencing. Earlier live acquisition and metadata HTTP success do not substitute for these checks.

For each configured mailbox provider separately, verify consent, encrypted token persistence, refresh, disconnect/reconnect and exact approval invalidation on edits/handoff/demotion. Microsoft acceptance is not delivery confirmation. Uncertain submissions require documented Sent-mail reconciliation, never blind retry. Automatic inbox reading stays disconnected.

A real email check needs the owner's explicitly authorized mailbox, recipient, subject/body and final approval of that exact revision. Prepare the review screen first. This implementation did not send a professor or any other person a message. Record evidence as deployed, source acquired, model generated, provider accepted, or independently confirmed delivery, as applicable.

The next owner action is to authorize the reviewed schema/application/Worker rollout and configure the intended OAuth provider(s) securely. Once the deployed review screen and consenting test recipient are ready, approve that specific test message separately.

## Authorized production rollout addendum

The owner subsequently authorized deployment and three specific admin promotions. See the [October 9 rollout record](../quality/research-outreach-deployment-2026-10-09.md) for exact production version IDs, applied migrations, targeted roles, backup limitations and live checks. Research remains paused and AI disabled; provider generation, OAuth and real mail remain unverified. Include the subsequent `20261010033444_research_immutable_search_path.sql` after the eleven original migrations on any fresh rollout. Earlier local evidence and no-deployment statements above describe the pre-authorization state.
