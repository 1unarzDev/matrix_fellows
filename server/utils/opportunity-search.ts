import { z } from 'zod'
import type { H3Event } from 'h3'

const allowedDisciplines = [
  'AI & machine learning',
  'Robotics',
  'Biomedical engineering',
  'Electrical engineering',
  'Mechanical engineering',
  'Biology',
  'Chemistry',
  'Computer science',
  'Mathematics',
  'Physics',
  'Materials science',
  'Environmental science',
] as const
const split = (value: unknown) =>
  (Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [])
    .map(String)
    .map((entry) => entry.trim())
    .filter(Boolean)

const schema = z.object({
  q: z.string().trim().max(240).default(''),
  disciplines: z.array(z.enum(allowedDisciplines)).max(12).default([]),
  kinds: z
    .array(z.enum(['Competition', 'Conference', 'Workshop', 'Publication', 'Program']))
    .max(5)
    .default([]),
  highSchoolPolicies: z
    .array(z.enum(['supported', 'excluded', 'not-stated']))
    .max(3)
    .default([]),
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
    .default([]),
  statuses: z
    .array(
      z.enum([
        'open',
        'upcoming',
        'awaiting-announcement',
        'closed',
        'rolling',
        'historical',
        'unknown',
      ]),
    )
    .max(7)
    .default([]),
  modes: z
    .array(z.enum(['in-person', 'remote-submission', 'remote-presentation', 'hybrid']))
    .max(4)
    .default([]),
  freeSubmission: z.boolean().default(false),
  archival: z.boolean().nullable().default(null),
  sort: z.enum(['relevance', 'next-deadline', 'actionable', 'verified']).default('relevance'),
  page: z.number().int().min(1).max(10_000).default(1),
  pageSize: z.number().int().min(1).max(50).default(12),
})

export type SearchInput = z.infer<typeof schema>
export function parseOpportunitySearch(event: H3Event): SearchInput {
  const query = getQuery(event)
  return schema.parse({
    q: typeof query.q === 'string' ? query.q : '',
    disciplines: split(query.discipline),
    kinds: split(query.kind),
    highSchoolPolicies: split(query.highSchool),
    preparationStages: split(query.stage),
    statuses: split(query.status),
    modes: split(query.mode),
    freeSubmission: query.free === 'true',
    archival: query.archival === undefined ? null : query.archival === 'true',
    sort: query.sort,
    page: Number(query.page || 1),
    pageSize: Number(query.pageSize || 12),
  })
}

export function rpcSearchArgs(input: SearchInput) {
  return {
    p_query: input.q,
    p_disciplines: input.disciplines,
    p_kinds: input.kinds,
    p_high_school: input.highSchoolPolicies,
    p_stages: input.preparationStages,
    p_statuses: input.statuses,
    p_modes: input.modes,
    p_free_submission: input.freeSubmission,
    p_archival: input.archival,
    p_sort: input.sort,
    p_limit: input.pageSize,
    p_offset: (input.page - 1) * input.pageSize,
  }
}

export function emptyFacets(): Record<string, Record<string, number>> {
  return { kind: {}, highSchoolPolicy: {}, status: {} }
}

export function catalogQuery(input: SearchInput) {
  const query = new URLSearchParams()
  if (input.q) query.set('q', input.q)
  for (const [key, values] of [
    ['discipline', input.disciplines],
    ['kind', input.kinds],
    ['highSchool', input.highSchoolPolicies],
    ['stage', input.preparationStages],
    ['status', input.statuses],
    ['mode', input.modes],
  ] as const)
    for (const value of values) query.append(key, value)
  if (input.freeSubmission) query.set('free', 'true')
  if (input.archival !== null) query.set('archival', String(input.archival))
  if (input.sort !== 'relevance') query.set('sort', input.sort)
  if (input.page > 1) query.set('page', String(input.page))
  return query
}

export const catalogDisciplines = [...allowedDisciplines]
