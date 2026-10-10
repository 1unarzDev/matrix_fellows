# Dashboard research audit — 2026-10-07

Independent research-track review. The public homepage cinema and login atmosphere are outside this dashboard work.

## First-party policy checks

Direct HTTPS retrieval succeeded on 2026-10-07 for:

- [UT Southwestern STARS](https://www.utsouthwestern.edu/education/nondegree-programs/stars/programs/summer-research-opportunities.html): student applicants must be at least 16 by June 1, currently juniors and enrolled in high school. The page states that students with prior research experience are not eligible. The teacher section has a different biomedical-experience condition; do not use that narrower condition for students.
- [UT Dallas Clark FAQ](https://honors.utdallas.edu/research/clark-program-faq/): “The Clark Summer Research Program is open to incoming, first-year UT Dallas students.” A generic high-school badge is not sufficient.

The extracted requirements do not establish an open application cycle, current availability, or complete suitability. Rules preserve the source URL, supporting excerpt and check date; the check date is not a program cycle. These are source-backed policy test cases, not simulated places or contacts.

## Implemented bounded changes

`shared/utils/research-fit.ts` provides a stable practical-access/field partition with inspectable reasons and unresolved constraints, not response probability or reputation ranking. Member-approved locations are used without inventing commute minutes. A listed location is not upgraded to a verified laboratory worksite. Unknown participation remains unknown. Supported remote work can rank ahead of inaccessible physical work. Sorting does not mutate the original result list.

Rule evaluation preserves eligible, excluded, unknown and conflicting evidence. No rules is unknown. Checks retain their individual outcomes even when the aggregate is conflicting or excluded. Rule satisfaction is not an advertised opening or acceptance.

## Initial independent risks

- The original target queue sorts partial assessment scores, which can obscure the absence of usable eligibility and participation evidence.
- Original draft editing requires explicit save and retains optimistic revision checks on the backend. Autosave must not overwrite text typed during an in-flight save or conceal a conflict by reloading the latest server body.
- Original planner dates are converted through JavaScript Date, which turns an unlabeled member date into an instant. Preserve a date-only due value separately from source deadlines and scheduled work.
- Preserve existing member assignment and private-profile checks. Exposing Research to members does not authorize discovery, editing shared targets, group-scope drafting, or another member's records.
- An unverified source route should remain a verification task, not a ready-to-send contact. A current fetched page does not establish availability.

## Evidence and remaining scope

Unit tests exercise first-party requirements and their unknown/conflict cases, geography boundaries, field allocation, stable ordering, and remote feasibility. These are fixture/unit checks, not physical-device validation or a live mailbox test. Browser flow review will be added after main-thread integration. No Google activation, production access mutation, or real email sending was performed.
