# Official deadline-source research

Checked live on 2026-09-07. These are primary organizer sources, not an inferred annual calendar. Preserve year, date kind, original timezone wording, evidence excerpt, source URL and checked-at timestamp with every imported record. Page modification dates and unrelated news dates are **not** opportunity dates.

## Recommended initial sources

| Family | Official source | Observed information / extraction guidance |
| --- | --- | --- |
| Regeneron ISEF | https://www.societyforscience.org/isef/affiliated-fair-network/ | Explicit **May 8–14, 2027**, Los Angeles event. Extract the date range adjacent to `Regeneron ISEF 2027`, not arbitrary page dates. April 12, 2027 is the last date organizers may hold an affiliated fair, **not** a student application deadline. |
| ISEF qualification | https://findafair.societyforscience.org/ and the affiliated-network page above | Students qualify through a Society-affiliated fair; the network describes grades 9–12. Student deadlines require the student's local/regional fair and cannot be represented by one global ISEF submission date. Until location is configured, link to the finder and explain qualification. |
| Davidson Fellows | https://www.davidsongifted.org/gifted-programs/fellows-scholarship/ | Main page explicitly says 2026 closed and 2027 application opens Fall 2026. No precise 2027 deadline announced in inspected page. Retain a monitored/awaiting-announcement source rather than invent a February 2027 date. |
| Davidson eligibility / past deadline | https://www.davidsongifted.org/gifted-programs/fellows-scholarship/eligibility-and-application/ | FAQ says February 18, **2026**. It is historical, not the upcoming deadline. Applicants 18 or younger at deadline, with US citizenship/residency conditions (including stated active-duty overseas exception). Teams at most two. Use current official wording, not a blanket worldwide eligibility claim. |
| Queer in AI workshop | https://www.queerinai.com/neurips-2026 | Joint Queer in AI × {Dis}Ability in AI workshop. `Important Dates` and `DEADLINES` both explicitly state final contribution deadline **September 10, 2026 AoE**, final notification September 20. August 10 was a distinct visa-friendly submission deadline. Final contribution cutoff = September 11 11:59:59 UTC if representing end-of-day AoE. |
| NeurIPS | https://neurips.cc/Conferences/2026/Dates | Server-rendered tables include row labels, track headings, human-readable dates and exact countdown UTC variables. Main-paper abstract May 4 and full paper May 6, 2026 are past. Main conference, workshop proposals, workshop contributions and affinity proposals have distinct semantics. Do not present the suggested workshop contribution date as a universal deadline for individual workshops. |
| IEEE ICRA 2027 | https://2027.ieee-icra.org/contribute/call-for-icra-2027-papers-now-accepting-submissions/ | CFP states paper submission September 15, 2026 `(11:59 PST)`. There is a timezone conflict with calendar metadata (below); retain calendar date and original wording / flag review rather than assert precise UTC. |
| IEEE ICRA event | https://2027.ieee-icra.org/ | Explicit **May 24–28, 2027**, Coex, Seoul. This is the conference event, not a paper deadline. |
| IEEE/CVF CVPR | https://cvpr.thecvf.com/Conferences/2027/Dates | Paper registration November 10, 2026 AoE; submission November 16; supplementary materials November 23. Workshop/tutorial dates June 20–21, 2027; main conference June 22–25. Countdown variables expose exact UTC times. |
| Regeneron Science Talent Search | https://www.societyforscience.org/regeneron-sts/application-requirements/ | `The Regeneron STS 2027 application is now open through 8PM ET on Thursday, November 5, 2026.` Correct cutoff November 6, 2026 01:00 UTC (America/New_York is EST then). Official page links the current rules; target high-school seniors, but do not infer full eligibility solely from overview text. |
| Junior Science and Humanities Symposium | https://www.jshs.org/students/find-your-region/ and https://www.jshs.org/regional-competitions/ | Regional entry route, not one national application deadline. Homepage describes grades 9–12. Monitor official region sources once location is known; national event dates must not masquerade as regional submission deadlines. No upcoming exact student cutoff verified during this pass. |

