import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { catalogSeeds } from '../../../workers/catalog'
import { projectOpportunityCalendar } from '../../../shared/utils/calendar'
import { opportunitySchema } from '../../../shared/utils/validation'
import type { CalendarOpportunitySelection, Opportunity } from '../../../shared/types/content'

const requestSchema = z.object({
  ids: z.array(z.string().min(1).max(650)).max(100),
})

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const parsedBody = requestSchema.safeParse(await readBody(event))
  if (!parsedBody.success)
    throw createError({ statusCode: 400, statusMessage: 'Invalid saved opportunity IDs' })
  const { ids } = parsedBody.data
  const uniqueIds = [...new Set(ids)]
  if (!uniqueIds.length) return { entries: [] }
  const config = useRuntimeConfig(event)
  const { supabaseUrl, supabaseAnonKey } = config.public
  let opportunities: Opportunity[]
  if (!supabaseUrl || !supabaseAnonKey) {
    const wanted = new Set(uniqueIds)
    opportunities = catalogSeeds.map((seed) => seed.item).filter((item) => wanted.has(item.id))
  } else {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: {
        fetch: (value, init) => fetch(value, { ...init, signal: AbortSignal.timeout(6500) }),
      },
    })
    const { data, error } = await client
      .from('opportunities')
      .select('id,data,overrides,published,suppressed')
      .in('id', uniqueIds)
      .eq('published', true)
      .eq('suppressed', false)
    if (error) throw createError({ statusCode: 503, statusMessage: 'Saved dates unavailable' })
    opportunities = (data || []).flatMap((row: Record<string, any>) => {
      const parsed = opportunitySchema.safeParse({
        ...row.data,
        ...row.overrides,
        id: row.id,
        published: row.published && !row.suppressed,
      })
      return parsed.success ? [parsed.data as Opportunity] : []
    })
  }
  const selections: CalendarOpportunitySelection[] = uniqueIds.map((opportunityId, index) => ({
    opportunityId,
    enabled: true,
    includeDeadlines: true,
    includeEvents: true,
    priority: Math.max(0, 100 - index),
  }))
  return {
    entries: projectOpportunityCalendar(opportunities, selections, { savedIds: uniqueIds }),
  }
})
