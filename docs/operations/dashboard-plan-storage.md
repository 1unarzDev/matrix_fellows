# Canonical dashboard plan storage

Prepared October 7, 2026. Implemented and fixture tested; no remote migration applied by this work.

Release update: both dashboard migrations were applied remotely with the website
deployment later that day. See [release evidence and recovery](dashboard-policies-release-2026-10-07.md).

Migration `20261008005351_dashboard_canonical_plan.sql` adds private pursuits, activities, tasks, events and capacity settings. Existing saves remain references and create no tasks. A reviewed pursuit creates its tasks transactionally, deduplicated by member, opportunity and cycle. Drafts, outreach history and profiles are untouched.

Legacy planner tasks retain their stable IDs and owner. `legacy_context` preserves the original due timestamp and target, profile and opportunity associations. The original table remains accessible as a read-only archive. A legacy internal due timestamp becomes an internal calendar date in America/Chicago; its exact original timestamp also stays in the notes and source record. These are not official organizer deadlines. Do not allow simultaneous writes to the old and new planner ledgers after activation.

## Activation and recovery

1. Back up the database using the existing Supabase backup/export procedure, including `outreach_planner_items`; check row counts and archive access.
2. Exercise the migration against a non-production database with representative existing rows before applying it remotely. Run `npx vitest run tests/unit/dashboard-planning.test.ts tests/unit/dashboard-planning-database.test.ts --maxWorkers=2`.
3. Apply the reviewed migration via the established release process. It requires migrations 023 and 028 and does not modify their records. Check migrated task count against the old ledger; spot-check stable IDs, owners, original dates, notes and associations. Confirm another member cannot read the records.
4. Deploy the canonical planner UI and make legacy planner access read-only. Use task/event edits for internal plans; there is deliberately no pursuit PATCH for official source dates.

If activation fails, roll back the frontend release, retain all additive tables and restore legacy planner access only after deciding which ledger is authoritative. Do **not** drop the new tables: members may have created new work. Export the new tables and compare versions before translating any new edits back to the old ledger. An interface rollback does not require a destructive database rollback. Original records are untouched and remain the recovery source for pre-migration data.

## API boundaries

`GET /api/workspace/plan` returns the canonical ledger. All writes verify the live signed-in membership and same-origin request. Browser database grants are SELECT only with owner RLS; service-mediated writes filter by owner. Updates use expected versions and report a 409 instead of overwriting concurrent work. The pursue RPC is service-only; its unique constraint prevents duplicate tasks after repeated submissions.

Capacity is unknown when null, not zero. Workload reports scheduled allocations in the requested window, total unscheduled backlog, and a separate unknown-estimate count. It never adds parent rollups. Calendar export is a one-time `.ics` download, not a subscription or external synchronization. Date-only facts stay all-day; month-only, conflicting and approximate facts are not exported as invented timestamps. IANA zones and AoE are validated; public source facts are a member-reviewed snapshot, not evidence of live source verification.

Activity contributions remain member-supplied evidence and do not automatically become profile achievements. Marking Submitted records explicit member confirmation, not an external form submission. No mail is sent by planning handlers.
