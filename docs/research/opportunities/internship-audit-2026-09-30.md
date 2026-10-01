# High-school internship audit

Observed September 30, 2026. This is an evidence and publication-review note,
not a claim that a program is open, that a Texas student meets every condition,
or that production records have been published. First-party HTML was retrieved
with an ordinary browser User-Agent. Failed requests are recorded as source
health problems, not cancellations. Dates have not been rolled forward.

## Selection and duplicate check

Checked `shared/data/opportunity-catalog-expansion.ts`,
`shared/data/opportunity-catalog-enrichment.ts`, and
`docs/research/catalogs/program.json`. Existing routes RSI, SSP, SIMR,
Simons SRP, Rockefeller SSRP, BU RISE, Garcia, NASA SEES, Navy SEAP,
Broad Summer Scholars, MD Anderson, ASSIP, BWSI, MITES Summer,
Clark Scholars, CMU AI Scholars, UC Davis YSP, and Iowa SSTP must keep
their current IDs. Reclassify/enrich supported internship placements in place;
do not create a second summer-program record for the same application.

The implementation agent additionally inspected the actual public catalog:
six Internship IDs are `catalog:navy-seap-2027`, `catalog:gmu-assip-2026`,
`catalog:md-anderson-king-summer-2026`, `catalog:bu-rise`, `catalog:nasa-sees`,
and `catalog:stanford-simr`. AEOP is not present despite the handoff's claim;
it is investigated separately below. Local files do not prove production data.

`ADD` means credible, substantive, and suitable for conditional Texas public
discovery; it does not mean every field or future cycle is known. `MONITOR`
means a publication gate remains. `LOCAL-ONLY` means keep in an internal
review register, outside the Texas public catalog. Unknown fees, housing,
travel, meals, dates, and requirements stay unknown.

## Candidate decisions

| Candidate | Recommendation | Verified scope / remaining publication gate |
| --- | --- | --- |
| Stripe HS Software Engineering Summer 2027 | ADD | First-party live specific job; Texas conditional on relocation/employment eligibility. |
| Microsoft Discovery | LOCAL-ONLY | Explicit Redmond radius / Atlanta districts; excludes ordinary Texas applicants. |
| MITRE HS internships | MONITOR | HS hiring hub verified; no concrete current high-school technical posting verified. |
| Sandia HS technical summer | MONITOR specific posting | Nationwide summer HS eligibility verified; role application page unsupported-browser shell. |
| AFRL Scholars | MONITOR | Organizer/eligibility first-party fetch blocked 403. |
| PNNL High School Intern Program | MONITOR | HS hub verified, lab age 18; posting geography/pay unresolved. |
| Stanford AIMI Summer Research | ADD | Virtual HS program and 2027 application dates verified; cost/materials/age unknown. |
| Stanford SHTEM | MONITOR | Old program path 404; no current route found on lab hub. |
| UT Southwestern STARS | ADD | North Texas grade-11 beginner lab placement; 2027 application dates verified. |
| Houston Methodist HS Research | ADD | 2027 route, grade/age/GPA/materials/program dates verified; Houston commuting/housing required. |
| Hutton Junior Fisheries Biology | MONITOR | Organizer blocked 403; no fresh 2027 claims verified. |
| NIH SIP HS-senior pathway | MONITOR | Eligibility page blocked; do not imply general HS eligibility. |
| Smithsonian Claudine K. Brown | MONITOR | First-party request blocked; graduating-senior claims still need direct verification. |
| St. Jude HS Research Immersion | LOCAL-ONLY | Current official URL recovered; explicitly Memphis/surrounding TN/MS/AR HS students. |
| UChicago DSI Summer Lab | LOCAL-ONLY | Explicit year-round Chicago residence exclusion. |
| Princeton Laboratory Learning | MONITOR / suspected LOCAL-ONLY | First-party request blocked; local-only handoff claim not newly verified. |
| Smithsonian NMNH HS internship | MONITOR / suspected LOCAL-ONLY | First-party request blocked; commuter-radius handoff claim not newly verified. |
| INL SparkLab | MONITOR / suspected LOCAL-ONLY | First-party request blocked; local-region handoff claim not newly verified. |
| Amazon Future Engineer | MONITOR as scholarship; EXCLUDE internship label | Award + future college internship, not immediate HS employment. |
| Meta Summer Academy | MONITOR | Careers JS shell, no current Academy edition evidence. |
| UT Dallas intensive CS lab research | ADD as research program | Substantive advanced lab placement, $1,500 fee, last verified cycle 2026; no paid-work claim. |
| NASA Texas Aerospace Scholars | ADD as program / duplicate check | Texas juniors/seniors; 2026–27 junior application closed. Not internship. |
| Texas A&M Camp SOAR | MONITOR as summer program | Verified 2027 short residential enrichment; secondary priority, not internship. |
| AEOP high-school internships | MONITOR host placements / conditional discovery | Nationwide commuter access verified; no Texas host currently in embedded listing; specific routes require host review. |

