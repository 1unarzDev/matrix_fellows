import type { Opportunity, OpportunityEvidenceRef } from '../types/content'

export const INTERNSHIP_REVIEW_VERSION = 2
const observedAt = '2026-09-30T00:00:00Z'
const navy = 'https://navalsteminterns.us/internships/seap/'
const assip = 'https://science.gmu.edu/assip/how-apply'
const md =
  'https://www.mdanderson.org/education-training/research-training/early-career-pathway-programs/summer-research-programs/programs/high-school-summer-program.html'
const rise =
  'https://www.bu.edu/summer/high-school-programs/rise-internship-practicum/how-to-apply/'
const sees = 'https://www.csr.utexas.edu/sees-internship/'
const simr = 'https://simr.stanford.edu/'
export function internshipEvidence(
  url: string,
  claims: Record<string, string>,
): OpportunityEvidenceRef[] {
  return Object.entries(claims).map(([field, quote]) => ({
    field,
    url,
    quote,
    observedAt,
    confirmedAt: observedAt,
  }))
}

// Existing public identities are enriched in place. Editorial Texas access is
// reviewed separately from organizer requirements and automatic date updates.
export const internshipPatches: Record<string, Partial<Opportunity>> = {
  'catalog:navy-seap-2027': {
    internship: {
      texasEligibility: 'conditional',
      placement: 'research-placement',
      texasEligibilityNote:
        'Texas students can apply to participating laboratories. Check the chosen lab’s citizenship, age, and commuting rules; selection does not establish relocation support.',
      duration: 'Eight weeks, with a possible extension of up to two weeks.',
      experience:
        'Academic achievement, career/research interests, personal statements and recommendations are considered; preferred lab requirements also apply.',
      applicationMaterials: [
        'Personal statements',
        'Recommendations',
        'Academic achievement and career/research interests; check the current portal for required documents.',
      ],
      selectionStages: [
        'Research and choose preferred laboratories.',
        'Submit the application in the announced enrollment window.',
        'Laboratories review applications and select candidates.',
        'Award and non-award letters are sent; accepted interns prepare for their placement.',
      ],
    },
    costs: {
      compensation:
        'New participants: $4,000; returning participants: $4,500. Paid biweekly; current page reviewed September 30, 2026.',
    },
    fieldEvidence: internshipEvidence(navy, {
      'internship.duration':
        'The SEAP internship has a duration of eight weeks (with a possible extension up to two additional weeks).',
      'internship.experience':
        'Interns are selected based on academic achievement, personal statements, recommendations, and career and research interests.',
      'internship.applicationMaterials':
        'Interns are selected based on academic achievement, personal statements, recommendations, and career and research interests.',
      'internship.selectionStages':
        'Selection Students Research and Choose Their Preferred Labs Application Apply by the Deadline (Sept. 15 – Nov. 30) Review Labs Review Applications and Make Their Decisions Award Award and Non-Award Letters are Sent Out (January-March) Preparation Interns Get Ready for Their New Adventure!',
      'costs.compensation': 'New participants: $4,000 Returning participants: $4,500',
    }),
  },
  'catalog:gmu-assip-2026': {
    internship: {
      texasEligibility: 'conditional',
      placement: 'research-program',
      texasEligibilityNote:
        'Texas students may apply. Remote placements depend on the chosen mentor; minors in on-site placements must arrange off-campus housing and transportation.',
      duration:
        '2026 cycle: eight weeks, June 18–August 12. The 2027 schedule is not announced on the reviewed page.',
      commitment:
        '2026 page states Monday–Friday 9 a.m.–5 p.m. and also 30 hours/week; confirm the actual mentor schedule because those figures differ.',
      housing:
        '2026 rules: no campus housing for minors. Paid campus housing may be available for interns 18 or older.',
      applicationMaterials: [
        '2026 checklist: STEM courses, GPA, volunteer/work experience and personal statements.',
        '2026 initial review does not accept transcripts or recommendation letters.',
      ],
      selectionStages: [
        'Application review.',
        'Prospective mentor review and possible interview.',
        'Mentor offer; accept the placement and arrange tuition or an approved waiver.',
        'Required orientation and research training, followed by the mentor project.',
        'Required final research symposium.',
      ],
    },
    costs: {
      application:
        '2026: $25 nonrefundable application processing fee; financial-need waiver available.',
      program: '2026: $1,299 tuition for accepted interns; financial-need waiver available.',
      travel: 'Students arrange transportation; campus housing is not available for minors.',
      aid: '2026: application and tuition fee waivers based on financial need; request before applying.',
    },
    fieldEvidence: internshipEvidence(assip, {
      'internship.commitment':
        'Program hours are Monday through Friday, 9 a.m.to 5 p.m., for 30 hours/week',
      'internship.housing': 'We are unable to arrange campus housing for minors.',
      'internship.applicationMaterials.0':
        'Science, technology, engineering, and math courses completed, GPA, volunteer/work experience, and personal statements will be considered when reviewing applicants.',
      'internship.applicationMaterials.1':
        'A letter of recommendation is notrequired and will not be accepted during the initial review process. Transcripts are neither requested nor accepted.',
      'costs.application': 'a $25 nonrefundable application processing fee',
      'costs.program': 'a $1299 tuition fee for accepted interns',
      'costs.aid':
        'Applicants with financial need can request a fee waiver code to waive their application fee and their program tuition.',
    }),
  },
  'catalog:md-anderson-king-summer-2026': {
    eligibility:
      'Texas high-school senior in the spring before participation; age 18+ at entry; graduating that spring and accepted to college for the following fall; U.S. citizen, permanent resident or work-eligible visa holder. Allied-health career interest is preferred.',
    restrictions: {
      grades:
        'Texas high-school senior in the spring before the program; must graduate that spring and enter college in fall.',
      ages: '18 or older by the program start.',
      geography:
        'Enrolled in a Texas public, private or charter high school or a Texas home school as a senior-level student during the Spring semester prior to program start.',
      authorEligibility: 'U.S. Citizen, permanent resident, or work-eligible visa holders.',
    },
    lifecycle: 'awaiting-announcement',
    lifecycleEvidence:
      'Applications for 2026 have closed. The official page says to check back in October for 2027 details; dates and compensation below are the historical 2026 terms.',
    internship: {
      texasEligibility: 'conditional',
      placement: 'research-placement',
      texasEligibilityNote:
        'A Texas-only route for graduating seniors who will be 18 at entry, college-bound, and eligible to work. Houston housing and transportation are the student’s responsibility.',
      duration:
        '2026: ten weeks; an approved later start allowed nine weeks for students with later graduation.',
      commitment:
        'Five days a week, 8 a.m.–5 p.m.; entire program attendance required, subject to stated exceptions.',
      housing:
        'All participants must secure their own housing and transportation for the duration of the program.',
      meals:
        'Meals are the reponsibility of the participants unless otherwise noted in the Summer Experience program.',
      experience: 'Previous laboratory and/or research experience is NOT required.',
      selectionStages: [
        'Apply with all required documents by the current deadline.',
        'Review considers academics, leadership, scientific aptitude, service and allied-health interest.',
        'Award notification and preparation for the faculty-supervised laboratory placement.',
        'Laboratory research, seminars and an end-of-program presentation.',
      ],
    },
    costs: {
      compensation:
        'Historical 2026 terms: $7,200 for ten weeks or $6,480 for nine weeks, less taxes and deductions. Await 2027 terms.',
      travel:
        'Participants arrange and pay for housing and transportation; other expenses are their responsibility.',
    },
    outcomes: [
      'Faculty-supervised biomedical research.',
      'End-of-program presentation; seminars and possible abstract/poster/elevator-speech activities.',
    ],
    fieldEvidence: internshipEvidence(md, {
      'restrictions.geography':
        'Enrolled in a Texas public, private or charter high school or a Texas home school as a senior-level student during the Spring semester prior to program start.',
      'restrictions.authorEligibility':
        'U.S. Citizen, permanent resident, or work-eligible visa holders.',
      'internship.housing':
        'All participants must secure their own housing and transportation for the duration of the program.',
      'internship.meals':
        'Meals are the reponsibility of the participants unless otherwise noted in the Summer Experience program.',
      'internship.experience': 'Previous laboratory and/or research experience is NOT required.',
      'internship.commitment':
        'During the program, students work in MD Anderson laboratories five days a week, from 8 a.m.-5 p.m.',
      'costs.compensation':
        'Invitees receive a $7,200 stipend for their participation in the 10-week program ($6,480 if pariticating for nine weeks) less applicable taxes and deductions.',
    }),
  },
  'catalog:bu-rise': {
    internship: {
      texasEligibility: 'conditional',
      placement: 'research-program',
      texasEligibilityNote:
        'Texas students meeting the citizenship and school-year rules may apply. The application page mixes Summer 2027 with an entering-senior Fall 2026 requirement: confirm the eligible cohort with BU. This is a tuition research program, not verified paid employment.',
      duration: 'Six weeks of research; choose the internship or structured practicum track.',
      applicationMaterials: [
        'Full high-school transcript beginning in grade 9, including fall 2026 grades; unofficial copies accepted.',
        'Three essays: subject interest (300 words), academic achievements (250 words), and why RISE (200 words).',
        'Internship track only: three potential faculty mentors and research-fit explanation (250 words); placement with those mentors is not guaranteed.',
        'One recommendation through the emailed form from a STEM teacher, counselor or qualifying research supervisor.',
        'Optional standardized test scores; financial-aid documents if requesting aid; nonrefundable application fee.',
      ],
      selectionStages: [
        'Student submits the application and requests the recommendation early.',
        'All materials and financial-aid request must arrive by the application deadline.',
        'Admissions review and any required corrections.',
        'Internship mentor matching or practicum placement; attend the selected track.',
      ],
    },
    milestones: [
      {
        label: 'Application, recommendations & aid deadline',
        date: '2027-02-03T23:59:00-05:00',
        kind: 'deadline',
        role: 'application',
        timezone: 'America/New_York',
        originalTimezone: '11:59pm Eastern time',
        precision: 'exact',
        evidence:
          'The deadline to submit a RISE application form our Summer 2027 program is 11:59pm Eastern time on Wednesday, February 3, 2027. All supplemental materials, including recommendations, must also be received by this date.',
        url: rise,
      },
    ],
    fieldEvidence: internshipEvidence(rise, {
      'internship.applicationMaterials.0':
        'Your full high school transcript must begin in 9th grade and include your fall 2026 grades',
      'internship.applicationMaterials.1':
        'Why you selected your subject of interest (max 300 words) Your academic achievements (max 250 words) Why you want to attend the RISE program (max 200 words)',
      'internship.applicationMaterials.2':
        'Internship applicants only: You must list three faculty members you are interested in working with this summer and explain how their research interests align with yours (max 250 words).',
      'internship.applicationMaterials.3':
        'The recommendation should be from a STEM teacher, a guidance counselor, or a research supervisor with whom you have worked for at least six months and who knows you well.',
      'internship.applicationMaterials.4':
        'We have adopted a standardized test-optional policy for summer 2027 applicants.',
    }),
  },
  'catalog:nasa-sees': {
    internship: {
      texasEligibility: 'conditional',
      placement: 'research-placement',
      texasEligibilityNote:
        'Texas students may apply under the announced national eligibility rules. The published 2026 cycle is closed; wait for renewed funding and a verified next-cycle announcement.',
      duration:
        '2026: preparatory distance-learning modules, team research and the July 5–18 on-site period, followed by the July 20–21 virtual symposium.',
      housing:
        '2026: housing, meals and local transport provided to selected scholarship and fee-based on-site interns.',
      meals: '2026: meals included for selected on-site interns.',
      applicationMaterials: [
        'Academic record, written application and essay answers.',
        'Introduction video.',
        'Recommendation form.',
      ],
      selectionStages: [
        'Application and separate recommendation submission.',
        'Selection notification.',
        'Earth/space and Python distance-learning preparation, with project-dependent additional work.',
        'Mission-data team research and on-site participation for selected routes.',
        'Virtual SEES Science Symposium presentation.',
      ],
    },
    fieldEvidence: internshipEvidence(sees, {
      'internship.housing':
        'Housing, meals, and local transportation will be provided for those selected for scholarship and those fee-based students selected to attend on-site.',
      'internship.meals':
        'Housing, meals, and local transportation will be provided for those selected for scholarship and those fee-based students selected to attend on-site.',
      'internship.applicationMaterials':
        'Interns are selected on the basis of their academic records, written application that includes answers to essay questions, introduction video, recommendation form, and interest in STEM.',
    }),
  },
  'catalog:stanford-simr': {
    restrictions: {
      grades: 'Graduating class of 2027 or 2028.',
      ages: 'At least 16 by the June 2027 program start.',
      geography: 'Currently living in and attending high school in the United States; strong Bay Area selection preference.',
      authorEligibility: 'U.S. citizen or permanent resident with a green card.',
    },
    internship: {
      texasEligibility: 'conditional',
      placement: 'research-placement',
      texasEligibilityNote:
        'Texas students meeting US school/residency and citizenship or green-card rules may apply. Selection heavily favors local Bay Area students; confirm living arrangements before accepting.',
      duration: 'Eight weeks; June 7–July 29, 2027 are explicitly tentative.',
      experience:
        'The program invites students with a broad range of experiences, interests and backgrounds; specific track rules apply.',
      selectionStages: [
        'Apply under the current grade, age and citizenship rules.',
        'Selection strongly favors local Bay Area applicants.',
        'Accepted students are assigned to an institute based on their choices; distinguish lab research from the BioE design track.',
      ],
    },
    fieldEvidence: internshipEvidence(simr, {
      'internship.duration': 'Summer 2027 Program TENTATIVE Dates: June 7- July 29, 2027 (8 weeks)',
      'restrictions.grades': 'Students must be in the graduating class of 2027 or 2028.',
      'restrictions.ages':
        'Students must also be 16 years old or older by the start date of the program in June 2027.',
      'restrictions.authorEligibility':
        'Students must currently be living in and attending high school in the U.S. AND must be U.S. citizens or permanent residents with a green card in order to apply.',
    }),
  },
}

export function enrichInternship(item: Opportunity): Opportunity {
  const patch = internshipPatches[item.id]
  if (!patch) return item
  const existing = item.milestones || []
  const incoming = patch.milestones || []
  const milestones = [...existing]
  for (const point of incoming) {
    // An exact reviewed cutoff refines the existing same-day application deadline.
    const index = milestones.findIndex(
      (old) =>
        old.kind === point.kind &&
        old.date.slice(0, 10) === point.date.slice(0, 10) &&
        !old.superseded &&
        (old.role === 'application' || /application/i.test(old.label)),
    )
    if (index >= 0) milestones[index] = point
    else milestones.push(point)
  }
  const fields = new Set((patch.fieldEvidence || []).map((entry) => entry.field))
  return {
    ...item,
    ...patch,
    internshipReviewVersion: INTERNSHIP_REVIEW_VERSION,
    costs: { ...item.costs, ...patch.costs },
    restrictions: { ...item.restrictions, ...patch.restrictions },
    milestones: milestones.sort((a, b) => a.date.localeCompare(b.date)),
    fieldEvidence: [
      ...(item.fieldEvidence || []).filter((entry) => !fields.has(entry.field)),
      ...(patch.fieldEvidence || []),
    ],
  }
}
