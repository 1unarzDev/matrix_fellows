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
    [
      'mit-bwsi',
      'MIT Beaver Works Summer Institute',
      'https://bwsi.mit.edu/apply-now/',
      'bwsi.mit.edu',
      '/',
    ],
    [
      'mites-summer',
      'MITES Summer',
      'https://mites.mit.edu/discover-mites/mites-summer/',
      'mites.mit.edu',
      '/discover-mites/mites-summer/',
    ],
    [
      'texas-tech-clark-scholars',
      'Texas Tech Clark Scholars',
      'https://www.depts.ttu.edu/clarkscholars/',
      'www.depts.ttu.edu',
      '/clarkscholars/',
    ],
    [
      'cmu-ai-scholars',
      'Carnegie Mellon AI Scholars',
      'https://www.cmu.edu/pre-college/academic-programs/ai_scholars.html',
      'www.cmu.edu',
      '/pre-college/academic-programs/ai_scholars',
    ],
    [
      'uc-davis-young-scholars',
      'UC Davis Young Scholars Program',
      'https://education.ucdavis.edu/young-scholars-program',
      'education.ucdavis.edu',
      '/',
    ],
    [
      'iowa-sstp',
      'University of Iowa SSTP',
      'https://belinblank.education.uiowa.edu/students/sstp/',
      'belinblank.education.uiowa.edu',
      '/students/sstp/',
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
  {
    id: 'iros-2026',
    name: 'IROS 2026 contribution and workshop program',
    authoritativeHub: 'https://2026.ieee-iros.org/contribute/call-for-papers/',
    permittedHost: '2026.ieee-iros.org',
    permittedPathPrefix: '/',
    sourceType: 'official-html',
    discoveryMethod: 'Reviewed conference call and accepted workshop directory',
    parserVersion: 'official-route-v1',
    scope: 'IROS 2026 paper and accepted workshop contribution routes',
    publicationPolicy: 'review-required',
    reviewedAt: '2026-09-23T00:00:00Z',
  },
  {
    id: 'iros-2026-modular',
    name: 'IROS 2026 modular robots workshop',
    authoritativeHub:
      'https://modular-robot-workshop.github.io/iros2026-modular-robot-workshop-site/',
    permittedHost: 'modular-robot-workshop.github.io',
    permittedPathPrefix: '/iros2026-modular-robot-workshop-site/',
    sourceType: 'official-html',
    parentId: 'iros-2026',
    discoveryMethod: 'Official IROS directory link followed to organizer call',
    parserVersion: 'official-route-v1',
    scope: 'Reconfigurable modular robot workshop contribution route only',
    publicationPolicy: 'review-required',
    reviewedAt: '2026-09-23T00:00:00Z',
  },
  {
    id: 'corl-2026',
    name: 'CoRL 2026 accepted workshops',
    authoritativeHub: 'https://www.corl.org/program/workshops',
    permittedHost: 'www.corl.org',
    permittedPathPrefix: '/',
    sourceType: 'directory',
    discoveryMethod: 'Official accepted-workshop directory and linked organizer calls',
    parserVersion: 'official-route-v1',
    scope: 'CoRL 2026 conference and accepted workshop routes',
    publicationPolicy: 'review-required',
    reviewedAt: '2026-09-23T00:00:00Z',
  },
  {
    id: 'corl-agentic-robotics',
    name: 'CoRL Agentic Robotics workshop',
    authoritativeHub: 'https://agentic-robotics-workshop.github.io/',
    permittedHost: 'agentic-robotics-workshop.github.io',
    permittedPathPrefix: '/',
    sourceType: 'official-html',
    parentId: 'corl-2026',
    discoveryMethod: 'Official CoRL directory link followed to organizer call',
    parserVersion: 'official-route-v1',
    scope: 'Agentic Robotics workshop paper and demonstration routes only',
    publicationPolicy: 'review-required',
    reviewedAt: '2026-09-23T00:00:00Z',
  },
  {
    id: 'corl-physical-ai-safety',
    name: 'CoRL Physical AI Safety workshop',
    authoritativeHub: 'https://spais-ws.org/',
    permittedHost: 'spais-ws.org',
    permittedPathPrefix: '/',
    sourceType: 'official-html',
    parentId: 'corl-2026',
    discoveryMethod: 'Official CoRL directory link followed to organizer call',
    parserVersion: 'official-route-v1',
    scope: 'Physical AI Safety workshop paper and failure-demo routes only',
    publicationPolicy: 'review-required',
    reviewedAt: '2026-09-23T00:00:00Z',
  },
  {
    id: 'iscas-2027',
    name: 'ISCAS 2027 calls',
    authoritativeHub: 'https://2027.ieee-iscas.org/call-for-papers',
    permittedHost: '2027.ieee-iscas.org',
    permittedPathPrefix: '/',
    sourceType: 'official-html',
    discoveryMethod: 'Reviewed first-party conference call',
    parserVersion: 'official-route-v1',
    scope: 'ISCAS 2027 regular paper and live demonstration routes',
    publicationPolicy: 'monitor-confirmed',
    reviewedAt: '2026-09-23T00:00:00Z',
  },
  {
    id: 'genius-olympiad',
    name: 'GENIUS Olympiad',
    authoritativeHub: 'https://geniusolympiad.org/',
    permittedHost: 'geniusolympiad.org',
    permittedPathPrefix: '/',
    sourceType: 'official-html',
    discoveryMethod: 'Reviewed event site, discipline descriptions, and organizer rules PDF',
    parserVersion: 'official-route-v1',
    scope: 'GENIUS Olympiad student competition routes and current-cycle rules',
    publicationPolicy: 'monitor-confirmed',
    reviewedAt: '2026-09-23T00:00:00Z',
  },
  {
    id: 'ieee-big-data-2026',
    name: 'IEEE Big Data 2026 program and registration',
    authoritativeHub: 'https://bigdataieee.org/BigData2026/program/',
    permittedHost: 'bigdataieee.org',
    permittedPathPrefix: '/BigData2026/',
    sourceType: 'directory',
    discoveryMethod: 'Official conference program and linked workshop calls',
    parserVersion: 'official-route-v1',
    scope: 'IEEE Big Data 2026 accepted workshops and conference cost rules',
    publicationPolicy: 'review-required',
    reviewedAt: '2026-09-23T00:00:00Z',
  },
  {
    id: 'trustmore-2026',
    name: 'TRUSTMORE 2026 workshop',
    authoritativeHub: 'https://trustmoreai.github.io/workshop2026/',
    permittedHost: 'trustmoreai.github.io',
    permittedPathPrefix: '/workshop2026/',
    sourceType: 'official-html',
    parentId: 'ieee-big-data-2026',
    discoveryMethod: 'Official IEEE Big Data program link followed to organizer call',
    parserVersion: 'official-route-v1',
    scope: 'TRUSTMORE 2026 contribution route only',
    publicationPolicy: 'review-required',
    reviewedAt: '2026-09-23T00:00:00Z',
  },
  {
    id: 'icassp-2027',
    name: 'ICASSP 2027 regular paper call',
    authoritativeHub: 'https://2027.ieeeicassp.org/call-for-papers/',
    permittedHost: '2027.ieeeicassp.org',
    permittedPathPrefix: '/',
    sourceType: 'official-html',
    discoveryMethod: 'Reviewed first-party conference call and IEEE society event page',
    parserVersion: 'official-route-v1',
    scope: 'ICASSP 2027 regular paper route',
    publicationPolicy: 'monitor-confirmed',
    reviewedAt: '2026-09-23T00:00:00Z',
  },
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