## Verified additions: application and practical evidence

### Stripe High School Internship, Software Engineering (Summer 2027) — ADD

Canonical specific first-party job:
<https://stripe.com/jobs/listing/high-school-internship-software-engineering-summer-2027/8241260>.
Organizer Stripe; employment internship. Disciplines CS/software engineering,
AI/ML where project-specific, infrastructure/security/data as supported topics.
Texas eligibility conditional: no residency radius stated, but requires
relocation/presence in Seattle or South San Francisco and employment
eligibility. Actual production software work with engineers, not an
introductory course. Substantive programming evidence required.

| Field | Exact source excerpt | Interpretation |
| --- | --- | --- |
| Audience | “current high school students graduating in 2027 or later.” | HS graduation 2027 or later; no maximum age stated. |
| Minimum enrollment | “Currently enrolled in high school, or graduating from high school before the internship begins.” | Current HS / pre-start graduate. |
| Duration/location | “full-time and in person from Stripe’s San Francisco or Seattle office for 12 consecutive weeks … between May and August 2027.” | 12 continuous weeks, individual agreed start/end; no exact fixed calendar interval. |
| Attendance | “We cannot accommodate remote participation, a shorter internship, or breaks within the 12-week period.” | In person, full-time; not remote/hybrid. |
| Work eligibility | “employment eligibility, minimum age, and documentation requirements for the role’s location by the internship start date.” | Exact age/work-authorization categories unknown. The source adds “Final language is subject to Legal review”; review gate/caveat. |
| Pay | “hourly position with a pay rate of $60 per hour.” | Role-specific $60/hour; no tuition/fees inferred. |
| Materials | “A resume or short summary of your technical experience”; “one or two examples of your strongest work, such as a repository, live product, technical paper, research abstract, competition submission, or project write-up.” | Resume/summary and 1–2 examples. |
| Materials detail | “problem, what you personally contributed, the hardest technical decision, how you tested the work, and what you learned.” | Explain contribution, judgment, tests, lessons. |
| Optional materials | “Optional: High school transcript, standardized test scores.” | Do not imply scores required. |
| Experience | “Evidence of exceptional technical achievement for your stage.” | Advanced builder route; no specific degree/test-score threshold. |
| Output | “Write, test, and document software intended for production use” | Production software/work product, not promised paper/poster. |
| Mentorship | “own a problem end to end with support from your manager and teammates” | Ownership of employer-scoped project, not unrestricted independent project. |

Page has active Apply now; opening/closing dates unstated. Do not label rolling.
Lifecycle applications open (job listing active), with no deadline marker.
Selection materials → employer technical/hiring review → offer; exact interview
steps not specified. Housing, travel, meals, application/program fees, and
financial aid not stated. Generic template conflicts: annual “$130,000–169,000”
salary and general “at least 50%” office requirement sit below explicit hourly
pay/onsite internship terms. Retain contradiction for review, prefer job-specific
terms; no hybrid/free-housing inference. Job ID 8241260 must be preserved as
source alias; current job rather than constructed annual URL.

### UT Southwestern STARS Summer Research Program for Students — ADD

- Organizer: UT Southwestern Medical Center; canonical source:
  <https://www.utsouthwestern.edu/education/nondegree-programs/stars/programs/summer-research-opportunities.html>.
- Type: Internship / research placement. Disciplines: biology, biomedical
  engineering, medicine; specific laboratory topic depends on faculty host.
- Description: eight-week mentored biomedical laboratory placement in Dallas;
  explicitly excludes clinical shadowing. `texasEligibility: conditional`:
  the program is intended for North Texas students, and the applicant must
  independently commute to Dallas. Do not generalize the teacher track's
  statewide eligibility to the student track.

