import { assertMeetingSession, meetingStorage, rowToMeeting } from '../../utils/meeting-admin'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  await assertMeetingSession(event)
  const { data, error } = await meetingStorage(event)
    .from('meetings')
    .select('*')
    .order('meeting_date')
    .limit(200)
  if (error) throw createError({ statusCode: 503, statusMessage: 'Could not load meetings.' })
  return { meetings: (data || []).map(rowToMeeting) }
})
