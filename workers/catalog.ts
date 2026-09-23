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
  ...[...catalogAdditions, ...catalogExpansion, ...disciplineCatalogExpansion].map((item) => ({
    sources: [...new Set([item.url, ...(item.fieldEvidence || []).map((entry) => entry.url)])],
    item: opportunitySchema.parse(item) as Opportunity,
  })),
]

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
    return (
      parsed.protocol === 'https:' &&
      !parsed.username &&
      !parsed.password &&
      !parsed.port &&
      allowedHosts.has(parsed.hostname)
    )
  } catch {
    return false
  }
}