| Field | Exact source excerpt | Structured interpretation |
| --- | --- | --- |
| 2027 application dates | “Applications for the Summer 2027 Summer Research Program will open November 16, 2026 and close on January 22, 2027.” | Opening 2026-11-16, submission 2027-01-22; date-only, time/timezone not stated. |
| Duration/housing | “This eight-week, non-residential program” | Eight weeks, in-person commuter; no residential housing. |
| Mentoring/pay/output | “work side by side with a faculty host in a research laboratory. Participants are paid a stipend and are required to present the results of their research at the end of the summer.” | Stipend amount unknown; end-of-program research presentation required. |
| Geography | “encourage students in North Texas” | Intended North Texas audience, not a national residential route. |
| Grade/age | “at least 16 years old by June 1 … currently classified as a junior, and be enrolled in high school.” | Grade 11 at application; age 16 by June 1 before program; maximum not stated. |
| Work eligibility | “All citizens or nationals of the United States or those eligible to work in the United States are eligible” | U.S. citizen/national or eligible to work in U.S.; do not narrow to citizenship only. |
| Experience | “students with prior research experience are not eligible.” | Prior research is an exclusion; beginner lab placement, competitive selection. |
| Research scope | “only in biomedical research laboratories and will not include any clinical or shadowing opportunities.” | Laboratory research, no clinical/shadowing promise. |
| Review factors | “Evidence of superior academic achievement”; “Strong interest and desire to pursue education in science and/or medicine” | Academic review and interest assessment; interview/offer stages not specified. |

The official student calendar independently corroborates the opening and
closing dates:
<https://www.utsouthwestern.edu/education/nondegree-programs/stars/assets/2026-27-student-calendar-of-events.pdf>.
It states “All dates subject to change.” Preserve a tentative flag for that
PDF; the main page states application dates without that qualification.
No exact 2027 program interval, weekly hours, stipend amount, student fee,
application materials, meals, or travel funding appears in the inspected
source. “All STARS events and materials are free to teachers” is not evidence
of free student participation. Independent project choice not stated; faculty
host placement. Lifecycle: upcoming application cycle.

### Houston Methodist Summer High School Research Internship — ADD

- Organizer: Houston Methodist Academic Institute; canonical call:
  <https://www.houstonmethodist.org/academic-institute/education/research/summer-internship-program/highschoolresearchinternship/>.
- Hub/FAQ:
  <https://www.houstonmethodist.org/academic-institute/education/research/summer-internship-program/>.
- Type: Internship / research placement. Disciplines: biomedical engineering,
  biology, medicine/translational research. Texas eligibility conditional on
  full-time presence in Houston and eligibility checks. No local residency
  radius is stated in the inspected route; housing must be arranged.

| Field | Exact source excerpt | Structured interpretation |
| --- | --- | --- |
| Application cycle | “Applications for the 2027 Summer Internship Programs will open on December 4, 2026, and close on January 29, 2027.” | 2026-12-04 opening; 2027-01-29 deadline; date-only. |
| Route-specific program dates | “full-time commitment for the 8-week duration (June 7 – August 6, 2027).” | Use June 7–August 6 for this high-school route. Do not use the hub's undergraduate June 1 start. Source calls it eight weeks even though the calendar interval is longer; preserve wording/flag mismatch. |
| Daily commitment | “Daily attendance is required … full 8-hour workday, approximately 8:30 a.m.–5:00 p.m., except for the July 4th holiday.” | Full-time on-site, daily attendance; no remote attendance. |
| Grade/age | “currently in their junior or senior year and are 16 years of age” | Grades 11–12, age 16 minimum; 2027 page does not repeat an exact age-cutoff date. |
| Application materials | “Completed summer internship program application”; “Two required essay questions and one optional”; “Two letters of recommendation”; “Current transcript (official or unofficial)”; “Resume”; “Minimum 3.5 GPA” | Separate application/materials from eligibility; 3.5 GPA, resume, two recommendations, essays, transcript. |
| Transcript year | “Your transcript MUST include your grades for the current 2026 fall semester.” | Current academic-year grades including fall 2026. |
| Location | “main Houston Methodist Hospital in the Texas Medical Center (6565 Fannin St., Houston, TX 77030).” | Houston in-person placement; housing not implied. |
| Output | “program concludes with a research symposium, where interns present poster presentations of their work.” | Required research poster/symposium. |
| Project ownership | “Each summer project will be selected by the mentor assigned to the student and their specific area of expertise.” | Mentor-selected project; independent project choice not promised. |

Important FAQ qualifications: the FAQ still describes 2026 program dates,
2025 selection notices, and a 2024 portal opening. Those dated sentences are
historical, not 2027 milestones. Its high-school-specific statement says
“High school students are not eligible to receive a stipend”; the general
“stipend amount … included in your acceptance letter” must not override
that student-specific rule. Record unpaid/no stipend under the currently
visible policy and mark it for 2027 reconfirmation.

