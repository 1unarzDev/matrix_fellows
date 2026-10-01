import type { Opportunity } from '../types/content'
import { internshipEvidence, INTERNSHIP_REVIEW_VERSION } from './internship-catalog'
import { internshipAdditions } from './internship-additions'

const sandia =
  'https://cg.sandia.gov/psp/applicant/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant&Page=HRS_APP_JBPST&Action=U&SiteID=1&JobOpeningId=698908&PostingSeq=1'
const sandiaHub =
  'https://www.sandia.gov/careers/career-possibilities/students-and-postdocs/internships-co-ops/'
const sandiaBenefits = `${sandiaHub}benefits/`
const arl = 'https://wwwext.arlut.utexas.edu/se.shtml'
const arlApplication =
  'https://wwwext.arlut.utexas.edu/pdfs/student-jobs/2026-apps-flyer/2026_Apprentice_application.pdf'
const arlFlyer =
  'https://wwwext.arlut.utexas.edu/pdfs/student-jobs/2026-apps-flyer/2026_Apprentice_flyer_F.pdf'
const base = {
  kind: 'Internship',
  routeType: 'internship',
  highSchoolPolicy: 'supported',
  verifiedAt: '2026-09-30T00:00:00Z',
  priority: 83,
  published: true,
  deadline: null,
  eventDate: null,
  timezone: null,
  preparationStages: ['learning-team-practice'],
  participationModes: ['in-person'],
  internshipReviewVersion: INTERNSHIP_REVIEW_VERSION,
  searchVersion: 1,
  archival: null,
  aliases: [],
  topics: [],
  prerequisites: [],
} satisfies Partial<Opportunity>

