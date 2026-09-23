# Opportunity catalog operations

## Runtime seams

- `/api/content` returns six previews for the cinematic homepage.
- `/api/opportunities` validates a 240-character query, facets, sort, page, and page size up to 50, then calls the RLS-protected search function.
- `/api/opportunities/[slug]` resolves one published, unsuppressed record.
- `/opportunities` and detail pages are SSR. Query/filter URLs are noindex; the catalog root is canonical.
- Search never fetches sources, runs discovery, or receives ingest credentials.

## Apply and backfill

Run `npx supabase db push --linked`. Migrations 008–018 add search columns/RPCs, reviewed sources, structured API evidence, separate embedding/jobs tables, vector/trigram extensions, weak-match rejection, actionable and discipline-aware sorting, internship/summer-program kinds, funding filters, and an editor-only queue-health guard. Migration 018 removes the superseded pre-funding RPC overload so defaulted calls remain unambiguous.

`npm run backfill:catalog` is a dry run. `npm run backfill:catalog -- --apply` fills missing metadata, applies versioned reviewed corrections to the base record, uses optimistic timestamps, and inserts new routes only on absent IDs. Owner overrides remain a separate effective-data layer; publication, suppression, and monitor history are not changed. Re-run until dry-run output is zero; concurrently monitored rows can require a second pass.

`Internship` and `Summer program` are intentional public kinds. Program-specific costs use `application`, `program`, and `compensation`; paper/poster routes use `submission` and `publication`. Never put tuition in the submission field merely to avoid an unknown value. Funding filters require positive text evidence for a stipend, aid, or no program fee; a null field never passes as free.

`disciplineAffinity` is reviewed editorial metadata from 0–100. It affects relevance only when the visitor explicitly filters by a discipline, after exact/text search relevance and before global priority. Primary-discipline fallback is 100 and secondary-membership fallback is 60 when no reviewed value exists. Do not use affinity to add an unsupported discipline or to make a globally prominent route dominate every field.

## Source review

OpenReview discoveries enter `opportunity_discoveries`; they are not opportunities. Review the official call, route type, parent affiliation, contribution format, deadline semantics, costs, attendance rules, and high-school policy. Eligibility-unknown advanced calls may be approved only as `not-stated` and remain outside the strict high-school preset. Organizer proposals are not student-paper routes.

The HTML monitor still requires exact date quotes and two matching observations at least six hours apart. API timestamps use `opportunity_api_evidence`; never fabricate a natural-language quote from a raw value.

## Search, embeddings, and capacity

Run `npm run benchmark:search` after ranking or catalog changes. It exercises more than 50 exact, typo, concept, filtered, and negative queries and throws on hard-filter leakage.

Embeddings are independent jobs. Before enabling hybrid retrieval, verify model availability, 768 dimensions, preprocessing, input limits, and versioning; enqueue only changed approved text; benchmark exact filtered vector search; and bound query embedding time with lexical fallback. An embedding failure must not prevent publication or lexical search.

`opportunity_jobs` separates monitoring, confirmation, discovery, and embedding work. `opportunity_queue_health()` exposes queue counts/age to editors. Preserve source failures, conflicts, and freshness warnings. Increase the daily budget only after measuring fetch, extraction, confirmation, and embedding usage.

## Rollback

Frontend rollback uses a Cloudflare Worker version rollback. Database additions are backward-compatible and should remain. Disable source rows or feature flags instead of deleting observations. Suppress a bad public record through the editor so identity, evidence, and history remain recoverable.