The FAQ says “only US citizens, Legal Permanent Residents and Foreign
Nationals who already hold a legal visa status (F-1, J-1, EADs)” can apply;
capture the exact categories, and have applicants confirm suitability rather
than infer that any visa authorizes employment. It says participants must
secure their own housing and “may choose to receive either a Smithlands
parking pass or a paid QCard” for local transit. Application/program fees,
travel, meals, and additional aid are not stated. The older FAQ mentions
PDF files below 4 MB and recommenders invited by email; these are useful
preparation notes flagged as older FAQ guidance. Selection: application
and documents/recommendations complete → review → notice; no interview
promised. Lifecycle: upcoming 2027 cycle.

### Stanford AIMI Summer Research Internship — ADD with explicit unknowns

- Organizer: Stanford Center for Artificial Intelligence in Medicine and
  Imaging. Canonical call:
  <https://aimi.stanford.edu/education/summer-research-internship>.
- Type: Internship / research program (not verified paid employment).
  Disciplines AI/ML, biomedical engineering, CS/medical imaging.
- Texas eligibility: conditional/not fully verified; the official two-week
  virtual format eliminates a local commute requirement, but updated 2027
  age, grade, country, prerequisites, and fee rules still need publication.

| Field | Exact source excerpt | Structured interpretation |
| --- | --- | --- |
| Audience | “gives high school students the opportunity to experience this rapidly evolving field firsthand.” | Explicit high-school audience. |
| Research | “Through mentored, hands-on research, students build technical skills, work with real-world health data” | Mentored health-AI projects; no publication guarantee. |
| Opening | “Application Opens: November 10, 2026” | 2026-11-10, date-only. |
| Submission | “Application Deadline: February 1, 2027” | 2027-02-01, date-only. |
| Information session | “Tuesday, November 10, 2026, from 5–6 PM PT.” | Information event, separate from application opening; preserve original PT wording. |

Virtual duration independently corroborated by first-party program hub
<https://aimi.stanford.edu/hs-student-programs>: “Two-week virtual opportunity
to explore technical and clinical aspects of AI in healthcare”; also Stanford
Medicine's educational directory
<https://med.stanford.edu/education/high-school-and-undergraduate-programs.html>:
“a two-week virtual program for high school students … lectures, hands-on
projects, and mentorship.” Cost, aid, pay, exact 2027 session dates, required
materials, hours, citizenship, age, grade, and independent research rules
are not published on the current call. Do not reuse third-party quoted fees.
Lifecycle: upcoming application cycle. The student-work gallery includes
academic-year projects; do not represent them as outputs achieved in two
weeks by every summer participant.

### Stanford AIMI Academic Year Research Internship — MONITOR, prerequisite route

<https://aimi.stanford.edu/academic-year-research-internship> explicitly says
“September 2026–May 2027”, “Virtual, with an optional in-person capstone
experience at Stanford”, “approximately 30 weeks”, and “open by invitation
to alumni … who are enrolled in high school during the academic year.”
“Applications for the 2026–27 … are now closed.” Small teams analyze data,
develop/evaluate models, write and present. Written deliverables and research
presentations culminate the program; optional Stanford poster experience.
This is a distinct continuation application with a mandatory AIMI summer
alumni prerequisite, not an open-entry internship. Pay, fees, hours,
housing/travel, age and citizenship not stated. Keep monitor or closed
historical route until full information is recorded.

## Additional substantive route and national discovery

### AEOP high-school internships — MONITOR host placements; ADD conditional discovery if supported

AEOP is not in the actual six public Internship records verified by the
implementation agent, despite the handoff listing it. Official legacy
<https://www.usaeop.com/program/high-school-internships/> redirects to the
current operator <https://aeopinternships-fellowships.org/>. Authoritative
program, application and FAQ sources:

- <https://aeopinternships-fellowships.org/internships/>
- <https://aeopinternships-fellowships.org/application-process/>
- <https://aeopinternships-fellowships.org/faq/>
- <https://aeopinternships-fellowships.org/search-openings/>

