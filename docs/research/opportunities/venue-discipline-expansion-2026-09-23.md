# Venue and discipline opportunity expansion audit

Checked against first-party organizer pages and public OpenReview metadata on
**2026-09-23**. This note covers advanced conference and workshop routes plus
two cross-disciplinary student competitions. It is implementation evidence for
the opportunity catalog, not evidence that any record has been published to the
live site.

Eligibility marked **not stated** means exactly that: the reviewed call neither
explicitly includes nor explicitly excludes high-school authors. It must not be
shown by the strict high-school-route filter. An active OpenReview venue is not
proof that its submission window is open, and an OpenReview deadline does not
replace the organizer's public call when the two disagree.

## Existing-record and identity audit

- `shared/data/defaults.ts` already contains a minimal Regeneron ISEF discovery
  record. Enrich that identity rather than creating a second ISEF record.
- `docs/research/catalogs/workshop.json` contains a generic **CoRL workshops &
  tutorials** record. It is a conference-day discovery hub, not the archival
  CoRL main-paper route and not a substitute for named workshop contribution
  routes.
- `shared/data/opportunity-catalog-additions.ts` already contains **ISCAS 2027
  Live Demonstration**. A regular-paper route is distinct; the live demo requires
  an associated existing publication or new ISCAS submission and an in-person
  working demonstration.
- MODULAR and TRUSTMORE are separate workshops with different parents and
  subjects. MODULAR belongs to IROS 2026; TRUSTMORE belongs to IEEE Big Data
  2026. Never merge them because both happen to use OpenReview and IEEE
  branding.

## Robotics workshop and conference routes

### IROS 2026 modular-robots workshop

- **Canonical identity:** `ieee-iros:2026:workshop:modular-robots`; official
  title: **2nd Workshop: Challenges and Applications Prospects for
  Reconfigurable Modular Robots**. Parent: IEEE/RSJ IROS 2026. `MODULAR` is a
  useful search alias, not the displayed official title.
- **Format and preparation:** extended abstract of up to four IEEE-IROS-format
  pages. The call explicitly welcomes preliminary findings and conceptual
  proposals. Accepted contributions are presented as a spotlight and poster;
  abstracts appear only on the workshop site when authors consent.
- **Milestones and state:** extended deadline September 12, 2026, 11:59 p.m.
  AoE; now closed. The OpenReview invitation stores
  `2026-09-13T11:59:00Z`, the corresponding UTC instant. The organizer lists a
  tentative in-person workshop date of September 27 in Pittsburgh.
- **Access:** high-school eligibility is not stated. IROS attendance is
  required. The official late workshop-badge table lists $135 for a student
  member, $190 for a student nonmember, $300 for a member, and $350 for a
  nonmember; the student category does not establish high-school eligibility.
  Main-conference registration is separate. Submission fees, travel, lodging,
  and aid are not stated and remain unknown.
