import { z } from 'zod'
import type { OpportunityCapturePreview } from '../types/dashboard-opportunities'
import type { Opportunity } from '../types/content'
export const catalogOpportunityIdSchema = z.string().regex(/^[a-z0-9][a-z0-9:_-]{0,199}$/)
/** Preview is a catalog lookup, never an arbitrary URL fetch. Private/special
 * addresses are rejected even though unsupported references are not requested. */
export function normalizeCaptureUrl(value: string) {
  if (value.length > 2000 || /[\u0000-\u0020\u007f]/.test(value.trim()))
    throw new Error('Paste a public HTTP or HTTPS link without spaces.')
  const url = new URL(value.trim())
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port)
    throw new Error('Use a public HTTP or HTTPS link without credentials or a custom port.')
  const host = url.hostname.toLowerCase()
  if (
    !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]*$/.test(host) ||
    /(?:^|\.)(localhost|local|internal|home|onion|invalid|test)$/.test(host)
  )
    throw new Error('Private-network and special-use addresses cannot be captured.')
  url.hash = ''
  for (const key of [...url.searchParams.keys()])
    if (/^utm_/i.test(key) || ['fbclid', 'gclid', 'msclkid'].includes(key.toLowerCase()))
      url.searchParams.delete(key)
  url.searchParams.sort()
  if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '')
  return url.href
}
export const captureInputSchema = z
  .object({
    url: z
      .string()
      .trim()
      .max(2000)
      .transform((v, ctx) => {
        try {
          return normalizeCaptureUrl(v)
        } catch (e) {
          ctx.addIssue({
            code: 'custom',
            message: e instanceof Error ? e.message : 'Paste a valid public link.',
          })
          return z.NEVER
        }
      }),
  })
  .strict()
export const referenceInputSchema = z
  .object({ url: captureInputSchema.shape.url, title: z.string().trim().min(1).max(240) })
  .strict()
export const opportunityDecisionSchema = z
  .object({
    opportunityId: catalogOpportunityIdSchema,
    decision: z.enum(['pass', 'clear']),
    reason: z.string().trim().max(1000).default(''),
    expectedVersion: z.number().int().min(0),
  })
  .strict()
export function capturePreview(
  url: string,
  item: Opportunity | null,
  retrievedAt: string | null,
): OpportunityCapturePreview {
  return {
    url,
    title: item?.title || new URL(url).hostname,
    kind: item ? 'catalog' : 'unverified-reference',
    item,
    candidate: null,
    disposition: item ? 'catalog' : 'reference',
    reason: item ? 'Published catalog opportunity.' : 'The source has not been reviewed.',
    confidence: item ? 1 : null,
    source: {
      url: item?.url || url,
      retrievedAt,
      label: item ? 'Existing sourced catalog record' : 'Member-supplied link',
    },
    notice: item
      ? 'Review the published cycle and eligibility before pursuing. This preview does not reverify the source.'
      : 'This link has not been fetched or verified. Save it as a reference; it creates no application or task.',
  }
}

export type OpportunityCaptureDisposition = 'personal' | 'shared-review' | 'rejected'

/**
 * Classifies bounded source text without treating a model or page as an authority.
 * The worker/editorial review remains the publication gate for shared opportunities.
 */