| Field | Exact source excerpt | Interpretation |
| --- | --- | --- |
| Work | “first-hand exposure to the cutting-edge research … in top university labs and U.S. Army Research Laboratories and Centers.” | Mentored research placement; topics host-specific. |
| Pay | “All AEOP interns receive an educational stipend”; “amount varies by internship location and program duration.” | Paid educational stipend; not a promise of employee status or fixed wage. |
| Fees | “There is no application fee required, and participation … is free.” | Verified $0 application and program fee; commuter expenses remain. |
| Citizenship/age | “U.S. citizens or permanent legal residents and … at least 14 years of age. Additional age requirements or pre-requisites may apply by site.” | U.S. citizen/permanent resident, minimum 14, host exceptions/stricter cutoffs. |
| Grade | “currently enrolled in high school or … within 60 months of having received their high school degree and have not enrolled in an undergraduate program.” | Current HS or eligible recent graduate, not undergraduate track. |
| Texas access | “you do not need to be a legal resident of the state … (e.g., you can be visiting for the summer).” | Conditional relocation/commuting can permit Texas students; no guaranteed Texas host. |
| Expenses | “Housing, transportation, and meals are not provided.” | No housing/meals/travel; must arrange daily commute. |
| Mode/duration | “Most summer opportunities … full-time … (40 hours a week, ~9-5) for 6-10 weeks in May-August.” | Typical duration only, not fixed 2027 interval. Remote only if explicitly stated in host description. |
| Core materials | “Most current resume”; “Most recent transcript (Unofficial transcripts are acceptable.)” | Resume/unofficial transcript required. |
| Conditional material | “Required for SOME … Personal Statement” | Personal statement host-dependent (FAQ lists it generally; preserve difference). |
| Parent consent | “name and email address for your parent/guardian … log into the application system to authorize your participation.” | Under-18 parent account and digital approval. |
| Output | “required to submit an abstract … Abstracts are published in the online AEOP Research Journal.” | Research abstract required; not peer-reviewed journal acceptance. |
| Selection | “Interviews are at the discretion of the lab” | Application → host review → possible interview → host offer; no universal interview. |
| Cycle | “applications are always open, but application deadlines vary … Some … specific deadlines while others … rolling” | Hub applications always open; route-level rolling only with host evidence. |

The official search page embeds first-party `allLabs` JSON directly in HTML
(27 labs observed, zero Texas, 13 high-school lab entries). This can be parsed
without arbitrary outbound calls. Many entries are explicitly GENERAL
INTEREST calls, not guaranteed positions. Their period ends September 30,
2026 and asks students to reapply after October 1 for the October 1, 2026–
September 30, 2027 administrative performance period. Do not put this broad
performance period on the calendar as a student's internship start/end.

Specific high-school discoveries: ASU Lab 1 (Tempe) transistor simulation,
thermal modeling and materials work, GPA 3.5, recommendations may be requested;
UMD College Park Lab 3 preceramic-polymer/ceramic research, independent
subproject, roughly three-month research description; USAMRICD Edgewood
requires age 16, U.S. citizenship, driving-distance accommodations and full
attendance, with final presentation. No edition-specific dates on those
entries; MONITOR until host route/availability and complete date requirements
are confirmed. A reviewed AEOP family may appear as discovery navigation
with explicit conditional access; do not count that hub as a specific
actionable placement or create 27 copied near-duplicates.

### UT Dallas Intensive Research Internship in CS Labs — ADD as research program

<https://k12.utdallas.edu/research/> is current canonical source. It explicitly
states the 2026 application is closed and “we will reopen in early 2027.”
Keep 2026 historical, 2027 awaiting announcement; yearless priority March 1
belongs to the 2026 document and is not a 2027 deadline.

“Program dates: June 8 – July 31, 2026 (8 weeks)”; “typically meet IN-PERSON
for multiple days per week”; “20-40 hours per week”; “$1500 fee” with low-income
discounts; “register within a week to keep your spot”; “$100 cancellation fee.”
This is a fee-charging advanced research program, not paid employment.
“ONLY … passionate & highly motivated advanced level high school students
(ideally students finishing 10th and 11th grade)” and age 15+; age-cutoff
paragraph says June 9 while overall date/eligibility says June 8—flag conflict.
“If you do not live in Dallas area … find a place to stay … on your own” and
“does not provide the residential stay option for minors using our dorms.”
Texas conditional (Richardson commute/temporary accommodation).

Research work varies by lab: reading papers, simulations, app development.
Lab sets selection/goals; substantial background required. Materials and
citizenship/GPA not specified on this page; don't infer from workshops.
Certificate/experience letter, possible recommendation for impressive work.
Independent project/output specifics depend on lab. Nearby $900/$1,000
workshops and $2,000 deep-dive AI class are separate educational products,
not the lab placement. No lab pay, meals/travel, or fees-free inference.

