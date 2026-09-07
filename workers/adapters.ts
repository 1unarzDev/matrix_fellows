import { XMLParser } from 'fast-xml-parser'
import type { ImportSource, Opportunity } from '../shared/types/content'
import { opportunitySchema } from '../shared/utils/validation'
import { parseOfficial } from './official'
import { officialProfiles } from './official-sources'

export interface SourceAdapter {
  parse(body: string, source: ImportSource, now: string): Opportunity[]
}

export function canonicalUrl(value: string): string {
  const url = new URL(value)
  if (url.protocol !== 'https:') throw new Error('Only HTTPS URLs are accepted')
  url.hash = ''
  for (const key of [...url.searchParams.keys()])
    if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key)
  url.searchParams.sort()
  return url.href.replace(/\/$/, '')
}

function normalize(row: Record<string, unknown>, source: ImportSource, now: string): Opportunity {
  const url = canonicalUrl(String(row.url || ''))
  const externalId = String(row.externalId || row.id || url)
  return opportunitySchema.parse({
    ...row,
    id: `${source.id}:${externalId}`,
    sourceId: source.id,
    externalId,
    url,
    kind: row.kind || 'Conference',
    discipline: row.discipline || 'Across disciplines',
    description: row.description || '',
    eventDate: row.eventDate || null,
    deadline: row.deadline || null,
    timezone: row.timezone || null,
    location: row.location || 'See official source',
    eligibility: row.eligibility || 'Check official eligibility',
    verifiedAt: now,
    priority: row.priority ?? 50,
    published: true,
  })
}

export const jsonAdapter: SourceAdapter = {
  parse(body, source, now) {
    const parsed = JSON.parse(body)
    const rows = Array.isArray(parsed) ? parsed : parsed.opportunities
    if (!Array.isArray(rows)) throw new Error('Expected an array or { opportunities: [...] }')
    if (rows.length > 500) throw new Error('Source exceeds 500 entries')
    return rows.map((row) => normalize(row, source, now))
  },
}

const text = (value: unknown): string =>
  typeof value === 'string'
    ? value
    : value && typeof value === 'object' && '#text' in value
      ? String(value['#text'])
      : ''
const plain = (value: unknown) =>
  text(value)
    .replace(/<[^>]*>/g, '')
    .trim()
const array = <T>(value: T | T[] | undefined): T[] =>
  value ? (Array.isArray(value) ? value : [value]) : []

export const rssAdapter: SourceAdapter = {
  parse(body, source, now) {
    // Reject DTDs/entities rather than evaluating untrusted feed expansion.
    if (/<!DOCTYPE|<!ENTITY/i.test(body)) throw new Error('Feed DTDs are not supported')
    const parsed = new XMLParser({ ignoreAttributes: false, processEntities: false }).parse(body)
    if (!parsed.rss?.channel && !parsed.feed) throw new Error('Expected RSS or Atom')
    const rows = array<Record<string, unknown>>(parsed.rss?.channel?.item || parsed.feed?.entry)
    if (rows.length > 500) throw new Error('Source exceeds 500 entries')
    return rows.map((row) => {
      const link = Array.isArray(row.link)
        ? row.link.find((l) => !l['@_rel'] || l['@_rel'] === 'alternate')
        : row.link
      const url = typeof link === 'string' ? link : (link as Record<string, string>)?.['@_href']
      return normalize(
        {
          externalId: text(row.guid || row.id) || url,
          url,
          title: plain(row.title),
          description: plain(row.description || row.summary).slice(0, 4000),
          // Publication dates are NOT event dates or submission deadlines.
          kind: text(row['mf:kind']) || 'Conference',
          discipline: plain(row['mf:discipline']),
          deadline: text(row['mf:deadline']) || null,
          eventDate: text(row['mf:eventDate']) || null,
          timezone: text(row['mf:timezone']) || null,
          eligibility: plain(row['mf:eligibility']),
          location: plain(row['mf:location']),
        },
        source,
        now,
      )
    })
  },
}

export function deduplicate(items: Opportunity[]): Opportunity[] {
  const urls = new Set<string>(),
    identities = new Set<string>()
  return items.filter((item) => {
    const identity = `${item.sourceId}:${item.externalId}`,
      url = canonicalUrl(item.url)
    if (urls.has(url) || identities.has(identity)) return false
    urls.add(url)
    identities.add(identity)
    return true
  })
}

export async function fetchSource(source: ImportSource): Promise<Opportunity[]> {
  if (
    source.kind === 'official' &&
    !officialProfiles.some((p) => p.id === source.id && p.url === source.url)
  )
    throw new Error('Official source URL does not match the reviewed allowlist')
  const url = new URL(source.url)
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    /(^localhost$|\.local$|\.internal$|^\[|^[\d.]+$)/i.test(url.hostname)
  )
    throw new Error('Source must be a public HTTPS hostname')
  const response = await fetch(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(12000),
    headers: {
      Accept:
        source.kind === 'official'
          ? 'text/html'
          : source.kind === 'json'
            ? 'application/json'
            : 'application/rss+xml, application/atom+xml, application/xml',
      'User-Agent': 'MatrixFellows-Opportunities/1.0',
    },
  })
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`)
  if (source.kind === 'official' && !response.headers.get('content-type')?.includes('text/html'))
    throw new Error('Expected official HTML page, not a redirect or challenge')
  if (!response.body) throw new Error('Empty response')
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > 2 * 1024 * 1024) {
        await reader.cancel()
        throw new Error('Source exceeds 2 MB')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  chunks.forEach((chunk) => {
    bytes.set(chunk, offset)
    offset += chunk.length
  })
  if (source.kind === 'official') {
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
    return parseOfficial(new TextDecoder().decode(bytes), source, new Date().toISOString(), hash)
  }
  return deduplicate(
    (source.kind === 'json' ? jsonAdapter : rssAdapter).parse(
      new TextDecoder().decode(bytes),
      source,
      new Date().toISOString(),
    ),
  )
}
