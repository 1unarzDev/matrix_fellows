import { opportunitySchema } from '../shared/utils/validation'
import { officialProfiles } from './official-sources'
import programs from '../docs/research/program-catalog.json'
import competitions from '../docs/research/competition-catalog.json'
import type { Opportunity } from '../shared/types/content'

export const catalogSeeds = [...programs, ...competitions].map((raw) => {
  const entry = raw as Record<string, any>
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
