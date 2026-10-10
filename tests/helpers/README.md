# Local persistence journey

Run `npx vitest run tests/unit/research-outreach-persistence-journey.test.ts --maxWorkers=1` after `npx nuxt prepare`.

The journey mounts the actual application API handlers on a local H3 HTTP server. It uses the actual Supabase JavaScript client, encrypted session cookies, live membership lookup, profile/context compiler, source acquisition code, local writer, mailbox adapter, and approval/send RPCs. `PostgresSupabaseTransport` translates a deliberately limited PostgREST subset into parameterized PGlite PostgreSQL queries; every application mutation and RPC persists through the current outreach/research migration chain. Unsupported operators, SQL identifiers, and external destinations fail instead of returning invented application data.

The local test provides confirmed identity responses, an administrative join-table fixture containing sensitive fields, GitHub metadata/README responses, and Gmail acceptance/indeterminate responses. It provisions fixture mailboxes locally; it does not perform OAuth consent, model generation, external delivery, or production deployment. Auth/join/catalog prerequisite tables are test fixtures; all sixteen relevant outreach/dashboard/research migrations through `20261010031000_provider_retry_metadata.sql` execute unchanged. The default checks establish a real HTTP-handler-to-PostgreSQL journey. They do not establish deployed Supabase/PostgREST compatibility.

The checks cover concurrent canonical bootstrap, identity spoof rejection, private join-field exclusion, persisted source snapshots, explicit contribution correction/sharing, participation preferences, frozen match selection, officer/member and owner boundaries, revision preview and stale saves, exact approval, A-to-B handoff with B's mailbox, concurrent submission fencing, manual reply and canonical follow-up task, separately approved follow-up, uncertain outcome, demotion, narrow reconciliation/disconnection, and consumed-claim withdrawal without changing the earlier provider-accepted snapshot.

An opt-in browser check runs against a separately started Nuxt production preview:

```sh
RESEARCH_BROWSER_BASE_URL=http://127.0.0.1:3194 npx vitest run tests/unit/research-outreach-persistence-journey.test.ts --maxWorkers=1
```

Playwright proxies workspace API requests to the actual local H3 handlers and PostgreSQL transport. Only confirmed identity, acquisition/mail providers, and unrelated catalog responses are fixtures. The browser adds and shares a research contribution, reloads its persisted overview, selects a member and match as an officer, creates a draft, previews a local smaller-ask revision, and reloads the saved body. Database assertions verify the artifact snapshot, draft revision, and selected match binding. Successful screenshots are `/tmp/matrix-browser-persisted-profile.png` and `/tmp/matrix-browser-persisted-officer-draft.png`; failures capture `/tmp/matrix-browser-persistence-failure.png`. This is UI-to-handler-to-database evidence, without real OAuth/model/mail operation.

The source review regression creates 45 sources, requests both pages with exact counts, opens source 45 by ID, binds its reviewed excerpt to the persisted snapshot hash, and retries only its failed dependent job while retaining completed acquisition. Ordinary members cannot access the detail.

The exported transport supports this local preview harness. Keep its test-only configuration and identity fixtures outside production runtime paths. Its supported query operators are equality/inequality, comparisons, `is`, `in`, `like`, `ilike`, grouped `and`/`or`, ordering, pagination, insert/update, and upsert. Two explicit application relation projections are supported for shareable profiles and assignments. It intentionally does not implement arbitrary PostgREST joins or general-purpose SQL input.
