import { createClient } from '@supabase/supabase-js'
import { defaultOpportunities } from '../../../shared/data/defaults'
import { opportunitySchema } from '../../../shared/utils/validation'
import type { OpportunitySearchResult } from '../../../shared/types/content'
import { emptyFacets, parseOpportunitySearch, rpcSearchArgs } from '../../utils/opportunity-search'
import { catalogSeeds } from '../../../workers/catalog'
import { getOpportunityState } from '../../../shared/utils/opportunity-lifecycle'

export default defineEventHandler(async (event): Promise<OpportunitySearchResult> => {
  let input
  try {
    input = parseOpportunitySearch(event)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid opportunity search' })
  }
  const config = useRuntimeConfig(event)
  const { supabaseUrl, supabaseAnonKey } = config.public
  setHeader(event, 'Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
  if (!supabaseUrl || !supabaseAnonKey) {
    const term = input.q.toLowerCase()
    const items = catalogSeeds.length ? catalogSeeds.map((seed) => seed.item) : defaultOpportunities
    const statusOf = (item: (typeof items)[number]) => {
      const key = getOpportunityState(item, Date.now()).key
      return key === 'awaiting' ? 'awaiting-announcement' : key === 'completed' ? 'closed' : key
    }
    const fundingMatch = (item: (typeof items)[number]) => {
      if (!input.funding.length) return true
      const compensation = item.costs?.compensation?.toLowerCase() || ''
      const aid = item.costs?.aid?.toLowerCase() || ''
      const program = item.costs?.program?.toLowerCase() || ''
      return input.funding.some(
        (value) =>
          (value === 'paid' &&
            /(paid|stipend|salary|award|\$\d)/.test(compensation) &&
            !/\bno (wage|stipend|compensation)/.test(compensation)) ||
          (value === 'aid' &&
            /(aid|waiver|scholarship|assistance|reimbursement|cover)/.test(aid)) ||
          (value === 'no-program-fee' &&
            /\b(free|no (attendance|participation|program|tuition)? ?(cost|fee))/.test(program)),
      )
    }
    const matches = items.filter((item) => {
      const haystack =
        `${item.title} ${(item.aliases || []).join(' ')} ${item.description} ${item.discipline} ${(item.disciplines || []).join(' ')} ${(item.topics || []).join(' ')}`.toLowerCase()
      const disciplines = item.disciplines?.length ? item.disciplines : [item.discipline]
      const noEntryFee =
        `${item.costs?.application || ''} ${item.costs?.submission || ''}`.toLowerCase()
      return (
        (!term || haystack.includes(term)) &&
        (!input.disciplines.length ||
          input.disciplines.some((value) => disciplines.includes(value))) &&
        (!input.kinds.length || input.kinds.includes(item.kind)) &&
        (!input.preparationStages.length ||
          input.preparationStages.some((value) => item.preparationStages?.includes(value))) &&
        (!input.statuses.length ||
          input.statuses.includes(statusOf(item) as (typeof input.statuses)[number])) &&
        (!input.modes.length ||
          input.modes.some((value) => item.participationModes?.includes(value))) &&
        (!input.freeSubmission ||
          /\b(free|no (application |submission )?fee)\b/.test(noEntryFee)) &&
        fundingMatch(item)
      )
    })
    const disciplineAffinity = (item: (typeof items)[number]) =>
      input.disciplines.length
        ? Math.max(
            ...input.disciplines.map(
              (value) => item.disciplineAffinity?.[value] ?? (item.discipline === value ? 100 : 60),
            ),
          )
        : 0
    const exactIntent = (item: (typeof items)[number]) =>
      term.length > 0 &&
      [item.title, ...(item.aliases || [])].some((value) => value.toLowerCase() === term)
        ? 1
        : 0
    matches.sort((a, b) => {
      if (input.sort === 'relevance') {
        const exact = exactIntent(b) - exactIntent(a)
        if (exact) return exact
        const affinity = disciplineAffinity(b) - disciplineAffinity(a)
        if (affinity) return affinity
      }
      return b.priority - a.priority || a.title.localeCompare(b.title) || a.id.localeCompare(b.id)
    })
    const count = (values: string[]) =>
      Object.fromEntries(
        [...new Set(values)].map((value) => [
          value,
          values.filter((item) => item === value).length,
        ]),
      )
    const facets = {
      kind: count(matches.map((item) => item.kind)),
      highSchoolPolicy: count(matches.map((item) => item.highSchoolPolicy || 'not-stated')),
      status: count(matches.map(statusOf)),
      discipline: count(matches.flatMap((item) => item.disciplines || [item.discipline])),
    }
    return {
      items: matches.slice((input.page - 1) * input.pageSize, input.page * input.pageSize),
      total: matches.length,
      page: input.page,
      pageSize: input.pageSize,
      pageCount: Math.max(1, Math.ceil(matches.length / input.pageSize)),
      facets,
      mode: 'fallback',
      version: 'defaults-1',
    }
  }
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: {
      fetch: (value, init) => fetch(value, { ...init, signal: AbortSignal.timeout(6500) }),
    },
  })
  let { data, error } = await client.rpc('search_opportunities', rpcSearchArgs(input))
  // Keep ordinary catalog reads available while the additive funding-filter
  // migration rolls out independently from the frontend deployment.
  if (
    error &&
    input.funding.length === 0 &&
    (error.code === 'PGRST202' || error.message.includes('p_funding'))
  ) {
    const { p_funding: _funding, ...legacyArgs } = rpcSearchArgs(input)
    const legacy = await client.rpc('search_opportunities', legacyArgs)
    data = legacy.data
    error = legacy.error
  }
  if (error) {
    setHeader(event, 'Cache-Control', 'no-store')
    return {
      items: [],
      total: 0,
      page: input.page,
      pageSize: input.pageSize,
      pageCount: 1,
      facets: emptyFacets(),
      mode: 'fallback',
      version: 'unavailable',
      unavailable: true,
    }
  }
  const rows = (data || []).flatMap((row: Record<string, unknown>) => {
    const parsed = opportunitySchema.safeParse({
      ...(row.item as object),
      id: row.id,
      slug: row.slug,
      published: true,
    })
    return parsed.success ? [{ ...row, parsed: parsed.data }] : []
  })
  const first = rows[0]
  const total = Number(first?.total || 0)
  return {
    items: rows.map((row: { parsed: ReturnType<typeof opportunitySchema.parse> }) => row.parsed),
    total,
    page: input.page,
    pageSize: input.pageSize,
    pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
    facets: (first?.facets as Record<string, Record<string, number>>) || emptyFacets(),
    mode: 'lexical',
    version: String(first?.search_version || 1),
  }
})
