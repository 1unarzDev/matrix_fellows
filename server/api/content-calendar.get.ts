import type { H3Event } from 'h3'
import { projectOpportunityCalendar } from '../../shared/utils/calendar'
import type {
  CalendarOpportunityEntry,
  CalendarOpportunitySelection,
} from '../../shared/types/content'
import {
  isNotModified,
  parsePublicOpportunity,
  publicSupabase,
  setPublicCacheHeaders,
} from '../utils/public-content'
import { definePublicProjection, publicEtag } from '../utils/public-projection-cache'

const loadCalendar = definePublicProjection(
  'calendar',
  async (event: H3Event): Promise<CalendarOpportunityEntry[]> => {
    const client = publicSupabase(event)
    const [{ data: selectionRows, error: selectionsError }, health] = await Promise.all([
      client
        .from('calendar_opportunity_selections')
        .select('opportunity_id,enabled,include_deadlines,include_events,priority')
        .eq('enabled', true)
        .order('priority', { ascending: false }),
      client.rpc('opportunity_monitor_health'),
    ])
    if (selectionsError) throw selectionsError
    const selections: CalendarOpportunitySelection[] = (selectionRows || []).map((row) => ({
      opportunityId: row.opportunity_id,
      enabled: row.enabled,
      includeDeadlines: row.include_deadlines,
      includeEvents: row.include_events,
      priority: row.priority,
    }))
    const ids = [...new Set(selections.map((selection) => selection.opportunityId))]
    if (!ids.length) return []
    // The former homepage path read up to 1,000 records for this projection.
    const { data, error } = await client
      .from('opportunities')
      .select('id,data,overrides,published,suppressed,slug')
      .in('id', ids.slice(0, 100))
    if (error) throw error
    const healthRows = health.error ? [] : health.data || []
    const opportunities = (data || [])
      .map((row: Record<string, any>) => parsePublicOpportunity(row, healthRows))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
    return projectOpportunityCalendar(opportunities, selections)
  },
  120,
  600,
)

export default defineEventHandler(
  async (event): Promise<{ entries: CalendarOpportunityEntry[] } | undefined> => {
    const config = useRuntimeConfig(event)
    if (!config.public.supabaseUrl || !config.public.supabaseAnonKey) {
      const result = { entries: [] }
      const etag = await publicEtag(result)
      setPublicCacheHeaders(event, etag, 120)
      setHeader(event, 'Age', 0)
      setHeader(event, 'X-Matrix-Cache', 'LOCAL')
      if (isNotModified(event, etag)) return
      return result
    }
    try {
      const result = { entries: await loadCalendar(event) }
      const etag = await publicEtag(result)
      setPublicCacheHeaders(event, etag, 120)
      if (isNotModified(event, etag)) return
      return result
    } catch {
      setHeader(event, 'Cache-Control', 'no-store')
      setHeader(event, 'CDN-Cache-Control', 'no-store')
      setHeader(event, 'X-Matrix-Cache', 'BYPASS')
      return { entries: [] }
    }
  },
)