## Verified local-only and alternative classifications

### Microsoft Discovery — LOCAL-ONLY

<https://careers.microsoft.com/v2/global/en/discoveryprogram> states graduating
seniors must “live and attend high school within 50 miles of Redmond,
Washington OR live and attend high school around Atlanta, Georgia.” Atlanta
school districts and Redmond partner-organization requirements apply.
Paid full-time onsite four weeks. Historical 2026 Atlanta July 6–31 and
Redmond July 13–August 7; “applications open in early February” is not a
dated 2027 milestone. Resume/application describes college acceptance/applied
institutions, intended major and affiliations. Exact pay, age, housing, meals,
citizenship, travel and materials details not otherwise established in this
audit. No public Texas route.

### St. Jude High School Research Immersion — LOCAL-ONLY

Current official path successfully found through first-party internship
navigation after older URLs failed:
<https://www.stjude.org/education-training/pre-college/high-school-programs/high-school-research-immersion.html>.
“current junior at a high school in the Memphis-Shelby County area or
immediate surrounding counties in Tennessee, Mississippi, and Arkansas”;
age 16+, GPA 3.0, U.S. citizen/noncitizen national/permanent-resident visa.
2027 application “is open” and closes December 4, 2026, including teacher
recommendation. Online application; guardian written permission and official
transcript if selected. Eight weeks, 40 hours/week, 9–5, June 1–July 24,
2027; poster exhibition July 24. Stipend $4,800; paired mentored lab/clinical/
data-science work, scientific poster and personal statement. Selection blinded/
unblinded review. No Texas access; leave outside public Texas results.

### UChicago DSI Summer Lab — LOCAL-ONLY

<https://datascience.uchicago.edu/education/summerlab/> explicitly says
“high school students who do not reside year-round in the Chicago area are
not eligible to apply.” Eight-week paid research, no prior research experience
required, computing/data science/climate/materials/biomedical topics. June
15–August 7, 2026 “has concluded”; “Check back this fall for the 2027 program
application.” Age, citizenship, exact pay, housing, meals, travel, materials,
future dates not established. Texas visitor housing does not satisfy the
year-round residency rule.

### Amazon Future Engineer — Scholarship; EXCLUDE high-school internship label

<https://www.amazonfutureengineer.com/scholarships> states “Applications for
2025–2026 are closed.” High-school seniors in U.S., authorized U.S. work,
CS course or assessment, GPA 2.3+, financial need, eligible college CS/software/
computer/EE degree. Up to $10,000/year four years according to unmet need;
paid internship is a later college pathway (official testimony “right after my
first year of college”). No immediate HS internship, no verified 2027 dates.

### NASA Texas Aerospace Scholars — Program, not internship

<https://www.nasa.gov/learning-resources/high-school-aerospace-scholars/>
now calls HAS “Texas Aerospace Scholars”; U.S. citizen Texas junior/senior,
virtual learning and Johnson Space Center Houston experience. Junior
2026–27 window July 1–September 16, 2026 is closed. A useful Texas STEM
pathway, but do not promote learning activities into employment/research
internship. Duplicate-check before any separate program addition.

### Texas A&M Camp SOAR — Summer program; MONITOR / secondary priority

<https://engineering.tamu.edu/aerospace/prospective-students/undergraduate/camp-soar.html>
states 2027 sessions June 13–18 or July 11–16, application opens January 1,
2027; no deadline. Six-day residential aircraft/rotorcraft/space-mission/space-
robotics design work; all-state eligibility, but “rising juniors/seniors” and
“juniors/seniors as of Fall 2026” wording differs. Transcript, essay, $35
nonrefundable application fee. Program-cost amount unknown; includes room,
board and activities, need-based aid. Short enrichment scope, not internship.

## National-laboratory / industry routes awaiting specific postings

- **Sandia:** <https://www.sandia.gov/careers/career-possibilities/students-and-postdocs/internships-co-ops/>
  says summer internships “available to students at all education levels from
  all over the country”, “10–12 weeks”, May–last Thursday August, up to
  40h/week; age 16+, spring full-time enrollment, technical/R&D/business GPA
  3.0. Citizenship required if clearance/job specifies; not universal citizen-
  only rule. All interns hourly temporary employees, amount offer-dependent.
  Resume → posting application → manual recruiter review → selection/offer;
  transcript evaluation at hiring. Housing/meals/travel/fees not established.
  Live hub lists HS summer Mechanical Design job 698908, but linked PeopleSoft
  posting returned an unsupported-browser shell. MONITOR specific posting;
  do not use year-round local-school route to establish nationwide summer
  restrictions. Posting:
  <https://cg.sandia.gov/psp/applicant/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant&Page=HRS_APP_JBPST&Action=U&SiteID=1&JobOpeningId=698908&PostingSeq=1>.
