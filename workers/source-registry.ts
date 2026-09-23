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
