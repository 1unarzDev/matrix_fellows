# Dashboard task composer and discovery transitions

October 11, 2026, America/Chicago. Release follows `7cb9c76` and includes the dialog glass feedback commit `e934bab`.

The task composer now exposes a name, optional saved opportunity/project connection, optional opportunity milestone and calendar. Legacy notes, estimates, dependencies, status and exact-time allocations remain stored; they are no longer setup fields. All task entry points use this composer. Opportunity pagination uses the home/catalog glass controls and directional fade, blur and slide transitions.

The calendar supports single-day selection and pointer dragging across week rows, including touch and reverse selection. A task range retains its first and last calendar dates and its deadline is the final day. Milestone selection chooses one date. Save feedback uses a gold glow, small star particles and the dialog's closing animation. Reduced motion disables decorative movement. The panel retains edits on persistence errors.

## Storage and rollout

`20261011095921_dashboard_task_opportunity_links.sql` adds nullable opportunity and milestone references to existing tasks. It does not rewrite or delete historical data. One task can connect to one pursuit, project or saved opportunity. Private opportunity references are validated against the task owner in Postgres and the authenticated API; published references must be accessible when attached. Later unpublication retains the historical link. Browser write privileges and owner-only RLS remain unchanged.

Task connection changes use the existing optimistic version check. Older clients that omit connection fields preserve them; new clients send the complete connection together. Edit submissions preserve hidden legacy fields. Source date facts remain distinct from personal task dates.

The linked project is `xlnjzzbsxzadrvbrggau`. Preflight confirmed 45 applied migrations through `20261010123000` and zero task rows. The additive migration was applied and its columns and access guard were verified remotely. Its local filename matches remote ledger version `20261011095921`; do not replay it. For another environment, apply only this migration after a ledger assertion, before deploying the application. No research Worker, role, model configuration, mailbox or inbox capability changes are required. A frontend rollback can retain the additive columns; do not drop task data during recovery.

## Verification

The full local unit suite passes 396 tests with one existing optional test skipped. New database checks cover saved-opportunity persistence, cross-member private-link rejection, owner read isolation, atomic connection switching and retaining links after unpublication. Type checking and documentation links pass.

Browser, visual and deployment evidence will be recorded after the final integration pass. Browser API fixtures exercise the UI contracts; Postgres tests verify real database persistence separately. They do not establish a production authenticated browser session.
