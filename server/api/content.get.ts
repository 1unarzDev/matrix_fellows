import { defaultContent, defaultOpportunities } from '../../shared/data/defaults'
import { contentSchema } from '../../shared/utils/validation'
import {
  HOMEPAGE_FEATURED_IDS,
  selectHomepageOpportunities,
} from '../../shared/utils/opportunities'
import { buildMeetingSchedule, sortMeetings } from '../../shared/data/meetings'
import type { PublicContent } from '../../shared/types/content'
import type { H3Event } from 'h3'
import { rowToMeeting } from '../utils/meeting-admin'
import {
  isNotModified,
  parsePublicOpportunity,
  publicSupabase,
  setPublicCacheHeaders,
} from '../utils/public-content'
import { definePublicProjection, publicEtag } from '../utils/public-projection-cache'

const loadPublicContent = definePublicProjection(
  'content',
  async (event: H3Event): Promise<PublicContent> => {
    const client = publicSupabase(event)
    // The homepage is an explicit projection. Calendar opportunity details are
    // loaded by /api/content-calendar after this meeting shell is usable.
    const [site, listings, health, meetingRows] = await Promise.all([
      client
        .from('site_content')
        .select('data')
        .eq('id', 'main')
        .eq('published', true)
        .maybeSingle(),
      client
        .from('opportunities')
        .select('id,data,overrides,published,suppressed,slug')
        .in('id', [...HOMEPAGE_FEATURED_IDS]),
      client.rpc('opportunity_monitor_health'),
      client
        .from('meetings')
        .select(
          'id,title,summary,meeting_date,time_label,timezone,location,status,topics,resources,url,published',
        )
        .eq('published', true)
        .order('meeting_date'),
    ])
    if (site.error || listings.error) throw new Error('Content query failed')
    const parsed = contentSchema.safeParse(site.data?.data)
    const healthRows = health.error ? [] : health.data || []
    const opportunities = (listings.data || [])
      .map((row: Record<string, any>) => parsePublicOpportunity(row, healthRows))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
    return {
      content: parsed.success ? parsed.data : defaultContent,
      opportunities: opportunities.length
        ? selectHomepageOpportunities(opportunities)
        : defaultOpportunities,
      meetings:
        !meetingRows.error && meetingRows.data?.length
          ? sortMeetings(meetingRows.data.map(rowToMeeting))
          : buildMeetingSchedule(parsed.success ? parsed.data.meeting : defaultContent.meeting),
      // An empty calendar is a complete meeting shell. Its optional opportunity
      // markers swap in atomically once the deferred projection is complete.
      calendarEntries: [],
      configured: true,
    }
  },
  30,
  120,
)

const fallback = (configured: boolean, unavailable = false): PublicContent => ({
  content: defaultContent,
  opportunities: defaultOpportunities,
  meetings: buildMeetingSchedule(defaultContent.meeting),
  calendarEntries: [],
  configured,
  ...(unavailable ? { unavailable: true } : {}),
})

export default defineEventHandler(async (event): Promise<PublicContent | undefined> => {
  const config = useRuntimeConfig(event)
  if (!config.public.supabaseUrl || !config.public.supabaseAnonKey) {
    const result = fallback(false)
    const etag = await publicEtag(result)
    setPublicCacheHeaders(event, etag)
    setHeader(event, 'Age', 0)
    setHeader(event, 'X-Matrix-Cache', 'LOCAL')
    if (isNotModified(event, etag)) return
    return result
  }
  try {
    const result = await loadPublicContent(event)
    const etag = await publicEtag(result)
    setPublicCacheHeaders(event, etag)
    if (isNotModified(event, etag)) return
    return result
  } catch {
    // Never cache an availability failure as a successful public projection.
    const result = fallback(true, true)
    setHeader(event, 'Cache-Control', 'no-store')
    setHeader(event, 'CDN-Cache-Control', 'no-store')
    setHeader(event, 'X-Matrix-Cache', 'BYPASS')
    return result
  }
})
