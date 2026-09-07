import { z } from 'zod'

export const httpsUrl = z
  .string()
  .url()
  .refine((value) => value.startsWith('https://'), 'Use an https:// URL')
const optionalUrl = z.union([z.literal(''), httpsUrl])
const shortText = z.string().max(300)
const date = z.string().refine((value) => {
  if (
    !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2}))?$/.test(value) ||
    Number.isNaN(Date.parse(value))
  )
    return false
  const day = value.slice(0, 10)
  return new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day
}, 'Use a valid YYYY-MM-DD date or ISO timestamp with timezone')
const timezone = z.string().refine((value) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
    return true
  } catch {
    return false
  }
}, 'Use an IANA timezone, e.g. America/Chicago')
export const contentSchema = z.object({
  meeting: z.object({
    title: shortText.min(1),
    date: z.union([z.literal(''), date]),
    time: z.string().max(40),
    timezone,
    location: shortText,
    topics: z.array(shortText.min(1)).max(20),
    url: optionalUrl,
  }),
  projects: z
    .array(
      z.object({
        id: shortText.min(1),
        title: shortText.min(1),
        field: shortText,
        summary: z.string().max(1200),
        details: z.string().max(15000),
        status: shortText,
        url: optionalUrl,
      }),
    )
    .length(3),
  benefits: z
    .array(
      z.object({ title: shortText.min(1), description: z.string().max(2000), url: optionalUrl }),
    )
    .max(12),
  links: z.object({
    join: optionalUrl,
    contact: z.union([optionalUrl, z.string().regex(/^mailto:[^\s<>]+@[^\s<>]+$/)]),
  }),
})
export const opportunitySchema = z.object({
  id: z.string().min(1).max(650),
  sourceId: shortText.min(1),
  externalId: shortText.min(1),
  title: shortText.min(1),
  kind: z.enum(['Competition', 'Conference', 'Workshop', 'Publication', 'Program']),
  discipline: shortText,
  description: z.string().max(4000),
  eventDate: date.nullable(),
  deadline: date.nullable(),
  timezone: timezone.nullable(),
  location: shortText,
  eligibility: z.string().max(1000),
  url: httpsUrl,
  verifiedAt: date,
  priority: z.number().min(0).max(100),
  published: z.boolean(),
  milestones: z
    .array(
      z.object({
        label: shortText.min(1),
        date,
        kind: z.enum(['deadline', 'event']),
        timezone: timezone.nullable(),
        evidence: z.string().min(1).max(700),
        url: httpsUrl,
      }),
    )
    .max(30)
    .optional(),
  provenance: z
    .object({
      url: httpsUrl,
      contentHash: z.string().regex(/^[a-f0-9]{64}$/),
      parserVersion: shortText,
    })
    .optional(),
})
export const sourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,60}$/),
  name: shortText.min(1),
  kind: z.enum(['json', 'rss', 'official']),
  url: httpsUrl,
  enabled: z.boolean(),
})
