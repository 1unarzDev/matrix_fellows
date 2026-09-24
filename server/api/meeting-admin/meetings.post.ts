import { meetingEventSchema } from '#shared/utils/validation'
import {
  assertMeetingOrigin,
  assertMeetingSession,
  meetingStorage,
  meetingToRow,
  rowToMeeting,
} from '../../utils/meeting-admin'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  assertMeetingOrigin(event)
  await assertMeetingSession(event)
  const parsed = meetingEventSchema.safeParse(await readBody(event))
  if (!parsed.success)
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Check the meeting details.',
    })
  const { data, error } = await meetingStorage(event)
    .from('meetings')
    .insert(meetingToRow(parsed.data))
    .select('*')
    .single()
  if (error)
    throw createError({
      statusCode: error.code === '23505' ? 409 : 503,
      statusMessage:
        error.code === '23505'
          ? 'That meeting ID already exists.'
          : 'Could not create the meeting.',
    })
  return { meeting: rowToMeeting(data) }
})
