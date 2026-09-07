import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  jsonAdapter,
  rssAdapter,
  canonicalUrl,
  deduplicate,
  fetchSource,
} from '../../workers/adapters'
import { defaultOpportunities, defaultContent } from '../../shared/data/defaults'
import { deadlineTimestamp, isUpcoming, sortOpportunities } from '../../shared/utils/opportunities'
import { contentSchema, opportunitySchema } from '../../shared/utils/validation'

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
