import { meetingEventSchema } from '#shared/utils/validation'
import {
  assertMeetingOrigin,
  assertMeetingSession,
  meetingStorage,
  meetingToRow,
  rowToMeeting,
} from '../../../utils/meeting-admin'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  assertMeetingOrigin(event)
  await assertMeetingSession(event)
  const id = getRouterParam(event, 'id') || ''
  const parsed = meetingEventSchema.safeParse(await readBody(event))
  if (!parsed.success || parsed.data.id !== id)
    throw createError({ statusCode: 400, statusMessage: 'Check the meeting details.' })
  const { data, error } = await meetingStorage(event)
    .from('meetings')
    .update(meetingToRow(parsed.data))
    .eq('id', id)
    .select('*')
    .maybeSingle()
  if (error) throw createError({ statusCode: 503, statusMessage: 'Could not save the meeting.' })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Meeting not found.' })
  return { meeting: rowToMeeting(data) }
})
