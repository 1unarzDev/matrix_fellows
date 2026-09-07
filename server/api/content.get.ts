import { createClient } from '@supabase/supabase-js'
import { defaultContent, defaultOpportunities } from '../../shared/data/defaults'
import { contentSchema, opportunitySchema } from '../../shared/utils/validation'
import type { PublicContent } from '../../shared/types/content'

export default defineEventHandler(async (event): Promise<PublicContent> => {
  const config = useRuntimeConfig(event)
  const { supabaseUrl, supabaseAnonKey } = config.public
  setHeader(event, 'Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
  if (!supabaseUrl || !supabaseAnonKey)
    return { content: defaultContent, opportunities: defaultOpportunities, configured: false }
  try {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(6000) }),
      },
    })
    const [site, listings] = await Promise.all([
      client
        .from('site_content')
        .select('data')
        .eq('id', 'main')
        .eq('published', true)
        .maybeSingle(),
      client
        .from('opportunities')
        .select('id,data,overrides,published')
        .eq('published', true)
        .eq('suppressed', false),
    ])
    if (site.error || listings.error) throw new Error('Content query failed')
    const parsed = contentSchema.safeParse(site.data?.data)
    const opportunities = (listings.data || []).flatMap((row) => {
      const result = opportunitySchema.safeParse({
        ...row.data,
        ...row.overrides,
        id: row.id,
        published: row.published,
      })
      return result.success ? [result.data] : []
    })
    return {
      content: parsed.success ? parsed.data : defaultContent,
      opportunities,
      configured: true,
    }
  } catch {
    setHeader(event, 'Cache-Control', 'no-store')
    return {
      content: defaultContent,
      opportunities: defaultOpportunities,
      configured: true,
      unavailable: true,
    }
  }
})
