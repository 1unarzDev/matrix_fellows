import { calendarOpportunitySelectionSchema } from '#shared/utils/validation'
import {
  assertMeetingOrigin,
  assertMeetingSession,
  meetingStorage,
} from '../../../utils/meeting-admin'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  assertMeetingOrigin(event)
  await assertMeetingSession(event)
  const id = decodeURIComponent(getRouterParam(event, 'id') || '')
  const parsed = calendarOpportunitySelectionSchema.safeParse(await readBody(event))
  if (!parsed.success || parsed.data.opportunityId !== id)
    throw createError({ statusCode: 400, statusMessage: 'Check the calendar settings.' })
  const { data, error } = await meetingStorage(event)
    .from('calendar_opportunity_selections')
    .upsert({
      opportunity_id: id,
      enabled: parsed.data.enabled,
      include_deadlines: parsed.data.includeDeadlines,
      include_events: parsed.data.includeEvents,
      priority: parsed.data.priority,
    })
    .select('opportunity_id,enabled,include_deadlines,include_events,priority')
    .single()
  if (error)
    throw createError({ statusCode: 503, statusMessage: 'Could not save calendar settings.' })
  return {
    selection: {
      opportunityId: data.opportunity_id,
      enabled: data.enabled,
      includeDeadlines: data.include_deadlines,
      includeEvents: data.include_events,
      priority: data.priority,
    },
  }
})
