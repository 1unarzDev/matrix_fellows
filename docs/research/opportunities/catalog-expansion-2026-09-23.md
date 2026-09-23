# Opportunity catalog expansion: research internships, summer programs, and HOSA

Checked against first-party organizer pages on **2026-09-23**. This note proposes
15 nonduplicate routes after comparing titles and organizers with
`docs/research/catalogs/*.json` and `shared/data/opportunity-catalog-additions.ts`.
It is evidence for an idempotent catalog backfill, not evidence that production
publication has occurred.

The current catalog already includes SIMR, Simons, Rockefeller SSRP, BU RISE,
Garcia, NASA/UT Austin SEES, RSI, SSP, PROMYS, Ross, and MIT PRIMES-USA. Do not
create alternate records for those programs. Costs below are separated into
application/program fees, compensation or aid, and participant-paid logistics.
An unstated cost is **unknown**, not free.

## Recommended taxonomy and filter changes

- Add `Internship` and `Summer program` as explicit kinds. Use `Internship` for
  supervised work in a lab or research group and `Summer program` for a
  structured cohort that combines research with instruction. Do not make users
  search for both under the generic `Program` label.
- Keep HOSA Medical Innovation under `Competition`; add `prototype` and
  `completed research` preparation stages. Its official name is **Medical
  Innovation**. “HOSA Biomedical Innovation” and “Biomedical Innovations” are
  search aliases, not the displayed title.
- Add visible facets for `Paid / stipend`, `No program fee`, `Need-based aid`,
  and `Commuter / housing not provided`. “Paid” must not imply that housing,
  meals, or travel are covered.
- Preserve geography as a first-class filter. Most internships below are local
  commuter routes even when the organizer has national name recognition.
- Treat `Applications open`, `Upcoming application window`, `Awaiting next
cycle`, and `Closed` distinctly. Do not roll 2026 deadlines into 2027.
- For preparation, distinguish `first research experience welcome`, `research
experience not required`, and `independent research project`. Those are not
  interchangeable.

## Coverage summary

| Route                                | Proposed kind  | Primary coverage                                    | Current state on 2026-09-23                   |
| ------------------------------------ | -------------- | --------------------------------------------------- | --------------------------------------------- |
| HOSA Medical Innovation              | Competition    | Biomedical engineering, health technology           | 2026–27 rules announced                       |
| NIST SHIP                            | Internship     | Physical science, engineering, computing            | 2027 window announced                         |
| Navy SEAP                            | Internship     | Engineering, computing, physical science            | 2027 applications open                        |
| Fermilab PRISM                       | Summer program | Physics, engineering, AI, quantum science           | 2027 dates announced                          |
| AEOP High School Internships         | Internship     | Engineering, biology, materials, cybersecurity      | Site-dependent openings / rolling portal      |
| Brookhaven HSRP                      | Internship     | Physics, computing, engineering, biology            | 2026 closed; next cycle unannounced           |
| Berkeley Lab Experiences in Research | Internship     | Experimental/data science and communication         | 2026 closed; next cycle unannounced           |
| UCSC Scholar Immersion Program       | Summer program | Science, engineering, social science, humanities    | 2027 window announced                         |
| Broad Summer Scholars Program        | Summer program | Biomedical science, genomics, computation           | 2026 closed; next cycle unannounced           |
| UT Austin HSRA                       | Summer program | Biology, chemistry, environment, neuroscience, data | January 2027 reopening announced              |
| Fred Hutch SHIP                      | Internship     | Biology, biomedical research                        | 2026 closed; 2027 information due in November |
| Seattle Children’s RTP               | Summer program | Biology, biochemistry, microbiology, public health  | 2026 closed; 2027 information due late 2026   |
| MSK Summer Student Program           | Internship     | Cancer biology, chemistry, computation, imaging     | 2026 closed; next cycle unannounced           |
| MD Anderson King Foundation program  | Internship     | Biomedical science and allied health                | 2026 closed; 2027 information due in October  |
| George Mason ASSIP                   | Internship     | Broad STEM, including biomedical and environmental  | 2026 closed; next cycle unannounced           |

## Route records

### 1. HOSA Medical Innovation

- **Canonical identity:** `hosa-medical-innovation:2026-27`; aliases: `HOSA
Biomedical Innovation`, `Biomedical Innovations`. Organizer: HOSA–Future
  Health Professionals. Parent: 2027 International Leadership Conference (ILC).
