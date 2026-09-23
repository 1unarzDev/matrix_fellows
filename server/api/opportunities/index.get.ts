import { createClient } from '@supabase/supabase-js'
import { defaultOpportunities } from '../../../shared/data/defaults'
import { opportunitySchema } from '../../../shared/utils/validation'
import type { OpportunitySearchResult } from '../../../shared/types/content'
import { emptyFacets, parseOpportunitySearch, rpcSearchArgs } from '../../utils/opportunity-search'

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
    const matches = defaultOpportunities.filter(
      (item) =>
        !term ||
        `${item.title} ${item.description} ${item.discipline}`.toLowerCase().includes(term),
    )
    return {
      items: matches.slice((input.page - 1) * input.pageSize, input.page * input.pageSize),
      total: matches.length,
      page: input.page,
      pageSize: input.pageSize,
      pageCount: Math.max(1, Math.ceil(matches.length / input.pageSize)),
      facets: emptyFacets(),
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
  const { data, error } = await client.rpc('search_opportunities', rpcSearchArgs(input))
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