export const industryInternshipExpansion: Opportunity[] = [
  {
    ...base,
    id: 'catalog:amazon-future-engineer-scholarship',
    canonicalId: 'amazon:future-engineer-scholarship',
    sourceId: 'catalog-amazon-future-engineer-scholarship',
    externalId: 'main',
    slug: 'amazon-future-engineer-scholarship',
    title: 'Amazon Future Engineer Scholarship & College Internship Pathway',
    organizer: 'Amazon Future Engineer · Scholarship America',
    kind: 'Program',
    routeType: 'program',
    edition: '',
    lifecycle: 'awaiting-announcement',
    url: 'https://www.amazonfutureengineer.com/scholarships',
    submissionUrl: 'https://scholarshipamerica.org/scholarship/amazonfutureengineer/',
    discipline: 'Computer science',
    disciplines: ['Computer science', 'Electrical engineering'],
    topics: ['software engineering', 'college scholarship', 'industry mentorship'],
    contributionFormat:
      'High-school senior scholarship application; paid internship after the first college year',
    description:
      'Apply as a high-school senior for need-based college scholarship support and a later paid Amazon software-engineering internship. This is not immediate high-school employment or a high-school summer research placement.',
    eligibility:
      'U.S. high-school senior; minimum cumulative GPA 2.3; demonstrated financial need; authorized to work in the U.S. Complete a CS course in high school/dual enrollment or the offered assessment. Plan an eligible computing/engineering bachelor’s degree; eligible two-year-to-four-year transfer pathways are included.',
    highSchoolEvidence: 'Be a high school senior in the U.S.',
    restrictions: {
      grades: 'High-school senior applying for college scholarship support.',
      geography:
        'High school in the United States; Texas students can apply subject to all other requirements. Future internship location is not established by the scholarship application.',
      authorEligibility:
        'Must be authorized to work in the United States; administrator requires authorization valid for at least two years. Examples include citizenship, permanent residency and an employment authorization document.',
    },
    location: 'U.S. scholarship applicants · future college internship location not specified',
    participationModes: [],
    prerequisites: [
      'GPA 2.3 or higher and demonstrated financial need.',
      'CS course or organizer-provided assessment.',
      'Eligible computing/engineering bachelor’s degree plans or eligible two-year-to-four-year transfer pathway.',
      'Last verified application: teacher online recommendation (CS teacher preferred), transcript, short answers, activities/projects and work experience, household financial information and first two pages of latest household IRS 1040. Black out sensitive information including Social Security Numbers before uploading to the official administrator—not Matrix Fellows. Recheck the next-cycle checklist.',
      'Selection: application/documents and assessment if needed → Scholarship America review → recipient financial-aid award letter → scholarship renewal → later college internship opportunity.',
    ],
    lifecycleEvidence:
      'Official page says applications for 2025–2026 are closed and invites signup for the next cycle. No next-cycle opening or deadline is verified.',
    costs: {
      aid: 'Up to $10,000 per year for four years (up to $40,000 total), based on unmet financial need and renewal conditions. No guaranteed award or maximum payment.',
      compensation: null,
    },
    outcomes: [
      'College scholarship support if selected.',
      'Paid Amazon internship after the first year of college; real software project work and employee mentorship. Internship duration, pay amount, housing, travel and exact placement terms are not verified.',
    ],
    milestones: [],
    fieldEvidence: [
      ...internshipEvidence('https://www.amazonfutureengineer.com/scholarships', {
        highSchoolEvidence: 'Be a high school senior in the U.S.',
        'prerequisites.0': 'Have a minimum cumulative grade point average of 2.3 on a 4.0 scale',
        lifecycleEvidence: 'Applications for 2025–2026 are closed.',
        'costs.aid':
          'up to $10,000 per year for four years and a paid summer internship at Amazon.',
      }),
      ...internshipEvidence('https://scholarshipamerica.org/scholarship/amazonfutureengineer/', {
        'restrictions.authorEligibility':
          'Employment authorization must be valid for at least 2 years.',
        'prerequisites.3':
          'Please black out any sensitive data including Social Security Numbers before uploading.',
      }),
    ],
  },
  {
    ...base,
    id: 'catalog:sandia-high-school-mechanical-design-698908',
    canonicalId: 'sandia:698908',
    sourceId: 'catalog-sandia-high-school-mechanical-design-698908',
    externalId: '698908',
    slug: 'sandia-high-school-mechanical-design-698908',
    title: 'Sandia High School Mechanical Design Internship',
    organizer: 'Sandia National Laboratories',
    url: sandia,
    submissionUrl: sandia,
    edition: '',
    lifecycle: 'announced',
    lifecycleEvidence:
      'Specific job 698908 was publicly listed with Apply for Job on September 30, 2026. No exact deadline or summer edition year is stated. Automated fetches may return a PeopleSoft cookie shell; confirm availability in the official browser portal.',
    discipline: 'Mechanical engineering',
    disciplines: ['Mechanical engineering'],
    topics: ['CAD', 'mechanical design', 'geometric dimensioning and tolerancing', 'manufacturing'],
    contributionFormat: 'Paid technical employment: CAD models and engineering drawings',
    description:
      'A specific on-site national-lab role creating and modifying mechanical CAD models and drawings with a staff mentor. It is not a generic national-lab directory or a promise of an independent research paper.',
    location: 'Albuquerque, New Mexico · on site',
    eligibility:
      'High-school student, age 16+, GPA 3.0/4.0, full-time enrollment in the preceding spring. Attend a local high school OR, if under 18, live with a parent/legal guardian near the work site. U.S. citizen, permanent resident, asylee or refugee; background and site-access rules apply.',
    highSchoolEvidence:
      'We are seeking a Summer High School Intern with interest in pursuing a career as a Computer Aided Drafting (CAD) Technologist to join our team!',
    restrictions: {
      grades:
        'High-school student enrolled full time in the spring immediately preceding the internship.',
      ages: 'Minimum 16 years of age.',
      geography:
        'Attending a local high school or living with a parent or legal guardian near the work site if under 18 years of age',
      authorEligibility:
        'U.S. citizens, legal permanent residents, asylees or refugees in the U.S.; additional national-lab site-access restrictions apply.',
      adultSponsor:
        'Under-18 nonlocal participants must live with a parent or legal guardian near the work site.',
    },
    internship: {
      texasEligibility: 'conditional',
      placement: 'employment',
      texasEligibilityNote:
        'A Texas student may qualify through the near-site parent/legal-guardian living option. Relocation alone without that guardian arrangement is not sufficient for a minor. Confirm site access and summer school-enrollment status.',
      duration:
        'Summer placement; exact job-specific dates and duration not stated. General summer internships are usually 10–12 weeks, not a guaranteed interval for this job.',
      commitment:
        'Ability to work up to 40 hours per week during the summer; selected applicant must work on site.',
      housing:
        'No job-specific housing promise. Under-18 nonlocal interns need a parent/legal guardian near the site.',
      experience:
        'CAD classroom experience (Creo, SolidWorks, AutoCAD) is desired, along with mechanical-design interest, initiative, organization and communication. GPA 3.0 required.',
      independentResearch:
        'Staff-mentor-assigned engineering projects; no unrestricted independent-research policy stated.',
      applicationMaterials: [
        'Specific job application through the Sandia Careers account.',
        'Resume: recruiters manually review resumes for each posting.',
        'Student transcripts evaluated during hiring; provide documents when requested. Exact recommendation/essay checklist is not stated.',
      ],
      selectionStages: [
        'Review specific job requirements and apply to job 698908.',
        'Manual recruiter review; selection considers interests, academics, experience and workforce needs.',
        'Offer includes hourly pay determined during hiring.',
        'Pre-employment drug test, background review and Kirtland Air Force Base access screening. No DOE security clearance is currently required by this posting.',
      ],
    },
    costs: {
      compensation:
        'Paid hourly temporary employment; job-specific rate determined in the offer package.',
      travel:
        'General intern benefits describe relocation-expense reimbursement only for eligible students meeting requirements. This job does not guarantee housing/travel coverage.',
      aid: null,
    },
    prerequisites: [
      'GPA 3.0/4.0, age 16+, preceding-spring full-time enrollment',
      'On-site attendance and qualifying parent/guardian arrangement for nonlocal minors',
    ],
    outcomes: [
      'Mechanical CAD models, engineering drawings and updates incorporating GD&T.',
      'Staff mentorship; no promised publication or poster.',
    ],
    milestones: [],
    fieldEvidence: [
      ...internshipEvidence(sandia, {
        'restrictions.geography':
          'Attending a local high school or living with a parent or legal guardian near the work site if under 18 years of age',
        'restrictions.ages': 'Minimum 16 years of age',
        'restrictions.authorEligibility':
          'U.S. citizens, legal permanent residents, asylees or refugees in the U.S.',
        'internship.commitment': 'Ability to work up to 40 hours per week during the summer',
        'internship.experience':
          'Classroom experience using a CAD software package (Creo, SolidWorks, AutoCAD, ...etc.)',
        'costs.compensation':
          'Your pay rate will be determined during the hire process and included in your offer package.',
      }),
      ...internshipEvidence(sandiaHub, {
        'internship.applicationMaterials.1':
          'Recruiters manually review resumes on each job posting instead of using a resume screening software program.',
        'internship.applicationMaterials.2':
          'Evaluation of student transcripts will occur during the hire process.',
      }),
      ...internshipEvidence(sandiaBenefits, {
        'costs.travel':
          'Relocation-expense reimbursement for eligible students who meet requirements.',
      }),
    ],
  },
  {
    ...base,
    id: 'catalog:ut-arl-science-engineering-apprenticeship',
    canonicalId: 'ut-arl:science-engineering-apprenticeship',
    sourceId: 'catalog-ut-arl-science-engineering-apprenticeship',
    externalId: 'main',
    slug: 'ut-arl-science-engineering-apprenticeship',
    title: 'UT Austin Applied Research Laboratories Apprenticeship',
    organizer: 'Applied Research Laboratories, The University of Texas at Austin',
    aliases: ['ARL:UT Science and Engineering Apprenticeship'],
    url: arl,
    edition: '2026',
    lifecycle: 'unknown',
    lifecycleEvidence:
      'The linked official application and flyer describe the completed 2026 cycle. No 2027 announcement is verified; do not reuse its cutoff or compensation as 2027 terms.',
    discipline: 'Mechanical engineering',
    disciplines: [
      'Mechanical engineering',
      'Electrical engineering',
      'Computer science',
      'Physics',
      'Mathematics',
    ],
    topics: ['acoustics', 'CAD', 'geophysics', 'quantum simulation', 'signal processing'],
    contributionFormat:
      'Full-time paid laboratory apprenticeship, technical report and presentation',
    description:
      'A laboratory R&D apprenticeship in Austin for the summer between high school and college. Complete a real project, technical report and judged presentation with scientists and engineers. The last verified cycle is 2026.',
    location: 'J.J. Pickle Research Campus, Austin, Texas · on site',
    eligibility:
      'Graduating high-school senior entering a four-year college in fall; must have applied and been accepted to UT Austin; U.S. citizen. The 2026 packet requires an Engineering, Geosciences or Natural Sciences major.',
    highSchoolEvidence:
      'Graduating high school senior entering a 4-year college or university in the upcoming fall semester',
    restrictions: {
      grades:
        'Graduating high-school senior before entering college; must have applied and been admitted to UT Austin.',
      geography: 'Austin full-time attendance; no other-state high-school restriction stated.',
      authorEligibility: 'U.S. citizen.',
    },
    internship: {
      texasEligibility: 'conditional',
      placement: 'research-placement',
      texasEligibilityNote:
        'Texas graduating seniors may qualify if admitted to UT Austin with the required STEM-major plans and able to attend in Austin full time. The overview mentions preference, but the requirements and 2026 packet explicitly require UT admission.',
      duration: 'Historical 2026: June 4–August 14. No verified 2027 interval.',
      commitment:
        'Historical 2026: 40 hours/week, Monday–Friday 8 a.m.–5 p.m.; unpaid time off only for freshman college orientation.',
      experience:
        'Interest and skills in engineering, CS, geophysics, mathematics or physics. Skills inventory says none of the listed skills is required for employment.',
      independentResearch:
        'Each apprentice completes a summer-long project; topic assignment and unrestricted independent-project permission are not stated.',
      applicationMaterials: [
        'Historical 2026: completed 16-page application questionnaire, employment form and skills inventory.',
        'Resume.',
        'Original high-school transcript sent by the school registrar; allow mailing time.',
        'Optional SAT/ACT scores if not already on transcript.',
        'Questionnaire includes technical experience, career goals and a less-than-500-word AI/ML task-redesign response.',
      ],
      selectionStages: [
        'Check graduation, citizenship, UT admission and intended-major requirements.',
        'Submit complete application/resume by official instructions; registrar sends original transcript.',
        'Competitive selection; interview sequence and offer dates not stated.',
        'Full-time summer project, seminars and laboratory activities.',
        'Technical report and judged presentation; small recognition prizes do not establish scholarship funding.',
      ],
    },
    costs: {
      compensation:
        'Historical 2026 official flyer: full-time paid positions at $20+ per hour. Future rates not announced.',
      travel: null,
      aid: null,
    },
    outcomes: [
      'Technical report combined with other apprentice reports for distribution to sponsors and university/government stakeholders.',
      'Judged project presentation and possible small cash recognition prizes, not guaranteed peer-reviewed publication.',
    ],
    milestones: [
      {
        label: 'Historical 2026 application deadline',
        kind: 'deadline',
        role: 'application',
        date: '2026-03-10',
        timezone: null,
        precision: 'date-only',
        evidence: 'Application must be received at Applied Research Labs by March 10, 2026.',
        url: arlApplication,
      },
      {
        label: 'Historical 2026 apprenticeship',
        kind: 'event',
        role: 'event',
        date: '2026-06-04',
        endDate: '2026-08-14',
        rangeDisplay: 'span',
        timezone: null,
        precision: 'date-only',
        evidence: 'June 4 through August 14, 2026.',
        url: arlFlyer,
      },
    ],
    fieldEvidence: [
      ...internshipEvidence(arl, {
        'restrictions.grades':
          'Must have applied and been admitted to The University of Texas at Austin',
        'internship.independentResearch':
          'Each apprentice completes a summer-long project and prepares a technical report and presentation outlining their work.',
      }),
      ...internshipEvidence(arlApplication, {
        'internship.commitment':
          'You will be expected to work a 40-hour work week, from 8:00am-5:00pm Mon-Fri., throughout each day of the program.',
        'internship.applicationMaterials.1': 'A resume',
        'internship.applicationMaterials.2': 'An original high school transcript',
        'internship.applicationMaterials.3':
          'Optional—Copies of your SAT and/or ACT scores (if not included on your transcript).',
      }),
      ...internshipEvidence(arlFlyer, {
        'costs.compensation':
          'Apprentices are appointed to full-time paid positions, at $20+ per hour, working on real-world projects with scientists and engineers.',
      }),
    ],
  },
]

// One reviewed set drives publication, scoped sources and monitor registration.
export const reviewedIndustryRoutes = [...internshipAdditions, ...industryInternshipExpansion]
