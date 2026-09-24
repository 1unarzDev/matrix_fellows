import {
  assertMeetingOrigin,
  assertMeetingSession,
  meetingStorage,
} from '../../../utils/meeting-admin'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  assertMeetingOrigin(event)
  await assertMeetingSession(event)
  const id = getRouterParam(event, 'id') || ''
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))
    throw createError({ statusCode: 400, statusMessage: 'Invalid meeting ID.' })
  const { data, error } = await meetingStorage(event)
    .from('meetings')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error) throw createError({ statusCode: 503, statusMessage: 'Could not delete the meeting.' })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Meeting not found.' })
  return { ok: true }
})
