import { createClient } from '@supabase/supabase-js'
import { defaultContent, defaultOpportunities } from '../../shared/data/defaults'
import { contentSchema, opportunitySchema } from '../../shared/utils/validation'
import { selectHomepageOpportunities } from '../../shared/utils/opportunities'
import type { PublicContent } from '../../shared/types/content'
import type { H3Event } from 'h3'

const loadPublicContent = defineCachedFunction(
  async (event: H3Event): Promise<PublicContent> => {
    const config = useRuntimeConfig(event)
    const { supabaseUrl, supabaseAnonKey } = config.public
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Content storage is not configured')
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(6000) }),
      },
    })
    const [site, listings, health] = await Promise.all([
      client
        .from('site_content')
        .select('data')
        .eq('id', 'main')
        .eq('published', true)
        .maybeSingle(),
      client.rpc('search_opportunities', {
        p_query: '',
        p_disciplines: [],
        p_kinds: [],
        p_high_school: [],
        p_stages: [],
        p_statuses: [],
        p_modes: [],
        p_funding: [],
        p_free_submission: false,
        p_archival: null,
        p_sort: 'relevance',
        // Fetch enough reviewed rows to select the intentionally curated six;
        // only the selected preview is returned in the homepage payload.
        p_limit: 50,
        p_offset: 0,
      }),
      client.rpc('opportunity_monitor_health'),
    ])
    if (site.error || listings.error) throw new Error('Content query failed')
    const parsed = contentSchema.safeParse(site.data?.data)
    const opportunities = (listings.data || []).flatMap((row: Record<string, any>) => {
      const monitor = (health.data || []).find((entry: { id: string }) => entry.id === row.id)
      const result = opportunitySchema.safeParse({
        ...row.item,
        id: row.id,
        slug: row.slug,
        published: true,
        ...(monitor
          ? {
              monitoring: {
                lastCheckedAt: monitor.last_checked_at,
                lastSuccessAt: monitor.last_success_at,
                issue: monitor.issue,
              },
            }
          : health.error
            ? {
                monitoring: {
                  lastCheckedAt: null,
                  lastSuccessAt: row.item.verifiedAt || null,
                  issue: true,
                },
              }
            : {}),
      })
      return result.success ? [result.data] : []
    })
    return {
      content: parsed.success ? parsed.data : defaultContent,
      opportunities: selectHomepageOpportunities(opportunities),
      configured: true,
    }
  },
  {
    name: 'public-content',
    getKey: () => 'main',
    maxAge: 30,
    staleMaxAge: 120,
    swr: true,
  },
)

export default defineEventHandler(async (event): Promise<PublicContent> => {
  const config = useRuntimeConfig(event)
  if (!config.public.supabaseUrl || !config.public.supabaseAnonKey) {
    setHeader(event, 'Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
    return { content: defaultContent, opportunities: defaultOpportunities, configured: false }
  }
  try {
    const result = await loadPublicContent(event)
    setHeader(event, 'Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
    return result
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
