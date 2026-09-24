import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  jsonAdapter,
  rssAdapter,
  canonicalUrl,
  deduplicate,
  fetchSource,
} from '../../workers/adapters'
import { defaultOpportunities, defaultContent } from '../../shared/data/defaults'
import {
  deadlineTimestamp,
  isUpcoming,
  selectHomepageOpportunities,
  sortOpportunities,
} from '../../shared/utils/opportunities'
import { contentSchema, opportunitySchema } from '../../shared/utils/validation'
import { catalogAdditions } from '../../shared/data/opportunity-catalog-additions'
import {
  catalogExpansion,
  texasIneligibleCatalogIds,
} from '../../shared/data/opportunity-catalog-expansion'
import { disciplineCatalogExpansion } from '../../shared/data/opportunity-discipline-expansion'
import {
  CATALOG_ENRICHMENT_VERSION,
  catalogEnrichment,
} from '../../shared/data/opportunity-catalog-enrichment'

const source = {
  id: 'test',
  name: 'Test source',
  kind: 'json' as const,
  url: 'https://example.org/feed',
  enabled: true,
}
const now = '2026-09-06T12:00:00Z'
const row = {
  title: 'Research workshop',
  url: 'https://example.org/workshop?utm_source=email',
  externalId: 'workshop',
  deadline: '2026-10-01',
}
afterEach(() => vi.unstubAllGlobals())

