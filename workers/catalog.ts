import { opportunitySchema } from '../shared/utils/validation'
import { officialProfiles } from './official-sources'
import programs from '../docs/research/catalogs/program.json'
import competitions from '../docs/research/catalogs/competition.json'
import publications from '../docs/research/catalogs/publication.json'
import workshops from '../docs/research/catalogs/workshop.json'
import { catalogAdditions } from '../shared/data/opportunity-catalog-additions'
import { catalogExpansion } from '../shared/data/opportunity-catalog-expansion'
import { disciplineCatalogExpansion } from '../shared/data/opportunity-discipline-expansion'
import { enrichCatalogOpportunity } from '../shared/data/opportunity-catalog-enrichment'
import type { Opportunity } from '../shared/types/content'
import { enrichInternship } from '../shared/data/internship-catalog'
import { reviewedIndustryRoutes as internshipAdditions } from '../shared/data/industry-internship-expansion'

const researchedSeeds = [...programs, ...competitions, ...publications, ...workshops].map((raw) => {
  const entry = enrichCatalogOpportunity(raw as Record<string, any>)
  const milestones = (entry.milestones || []).map((m: Record<string, any>) => ({
    ...m,
    timezone: ['America/Los_Angeles', 'America/New_York'].includes(m.timezone) ? m.timezone : null,
  }))
  return {
    sources: [...new Set([entry.url, ...(entry.sourceUrls || [])])] as string[],
    item: opportunitySchema.parse({
      ...entry,
      id: `catalog:${entry.id}`,
      sourceId: `catalog-${entry.id}`,
      externalId: 'main',
      edition: String(entry.edition || ''),
      priority: 80,
      location: entry.location || 'See official eligibility',
      eventDate: null,
      deadline: null,
      timezone: null,
      milestones,
      verifiedAt: '2026-09-07',
      published: true,
    }) as Opportunity,
  }
})
export const catalogSeeds = [
  ...researchedSeeds,
  ...[
    ...catalogAdditions,
    ...catalogExpansion,
    ...disciplineCatalogExpansion,
    ...internshipAdditions,
  ].map((item) => ({
    sources: [...new Set([item.url, ...(item.fieldEvidence || []).map((entry) => entry.url)])],
    item: opportunitySchema.parse(item) as Opportunity,
  })),
].map((seed) => {
  const item = opportunitySchema.parse(enrichInternship(seed.item)) as Opportunity
  return {
    ...seed,
    item,
    sources: [
      ...new Set([...seed.sources, ...(item.fieldEvidence || []).map((entry) => entry.url)]),
    ],
  }
})

// New discoveries can expand within reviewed official institutions, never
// arbitrary domains supplied by a model or an HTTP caller.
export const discoveryHubs = ['https://mitadmissions.org/apply/prepare/summer/']
export const allowedHosts = new Set([
  ...catalogSeeds.flatMap((seed) => seed.sources.map((url) => new URL(url).hostname)),
  ...officialProfiles.map((profile) => new URL(profile.url).hostname),
  ...discoveryHubs.map((url) => new URL(url).hostname),
])
export function approvedSource(url: string) {
  try {
    const parsed = new URL(url)
    // PeopleSoft reuses one URL path for unrelated vacancies. Only this public
    // job and its browser redirect alias are reviewed, never arbitrary jobs.
    if (parsed.hostname === 'cg.sandia.gov') {
      const job = new URL(internshipAdditions.find((item) => item.externalId === '698908')!.url)
      if (
        ![job.pathname, job.pathname.replace('/psp/', '/psc/')].includes(parsed.pathname) ||
        parsed.searchParams.size !== job.searchParams.size ||
        [...job.searchParams].some(([key, value]) => parsed.searchParams.get(key) !== value)
      )
        return false
    }
    return (
      parsed.protocol === 'https:' &&
      !parsed.username &&
      !parsed.password &&
      !parsed.port &&
      allowedHosts.has(parsed.hostname) &&
      (!internshipAdditions.some((item) =>
        [item.url, ...(item.fieldEvidence || []).map((entry) => entry.url)].some(
          (source) => new URL(source).hostname === parsed.hostname,
        ),
      ) ||
        internshipAdditions.some((item) =>
          [item.url, ...(item.fieldEvidence || []).map((entry) => entry.url)].some(
            (url) =>
              new URL(url).hostname === parsed.hostname &&
              (parsed.pathname === new URL(url).pathname ||
                (parsed.hostname === 'cg.sandia.gov' &&
                  parsed.pathname === new URL(url).pathname.replace('/psp/', '/psc/'))),
          ),
        ))
    )
  } catch {
    return false
  }
}
