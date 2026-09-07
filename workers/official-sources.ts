import type { OpportunityKind } from '../shared/types/content'

export interface OfficialProfile {
  id: string
  name: string
  url: string
  year: number
  parser: 'conference' | 'isef' | 'davidson' | 'queer-ai' | 'sts' | 'icra'
  kind: OpportunityKind
  discipline: string
  eligibility: string
  description: string
  priority: number
  variables?: string[]
}

// An explicit allowlist, not a crawler. Editions roll forward after review of
// their official pages; an old deadline is never silently relabeled next year.
export const officialProfiles: OfficialProfile[] = [
  {
    id: 'isef-2027',
    name: 'Regeneron ISEF 2027',
    year: 2027,
    parser: 'isef',
    kind: 'Competition',
    url: 'https://www.societyforscience.org/isef/affiliated-fair-network/',
    discipline: 'Science & engineering',
    priority: 98,
    eligibility:
      'Students qualify through an ISEF-affiliated fair. Local fair eligibility and deadlines vary; there is no universal direct student application.',
    description:
      'International science and engineering fair. The listed date is the event, not a local qualifying-fair submission deadline.',
  },
  {
    id: 'davidson-fellows-2027',
    name: 'Davidson Fellows Scholarship 2027',
    year: 2027,
    parser: 'davidson',
    kind: 'Program',
    url: 'https://www.davidsongifted.org/gifted-programs/fellows-scholarship/',
    discipline: 'Research, humanities & creative work',
    priority: 95,
    eligibility:
      'See official age, US residency/citizenship, team, and significant-work requirements before applying.',
    description:
      'Scholarships for significant original work. The next cycle is monitored; an exact deadline is not inferred from previous years.',
  },
  {
    id: 'queer-ai-neurips-2026',
    name: 'Queer in AI at NeurIPS 2026',
    year: 2026,
    parser: 'queer-ai',
    kind: 'Workshop',
    url: 'https://www.queerinai.com/neurips-2026',
    discipline: 'Artificial intelligence',
    priority: 92,
    eligibility:
      'Read the official call for contribution formats, participation, accessibility, and attendance requirements.',
    description:
      'Community workshop and call for contributions. Its submission deadline is separate from the main NeurIPS paper deadline.',
  },
  {
    id: 'neurips-2026',
    name: 'NeurIPS 2026',
    year: 2026,
    parser: 'conference',
    kind: 'Conference',
    url: 'https://neurips.cc/Conferences/2026/Dates',
    variables: ['paperabstractsubmissiondeadline_3', 'fullpapersubmissiondeadline_3'],
    discipline: 'Machine learning & AI',
    priority: 85,
    eligibility:
      'Main-conference papers and individual workshops have different calls. Check each track and attendance requirements.',
    description:
      'Conference on Neural Information Processing Systems. Session dates and main-track deadlines are tracked separately.',
  },
  {
    id: 'cvpr-2027',
    name: 'IEEE/CVF CVPR 2027',
    year: 2027,
    parser: 'conference',
    kind: 'Conference',
    url: 'https://cvpr.thecvf.com/Conferences/2027/Dates',
    variables: [
      'paper_registration_deadline_1',
      'submission_deadline_1',
      'supplementary_materials_deadline_1',
    ],
    discipline: 'Computer vision',
    priority: 86,
    eligibility:
      'Technical research submissions; abstract registration, full paper, and supplementary material have distinct deadlines.',
    description:
      'IEEE/CVF Conference on Computer Vision and Pattern Recognition. Official countdown timestamps supply exact submission cutoffs.',
  },
  {
    id: 'icra-2027',
    name: 'IEEE ICRA 2027',
    year: 2027,
    parser: 'icra',
    kind: 'Conference',
    url: 'https://2027.ieee-icra.org/contribute/call-for-icra-2027-papers-now-accepting-submissions/',
    discipline: 'Robotics & automation',
    priority: 86,
    eligibility: 'Consult the official paper-submission and presentation requirements.',
    description:
      'IEEE International Conference on Robotics and Automation. The CFP’s timezone wording needs checking against the submission portal; only the calendar deadline is recorded.',
  },
  {
    id: 'regeneron-sts-2027',
    name: 'Regeneron Science Talent Search 2027',
    year: 2027,
    parser: 'sts',
    kind: 'Competition',
    url: 'https://www.societyforscience.org/regeneron-sts/application-requirements/',
    discipline: 'Science & engineering',
    priority: 97,
    eligibility:
      'For eligible high-school seniors conducting independent research. Read the official US residency/schooling rules and application requirements.',
    description:
      'Research competition for high-school seniors. The application cutoff is tracked separately from finalist events.',
  },
]