- **Kind / format:** Competition; team prototype, digital outline, exhibit, and
  finalist presentation. Disciplines: biomedical engineering, health science,
  engineering. Topics: medical devices, healthcare delivery, health technology,
  product design.
- **High-school eligibility:** Explicitly supported through HOSA's Secondary
  Division (grades 9–12). Competitors must be HOSA members on a chapter roster;
  individual membership is not available. Teams contain 2–4 competitors. Local
  and state qualification/upload rules can add earlier requirements.
- **Preparation and prerequisites:** An original medical innovation, supporting
  evidence for the need, a prototype, a maximum 13-slide outline PDF plus
  references, a physical exhibit, and a required ILC display. Advancing teams
  give a five-minute oral presentation. The team supplies the exhibit and may
  not use flames, body fluids, living organisms, sharps, or hazardous materials;
  electricity and Wi-Fi are not supplied.
- **Costs and access:** Submission fee is not stated. HOSA membership and ILC
  registration are required, but amounts are not established by the event
  guideline. Prototype materials, travel, lodging, and accompanying-adult costs
  are not funded or priced in the inspected sources and must remain unknown.
- **Milestones / status:** Current 2026–27 guidelines are announced. The ILC
  upload cutoff is written as “May 15 at midnight EST” without a year; do not
  encode a 2027 instant until a fully dated source corroborates it. The 2027 ILC
  is June 22–25 in Philadelphia. Mode: remote outline upload followed by
  in-person display/presentation for ILC competitors. Outcome is a judged
  competition, not archival publication.
