# Opportunity catalog implementation research

Reviewed 22 September 2026. This note records primary-source decisions; it is not a claim that every listed family has a currently open call.

## OpenReview boundary

OpenReview's public `active_venues` group is a discovery index, not an open-submission or endorsement list. A reviewed venue ID must be readable by `everyone`, fall under an approved conference-family prefix, and resolve an explicit public submission invitation. Reviewer, chair, per-paper, organizer-proposal, and private groups are rejected. No profiles, submissions, reviews, or private objects are fetched.

Invitation `duedate` is stored as the public deadline. `expdate` is separately typed as technical expiry and is never presented as proof of an extension. `cdate` and `mdate` are not deadlines. Expired invitations are retrieved with `expired=true` because membership in `active_venues` can outlive the public deadline. A live check found exactly this state for ICML 2026 AI4Science and IROS 2026 Touch-to-Action.

API evidence records endpoint, object ID, JSON field, raw millisecond value, interpreted UTC instant, semantic role, retrieval time, and content hash. This stays separate from the HTML validator; literal-quote validation was not weakened.

- [OpenReview groups](https://docs.openreview.net/getting-started/objects-in-openreview/groups)
- [Invitation fields](https://docs.openreview.net/reference/api-v2/entities/invitation/fields)
- [Venue API-version checks](https://docs.openreview.net/how-to-guides/data-retrieval-and-modification/how-to-check-the-api-version-of-a-venue)
- [Public active venues group](https://api2.openreview.net/groups?id=active_venues)

## Search implementation

The database uses exact alias/title recognition, PostgreSQL full-text search, and bounded `pg_trgm` typo matching. Publication and facets apply before pagination. The function is `security invoker`; RLS remains the final boundary. The semantic schema stores 768-dimensional vectors plus model/schema/content versions, but semantic retrieval remains off until a provider is configured and held-out judgments improve without hurting exact-name retrieval.

- [PostgreSQL pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html)
- [Supabase hybrid search](https://supabase.com/docs/guides/ai/hybrid-search)
- [pgvector](https://github.com/pgvector/pgvector)
- [Cloudflare BGE base model](https://developers.cloudflare.com/workers-ai/models/bge-base-en-v1.5/)

## Specific route checks

- **BMES High School Poster Expo 2026:** the official page accepts juniors and seniors, allows research, innovation, or an idea, says no lab experience is required, and lists separate $100 accepted-student and chaperone registrations. The 18 August 2026 deadline passed.
- **ACS SWRM 2026:** the official contributed-session listing names a “High School Research in Chemistry” poster session. The advertised 2026 submission period passed. Costs and detailed minor-attendance rules remain unknown.
- **ISCAS 2027 Live Demonstration:** the official call lists a 13 October 2026 deadline. The one-page description must connect to an already published paper or new ISCAS paper, with a working system and in-person presentation. Page count does not make it a beginner route.

- [BMES poster expo](https://www.bmes.org/2026/annualmeeting/high-school-poster-expo)
- [ACS SWRM call](https://www.acs.org/events/regional/southwest/2026-swrm-call-for-papers.html)
- [ISCAS 2027 call](https://2027.ieee-iscas.org/call-for-papers)
- [IEEE corroboration](https://enotice.vtools.ieee.org/public/204760)

The registry in `workers/source-registry.ts` scopes shared hosts to reviewed families. Hosting or directory inclusion does not establish affiliation, quality, eligibility, or current availability.
