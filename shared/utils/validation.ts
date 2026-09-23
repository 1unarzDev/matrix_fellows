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
        kind: z.enum(['deadline', 'event', 'opens', 'results']),
        timezone: timezone.nullable(),
        evidence: z.string().min(1).max(700),
        superseded: z.boolean().optional(),
        url: httpsUrl,
        role: z
          .enum([
            'abstract',
            'submission',
            'qualification',
            'nomination',
            'ethics-approval',
            'registration',
            'camera-ready',
            'event',
            'results',
          ])
          .optional(),
        precision: z.enum(['exact', 'date-only']).optional(),
        originalTimezone: z.string().max(160).nullable().optional(),
        tentative: z.boolean().optional(),
        conflict: z.string().max(700).nullable().optional(),
        sourceRef: z.string().max(240).optional(),
      }),
    )
    .max(120)
    .optional(),
  provenance: z
    .object({
      url: httpsUrl,
      contentHash: z.string().regex(/^[a-f0-9]{64}$/),
      parserVersion: shortText,
    })
    .optional(),
  lifecycle: z
    .enum(['announced', 'rolling', 'awaiting-announcement', 'discontinued', 'replaced', 'unknown'])
    .optional(),
  lifecycleEvidence: z.string().max(1000).optional(),
  edition: z.string().max(80).optional(),
  cost: z.string().max(500).optional(),
  effort: z.string().max(500).optional(),
  monitoring: z
    .object({ lastCheckedAt: date.nullable(), lastSuccessAt: date.nullable(), issue: z.boolean() })
    .optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(180)
    .optional(),
  canonicalId: z.string().min(1).max(650).optional(),
  aliases: z.array(z.string().min(1).max(160)).max(30).optional(),
  organizer: z.string().max(240).optional(),
  series: z
    .object({ id: z.string().max(180), name: z.string().max(240) })
    .nullable()
    .optional(),
  parent: z
    .object({
      id: z.string().max(180).optional(),
      name: z.string().max(240),
      kind: z.enum(['organization', 'series', 'edition', 'session']),
    })
    .nullable()
    .optional(),
  routeType: z
    .enum([
      'paper',
      'short-paper',
      'poster',
      'workshop-contribution',
      'challenge',
      'competition',
      'program',
      'publication',
      'attendance',
    ])
    .optional(),
  contributionFormat: z.string().max(300).optional(),
  disciplines: z.array(z.string().min(1).max(100)).max(20).optional(),
  topics: z.array(z.string().min(1).max(120)).max(60).optional(),
  highSchoolPolicy: z.enum(['supported', 'excluded', 'not-stated']).optional(),
  highSchoolEvidence: z.string().max(1200).optional(),
  restrictions: z
    .object({
      grades: z.string().max(300).nullable().optional(),
      ages: z.string().max(300).nullable().optional(),
      geography: z.string().max(500).nullable().optional(),
      team: z.string().max(500).nullable().optional(),
      adultSponsor: z.string().max(500).nullable().optional(),
      schoolNomination: z.string().max(500).nullable().optional(),
      authorEligibility: z.string().max(700).nullable().optional(),
      minorAttendance: z.string().max(700).nullable().optional(),
      platformAccount: z.string().max(500).nullable().optional(),
    })
    .optional(),
  preparationStages: z
    .array(
      z.enum([
        'idea',
        'prototype',
        'preliminary-results',
        'completed-research',
        'learning-team-practice',
      ]),
    )
    .max(5)
    .optional(),
  prerequisites: z.array(z.string().min(1).max(700)).max(30).optional(),
  costs: z
    .object({
      submission: z.string().max(400).nullable().optional(),
      registration: z.string().max(400).nullable().optional(),
      accompanyingAdult: z.string().max(400).nullable().optional(),
      travel: z.string().max(400).nullable().optional(),
      materials: z.string().max(400).nullable().optional(),
      publication: z.string().max(400).nullable().optional(),
      aid: z.string().max(500).nullable().optional(),
    })
    .optional(),
  outcomes: z.array(z.string().min(1).max(500)).max(30).optional(),
  participationModes: z
    .array(z.enum(['in-person', 'remote-submission', 'remote-presentation', 'hybrid']))
    .max(4)
    .optional(),
  archival: z.boolean().nullable().optional(),
  fieldEvidence: z
    .array(
      z.object({
        field: z.string().min(1).max(120),
        url: httpsUrl,
        quote: z.string().max(1200).optional(),
        observedAt: date,
        confirmedAt: date.nullable().optional(),
        contentHash: z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .optional(),
      }),
    )
    .max(100)
    .optional(),
  searchVersion: z.number().int().min(1).max(1000).optional(),
})
export const sourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,60}$/),
  name: shortText.min(1),
  kind: z.enum(['json', 'rss', 'official']),
  url: httpsUrl,
  enabled: z.boolean(),
})
