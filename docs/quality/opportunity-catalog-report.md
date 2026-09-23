# Opportunity catalog quality report — 23 September 2026

## Baseline

Production `/api/content` returned 49 public records and about 90 KB of JSON. The homepage filtered the complete array in the browser. There was no crawlable catalog/detail route, bounded server query, or typo-tolerant search.

Baseline homepage-section captures are in ignored `test-results/opportunity-catalog/before`; post-change homepage and 1440/320/360/390/430-pixel catalog captures are in `test-results/opportunity-catalog/after`. Desktop and mobile search/filter/pagination recordings are in `test-results/opportunity-catalog/recordings`. Post-change pages have no horizontal overflow and render 12 bounded rows. These are Chromium captures/emulations, not phone tests.

## Current measured state

- 52 published routes after backfill: 12 explicitly high-school-supported and 40 eligibility-not-stated.
- Discipline coverage: AI/ML 8, computer science 7, mathematics 7, physics 6, biomedical 5, biology 5, robotics 3, chemistry 3, environmental 3, mechanical 2, materials 2, electrical 1. Electrical and mechanical remain thin.
- New routes: BMES poster expo, ACS SWRM high-school chemistry poster, and ISCAS live demonstration. BMES/ACS are closed/awaiting announcement; ISCAS is advanced and eligibility-not-stated.
- The OpenReview evidence schema is applied and the bounded acquisition path is implemented locally, but the updated scheduled Worker has not been deployed in this validation pass. Zero discoveries were auto-published.
- The 53-query live benchmark measured recall@5 **0.868** and MRR **0.836**, versus **0.547** and **0.524** for title-substring search. Exact names are prioritized. Seven multi-token typo cases remain misses and semantic retrieval stays off.
- Warm database benchmark p95 was **144.9 ms** on the maintainer connection in the final validation run, below the proposed 300 ms lexical target. This is not a global production p95.

## 23 September catalog expansion

- The checked-in Worker catalog now contains 56 seed routes: 18 competitions, 9 internships, 11 summer programs, 3 other programs, 5 conferences, 5 workshops, and 5 publication routes. This is a local build-time count, not a claim that production has been backfilled.
- Twelve rich routes were added: HOSA Medical Innovation, HOSA Research Poster, NIST SHIP, Navy SEAP, Fermilab PRISM, Broad Summer Scholars, Fred Hutch SHIP, Seattle Children’s RTP, MSK Summer Student, MD Anderson King Foundation, George Mason ASSIP, and UT Austin HSRA.
- Eleven established program IDs are enriched in place. SIMR, BU RISE, and NASA/UT SEES are now discoverable as internships; RSI, SSP, Simons, Rockefeller SSRP, Garcia, PROMYS, and Ross are summer programs. MIT PRIMES-USA and NYAS Junior Academy remain general programs.
- The catalog supports positive-evidence filters for paid/stipend routes, need-based aid, and no program fee. Unknown values do not pass those filters. Application/program fees and compensation are separate from paper/poster submission costs.
- HOSA’s official title is “Medical Innovation”; “HOSA Biomedical Innovation” is retained as a search alias. Its yearless May 15 upload wording is not encoded as a 2027 deadline.
- First-party evidence and deliberate exclusions are documented in the [expansion research note](../research/opportunities/catalog-expansion-2026-09-23.md).

## Checklist

- Passed: linked Supabase migrations 008–012; RLS-invoker queries; idempotent backfill at zero; 102 unit/database tests; typecheck/build/docs checks; 320–430 px no-overflow captures; bounded homepage; OpenReview public/private, proposal, rotating-window, legacy-link, expired-invitation, and `duedate`/`expdate` tests.
- Passed: one-row mobile pagination, keyboard-operable native filter sheet/sort, and device-local save with storage-disabled handling.
- Outstanding: semantic ranking remains feature-flagged off.
- Outstanding: the 100–150 ambition is not met; 52 vetted routes are reported rather than padded.
- Outstanding: physical iPhone/Safari and budget Android verification was unavailable.
- Outstanding: current electrical/mechanical and IROS route coverage is thin. Active-venue discovery alone is not publication evidence.
- Outstanding: the new frontend and scheduled-Worker builds have not been deployed from this checkout.
- Outstanding: migration 015 and the version-2 catalog backfill have not been applied to production in this validation pass.
