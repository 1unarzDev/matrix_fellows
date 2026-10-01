import type { Opportunity, OpportunityMilestone } from '../types/content'
import { internshipEvidence, INTERNSHIP_REVIEW_VERSION } from './internship-catalog'

const stripe =
  'https://stripe.com/jobs/listing/high-school-internship-software-engineering-summer-2027/8241260'
const stars =
  'https://www.utsouthwestern.edu/education/nondegree-programs/stars/programs/summer-research-opportunities.html'
const methodist =
  'https://www.houstonmethodist.org/academic-institute/education/research/summer-internship-program/highschoolresearchinternship/'
const methodistFaq =
  'https://www.houstonmethodist.org/academic-institute/education/research/summer-internship-program/'
function checkpoint(
  url: string,
  label: string,
  date: string,
  kind: OpportunityMilestone['kind'],
  evidence: string,
): OpportunityMilestone {
  return {
    label,
    date,
    kind,
    role: kind === 'event' ? 'event' : 'application',
    timezone: null,
    precision: 'date-only',
    url,
    evidence,
  }
}
function route(slug: string, fields: Partial<Opportunity>): Opportunity {
  return {
    id: `catalog:${slug}`,
    canonicalId: `catalog:${slug}`,
    sourceId: `catalog-${slug}`,
    externalId: 'main',
    slug,
    title: '',
    kind: 'Internship',
    routeType: 'internship',
    discipline: '',
    description: '',
    eligibility: '',
    location: '',
    url: '',
    highSchoolPolicy: 'supported',
    verifiedAt: '2026-09-30T00:00:00Z',
    priority: 85,
    published: true,
    deadline: null,
    eventDate: null,
    timezone: null,
    edition: '2027',
    lifecycle: 'announced',
    preparationStages: ['learning-team-practice'],
    participationModes: ['in-person'],
    internshipReviewVersion: INTERNSHIP_REVIEW_VERSION,
    aliases: [],
    prerequisites: [],
    archival: null,
    searchVersion: 1,
    milestones: [],
    ...fields,
  }
}
export const internshipAdditions: Opportunity[] = [
  route('stripe-high-school-software-2027', {
    title: 'Stripe High School Software Engineering Internship',
    organizer: 'Stripe',
    externalId: '8241260',
    discipline: 'Computer science',
    disciplines: ['Computer science'],
    topics: ['software engineering', 'production software', 'testing'],
    contributionFormat: 'Paid industry software engineering placement',
    url: stripe,
    description:
      'Build, test and document production software with a Stripe team. An advanced route for students with strong technical work, not an introductory coding course.',
    eligibility:
      'Current high-school students graduating in 2027 or later. Must satisfy location-specific employment, age and documentation requirements and attend 12 consecutive weeks in person.',
    highSchoolEvidence: 'current high school students graduating in 2027 or later.',
    location: 'San Francisco / Seattle · full-time on site',
    lifecycleEvidence:
      'The current Summer 2027 job has an Apply now link. No exact deadline or rolling-admissions policy is stated.',
    restrictions: {
      grades:
        'High-school graduation 2027 or later; current enrollment or graduation before the internship starts.',
      ages: 'Location-specific minimum employment age; exact age not stated.',
      authorEligibility:
        'Must meet employment eligibility and documentation requirements at the work location.',
      geography:
        '12 consecutive weeks in San Francisco or Seattle. No residency radius stated; relocation support unknown.',
    },
    internship: {
      texasEligibility: 'conditional',
      texasEligibilityNote:
        'Texas students may consider this route if they can relocate for 12 continuous weeks and meet employment rules. No housing or travel support is verified.',
      placement: 'employment',
      duration:
        '12 consecutive weeks between May and August 2027; individual dates agreed with employer.',
      commitment:
        'Full-time, fully in person. No shortened placement, breaks, or remote participation.',
      experience:
        'Strong programming fundamentals and exceptional technical achievement for your stage.',
      independentResearch: 'Employer-scoped engineering problem with ownership and team support.',
      applicationMaterials: [
        'Resume or short technical-experience summary.',
        'One or two strongest work examples: repository, product, technical paper, research abstract or project write-up. Explain the problem, your contribution, decisions, testing and lessons.',
        'Optional high-school transcript and standardized test scores.',
      ],
      selectionStages: [
        'Submit the specific job application and technical work examples.',
        'Employer review; exact interview sequence is not stated.',
        'Offer and employment eligibility/documentation checks if selected.',
      ],
    },
    costs: {
      compensation:
        '$60/hour in the role-specific text. Generic annual salary boilerplate elsewhere conflicts; confirm offer terms.',
    },
    prerequisites: [
      'Substantial prior technical work',
      'Full-time on-site availability and work eligibility',
    ],
    outcomes: ['Production software and documented engineering work; no publication promised.'],
    fieldEvidence: internshipEvidence(stripe, {
      'costs.compensation': 'hourly position with a pay rate of $60 per hour.',
      'internship.duration': '12 consecutive weeks',
      'internship.commitment':
        'We cannot accommodate remote participation, a shorter internship, or breaks within the 12-week period.',
      'internship.applicationMaterials.0': 'A resume or short summary of your technical experience',
      'internship.applicationMaterials.1':
        'one or two examples of your strongest work, such as a repository, live product, technical paper, research abstract, competition submission, or project write-up.',
      'internship.applicationMaterials.2':
        'Optional: High school transcript, standardized test scores.',
    }),
  }),
  route('utsw-stars-summer-research-2027', {
    title: 'UT Southwestern STARS Summer Research',
    organizer: 'UT Southwestern Medical Center',
    url: stars,
    discipline: 'Biology',
    disciplines: ['Biology', 'Biomedical engineering'],
    topics: ['biomedical research', 'laboratory research'],
    contributionFormat: 'Mentored biomedical laboratory placement',
    location: 'Dallas, Texas · non-residential laboratory placement',
    description:
      'An eight-week faculty-hosted laboratory placement for North Texas juniors without prior research experience, ending in a research presentation. Not clinical shadowing.',
    eligibility:
      'North Texas high-school juniors; age 16 by June 1; eligible to work in the U.S. Prior research experience excludes students under the published policy.',
    highSchoolEvidence: 'Student applicants must be current juniors in high school.',
    restrictions: {
      grades: 'Current high-school junior.',
      ages: '16 by June 1.',
      authorEligibility: 'Eligible to work in the United States.',
      geography: 'Intended for North Texas students; Dallas attendance required.',
    },
    internship: {
      texasEligibility: 'conditional',
      texasEligibilityNote:
        'A North Texas route, not statewide eligibility. Current juniors must meet age/work rules, have no prior research experience and arrange Dallas attendance.',
      placement: 'research-placement',
      duration: 'Eight weeks; exact 2027 program dates not yet stated.',
      housing: 'Non-residential; arrange accommodation and commuting.',
      experience: 'Students with prior research experience are not eligible.',
      selectionStages: [
        'Apply in the announced 2027 application window.',
        'Academic achievement and scientific interest review.',
        'Faculty-hosted lab placement and end-of-summer presentation.',
      ],
    },
    costs: { compensation: 'Stipend provided; amount not stated.' },
    outcomes: ['Faculty-hosted research and end-of-summer presentation.'],
    milestones: [
      checkpoint(
        stars,
        '2027 application opens',
        '2026-11-16',
        'opens',
        'Applications for the Summer 2027 Summer Research Program will open November 16, 2026 and close on January 22, 2027.',
      ),
      checkpoint(
        stars,
        '2027 application deadline',
        '2027-01-22',
        'deadline',
        'Applications for the Summer 2027 Summer Research Program will open November 16, 2026 and close on January 22, 2027.',
      ),
    ].map((m) => ({ ...m, tentative: true })),
    fieldEvidence: internshipEvidence(stars, {
      'internship.duration': 'This eight-week, non-residential program',
      'internship.housing': 'This eight-week, non-residential program',
      'costs.compensation':
        'Participants are paid a stipend and are required to present the results of their research at the end of the summer.',
    }),
  }),
  route('houston-methodist-high-school-research-2027', {
    title: 'Houston Methodist High School Research Internship',
    organizer: 'Houston Methodist',
    url: methodist,
    discipline: 'Biology',
    disciplines: ['Biology', 'Biomedical engineering'],
    topics: ['translational research', 'biomedical research'],
    contributionFormat: 'Faculty-mentored biomedical research and symposium poster',
    location: 'Houston Texas Medical Center · full-time on site',
    description:
      'Work on a faculty-selected biomedical project, learn laboratory techniques and present a research poster. Students arrange Houston housing and full-time attendance.',
    eligibility:
      'Current high-school juniors or seniors, age 16+, GPA 3.5 or higher; full-time Houston attendance. Current citizenship/visa details need confirmation.',
    highSchoolEvidence: 'High school juniors and seniors',
    restrictions: {
      grades: 'Current junior or senior.',
      ages: '16 or older.',
      geography: 'Houston on-site attendance; students arrange housing.',
    },
    internship: {
      texasEligibility: 'conditional',
      texasEligibilityNote:
        'Texas juniors/seniors meeting age/GPA requirements can consider this Houston commuter placement. Confirm current work/visa rules and arrange housing.',
      placement: 'research-placement',
      duration:
        'Organizer calls it eight weeks, but June 7–August 6, 2027 spans about nine. Confirm before arranging travel.',
      commitment: 'Full 8-hour workday, approximately 8:30 a.m.–5 p.m.',
      housing: 'Own housing; earlier FAQ describes parking pass or Metro QCard.',
      independentResearch: 'Faculty mentor selects the summer project.',
      applicationMaterials: [
        'Completed application with two required essays and one optional essay.',
        'Two recommendation letters.',
        'Resume.',
        'Official or unofficial transcript including fall 2026 grades.',
      ],
      selectionStages: [
        'Apply in the announced application window.',
        'Complete document and recommendation review.',
        'Faculty/lab placement if selected.',
        'Laboratory work and research symposium poster.',
      ],
    },
    costs: {
      compensation:
        'Earlier official FAQ excludes high-school students from stipends; confirm 2027 terms. Do not assume paid.',
      travel:
        'Participants arrange their own housing; local parking/Metro support described in the earlier FAQ.',
    },
    outcomes: ['Research symposium poster and mentored laboratory experience.'],
    milestones: [
      checkpoint(
        methodist,
        '2027 application opens',
        '2026-12-04',
        'opens',
        'Applications for the 2027 Summer Internship Programs will open on December 4, 2026, and close on January 29, 2027.',
      ),
      checkpoint(
        methodist,
        '2027 application deadline',
        '2027-01-29',
        'deadline',
        'Applications for the 2027 Summer Internship Programs will open on December 4, 2026, and close on January 29, 2027.',
      ),
      {
        ...checkpoint(
          methodist,
          '2027 research placement',
          '2027-06-07',
          'event',
          'The Summer High School Research Internship program requires a full-time commitment for the 8-week duration (June 7 – August 6, 2027).',
        ),
        endDate: '2027-08-06',
        rangeDisplay: 'endpoints',
        conflict:
          'The official page calls this eight weeks, but its stated endpoints span about nine weeks. Confirm the actual attendance period.',
      },
    ],
    fieldEvidence: [
      ...internshipEvidence(methodistFaq, {
        'costs.compensation':
          'High school students are not eligible to receive a stipend for participation in the Summer Research Internship Program.',
        'internship.housing':
          'Participants will be responsible for securing their own housing arrangements.',
        'costs.travel':
          'For commuting, interns may choose to receive either a Smithlands parking pass or a paid QCard for using the Houston Metro service.',
      }),
      ...internshipEvidence(methodist, {
        'internship.duration': 'June 7 – August 6, 2027',
        'internship.applicationMaterials.0':
          'Completed summer internship program application Two required essay questions and one optional',
        'internship.applicationMaterials.1': 'Two letters of recommendation',
        'internship.applicationMaterials.2': 'Resume',
        'internship.applicationMaterials.3':
          'Your transcript MUST include your grades for the current 2026 fall semester.',
      }),
    ],
  }),
]
