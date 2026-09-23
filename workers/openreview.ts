import { z } from 'zod'
import { digest } from './monitoring'
import { openReviewVenuePrefixes } from './source-registry'

const API2 = 'https://api2.openreview.net'
const MAX_ACTIVE_VENUES = 2500
const MAX_CANDIDATES = 120
const timeout = 10_000

const wrapped = z.object({ value: z.unknown() })
const groupSchema = z.object({
  id: z.string().min(3).max(500),
  readers: z.array(z.string()).default([]),
  parent: z.string().optional(),
  content: z.record(z.string(), wrapped).default({}),
})
const invitationSchema = z.object({
  id: z.string().min(3).max(700),
  readers: z.array(z.string()).default([]),
  duedate: z.number().int().positive().optional(),
  expdate: z.number().int().positive().optional(),
  cdate: z.number().int().positive().optional(),
  mdate: z.number().int().positive().optional(),
  description: z.string().max(5000).optional(),
})

export interface StructuredApiEvidence {
  endpoint: string
  objectId: string
  jsonField: string
  rawValue: number
  interpretedAt: string
  semanticRole: 'submission' | 'technical-expiry'
  retrievedAt: string
  contentHash: string
}
export interface OpenReviewCandidate {
  sourceId: 'openreview-active-venues'
  sourceObjectId: string
  canonicalHint: string
  title: string
  website: string
  parent: string | null
  venueId: string
  invitationId: string
  duedate: string | null
  expdate: string | null
  active: boolean
  highSchoolPolicy: 'not-stated'
  evidence: StructuredApiEvidence[]
}

function value(content: Record<string, { value?: unknown }>, key: string) {
  return content[key]?.value
}
function eligibleVenueId(id: string) {
  return (
    openReviewVenuePrefixes.some((prefix) => id.startsWith(prefix)) &&
    /\/(Workshop|Symposium|Poster|Short_Paper|Work-In-Progress|Challenge)(?:\/|$)/i.test(id) &&
    !/(Workshop_Proposals?|Organizer|Reviewers?|Area_Chairs?|Program_Chairs?|Submission\d+)(?:\/|$)/i.test(
      id,
    )
  )
}
async function getJson(fetcher: typeof fetch, url: URL, attempt = 0): Promise<unknown> {
  if (url.origin !== API2) throw new Error('OpenReview endpoint is outside the reviewed API origin')
  const response = await fetcher(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(timeout),
    headers: { Accept: 'application/json', 'User-Agent': 'MatrixFellows-Opportunities/1.0' },
  })
  if (response.status === 429 || response.status >= 500) {
    if (attempt < 2) {
      const retryAfter = Math.min(
        2000,
        Math.max(
          250,
          Number(response.headers.get('retry-after') || 0) * 1000 || 400 * (attempt + 1),
        ),
      )
      await new Promise((resolve) => setTimeout(resolve, retryAfter))
      return getJson(fetcher, url, attempt + 1)
    }
    throw new Error(`OpenReview temporarily unavailable (${response.status})`)
  }
  if (!response.ok) throw new Error(`OpenReview returned HTTP ${response.status}`)
  const length = Number(response.headers.get('content-length') || 0)
  if (length > 2_000_000) throw new Error('OpenReview response exceeds 2 MB')
  const body = await response.text()
  if (body.length > 2_000_000) throw new Error('OpenReview response exceeds 2 MB')
  return JSON.parse(body) as unknown
}

export async function discoverOpenReview(
  fetcher: typeof fetch = fetch,
  limit = MAX_CANDIDATES,
  offset = 0,
): Promise<OpenReviewCandidate[]> {
  const activeUrl = new URL('/groups?id=active_venues', API2)
  const active = z
    .object({ groups: z.array(z.object({ members: z.array(z.string()) })).length(1) })
    .parse(await getJson(fetcher, activeUrl))
  if (active.groups[0]!.members.length > MAX_ACTIVE_VENUES)
    throw new Error('OpenReview active venue set exceeds reviewed bound')
  const eligibleIds = active.groups[0]!.members.filter(eligibleVenueId)
  const boundedLimit = Math.min(limit, MAX_CANDIDATES)
  const start = eligibleIds.length ? Math.max(0, offset) % eligibleIds.length : 0
  // Rotate the bounded weekly window rather than allowing whichever venue
  // family appears first in active_venues to monopolize review capacity.
  const ids = [...eligibleIds.slice(start), ...eligibleIds.slice(0, start)].slice(0, boundedLimit)
  const candidates: OpenReviewCandidate[] = []
  for (const id of ids) {
    const groupUrl = new URL('/groups', API2)
    groupUrl.searchParams.set('id', id)
    const groupResult = z
      .object({ groups: z.array(groupSchema).max(1) })
      .parse(await getJson(fetcher, groupUrl))
    const group = groupResult.groups[0]
    if (!group || !group.readers.includes('everyone')) continue
    const invitationId = value(group.content, 'submission_id')
    const title = value(group.content, 'title')
    const website = value(group.content, 'website')
    if (typeof invitationId !== 'string' || !invitationId.startsWith(`${id}/-/`)) continue
    if (typeof title !== 'string' || typeof website !== 'string') continue
    let reviewedWebsite: string
    try {
      const parsedWebsite = new URL(website)
      if (
        !['http:', 'https:'].includes(parsedWebsite.protocol) ||
        parsedWebsite.username ||
        parsedWebsite.password ||
        parsedWebsite.port
      )
        continue
      // A few organizer-maintained OpenReview records still advertise HTTP
      // even though the same official page supports HTTPS. Discovery remains
      // review-only, but we never expose or persist the insecure form.
      parsedWebsite.protocol = 'https:'
      reviewedWebsite = parsedWebsite.href
    } catch {
      continue
    }
    const invitationUrl = new URL('/invitations', API2)
    invitationUrl.searchParams.set('id', invitationId)
    invitationUrl.searchParams.set('expired', 'true')
    const invitationResult = z
      .object({ invitations: z.array(invitationSchema).max(1) })
      .parse(await getJson(fetcher, invitationUrl))
    const invitation = invitationResult.invitations[0]
    if (!invitation || !invitation.readers.includes('everyone')) continue
    const retrievedAt = new Date().toISOString()
    const contentHash = await digest(invitation)
    const evidence: StructuredApiEvidence[] = []
    if (invitation.duedate)
      evidence.push({
        endpoint: invitationUrl.href,
        objectId: invitation.id,
        jsonField: 'duedate',
        rawValue: invitation.duedate,
        interpretedAt: new Date(invitation.duedate).toISOString(),
        semanticRole: 'submission',
        retrievedAt,
        contentHash,
      })
    if (invitation.expdate)
      evidence.push({
        endpoint: invitationUrl.href,
        objectId: invitation.id,
        jsonField: 'expdate',
        rawValue: invitation.expdate,
        interpretedAt: new Date(invitation.expdate).toISOString(),
        semanticRole: 'technical-expiry',
        retrievedAt,
        contentHash,
      })
    candidates.push({
      sourceId: 'openreview-active-venues',
      sourceObjectId: id,
      canonicalHint: `${id}:${invitation.id}`,
      title,
      website: reviewedWebsite,
      parent: group.parent || null,
      venueId: id,
      invitationId: invitation.id,
      duedate: invitation.duedate ? new Date(invitation.duedate).toISOString() : null,
      expdate: invitation.expdate ? new Date(invitation.expdate).toISOString() : null,
      active: Boolean(invitation.duedate && invitation.duedate >= Date.now()),
      highSchoolPolicy: 'not-stated',
      evidence,
    })
  }
  return candidates
}