- **PNNL:** <https://www.pnnl.gov/high-school-students-pnnl> confirms “at least
  18 years of age … to work in PNNL laboratory spaces and in some field work
  settings.” Summer June–August up full-time; academic-year August–May up
  four hours/day five days/week. Generic summer applications early February–
  March and school-year February–June are not dated 2027 milestones. One PDF
  resume+cover letter, resume two personal references, prepare unofficial
  transcript. Mentored scientists/engineers or business work; exact position
  determines discipline. Texas accessibility/pay/citizenship/housing unknown;
  MONITOR specific job.
- **MITRE:** <https://careers.mitre.org/us/en/student-programs> includes “high
  school, college, or graduate student” and technical student recruiting. No
  current specific HS posting retrieved. Pay, location, age, citizenship,
  materials, dates, and Texas access unknown; MONITOR, not public open route.
- **AFRL Scholars:** <https://afrlscholars.usra.edu/> and
  <https://afrlscholars.usra.edu/students/> 403; no new dates/pay/eligibility
  verified. MONITOR source health and current official route.
- **NIH:** <https://www.training.nih.gov/research-training/pb/sip/> blocked 403.
  Exact graduating-senior age/date pathway cannot be established in this
  audit; MONITOR. Do not classify broad SIP as high-school eligible.
- **Princeton:** <https://research.princeton.edu/about-us/internships/laboratory-learning-program>
  blocked 403. Local-commuter rule and date conflicts from handoff remain
  unverified; MONITOR, not Texas public.
- **INL SparkLab:** <https://inl.gov/sparklab/> blocked 403. Host/geography,
  grade, pay and dates unverified; MONITOR, not Texas public.
- **Smithsonian Claudine Brown:** <https://www.si.edu/ofi/claudine-k-brown-internship-education>
  and internship directory <https://www.si.edu/Interns> 403 verification.
  Senior/pay/eligibility claims require first-party retrievable evidence.
- **Smithsonian NMNH:** <https://naturalhistory.si.edu/education/youth-programs/internships>
  and <https://naturalhistory.si.edu/education/internships> 403. Current
  youth route/local commute/pay unverified; MONITOR.
- **Meta Summer Academy:** official Meta careers rendered a JavaScript shell;
  no current Academy announcement. Recurrence/location/pay unknown; MONITOR.

## Fetch limitations and monitoring

- Hutton organizer <https://hutton.fisheries.org/> and AFS
  <https://fisheries.org/about/programs/hutton-junior-fisheries-biology-program/>
  returned HTTP 403 Cloudflare challenge, including with an ordinary browser
  User-Agent; WordPress API and alternate official paths also blocked.
  MONITOR. No 2027 dates/pay/age/materials verified in this audit. A blocked
  source is not evidence that the program ceased. Keep the promising national
  biology/environmental internship in the source-review queue.
- SHTEM historical links under `www.stanford.edu/group/brainsinsilicon/shtem/`
  and `web.stanford.edu/group/brainsinsilicon/shtem/` returned real Stanford
  404 pages after User-Agent retries. Current lab hub
  <https://www.stanford.edu/group/brainsinsilicon/> is live and links current
  graduate/undergraduate recruiting, but no SHTEM route in inspected
  positions/blog/project navigation. MONITOR; no claim of discontinuation or
  2027 recurrence. Do not publish an assumed free/housing/remote policy.
- Houston Methodist initially gave 403 with the default client, then 200 with
  `User-Agent: Mozilla/5.0`. A source adapter can use an ordinary declared UA;
  do not treat an Azure Gateway denial as content.

## Internship field examples for implementation

These values summarize cited evidence above. Store references/observed dates
per field alongside them; they are not a substitute for provenance.