## Machine-readable opportunities and traps

### NeurIPS and CVPR

Both official date pages expose inline countdown values, for example:

```js
// NeurIPS 2026 Full Paper Submission Deadline, main-paper row
var fullpapersubmissiondeadline_3 = "2026/05/07 11:59:59 UTC";
// CVPR 2027 Paper Registration Deadline
var paper_registration_deadline_1 = "2026/11/11 11:59:59 UTC";
// CVPR 2027 Submission Deadline
var submission_deadline_1 = "2026/11/17 11:59:59 UTC";
```

Read values as data; never execute publisher JavaScript. Pair each value with its containing table row and track heading. NeurIPS repeats labels across tracks; deduplicating only by label loses semantic distinctions. Human-readable AoE dates are the previous calendar day relative to these UTC values. Store/display that original date and timezone rather than misleading students with only the UTC date.

### ICRA conflict discovered

The [calendar event](https://2027.ieee-icra.org/event/technical-paper-first-submission/) has JSON-LD:

```json
{"startDate":"2026-07-16T08:00:00-04:00","endDate":"2026-09-15T23:59:00-04:00"}
```

But the [CFP](https://2027.ieee-icra.org/contribute/call-for-icra-2027-papers-now-accepting-submissions/) says `September 15, 2026 (11:59 PST)`. These disagree by hours; PST can also be an imprecise organizer abbreviation in September. Prefer a date-only deadline with a timezone warning and official link until clarified. Calendar `startDate` is the opening of the submission window, **not** the conference start. JSON-LD Event is not automatically a conference.

The endpoint https://2027.ieee-icra.org/wp-json/tribe/events/v1/events returned a valid **empty** collection although the homepage widget had a current submission event. Do not interpret this as cancellation or erase last-good content. The event page's JSON-LD is obtainable without browser automation, subject to the semantic caveats above.

### WordPress and Squarespace

Society for Science, Davidson, and ICRA expose HTML and generic SEO JSON-LD. The observed WebPage `datePublished` / `dateModified` values are not application deadlines. Their RSS/news feeds may help discover announcements but should not supply dates from publication timestamps. Queer in AI's Squarespace page renders relevant text in server HTML; no browser or LLM is required for the current annual page. Its [homepage](https://www.queerinai.com/) links `/neurips-2026#cfp`, useful for discovering annual rollover with an allowlisted same-site URL.

## Safe maintenance strategy

- Separate source discovery, acquisition, extraction, validation and publication. Allowlist official HTTPS origins; impose response-size/time limits, conditional requests, bounded retries and a transparent user agent.
- Refresh daily rather than scrape per page view. Cache last-good records; report missing anchors/changed years/conflicting timezones as source health issues. A 200 response with zero extracted dates is not proof that deadlines were removed.
- Store distinct record IDs for event dates, abstract registration, full-paper submission, workshop proposals and workshop contributions. For ISEF/JSHS, require specific affiliated/regional scope before importing student application deadlines.
- Expire past records from upcoming views, not from audit history. Keep unannounced sources visible as awaiting dates when useful. Never increment a past date's year to create next year's deadline.
- An optional scheduled LLM can suggest repairs/new source mappings from bounded untrusted HTML, but cannot directly publish guessed dates. Require source excerpts, deterministic date/timezone validation and review for ambiguous changes. Current requested sources are mostly extractable with deterministic adapters; an autonomous browsing agent is unnecessary for the first implementation.
- Capture small, attributed fixture excerpts for regression tests, including the ICRA timezone conflict, Davidson historical FAQ versus unannounced next cycle, duplicate NeurIPS track labels, and ISEF organizer-versus-student deadlines.

## Scope of IEEE

“IEEE conference” is not one event or deadline. ICRA and IEEE/CVF CVPR are a deliberate first robotics/computer-vision selection. Add other societies' official conferences only with explicit topic fit and their own source adapters; do not pretend these two cover the entire IEEE calendar.