describe('opportunity ingestion', () => {
  it('validates specific catalog routes and keeps unknown access claims explicit', () => {
    expect(catalogAdditions.map((item) => opportunitySchema.parse(item))).toHaveLength(3)
    expect(catalogAdditions.find((item) => item.id.includes('bmes'))).toMatchObject({
      highSchoolPolicy: 'supported',
      preparationStages: expect.arrayContaining(['idea']),
    })
    expect(catalogAdditions.find((item) => item.id.includes('iscas'))).toMatchObject({
      highSchoolPolicy: 'not-stated',
      participationModes: ['in-person'],
    })
  })
  it('ships complete, evidence-backed internship and summer-program expansion records', () => {
    const parsed = catalogExpansion.map((item) => opportunitySchema.parse(item))
    expect(parsed.length).toBeGreaterThanOrEqual(12)
    expect(parsed.find((item) => item.title === 'HOSA Medical Innovation')).toMatchObject({
      kind: 'Competition',
      aliases: expect.arrayContaining(['HOSA Biomedical Innovation']),
      deadline: null,
    })
    expect(parsed.filter((item) => item.kind === 'Internship').length).toBeGreaterThanOrEqual(3)
    expect(parsed.filter((item) => item.kind === 'Summer program').length).toBeGreaterThanOrEqual(7)
    for (const item of parsed) {
      expect(item.canonicalId, item.title).toBeTruthy()
      expect(item.organizer, item.title).toBeTruthy()
      expect(item.disciplines?.length, item.title).toBeGreaterThan(0)
      expect(item.topics?.length, item.title).toBeGreaterThan(0)
      expect(item.highSchoolPolicy, item.title).toBe('supported')
      expect(item.highSchoolEvidence, item.title).toBeTruthy()
      expect(item.preparationStages?.length, item.title).toBeGreaterThan(0)
      expect(item.prerequisites?.length, item.title).toBeGreaterThan(0)
      expect(item.costs, item.title).toBeTruthy()
      expect(item.outcomes?.length, item.title).toBeGreaterThan(0)
      expect(item.participationModes?.length, item.title).toBeGreaterThan(0)
      expect(item.fieldEvidence?.length, item.title).toBeGreaterThan(0)
    }
    const canonicalOwners = new Map<string, string>()
    for (const item of [...catalogAdditions, ...parsed, ...disciplineCatalogExpansion]) {
      const url = canonicalUrl(item.url)
      expect(canonicalOwners.get(url), `${item.title} shares its canonical URL`).toBeUndefined()
      canonicalOwners.set(url, item.title)
    }
  })
  it('ships reviewed robotics and electrical-engineering routes with explicit affinity', () => {
    const parsed = disciplineCatalogExpansion.map((item) => opportunitySchema.parse(item))
    expect(parsed).toHaveLength(9)
    expect(
      parsed.find((item) => item.canonicalId === 'ieee-iscas:2027:regular-paper'),
    ).toMatchObject({
      discipline: 'Electrical engineering',
      disciplineAffinity: { 'Electrical engineering': 100 },
    })
    expect(
      parsed.find((item) => item.canonicalId === 'corl:2026:workshop:agentic-robotics'),
    ).toMatchObject({ disciplines: expect.arrayContaining(['Robotics', 'AI & machine learning']) })
    expect(parsed.filter((item) => item.highSchoolPolicy === 'supported')).toHaveLength(2)
    for (const item of parsed) {
      expect(item.disciplines?.length, item.title).toBeGreaterThan(0)
      expect(Object.keys(item.disciplineAffinity || {}).length, item.title).toBeGreaterThan(0)
      expect(item.fieldEvidence?.length, item.title).toBeGreaterThan(0)
      expect(item.costs, item.title).toBeTruthy()
    }
  })
  it('publishes Texas-accessible summer routes and excludes non-Texas local programs', () => {
    const ids = new Set(catalogExpansion.map((item) => item.id))
    for (const id of texasIneligibleCatalogIds) expect(ids.has(id), id).toBe(false)

    for (const title of [
      'MIT Beaver Works Summer Institute',
      'MITES Summer',
      'Anson L. Clark Scholars Program',
      'Carnegie Mellon AI Scholars',
      'UC Davis Young Scholars Program',
      'University of Iowa Secondary Student Training Program',
    ]) {
      const item = catalogExpansion.find((entry) => entry.title === title)
      expect(item, title).toBeTruthy()
      expect(item?.restrictions?.geography, title).toMatch(/Texas|state-residency/)
    }

    for (const id of ['rsi', 'bu-rise', 'promys']) {
      expect(catalogEnrichment[id]?.restrictions?.geography, id).toMatch(/Texas/)
    }
    for (const id of ['navy-seap-2027', 'gmu-assip-2026']) {
      expect(catalogEnrichment[id]?.restrictions?.geography, id).toMatch(/Texas/)
    }
  })
  it('reclassifies established research programs without duplicating their catalog IDs', () => {
    expect(CATALOG_ENRICHMENT_VERSION).toBeGreaterThan(1)
    expect(catalogEnrichment['stanford-simr']).toMatchObject({
      kind: 'Internship',
      routeType: 'internship',
    })
    expect(catalogEnrichment.rsi).toMatchObject({
      kind: 'Summer program',
      routeType: 'summer-program',
    })
    expect(catalogEnrichment['nasa-sees']).toMatchObject({
      kind: 'Internship',
      costs: expect.objectContaining({ program: expect.any(String) }),
    })
  })
  it('uses Workers-compatible manual redirects and rejects redirected sources', async () => {
    const mock = vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 302, headers: { Location: 'https://other.example/feed' } }),
      )
    vi.stubGlobal('fetch', mock)
    await expect(fetchSource(source)).rejects.toThrow('Source redirects are not allowed')
    expect(mock).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({ redirect: 'manual' }),
    )
    expect(mock).toHaveBeenCalledTimes(1)
  })
  it('compares offset deadlines as instants and ranks US entries first at equal priority', () => {
    expect(deadlineTimestamp('2026-09-07T01:00:00+03:00')).toBeLessThan(
      deadlineTimestamp('2026-09-06T23:00:00Z'),
    )
    const global = {
      ...defaultOpportunities[0]!,
      id: 'global',
      title: 'A global workshop',
      location: 'International',
      priority: 50,
    }
    const us = { ...global, id: 'us', title: 'Z US workshop', location: 'United States' }
    expect(sortOpportunities([global, us]).map((item) => item.id)).toEqual(['us', 'global'])
  })
  it('curates research flagships for the homepage without promoting HOSA routes', () => {
    const base = defaultOpportunities[0]!
    const candidates = [
      ['catalog:hosa-medical-innovation-2026-27', 'HOSA Medical Innovation'],
      ['catalog:icassp-2027-regular-paper', 'ICASSP 2027 Regular Paper'],
      ['regeneron-sts-2027:main', 'Regeneron Science Talent Search'],
      ['neurips-2026:main', 'NeurIPS'],
      ['catalog:iros-2026-regular-paper', 'IROS 2026 Regular Paper'],
      ['isef-2027:main', 'Regeneron ISEF 2027'],
      ['davidson-fellows-2027:main', 'Davidson Fellows Scholarship'],
    ].map(([id, title], priority) => ({ ...base, id, title, priority: 1000 - priority }))
    expect(selectHomepageOpportunities(candidates).map((item) => item.id)).toEqual([
      'davidson-fellows-2027:main',
      'isef-2027:main',
      'catalog:iros-2026-regular-paper',
      'neurips-2026:main',
      'regeneron-sts-2027:main',
      'catalog:icassp-2027-regular-paper',
    ])
  })
  it('normalizes a trusted JSON feed without inventing event dates or eligibility', () => {
    const [item] = jsonAdapter.parse(JSON.stringify({ opportunities: [row] }), source, now)
    expect(item).toMatchObject({
      sourceId: 'test',
      deadline: '2026-10-01',
      eventDate: null,
      timezone: null,
      eligibility: 'Check official eligibility',
      url: 'https://example.org/workshop',
      verifiedAt: now,
      published: true,
    })
  })
  it('never treats an RSS publication date as a submission deadline', () => {
    const [item] = rssAdapter.parse(
      '<rss><channel><item><title>Workshop</title><link>https://example.org/event</link><guid>e1</guid><pubDate>Thu, 10 Sep 2026 12:00:00 GMT</pubDate></item></channel></rss>',
      { ...source, kind: 'rss' },
      now,
    )
    expect(item?.deadline).toBeNull()
    expect(item?.eventDate).toBeNull()
  })
  it('supports explicit Atom deadline metadata and alternate links', () => {
    const [item] = rssAdapter.parse(
      '<feed><entry><id>one</id><title>Workshop</title><link rel="self" href="https://example.org/xml"/><link rel="alternate" href="https://example.org/event"/><mf:deadline>2026-11-12T23:59:00-06:00</mf:deadline><mf:kind>Workshop</mf:kind></entry></feed>',
      { ...source, kind: 'rss' },
      now,
    )
    expect(item?.deadline).toBe('2026-11-12T23:59:00-06:00')
    expect(item?.url).toBe('https://example.org/event')
  })
  it('rejects unsafe URLs and malformed dates before any import', () => {
    expect(() =>
      jsonAdapter.parse(JSON.stringify([{ ...row, url: 'javascript:alert(1)' }]), source, now),
    ).toThrow()
    expect(() =>
      jsonAdapter.parse(JSON.stringify([{ ...row, deadline: 'sometime' }]), source, now),
    ).toThrow()
    expect(() => rssAdapter.parse('<!DOCTYPE x><rss/>', { ...source, kind: 'rss' }, now)).toThrow()
  })
  it('deduplicates by canonical link or stable source identity', () => {
    const items = jsonAdapter.parse(
      JSON.stringify([
        row,
        { ...row, externalId: 'other', url: 'https://example.org/workshop#apply' },
      ]),
      source,
      now,
    )
    expect(deduplicate(items)).toHaveLength(1)
    expect(canonicalUrl('https://EXAMPLE.org/event/?utm_campaign=x#apply')).toBe(
      'https://example.org/event',
    )
  })
  it('keeps date-only deadlines visible for the full UTC date', () => {
    const item = { ...defaultOpportunities[0]!, deadline: '2026-09-06' }
    expect(isUpcoming(item, new Date('2026-09-06T23:59:59Z'))).toBe(true)
    expect(isUpcoming(item, new Date('2026-09-07T00:00:00Z'))).toBe(false)
    expect(isUpcoming({ ...item, deadline: null, eventDate: null }, new Date(now))).toBe(true)
  })
  it('fails closed on network errors and private endpoint literals', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('unavailable', { status: 503 })))
    await expect(fetchSource(source)).rejects.toThrow('HTTP 503')
    await expect(fetchSource({ ...source, url: 'https://127.0.0.1/feed' })).rejects.toThrow(
      'public HTTPS',
    )
  })
  it('validates shipped content and disallows executable admin links', () => {
    expect(contentSchema.safeParse(defaultContent).success).toBe(true)
    defaultOpportunities.forEach((item) =>
      expect(opportunitySchema.safeParse(item).success).toBe(true),
    )
    expect(
      contentSchema.safeParse({
        ...defaultContent,
        links: { join: 'javascript:alert(1)', contact: '' },
      }).success,
    ).toBe(false)
  })
})