- **Evidence:** [organizer site](https://modular-robot-workshop.github.io/iros2026-modular-robot-workshop-site/),
  [organizer's structured workshop data](https://modular-robot-workshop.github.io/iros2026-modular-robot-workshop-site/assets/data/workshop.json),
  [OpenReview venue](https://openreview.net/group?id=IEEE.org/IROS/2026/Workshop/Modular_Robots),
  [official IROS workshop program](https://2026.ieee-iros.org/program/workshops-tutorials/),
  and [official IROS registration table](https://2026.ieee-iros.org/attend/registration/).

### TRUSTMORE 2026 correction

- **Canonical identity:** `ieee-big-data:2026:workshop:trustmore`; title:
  **TRUSTMORE 2026: 1st International Workshop on Trustworthy Multimodal
  Agents**. Parent: IEEE Big Data 2026, not IROS. The official IEEE Big Data
  program supplies the parent relationship.
- **Format:** full papers are 8–9 pages; short/work-in-progress and demo/system
  papers are 4–6 pages. Submissions are double-blind and original. Accepted
  papers enter the IEEE Big Data Workshop Proceedings.
- **Milestones and state:** the organizer says October 4, 2026 AoE, which would
  be October 5 at 11:59 UTC. OpenReview instead stores
  `2026-10-05T06:59:00Z`, five hours earlier, followed by a 30-minute technical
  grace period. Surface the conflict and use the earlier operational cutoff
  until the organizer corrects it. Author notification is October 21 and
  camera-ready is described only as the end of October. The route is open at
  this audit date.
- **Participation and cost:** IEEE Big Data runs December 14–17 in Phoenix. The
  host and organizer support remote presentation, but at least one author must
  register at the author rate: $850 for an IEEE member, including a student or
  life member, or $1,020 for a nonmember, including a student nonmember. Travel
  is optional for remote presenters; no general travel or lodging support is
  promised. High-school eligibility is not stated.
- **Evidence:** [official IEEE Big Data program](https://bigdataieee.org/BigData2026/program/),
  [organizer call](https://trustmoreai.github.io/workshop2026/),
  [OpenReview venue metadata](https://api2.openreview.net/groups?id=IEEE.org/BigData/2026/Workshop/TRUSTMORE),
  [OpenReview invitation metadata](https://api2.openreview.net/invitations?id=IEEE.org/BigData/2026/Workshop/TRUSTMORE/-/Submission&expired=true),
  and [parent registration rules](https://bigdataieee.org/BigData2026/attending/registration/).

### CoRL 2026 main conference

- **Canonical identity:** `corl:2026:main-paper`. This is the archival main
  paper route, distinct from the generic workshop-day hub.
- **Format:** eight-page initial paper plus references and appendix; the call
  requires a limitations section. Accepted papers appear in PMLR proceedings
  and are presented as posters, with selected papers receiving oral spotlights.
- **Milestones and state:** the official call gives abstract May 25 and full
  paper May 28, both at 11:59 p.m. AoE; supplement June 4 and acceptance
  September 4. All entry deadlines are closed. The main conference is November
  9–11 in Austin; workshops are November 12.
- **Access and cost:** high-school author eligibility is not stated. In-person
  registration and travel are participant-paid. The official table lists $200
  for the student full-conference category and $400 academic before late fees;
  the student label does not prove high-school access. Workshop-only prices are
  $75 student and $150 academic. The visa-letter policy explicitly does not
  provide financial support.
- **Evidence:** [official call for papers](https://www.corl.org/contributions/call-for-papers),
  [author instructions](https://www.corl.org/contributions/instruction-for-authors),
  [registration](https://www.corl.org/attending/registration), and
  [OpenReview venue](https://openreview.net/group?id=robot-learning.org/CoRL/2026/Conference).

### Named CoRL 2026 workshop contribution routes

These should be child routes under CoRL 2026, grouped in the interface but kept
distinct because their formats and deadlines differ. They were traced from the
[official accepted-workshop directory](https://www.corl.org/program/workshops).
High-school eligibility is not stated for any. Registration and Austin travel
remain separate, participant-paid costs unless the organizer publishes
route-specific aid.

| Proposed canonical route | Contribution and outcome | Deadline / status | First-party evidence |
| --- | --- | --- | --- |
| `corl:2026:workshop:agentic-robotics` | Separate demo and up-to-8-page poster tracks; a provided-robot demo option lowers hardware access cost; archival status unstated | September 27, 11:59 p.m. AoE; open | [Organizer call](https://agentic-robotics-workshop.github.io/) |
| `corl:2026:workshop:continually-self-improving-robots` | Up to 8 pages, double-blind; explicitly non-archival | September 28, 11:59 p.m. AoE; open | [Organizer call](https://csircorl.github.io/website/) |
| `corl:2026:workshop:physics-simulation-world-models` | Up to 4 pages; non-archival; poster and selected oral spotlights | September 30, 11:59 p.m. AoE; open | [Organizer call](https://corl26ws-physwm.github.io/) |
| `corl:2026:workshop:physical-ai-safety` | Up to 4 pages plus a distinct short safety-failure demo route; ten $2,000 grants are restricted to graduate or early-career researchers | October 1 AoE; open | [Organizer call](https://spais-ws.org/) |
| `corl:2026:workshop:learn-at-deploy` | Up to 8 single-column pages; explicitly non-archival | October 5 AoE; acceptance October 19; camera-ready November 1; open | [Organizer call](https://learn-at-deploy.github.io/) |
| `corl:2026:workshop:scaling-human-to-robot` | Long papers up to 8 pages or short papers up to 4; non-archival and concurrent submissions allowed | October 7 AoE; notification October 19; camera-ready October 30; open | [Organizer call](https://scaling-h2r-corl.github.io/) |
| `corl:2026:workshop:leap` | Long papers up to 8 pages or short papers up to 4; no copyright transfer; main-CoRL acceptances excluded | Organizer says late deadline October 7; open, but see conflict below | [Organizer call](http://leap-workshop.github.io) |
| `corl:2026:workshop:action-gap` | Research, position, or negative-result paper, 4–9 pages; non-archival | October 8, 11:59 p.m. AoE; open | [Organizer call](https://actiongapworkshop.github.io/) |
| `corl:2026:workshop:human-centered-robot-learning` | Up to 8 pages; non-archival; posters and selected spotlights | October 9, 11:59 p.m. AoE; open | [Organizer call](https://hc-robot-learning.github.io/) |
| `corl:2026:workshop:beneath-the-policy` | Four pages excluding references; archival status unstated | October 9, 11:59 p.m. Central Time; open | [Organizer call](https://beneath-the-policy.github.io/) |
| `corl:2026:workshop:grounded-4d-driving` | Short papers, abstracts, datasets, positions, and negative results; non-archival; an author should attend in person | October 12, 11:59 UTC; open | [Organizer call](https://arlo0o.github.io/Grounded-Driving-World-Models_Workshop/) |
| `corl:2026:workshop:roboletics` | Separate paper and demo tracks; page does not state page limit, timezone, or archival status | October 16; open with precision warning | [Organizer call](https://roboletics.github.io/corl2026/) |

OpenReview exposes an October 19 instant for LEAP even though the organizer says
October 7. Do not silently resolve this discrepancy. Store both observations,
mark the milestone conflicting, and use the organizer's earlier public deadline
unless it is corrected. Other official-directory candidates remain discovery
only where no deadline is posted or the date is explicitly tentative.

## Cross-disciplinary high-school competitions

### Regeneron ISEF 2027

- **Identity and access:** enrich the existing ISEF record. Students in grades
  9–12 or equivalent cannot apply directly; they must qualify through a
  Society-affiliated fair. The local or regional fair's deadline, fees, forms,
  and qualification process are therefore the student's next action.
- **Edition:** ISEF 2027 is May 8–14 in Los Angeles. April 12 is the last date an
  affiliated fair may operate, not a universal student submission deadline.
- **Discipline mapping:** the official category system supports biomedical and
  health sciences, biomedical engineering, chemistry, computational biology,
  environmental science and engineering, embedded systems, energy, materials,
  physics, robotics and intelligent machines, software design, and other STEM
  areas. The category page is still labeled 2026, so use it as descriptive
  taxonomy evidence rather than falsely presenting it as a finalized 2027 rule
  set.
- **Costs and practical access:** local fair costs and qualifier rules vary.
  Finalist registration, travel, accompanying-adult costs, and aid are not
  uniform across the affiliated-fair network; unknown fields must not be shown
  as free.
- **Evidence:** [affiliated-fair network](https://www.societyforscience.org/isef/affiliated-fair-network/),
  [fair finder](https://findafair.societyforscience.org/),
  [official FAQ](https://www.societyforscience.org/isef/faq/), and
  [official categories](https://www.societyforscience.org/isef/categories-and-subcategories/all-categories/).

### GENIUS Olympiad 2027

- **Canonical identity:** `genius-olympiad:2027`; lifecycle: awaiting
  application announcement. The event is June 7–12, 2027 in Rochester, New
  York, and applications are expected to open in December 2026. No exact 2027
  submission deadline was verified.
- **Eligibility:** grades 8–12 worldwide, minimum age 13, and no college or
  university enrollment before the event. Students apply directly only where no
  National GENIUS Olympiad exists; regional fairs and national affiliates are
  alternate qualification paths. Presentation is in person and in English, and
  participants ages 13–18 require an adult chaperone.
- **Disciplines:** Science, Art, Short Film, Music, Robotics,
  Entrepreneurship, Speech, Coding, and AI, all within an environmental or
  sustainability frame. Preserve these as supported disciplines rather than
  labeling GENIUS as science-only.
- **Teams:** Science, Entrepreneurship, Coding, AI, and Short Film allow up to
  two students; Robotics and group Music allow up to three; Speech, Art, and
  solo Music are individual.
- **Costs:** $75 application fee per project; $695 participant and chaperone
  fee, or $495 when arranging one's own hotel. Travel to and from the event is
  excluded. The participation fee includes dorm lodging, selected meals,
  activities, a Niagara trip, and Rochester-airport shuttle service.
- **Evidence:** [official event site](https://geniusolympiad.org/),
  [official rules PDF](https://geniuscountries.s3.us-east-2.amazonaws.com/GENIUS_Rules.pdf),
  and [discipline descriptions](https://geniusolympiad.org/disciplines.html).

The GENIUS homepage contains mixed older dates. Do not turn its generic March 1
or May text into 2027 milestones without a year-specific call.

## Electrical and biomedical engineering conference routes

### ISCAS 2027 regular paper

- **Canonical identity:** `ieee-iscas:2027:regular-paper`, distinct from the
  existing live-demo record.
- **Milestones:** regular paper October 13, 2026; notification January 11,
  2027; final paper January 27. The conference is June 6–9 in Bordeaux.
- **Outcome and access:** archival IEEE Xplore proceedings with an in-person
  oral or poster presentation. High-school eligibility is not stated.
  Registration and travel amounts are not yet published in the reviewed call.
- **Evidence:** [official ISCAS call](https://2027.ieee-iscas.org/call-for-papers).

### ICASSP 2027 regular paper

- **Canonical identity:** `ieee-icassp:2027:regular-paper`.
- **Format:** four-page paper plus an optional fifth references-only page.
  In-person presentation and an author registration are required.
- **Milestones:** full paper September 23, 2026; no time or timezone is given,
  so store it as date-only. Notification January 13, 2027; final paper January
  27; author registration February 10. The conference is May 16–21 in Toronto.
- **Access and cost:** high-school eligibility is not stated. Registration and
  travel prices were not published in the inspected call. Because the audit date
  equals the date-only deadline, do not infer an exact closing instant.
- **Evidence:** [official conference call](https://2027.ieeeicassp.org/call-for-papers/)
  and [IEEE Signal Processing Society event page](https://signalprocessingsociety.org/events/2027-ieee-international-conference-acoustics-speech-and-signal-processing-icassp).

### IEEE SENSORS 2026

- **Canonical identity:** `ieee-sensors:2026:regular-paper`; keep as a closed
  current-edition record and monitor for 2027 rather than rolling dates.
- **Routes:** Option A conference-proceedings paper was due July 2 and allows
  three pages plus an optional fourth references-only page. Option B IEEE
  Sensors Letters was due May 4. On-site presentation is required for IEEE
  Xplore publication.
- **Participation and cost:** one author must pay a full member/nonmember author
  fee; a student registration cannot cover publication. The official page lists
  an early nonmember author rate of $1,150 plus 21% VAT and a reduced student
  rate of $650 plus VAT, but the latter does not satisfy the paper-registration
  requirement. Travel and lodging remain separate. High-school eligibility is
  not stated.
- **Event:** October 25–28 in Rotterdam.
- **Evidence:** [official conference site](https://2026.ieee-sensorsconference.org/),
  [initial-author instructions](https://2026.ieee-sensorsconference.org/authors/initial-author-instructions),
  and [registration](https://2026.ieee-sensorsconference.org/registration/).

### EMBC monitoring decision

Do not publish an actionable EMBC 2027 record yet. The official 2026 conference
concluded July 26–30 in Toronto, while the paper/workshop page still contains
placeholder date text. The 2026 registration policy required one full author
registration for publication; its student category covered only full-time
undergraduate and postgraduate students, so it is not evidence of high-school
eligibility. Monitor for a first-party 2027 announcement instead of projecting
dates or eligibility from 2026.

Evidence: [EMBC 2026 official site](https://embc.embs.org/2026/) and
[official registration page](https://embc.embs.org/2026/registration/).

## Implementation recommendations

1. Enrich the existing ISEF record with qualification semantics, local-fair
   next action, and its supported cross-disciplinary tags. Add GENIUS 2027 as
   awaiting announcement with its direct-versus-affiliate pathway explicit.
2. Add ISCAS regular paper beside, not over, the existing live demo. Add ICASSP
   regular paper. Preserve SENSORS 2026 as closed and with its author-fee rule;
   leave EMBC 2027 unpublished until an official call exists.
3. Add CoRL main paper as closed/historical and named workshop children for
   Agentic Robotics, Learn@Deploy, Scaling Human-to-Robot, and optionally LEAP
   after resolving its deadline conflict. Retain the generic CoRL workshop
   record only as a discovery hub and do not count it as actionable coverage.
4. Add closed MODULAR under IROS 2026 and open TRUSTMORE under IEEE Big Data
   2026. Add aliases, but never map TRUSTMORE to IROS or label it a robotics
   route without topic evidence.
5. For every advanced call above, store eligibility as `not stated`, keep it out
   of the strict high-school-route preset, and use a reviewed advanced-route
   publication path. Do not convert unknown registration, travel, lodging, or
   aid values into false `free` filters.
6. Store organizer-page dates and OpenReview invitation timestamps as separate
   field-level observations with retrieval time and source. The LEAP conflict is
   the regression fixture for this rule.

## Verification gaps and follow-up

- Current numeric CoRL and IROS registration rates were not established here;
  route records should say unknown, not free.
- LEAP's organizer and OpenReview deadlines disagree and need organizer/editor
  resolution.
- ICASSP gives no deadline time or timezone; its September 23 milestone is
  date-only.
- The current ISEF category page is labeled 2026. Recheck the 2027 rulebook
  before treating category details or team rules as edition-specific.
- GENIUS has not yet published a fully dated 2027 application schedule; monitor
  the official call rather than copying generic dates.
- EMBC 2027 and IEEE SENSORS 2027 were not announced in the reviewed sources.
  Keep monitors, not speculative open listings.
