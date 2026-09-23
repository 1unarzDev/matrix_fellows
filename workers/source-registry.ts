export interface ReviewedSource {
  id: string
  name: string
  authoritativeHub: string
  permittedHost: string
  permittedPathPrefix: string
  sourceType: 'official-html' | 'official-api' | 'directory' | 'openreview-api'
  parentId?: string
  discoveryMethod: string
  parserVersion: string
  scope: string
  publicationPolicy: 'monitor-confirmed' | 'review-required' | 'discovery-only'
  reviewedAt: string
}

// Hosting is not trust. Each entry limits the organizer/family and path that may
// produce a review candidate; publication still uses the existing review and
// repeated-observation boundaries.
export const reviewedSources: ReviewedSource[] = [
  {
    id: 'openreview-active-venues',
    name: 'OpenReview active venues',
    authoritativeHub: 'https://api2.openreview.net/groups?id=active_venues',
    permittedHost: 'api2.openreview.net',
    permittedPathPrefix: '/',
    sourceType: 'openreview-api',
    discoveryMethod:
      'Public active_venues group, then explicit public venue and submission invitation lookup',
    parserVersion: 'openreview-v1',
    scope:
      'Reviewed NeurIPS, ICML, ICLR, IROS, ICRA, CoRL, CVPR and MICCAI workshop namespaces only',
    publicationPolicy: 'review-required',
    reviewedAt: '2026-09-22T00:00:00Z',
  },
  ...[
    ['neurips', 'NeurIPS workshops', 'NeurIPS.cc/'],
    ['icml', 'ICML workshops', 'ICML.cc/'],
    ['iclr', 'ICLR workshops', 'ICLR.cc/'],
    ['iros', 'IROS workshops', 'IEEE.org/IROS/'],
    ['icra', 'ICRA workshops', 'IEEE.org/ICRA/'],
    ['corl', 'CoRL workshops', 'robot-learning.org/CoRL/'],
    ['cvpr', 'CVPR workshops', 'thecvf.com/CVPR/'],
    ['miccai', 'MICCAI workshops', 'MICCAI.org/'],
  ].map(([id, name, prefix]) => ({
    id: `openreview-${id}`,
    name,
    authoritativeHub: 'https://api2.openreview.net/groups?id=active_venues',
    permittedHost: 'api2.openreview.net',
    permittedPathPrefix: '/',
    sourceType: 'openreview-api' as const,
    parentId: 'openreview-active-venues',
    discoveryMethod: `Venue IDs beginning ${prefix}`,
    parserVersion: 'openreview-v1',
    scope: `${prefix} workshop/session contribution routes; organizer proposals excluded`,
    publicationPolicy: 'review-required' as const,
    reviewedAt: '2026-09-22T00:00:00Z',
  })),
  ...[
    ['hosa-events', 'HOSA competitive events', 'https://hosa.org/guidelines/', 'hosa.org', '/'],
    [
      'nist-ship',
      'NIST SHIP',
      'https://www.nist.gov/iaao/summer-high-school-intern-program',
      'www.nist.gov',
      '/',
    ],
    [
      'navy-seap',
      'Navy SEAP',
      'https://navalsteminterns.us/internships/seap/',
      'navalsteminterns.us',
      '/internships/seap/',
    ],
    [
      'fermilab-prism',
      'Fermilab PRISM',
      'https://internships.fnal.gov/fermilab-program-for-research-innovation-and-stem-mentorship-prism/',
      'internships.fnal.gov',
      '/fermilab-program-for-research-innovation-and-stem-mentorship-prism/',
    ],
    [
      'broad-bssp',
      'Broad Summer Scholars',
      'https://www.broadinstitute.org/partnerships/education/k-12-outreach/broad-summer-scholars-program',
      'www.broadinstitute.org',
      '/partnerships/education/k-12-outreach/broad-summer-scholars-program',
    ],
    [
      'fred-hutch-ship',
      'Fred Hutch SHIP',
      'https://www.fredhutch.org/en/education-training/high-school-students/summer-high-school-internship-program.html',
      'www.fredhutch.org',
      '/en/education-training/high-school-students/',
    ],
    [
      'seattle-childrens-rtp',
      'Seattle Children’s RTP',
      'https://www.seattlechildrens.org/research/centers-programs/science-education-department/high-school-training-programs/',
      'www.seattlechildrens.org',
      '/research/centers-programs/science-education-department/',
    ],
    [
      'msk-summer-student',
      'MSK Summer Student Program',
      'https://www.mskcc.org/education-training/summer-student',
      'www.mskcc.org',
      '/education-training/summer-student',
    ],
    [
      'md-anderson-high-school-summer',
      'MD Anderson High School Summer Program',
      'https://www.mdanderson.org/education-training/research-training/early-career-pathway-programs/summer-research-programs/programs/high-school-summer-program.html',
      'www.mdanderson.org',
      '/education-training/research-training/early-career-pathway-programs/summer-research-programs/programs/',
    ],
    [
      'gmu-assip',
      'George Mason ASSIP',
      'https://science.gmu.edu/assip',
      'science.gmu.edu',
      '/assip',
    ],
    [
      'ut-austin-hsra',
      'UT Austin HSRA',
      'https://fri.cns.utexas.edu/community-outreach/summer-high-school-research-academy',
      'fri.cns.utexas.edu',
      '/',
    ],
  ].map(([id, name, authoritativeHub, permittedHost, permittedPathPrefix]) => ({
    id: id!,
    name: name!,
    authoritativeHub: authoritativeHub!,
    permittedHost: permittedHost!,
    permittedPathPrefix: permittedPathPrefix!,
    sourceType: 'official-html' as const,
    discoveryMethod: 'Reviewed first-party route page and linked current-cycle materials',
    parserVersion: 'official-route-v1',
    scope: `${name} eligibility, preparation, costs, participation, and lifecycle evidence`,
    publicationPolicy: 'monitor-confirmed' as const,
    reviewedAt: '2026-09-23T00:00:00Z',
  })),
]

export const openReviewVenuePrefixes = [
  'NeurIPS.cc/',
  'ICML.cc/',
  'ICLR.cc/',
  'IEEE.org/IROS/',
  'IEEE.org/ICRA/',
  'robot-learning.org/CoRL/',
  'thecvf.com/CVPR/',
  'MICCAI.org/',
]

export function reviewedSourceUrl(source: ReviewedSource, address: string) {
  try {
    const url = new URL(address)
    return (
      url.protocol === 'https:' &&
      url.hostname === source.permittedHost &&
      url.pathname.startsWith(source.permittedPathPrefix) &&
      !url.username &&
      !url.password &&
      !url.port
    )
  } catch {
    return false
  }
}
