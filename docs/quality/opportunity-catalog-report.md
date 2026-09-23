# Opportunity catalog quality report — 23 September 2026

## Baseline

Production `/api/content` returned 49 public records and about 90 KB of JSON. The homepage filtered the complete array in the browser. There was no crawlable catalog/detail route, bounded server query, or typo-tolerant search.

Baseline homepage-section captures are in ignored `test-results/opportunity-catalog/before`; post-change homepage and 1440/320/360/390/430-pixel catalog captures are in `test-results/opportunity-catalog/after`. Desktop and mobile search/filter/pagination recordings are in `test-results/opportunity-catalog/recordings`. Post-change pages have no horizontal overflow and render 12 bounded rows. These are Chromium captures/emulations, not phone tests.

## Current measured state

- 64 published routes after the latest backfill: 33 explicitly high-school-supported and 31 eligibility-not-stated.
- Discipline coverage: computer science 22, biology 19, biomedical 15, chemistry 13, AI/ML 12, physics 12, mathematics 9, environmental 8, robotics 5, mechanical 5, electrical 4, and materials 4. Electrical and mechanical remain thinner than computing and life science.
- New routes: BMES poster expo, ACS SWRM high-school chemistry poster, and ISCAS live demonstration. BMES/ACS are closed/awaiting announcement; ISCAS is advanced and eligibility-not-stated.
- The OpenReview evidence schema and bounded acquisition path are deployed in scheduled Worker version `0440754e-557d-4b7c-9c75-08a9e5b3a822`. Zero discoveries were auto-published by this manual catalog backfill.
- The 60-query live benchmark measured recall@5 **0.867** and MRR **0.828**, versus **0.433** and **0.425** for title-substring search. All seven new Texas-eligibility judgments passed; eight pre-existing typo cases remain misses and semantic retrieval stays off.
- Warm database benchmark p95 was **190.3 ms** on the maintainer connection, below the proposed 300 ms lexical target. This is not a global production p95.

## 23 September catalog expansion

- The checked-in Worker catalog contains 56 seed routes: 18 competitions, 6 internships, 14 summer programs, 3 other programs, 5 conferences, 5 workshops, and 5 publication routes.
- The initial expansion researched HOSA Medical Innovation, HOSA Research Poster, NIST SHIP, Navy SEAP, Fermilab PRISM, Broad Summer Scholars, Fred Hutch SHIP, Seattle Children’s RTP, MSK Summer Student, MD Anderson King Foundation, George Mason ASSIP, and UT Austin HSRA. The later Texas eligibility audit suppresses the six out-of-state local-only routes rather than shipping them in the Worker seed bundle.
- Eleven established program IDs are enriched in place. SIMR, BU RISE, and NASA/UT SEES are now discoverable as internships; RSI, SSP, Simons, Rockefeller SSRP, Garcia, PROMYS, and Ross are summer programs. MIT PRIMES-USA and NYAS Junior Academy remain general programs.
- The catalog supports positive-evidence filters for paid/stipend routes, need-based aid, and no program fee. Unknown values do not pass those filters. Application/program fees and compensation are separate from paper/poster submission costs.
- HOSA’s official title is “Medical Innovation”; “HOSA Biomedical Innovation” is retained as a search alias. Its yearless May 15 upload wording is not encoded as a 2027 deadline.
- First-party evidence and deliberate exclusions are documented in the [expansion research note](../research/opportunities/catalog-expansion-2026-09-23.md).

## Texas summer-program eligibility correction

- Production now exposes 14 summer programs and 6 internships. Six routes whose official rules require residence in Maryland/Colorado, Illinois, Massachusetts, the Seattle area, or the NY/NJ/CT area are suppressed in place; their IDs and audit history are preserved.
- MIT BWSI, MITES Summer, Texas Tech Clark Scholars, Carnegie Mellon AI Scholars, UC Davis Young Scholars, and Iowa SSTP were added from current first-party pages. RSI, PROMYS, and BU RISE remain published and received explicit Texas/national geography metadata.
- The live anonymous catalog returned all six new routes and zero of the six suppressed routes. A second backfill dry run reported zero metadata changes and zero pending suppressions.
- Eligibility, exclusions, caveats, and sources are documented in the [Texas eligibility audit](../research/opportunities/texas-summer-program-eligibility-2026-09-23.md).

## Discipline coverage and relevance correction

- Production now exposes 73 published routes: 35 explicitly high-school-supported and 38 eligibility-not-stated. Reviewed discipline coverage is robotics 25, electrical engineering 27, and mechanical engineering 25; broad science fairs and research programs account for some overlap.
- Nine specific routes were added: IROS regular paper and modular robotics, CoRL Agentic Robotics and Physical AI Safety, ISCAS and ICASSP regular papers, GENIUS Science and Robotics, and TRUSTMORE under its correct IEEE Big Data parent. Advanced conference routes remain excluded from the strict high-school preset.
- Relevance sorting now uses reviewed per-discipline affinity after exact/textual intent. HOSA Medical Innovation is biomedical/biology only and no longer appears in Mechanical Engineering; CoRL appears under both robotics and AI/ML; ISEF, TXSEF, FWRSEF, JSHS, and other broad routes have evidence-backed cross-disciplinary mappings.
- TRUSTMORE is not an IROS route. Its organizer/OpenReview deadline conflict is retained and the earlier operational cutoff is shown. EMBC remains monitor-only because no reliable 2027 call was available.
- The 68-query production benchmark measured lexical/fuzzy recall@5 **0.868**, MRR **0.828**, and p95 **225.6 ms** on the maintainer connection. Nine known typo queries remain misses; semantic retrieval remains off.
- Migrations 016–018, the converged version-7 catalog backfill, the main Worker, and scheduled import Worker were deployed. Primary-source decisions are recorded in the [venue and discipline audit](../research/opportunities/venue-discipline-expansion-2026-09-23.md).

## Checklist

- Passed: linked Supabase migrations 008–018; RLS-invoker queries; idempotent backfill at zero; 119 unit/database tests; typecheck/build/docs checks; 320–430 px no-overflow captures; bounded homepage; OpenReview public/private, proposal, rotating-window, legacy-link, expired-invitation, and `duedate`/`expdate` tests.
- Passed: one-row mobile pagination, keyboard-operable native filter sheet/sort, and device-local save with storage-disabled handling.
- Outstanding: semantic ranking remains feature-flagged off.
- Outstanding: the 100–150 ambition is not met; 73 vetted routes are reported rather than padded.
- Outstanding: physical iPhone/Safari and budget Android verification was unavailable.
- Passed: reviewed electrical, mechanical, IROS, CoRL, GENIUS, and broad-fair coverage expansion. Active-venue discovery alone remains insufficient publication evidence.
- Passed: migrations 015–018, the version-7 catalog backfill, and the scheduled Worker are deployed; the backfill converges at zero pending changes.
