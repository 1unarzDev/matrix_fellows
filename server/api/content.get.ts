import { createClient } from '@supabase/supabase-js'
import { defaultContent, defaultOpportunities } from '../../shared/data/defaults'
import { contentSchema, opportunitySchema } from '../../shared/utils/validation'
import { selectHomepageOpportunities } from '../../shared/utils/opportunities'
import { buildMeetingSchedule, sortMeetings } from '../../shared/data/meetings'
import type { PublicContent } from '../../shared/types/content'
import type { H3Event } from 'h3'
import { rowToMeeting } from '../utils/meeting-admin'
import { projectOpportunityCalendar } from '../../shared/utils/calendar'
import type { CalendarOpportunitySelection, Opportunity } from '../../shared/types/content'

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
    const [site, listings, health, meetingRows, calendarSelections, calendarOpportunities] = await Promise.all([
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
      client
        .from('meetings')
        .select(
          'id,title,summary,meeting_date,time_label,timezone,location,status,topics,resources,url,published',
        )
        .eq('published', true)
        .order('meeting_date'),
      client
        .from('calendar_opportunity_selections')
        .select('opportunity_id,enabled,include_deadlines,include_events,priority')
        .order('priority', { ascending: false }),
      client
        .from('opportunities')
        .select('id,data,overrides,published,suppressed')
        .eq('published', true)
        .eq('suppressed', false)
        .limit(1000),
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
    const calendarSource = calendarOpportunities.error
      ? []
      : (calendarOpportunities.data || []).flatMap((row: Record<string, any>) => {
          const parsed = opportunitySchema.safeParse({
            ...row.data,
            ...row.overrides,
            id: row.id,
            published: row.published && !row.suppressed,
          })
          return parsed.success ? [parsed.data as Opportunity] : []
        })
    const selections: CalendarOpportunitySelection[] = calendarSelections.error
      ? []
      : (calendarSelections.data || []).map((row) => ({
          opportunityId: row.opportunity_id,
          enabled: row.enabled,
          includeDeadlines: row.include_deadlines,
          includeEvents: row.include_events,
          priority: row.priority,
        }))
    return {
      content: parsed.success ? parsed.data : defaultContent,
      opportunities: selectHomepageOpportunities(opportunities),
      meetings:
        !meetingRows.error && meetingRows.data?.length
          ? sortMeetings(meetingRows.data.map(rowToMeeting))
          : buildMeetingSchedule(parsed.success ? parsed.data.meeting : defaultContent.meeting),
      calendarEntries: projectOpportunityCalendar(calendarSource, selections),
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
    return {
      content: defaultContent,
      opportunities: defaultOpportunities,
      meetings: buildMeetingSchedule(defaultContent.meeting),
      calendarEntries: [],
      configured: false,
    }
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
      meetings: buildMeetingSchedule(defaultContent.meeting),
      calendarEntries: [],
      configured: true,
      unavailable: true,
    }
  }
})