- **Official evidence:** [2026–27 event guideline](https://hosa.org/wp-content/uploads/2026/08/MI-26-27-FINAL-1.pdf),
  [competitive-event hub](https://hosa.org/guidelines/),
  [membership structure](https://hosa.org/membership/), and
  [2027 ILC](https://hosa.org/ilc/).

### 2. NIST Summer High School Intern Program (SHIP)

- **Canonical identity:** `nist-ship:2027`; organizer: National Institute of
  Standards and Technology.
- **Kind / format:** Internship; seven-week, unpaid, in-person research project
  at NIST Gaithersburg, Maryland, or Boulder, Colorado. Disciplines include
  physics, chemistry, engineering, computing, materials, and measurement science.
- **High-school eligibility:** U.S. citizen; high-school junior or senior at
  application; minimum unweighted 3.0 GPA; permanent residence within 50 miles
  of the host campus; full seven-week commitment. Helpful skills are listed, but
  not required.
- **Costs and access:** The organizer explicitly calls SHIP unpaid. Application
  and program fees, transport, meals, housing support, and aid are not stated.
  The permanent-residence rule makes this a commuter route.
- **Milestones / status:** 2027 vacancy announcement expected through USAJobs in
  mid-October 2026; applications due at the end of January 2027; exact days and
  program dates are still TBD. Outcome: mentored research and poster session.
- **Official evidence:** [NIST SHIP overview and eligibility](https://www.nist.gov/iaao/summer-high-school-intern-program)
  and [application/selection process](https://www.nist.gov/ship/ship-application-and-selection).

### 3. Science and Engineering Apprenticeship Program (SEAP)

- **Canonical identity:** `navy-seap:2027`; organizer: U.S. Department of the
  Navy.
- **Kind / format:** Internship; eight weeks of in-person research at a
  participating Navy laboratory, with a possible extension of up to two weeks.
  About 300 placements across 38 laboratories are advertised. Disciplines span
  engineering, computing, physical science, materials, and related laboratory
  research.
- **High-school eligibility:** Currently enrolled high-school students who have
  completed at least grade 9; graduating seniors may apply; generally age 16 by
  internship start and U.S. citizens. Individual labs may publish exceptions for
  grade, age, permanent residents, or dual citizens, so the selected lab remains
  part of eligibility.
- **Costs and access:** New participants receive a $4,000 stipend. Application
  fee, registration/program fee, housing, travel, meals, and materials are not
  stated on the inspected program page.
- **Milestones / status:** Application enrollment for 2027 opened September 15,
  2026; the official page gives a September 15–November 30 application period.
  Outcome: mentor-supervised naval research; non-archival unless a particular
  lab states otherwise.
- **Official evidence:** [SEAP program and 2027 application window](https://navalsteminterns.us/internships/seap/).

### 4. Fermilab Program for Research, Innovation, and STEM Mentorship (PRISM)

- **Canonical identity:** `fermilab-prism:2027`; organizer: Fermi National
  Accelerator Laboratory.
- **Kind / format:** Summer program; four-week research-and-mentorship experience
  in particle physics, quantum science, engineering design, and artificial
  intelligence. The listed schedule is on-site and off-site rather than remote.
- **High-school eligibility:** Illinois high-school senior for the 2027–28 school
  year or 2027 high-school graduate; U.S. citizen; proof of medical insurance.
  No STEM-course prerequisites are required. Application needs a course list and
  a recommendation from a STEM teacher or club adviser.
- **Costs and access:** $500 weekly salary; Fermilab does not provide housing;
  transportation assistance is available. Application/program fees, meals, and
  other travel support are not stated.
- **Milestones / status:** Applications January 12–March 1, 2027; offers April
  12; acceptance April 21; program July 12–August 6. Outcomes include a research
  abstract, poster, and final presentation.
- **Official evidence:** [Fermilab PRISM](https://internships.fnal.gov/fermilab-program-for-research-innovation-and-stem-mentorship-prism/).

### 5. AEOP High School Internships

- **Canonical identity:** `aeop-high-school-internships`; organizer: Army
  Educational Outreach Program. Child identity should include host lab and
  posting ID whenever a specific position is published.
- **Kind / format:** Internship; generally full-time, short-term, in-person
  research at Army or Army-funded university laboratories. Topics include
  cybersecurity, energetics, biology, materials science, and engineering.
- **High-school eligibility:** U.S. citizen or lawful permanent resident, age
  14+, currently enrolled in high school (the portal also allows recent graduates
  who have not entered an undergraduate program). Individual sites may add age,
  coursework, and location requirements. Parent/guardian authorization is
  required under age 18.
- **Costs and access:** No application fee; participation is free; all interns
  receive a site-dependent educational stipend disclosed in an award letter.
  Housing, transport, and meals are not provided. Applicants should select only
  labs within commuting distance.
- **Milestones / status:** The common application remains open, while deadlines
  and actual openings are site-specific or rolling. Do not present the umbrella
  as proof that a particular lab is accepting applicants. Required end product:
  a research abstract published in the online AEOP Research Journal.
- **Official evidence:** [internship overview](https://aeopinternships-fellowships.org/internships/),
  [eligibility and logistics FAQ](https://aeopinternships-fellowships.org/faq/), and
  [application process](https://aeopinternships-fellowships.org/application-process/).

### 6. Brookhaven National Laboratory High School Research Program (HSRP)

- **Canonical identity:** `brookhaven-hsrp:2026`; organizer: Brookhaven National
  Laboratory.
- **Kind / format:** Internship; six-week, full-time, on-site collaboration with
  a scientific research team. Disciplines include physics, computing, biology,
  chemistry, engineering, and energy/environmental science.
- **High-school eligibility:** Recommended for students who have completed grade
  11; age 16+ by program start; U.S. citizen or lawful permanent resident; active
  health insurance; full weekday commitment. Two recommendations are required.
  It is a commuter program and housing/transport are not provided.
- **Preparation and outcomes:** Students contribute to a shared research goal;
  the organizer explicitly says independent research projects are not permitted.
  Participants present a poster and/or oral presentation at the end.
- **Costs and access:** Application fee, program fee, stipend, meals, materials,
  and aid are not stated on the inspected page.
- **Milestones / status:** The 2026 application opened January 12 and closed
  March 20 at 5 p.m.; no 2027 cycle is announced. Preserve as closed/current
  historical evidence and monitor the official page.
- **Official evidence:** [Brookhaven HSRP](https://www.bnl.gov/education/programs/program.php?q=219).

### 7. Berkeley Lab Experiences in Research (EinR)

- **Canonical identity:** `berkeley-lab-experiences-in-research:2026`; organizer:
  Lawrence Berkeley National Laboratory.
- **Kind / format:** Internship; six weeks, 30–35 hours weekly, working with
  Berkeley Lab professionals. Project areas include experimental research, data
  science, coding, administration, and science communication; 2026 projects were
  hybrid or virtual depending on office and scope.
- **High-school eligibility:** Current grades 10–12 in Northern California, with
  priority within 30 miles of the lab; prior independent-work experience. The
  page says interns must be 16 but still gives a **June 16, 2025** age cutoff in
  otherwise 2026 copy. Store age 16 as guidance and flag the stale cutoff for
  review; do not quote it as a valid 2026 exact date.
- **Costs and access:** Paid $500 weekly. Application/program fees, housing,
  transport, meals, equipment, and aid are not stated.
- **Milestones / status:** 2026 applications ran February 2–March 22; program
  June 15–July 24; now closed with no 2027 dates. Former interns cannot repeat.
- **Official evidence:** [Berkeley Lab Experiences in Research](https://k12education.lbl.gov/programs/high-school/experiences-in-research).

### 8. UC Santa Cruz Scholar Immersion Program (SIP)

- **Canonical identity:** `ucsc-scholar-immersion-program:2027`; alias: `UCSC
Science Internship Program` (former name). Organizer: UC Santa Cruz.
- **Kind / format:** Summer program; eight-week, in-person authentic research in
  science, engineering, social science, humanities, or art, mentored by UCSC
  researchers. Campus housing is offered; commuting/shuttle choices also exist.
- **High-school eligibility:** Age 14–17 for the program duration; students who
  will have graduated by summer are generally ineligible; some projects require
  age 16. Application requires transcript/GPA and one academic reference.
- **Costs and access:** $68 nonrefundable application fee, with fee waiver by
  request. 2027 tuition, housing, and optional fees will not be published until
  December 2026. Limited need-based aid covers 25–100% of tuition/program fees;
  deposits and remaining balances apply after acceptance. Travel, meals, and
  materials remain unknown until the cost schedule appears.
- **Milestones / status:** Portal opens January 15, 2027; deadline February 26 at
  12 noon; reference due March 5; research June 14–August 6; final presentations
  August 7. The source calls the deadline “PST (-7 UTC),” an internally
  inconsistent timezone label/offset for February. Preserve the original wording
  and do not compute an exact UTC instant until corrected.
- **Official evidence:** [program overview](https://sip.ucsc.edu/) and
  [2027 application, eligibility, aid, and schedule](https://sip.ucsc.edu/applying-to-sip/).

### 9. Broad Summer Scholars Program (BSSP)

- **Canonical identity:** `broad-summer-scholars:2026`; organizer: Broad Institute.
- **Kind / format:** Summer program; six-week, in-person mentored biomedical and
  genomics research with scientific poster and presentation preparation.
- **High-school eligibility:** Students apply during junior year as rising
  seniors; attend a Massachusetts high school within commuting distance; grades
  of B or better in science and mathematics; U.S. citizen, permanent resident,
  or noncitizen with employment authorization; full six-week commitment. Prior
  research is not required.
- **Costs and access:** No application fee or attendance cost; $3,600 stipend and
  partial transportation reimbursement. Housing and other travel support are not
  stated; the route is commuter-based.
- **Milestones / status:** 2026 applications opened November 24, 2025, closed
  January 21, 2026, and decisions were due March 20; program June 29–August 7.
  No 2027 dates were verified, so retain as closed and monitor rather than rolling
  the calendar forward.
- **Official evidence:** [Broad Summer Scholars Program](https://www.broadinstitute.org/partnerships/education/k-12-outreach/broad-summer-scholars-program).

### 10. UT Austin Summer High School Research Academy (HSRA)

- **Canonical identity:** `ut-austin-hsra:2026`; organizer: UT Austin Freshman
  Research Initiative.
- **Kind / format:** Summer program; five-week, nonresidential, in-person research
  approximately 15–25 hours weekly. Topics include biochemistry, biology,
  environmental science, genetics, neuroscience, genome engineering, and data
  analytics. Students earn NSC 309 UT Extension credit and present a printed
  poster at the closing symposium.
- **High-school eligibility:** Age 15+ by June 1, 2026; rising sophomore, junior,
  or senior, with preference for juniors/seniors; full-program commitment. No
  recommendation, transcript, GPA, or class rank is used; selection emphasizes
  the essay and project fit. The official page conflicts internally by saying
  applicants “MUST be a Texas resident” and elsewhere that Texas residents are
  prioritized while others are encouraged. Preserve this conflict and do not
  enforce a strict geography value until the 2027 rules clarify it.
- **Costs and access:** 2026 fee $4,000, including a $400 nonrefundable deposit
  credited toward the fee. Limited need-based awards may include tuition waiver
  and stipend; no merit aid. Housing and transportation are not provided.
- **Milestones / status:** 2026 deadline March 22 at 11:59 p.m. CST; program June
  8–July 15. The official page says applications reopen in January 2027 but does
  not yet provide the 2027 day, fee, or program dates.
- **Official evidence:** [HSRA overview and 2026 schedule](https://fri.cns.utexas.edu/community-outreach/summer-high-school-research-academy)
  and [HSRA costs and logistics FAQ](https://fri.cns.utexas.edu/hsra-faq).

### 11. Fred Hutch Summer High School Internship Program (SHIP)

- **Canonical identity:** `fred-hutch-ship:2026`; organizer: Fred Hutchinson
  Cancer Center.
- **Kind / format:** Internship; eight-week, full-time, paid, in-person program:
  two weeks of safety/laboratory training followed by six weeks of paired,
  mentored work in a Seattle research group. Designed for students without
  extensive research experience.
- **High-school eligibility:** Entering senior year; age 16+ at start; currently
  resides in Greater Seattle/surrounding area; entire eight-week availability.
  Out-of-state and international students are not accepted. Application includes
  resume, transcript, essays, and two online recommendations.
- **Costs and access:** Application/program fees are not stated. Interns receive
  a financial award after successful completion, but the amount is disclosed
  only to interviewees. A free ORCA transit card is provided. Housing is not
  provided; interns arrange their own transportation.
- **Milestones / status:** 2026 deadline March 13; program June 22–August 14;
  closed. The official page says 2027 information will be posted in November.
  Outcome: research seminars, professional development, and final presentation.
- **Official evidence:** [Fred Hutch SHIP](https://www.fredhutch.org/en/education-training/high-school-students/summer-high-school-internship-program.html).

### 12. Seattle Children’s Research Training Program (RTP)

- **Canonical identity:** `seattle-childrens-rtp:2026`; organizer: Seattle
  Children’s Research Institute.
- **Kind / format:** Summer program; four-week, in-person, scaffolded biology-lab
  experience with an independent project and final oral presentation. Topics
  include biochemistry, immunotherapy, gene editing, infectious disease, and
  public health.
- **High-school eligibility:** Current grades 10–11, within commuting distance
  of downtown Seattle; SSN or ITIN required for the taxable stipend. This is
  explicitly intended as a first research experience; prior formal research is
  not required. One recommendation is required.
- **Costs and access:** No participation cost; $2,000 stipend toward transport
  and meals. Housing is not provided or arranged.
- **Milestones / status:** 2026 applications opened January 5; application due
  March 8 at 11:59 p.m. Pacific; recommendation due March 29 at 11:59 p.m.;
  mandatory orientation May 21; program July 13–August 7. Closed; the organizer
  says to check back late 2026 for summer 2027.
- **Official evidence:** [Seattle Children’s high-school training program](https://www.seattlechildrens.org/research/centers-programs/science-education-department/high-school-training-programs/).

### 13. Memorial Sloan Kettering Summer Student Program

- **Canonical identity:** `msk-summer-student:2026`; organizer: Memorial Sloan
  Kettering Cancer Center.
- **Kind / format:** Internship; eight-week, in-person biomedical or computational
  laboratory placement. Topics include cancer/cell biology, chemical biology,
  computational biology/genomics, engineering/imaging, immunology, pharmacology,
  and structural biology.
- **High-school eligibility:** Current junior; permanent address in New York,
  New Jersey, or Connecticut within 25 miles of MSK’s Manhattan main campus;
  legally authorized to work in the U.S.; science GPA 3.5; age 14+ by June 2026;
  full eight-week commitment. Application needs essays, one-page resume, all
  high-school transcripts, and two confidential recommendations.
- **Costs and access:** $1,200 summer stipend. Application/program fees are not
  stated; housing and transportation are not provided.
- **Milestones / status:** 2026 applications opened December 1, 2025 and closed
  February 6, 2026 at 8 a.m. EST; program June 29–August 21. No 2027 cycle is
  verified. Research is self-directed within a mentor’s lab project. PI approval
  is required before science-fair/external submission, and an IRB protocol
  addition may apply. Applicants and parents must not contact faculty during
  application.
- **Official evidence:** [MSK Summer Student Program](https://www.mskcc.org/education-training/summer-student).

### 14. Carl B. & Florence E. King Foundation High School Summer Program in Biomedical Sciences

- **Canonical identity:** `md-anderson-king-high-school-summer:2026`; organizer:
  UT MD Anderson Cancer Center School of Health Professions.
- **Kind / format:** Internship; nine- to ten-week, in-person faculty-guided
  biomedical/allied-health laboratory research in Houston. Prior laboratory or
  research experience is explicitly not required.
- **High-school eligibility:** Texas public/private/charter/home-school senior in
  the spring before the program; graduates before program; accepted to college
  for the following fall; age 18+ by start; U.S. citizen, permanent resident, or
  work-authorized visa holder; full-program commitment.
- **Costs and access:** $7,200 taxable stipend for ten weeks or $6,480 for nine.
  Application/program fees are not stated. Participant supplies housing,
  transportation, meals, and other expenses.
- **Milestones / status:** 2026 applications opened November 17, 2025 and closed
  January 14, 2026; program June 1–August 7. Closed; the page says to check back
  in October for 2027 details. Outcomes may include an abstract, poster,
  elevator-pitch competition, and closing presentation.
- **Official evidence:** [MD Anderson High School Summer Program](https://www.mdanderson.org/education-training/research-training/early-career-pathway-programs/summer-research-programs/programs/high-school-summer-program.html).

### 15. George Mason Aspiring Scientists Summer Internship Program (ASSIP)

- **Canonical identity:** `gmu-assip:2026`; organizer: George Mason University.
- **Kind / format:** Internship; eight-week, full-time research with George Mason
  or collaborating-institution faculty. Projects span biomedical science,
  chemistry, astronomy, engineering, computing, materials, environmental
  science, robotics, neuroscience, and other fields. Positions may be in-person,
  hybrid, or remote by mentor/project.
- **High-school eligibility:** Age 15+ for remote or computer-lab positions and
  age 16+ for wet-lab positions by the 2026 start. No maximum age while the
  applicant has not graduated from university. Project-specific skills and
  mentor fit still apply.
- **Costs and access:** $25 application fee, waivable for financial need; accepted
  interns pay $1,299 tuition for three undergraduate credits, also waivable on
  demonstrated need. Housing, travel, meals, transport, and materials support
  are not stated.
- **Milestones / status:** 2026 applications are closed; orientation June 18 and
  final poster August 12. No 2027 dates are verified. Outcomes: original research,
  scientific writing/communication, three credits, and poster presentation;
  publication is possible but not promised.
- **Official evidence:** [ASSIP overview, eligibility, 2026 status, and costs](https://science.gmu.edu/assip).

## Verification and publication rules

1. **No duplicate identity:** use the canonical IDs above and source aliases;
   keep separate only when a named host-lab posting has materially different
   eligibility or dates.
2. **No silent rollover:** only HOSA, NIST, SEAP, PRISM, UCSC SIP, and UT HSRA
   currently contain a verified 2026–27 or 2027 signal. Historical 2026 dates for
   other programs remain historical.
3. **No false “free” label:** NIST is unpaid, not necessarily cost-free; paid
   internships can still require participant-funded housing, meals, or travel.
   Apply `freeSubmission` only when the organizer expressly says no application
   fee.
4. **Eligibility filter:** all 15 routes explicitly support high-school students,
   but strict filters must also enforce grade/age/geography. A national organizer
   does not make a commuter program nationally accessible.
5. **Participation mode:** remote application does not mean remote participation.
   HOSA combines digital submission with in-person conference participation;
   EinR and ASSIP are the only records here with organizer-supported remote or
   hybrid project variants.
6. **Known source conflicts:** Berkeley Lab retains a stale 2025 age cutoff in
   2026 copy; UT HSRA conflicts on Texas residency; UCSC labels a February
   deadline “PST (-7 UTC).” Mark those fields for owner review rather than
   manufacturing normalized certainty.
7. **Full-field check before publish:** require kind, disciplines/topics,
   preparation stage, explicit high-school evidence, restrictions, participation
   mode, every cost bucket (including explicit `unknown`), prerequisites,
   lifecycle/status, outcomes, and field-level official source references.

## Deliberate exclusions from this pass

- **NASA OSTEM internships:** NASA’s current official comparison page describes
  OSTEM as college-level, despite older general awareness that some NASA routes
  once included high school. Do not add a high-school route from stale claims.
- **Jackson Laboratory Summer Student Program:** the current official page now
  describes an undergraduate program, so it is not a high-school addition.
- **Cincinnati Children’s 2027 High School Summer Immersion Program:** a first-
  party page announces a one-month program and November 1–February 1 application
  window, but cost, compensation, detailed eligibility, mode, and requirements
  are not yet published. Add it to the monitored source registry, not the public
  catalog, until those fields are available.
- **JSTI 2026:** the official page states that JSTI is not scheduled to occur in 2026. Do not infer a 2027 return.
- **UCSC/UC Davis and commercial programs:** UCSC SIP is included with disclosed
  fee/aid caveats. UC Davis YSP and other fee-charging programs require complete
  cost and eligibility verification before a future addition; generic commercial
  mentorship products were intentionally excluded.
