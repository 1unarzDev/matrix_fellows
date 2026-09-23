import { createClient } from '@supabase/supabase-js'
import { defaultOpportunities } from '../../../shared/data/defaults'
import { opportunitySchema } from '../../../shared/utils/validation'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') || ''
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 180)
    throw createError({ statusCode: 404, statusMessage: 'Opportunity not found' })
  const config = useRuntimeConfig(event)
  const { supabaseUrl, supabaseAnonKey } = config.public
  if (!supabaseUrl || !supabaseAnonKey) {
    const item = defaultOpportunities.find((entry) => entry.slug === slug || entry.id === slug)
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Opportunity not found' })
    return { item, version: 'defaults-1' }
  }
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: {
      fetch: (value, init) => fetch(value, { ...init, signal: AbortSignal.timeout(6500) }),
    },
  })
  const { data, error } = await client.rpc('get_opportunity_by_slug', { p_slug: slug })
  const row = data?.[0]
  if (error || !row) throw createError({ statusCode: 404, statusMessage: 'Opportunity not found' })
  const parsed = opportunitySchema.safeParse({
    ...row.item,
    id: row.id,
    slug: row.slug,
    published: true,
  })
  if (!parsed.success)
    throw createError({ statusCode: 404, statusMessage: 'Opportunity not found' })
  setHeader(event, 'Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
  return { item: parsed.data, version: String(row.search_version || 1) }
})
