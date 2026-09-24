import { assertMeetingOrigin, clearMeetingSession } from '../../utils/meeting-admin'

export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  assertMeetingOrigin(event)
  clearMeetingSession(event)
  return { ok: true }
})
