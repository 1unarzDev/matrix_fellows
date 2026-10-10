export const opportunityDisciplines = [
  'Biomedical engineering',
  'Robotics',
  'Electrical engineering',
  'Mechanical engineering',
  'Biology',
  'Chemistry',
  'AI & machine learning',
  'Computer science',
  'Mathematics',
  'Physics',
  'Materials science',
  'Environmental science',
]
export const opportunityKinds = [
  'Internship',
  'Summer program',
  'Competition',
  'Workshop',
  'Conference',
  'Publication',
  'Program',
]
export const opportunityStages = [
  ['idea', 'Idea or proposal'],
  ['prototype', 'Prototype'],
  ['preliminary-results', 'Preliminary results'],
  ['completed-research', 'Completed research'],
  ['learning-team-practice', 'Learning / team practice'],
]
export const opportunityStatuses = [
  ['open', 'Open'],
  ['upcoming', 'Upcoming'],
  ['awaiting-announcement', 'Awaiting announcement'],
  ['rolling', 'Rolling'],
  ['closed', 'Closed'],
  ['historical', 'Historical'],
]
export const opportunityFilterLabels: Record<string, Record<string, string>> = {
  discipline: Object.fromEntries(opportunityDisciplines.map((value) => [value, value])),
  kind: Object.fromEntries(opportunityKinds.map((value) => [value, value])),
  stage: Object.fromEntries(opportunityStages),
  status: Object.fromEntries(opportunityStatuses),
  funding: { paid: 'Paid / stipend', aid: 'Need-based aid', 'no-program-fee': 'No program fee' },
  mode: {
    'remote-participation': 'Remote program / internship',
    'remote-presentation': 'Remote presentation',
    'remote-submission': 'Remote submission',
    'in-person': 'In person',
    hybrid: 'Hybrid',
  },
  free: { true: 'No application / submission fee' },
}