export function classifyOpportunityCapture(input: {
  url: string
  title?: string
  text: string
}): {
  disposition: OpportunityCaptureDisposition
  reason: string
  confidence: number
  title: string
  kind: Opportunity['kind']
  discipline: string
  eligibility: string
  description: string
  eventDate: string | null
  deadline: string | null
  organizer?: string
} {
  const text = `${input.title || ''}\n${input.text}`.replace(/\s+/g, ' ').trim().slice(0, 16000)
  const lower = text.toLowerCase()
  const host = new URL(input.url).hostname.toLowerCase()
  const title = (input.title || text.match(/(?:^|\n)\s*([^\n]{4,140})/)?.[1] || host)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240)
  const media = /(?:youtube\.com|youtu\.be|vimeo\.com)/.test(host)
  const editorial = /\b(opinion|editorial|commentary|explainer|news article|article)\b/.test(lower)
  const audience = /\b(?:grades?|ages?|students?|participants?|applicants?|researchers?|high[- ]?school)\b/.test(lower)
  const action = /\b(?:apply|application|register|registration|submit|submission|call for|enter|enroll|participate|attend|deadline|contest|competition|応募)\b/.test(lower)
  const event = /\b(?:workshop|competition|contest|program|internship|conference|challenge|fellowship|olympiad|summer school)\b/.test(lower)
  const date = /\b(?:deadline|due|event date|held on|takes place|registration closes?|applications? close)\b/.test(lower)
  const schoolOnly = /\b(?:middle school|grades?\s*6\s*(?:-|to)\s*8|grades?\s*6\s*[-–]\s*8)\b/.test(lower) &&
    /\b(?:weekly|after[- ]school|students? of|for)\b/.test(lower) && !/\b(?:apply|register|external|open to)\b/.test(lower)
  const researchMention = /\b(?:research|robotics|artificial intelligence|\bai\b|science|engineering|paper|poster|demonstration|mentoring|lab|project)\b/.test(lower)
  const researchValue = researchMention && !/\b(?:no|without|not)\s+(?:research|mentoring|lab|project)\b/.test(lower)
  const toDate = (value: string) => {
    const iso = value.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1]
    if (iso && !Number.isNaN(Date.parse(`${iso}T00:00:00Z`))) return iso
    const named = value.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,|\s)\s*(20\d{2})\b/i)
    if (!named) return null
    const month = new Date(`${named[1]} 1, ${named[3]} UTC`).getUTCMonth() + 1
    return `${named[3]}-${String(month).padStart(2, '0')}-${String(Number(named[2])).padStart(2, '0')}`
  }
  const dateValues = [...text.matchAll(/\b(?:20\d{2}-\d{2}-\d{2}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,|\s)\s*20\d{2})\b/gi)].map((match) => toDate(match[0])).filter((value): value is string => !!value)
  const deadlineContext = text.match(/\b(?:deadline|due|applications? close|registration closes?|register by|submit by)\b[^.]{0,100}/i)?.[0] || ''
  const deadline = toDate(deadlineContext) || null
  const eventDate = dateValues.find((value) => value !== deadline) || dateValues[0] || null
  if (media)
    return { disposition: 'rejected', reason: 'Videos and other media are supporting material, not actionable opportunities.', confidence: 0.99, title, kind: 'Program', discipline: 'General', eligibility: 'Unknown', description: text.slice(0, 4000), eventDate: null, deadline: null }
  if (schoolOnly)
    return { disposition: 'rejected', reason: 'This is a closed school club outside the intended opportunity scope.', confidence: 0.97, title, kind: 'Program', discipline: 'General', eligibility: 'School-specific', description: text.slice(0, 4000), eventDate: null, deadline: null }
  if (!action || !event || editorial || (!audience && !date))
    return { disposition: 'rejected', reason: 'No participant action, eligibility, or concrete opportunity timing was found.', confidence: 0.9, title, kind: event ? 'Program' : 'Publication', discipline: 'General', eligibility: 'Not stated', description: text.slice(0, 4000), eventDate: null, deadline: null }
  const shared = researchValue && /\b(?:workshop|conference|call for|research|lab|mentoring)\b/.test(lower) && (audience || date) && (action || date)
  const kind: Opportunity['kind'] = /workshop/.test(lower) ? 'Workshop' : /competition|contest|olympiad/.test(lower) ? 'Competition' : /internship/.test(lower) ? 'Internship' : /conference/.test(lower) ? 'Conference' : 'Program'
  return {
    disposition: shared ? 'shared-review' : 'personal',
    reason: shared ? 'Research or mentoring value appears reusable across Matrix Fellows; it will wait for officer review.' : 'This is a real, bounded opportunity that is useful to the submitting member without enough evidence for shared catalog admission.',
    confidence: shared ? 0.78 : 0.72,
    title,
    kind,
    discipline: researchValue ? 'Research & enrichment' : 'General enrichment',
    eligibility: audience ? 'Eligibility described on the submitted source; review required.' : 'Eligibility needs review.',
    description: text.slice(0, 4000),
    eventDate,
    deadline,
  }
}
