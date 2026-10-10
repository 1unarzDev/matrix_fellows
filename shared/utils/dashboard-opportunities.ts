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