```json
{
  "stripe": {
    "texasEligibility": "conditional",
    "texasEligibilityNote": "No residency radius stated; 12 continuous weeks in Seattle or South San Francisco and location-specific employment eligibility required.",
    "placement": "employment",
    "duration": "12 consecutive weeks between May and August 2027; dates individually agreed",
    "commitment": "Full-time, fully in person; no shorter period or breaks",
    "housing": "Not stated",
    "meals": "Not stated",
    "experience": "Strong programming fundamentals and exceptional prior technical work; explain individual contribution and testing",
    "independentResearch": "Employer-scoped engineering project with ownership and manager/team support",
    "applicationMaterials": ["Resume or technical-experience summary", "1–2 strong technical work examples with contribution, decisions, testing and lessons", "Optional high-school transcript/test scores"],
    "selectionStages": ["Submit role application and work examples", "Employer review; exact interview sequence not stated", "Employment eligibility and offer if selected"]
  },
  "utswStars": {
    "texasEligibility": "conditional",
    "texasEligibilityNote": "Intended for North Texas students; Dallas non-residential placement; grade 11, age 16 by June 1, U.S. work eligibility, no prior research experience",
    "placement": "research-placement",
    "duration": "Eight weeks; exact 2027 placement dates not stated",
    "commitment": "In-person laboratory placement; weekly hours not stated",
    "housing": "Non-residential; arrange commute/accommodation",
    "meals": "Not stated for research placement",
    "experience": "Prior research experience excludes students under the published student policy",
    "independentResearch": "Faculty-hosted laboratory work; student project choice not stated",
    "applicationMaterials": ["Current materials will appear when the 2027 application opens November 16"],
    "selectionStages": ["Apply November 16, 2026–January 22, 2027", "Academic achievement and scientific interest review", "Placement and end-of-summer research presentation"]
  },
  "houstonMethodist": {
    "texasEligibility": "conditional",
    "texasEligibilityNote": "Grades 11–12, age 16, GPA 3.5; full-time Houston attendance and own housing; confirm current visa/eligibility rules",
    "placement": "research-placement",
    "duration": "Organizer calls it eight weeks; source interval June 7–August 6, 2027 differs",
    "commitment": "Daily full 8-hour workday, approximately 8:30 a.m.–5 p.m.",
    "housing": "Participants arrange own housing; local parking pass or Metro QCard described in FAQ",
    "meals": "Not stated",
    "experience": "Prior research described in application essay; no universal prior-experience minimum stated",
    "independentResearch": "Mentor selects summer project",
    "applicationMaterials": ["Completed application", "Two required essays and one optional", "Two recommendation letters", "Resume", "Official/unofficial transcript including fall 2026 grades"],
    "selectionStages": ["Apply December 4, 2026–January 29, 2027", "Complete recommendation and document review", "Faculty/lab placement if selected", "Research symposium poster"]
  },
  "aimi": {
    "texasEligibility": "conditional",
    "texasEligibilityNote": "Virtual high-school route; current 2027 age/grade/country/cost rules not yet stated",
    "placement": "research-program",
    "duration": "Two weeks; exact 2027 session dates not stated",
    "commitment": "Virtual mentored work; hours not stated",
    "housing": "Virtual participation; no residential requirement",
    "meals": "Not stated",
    "experience": "Updated prerequisites not stated",
    "independentResearch": "Mentored hands-on health-AI projects; independent project permission not stated",
    "applicationMaterials": ["Updated 2027 materials not yet published"],
    "selectionStages": ["Apply November 10, 2026–February 1, 2027", "Program review; specific interview/decision dates not stated"]
  }
}
```

Do not convert preparation notes such as “materials not yet published” into
a required uploaded document. Model unknown requirements as unknown and
render the call link nearby. Stages above combine application/participation
steps; exact named hiring stages are only recorded when the organizer gives
them.

## Worker contract for these routes

Maintain application opening, application deadline, recommendation deadline
when separately stated, decision notices when explicitly current, and program
start/end. Preserve timezone wording and date-only precision. A program
start/end interval may enter the calendar only when both dates belong to the
specific high-school route and same edition, not an adjacent undergraduate
track. Unknown closing dates do not imply rolling.

Also monitor eligibility (grade, age cutoff, geography, citizenship/work
authorization, GPA, prior-research exclusions), housing/commuting, hours,
application materials, fees, pay, and mentor/output requirements independently
of dates. A successful date check does not renew those fields. Changed
requirements need evidence and review. Preserve prior last-good information
on 403/404/empty parsing and surface source health; no cancellation inference.

Dynamic careers postings require reviewed portal paths, specific job IDs,
and role-level review. A generic internship hub is discovery, not proof of an
open high-school technical job. Prevent undergraduate/graduate postings from
being merged into high-school eligibility or pay. Route-specific rules outrank
generic FAQs only when the contradiction is exposed for review.
