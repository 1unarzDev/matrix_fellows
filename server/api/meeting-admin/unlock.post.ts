import { z } from 'zod'
import {
  assertMeetingOrigin,
  createMeetingSession,
  meetingRateKey,
  meetingStorage,
  verifyMeetingPin,
} from '../../utils/meeting-admin'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  assertMeetingOrigin(event)
  const body = z.object({ pin: z.string().regex(/^\d{8}$/) }).safeParse(await readBody(event))
  if (!body.success)
    throw createError({ statusCode: 400, statusMessage: 'Enter all eight digits.' })
  const client = meetingStorage(event)
  const rateKey = await meetingRateKey(event)
  const { data: attempt, error: readError } = await client
    .from('meeting_admin_attempts')
    .select('attempts,window_started_at,locked_until')
    .eq('rate_key', rateKey)
    .maybeSingle()
  if (readError)
    throw createError({ statusCode: 503, statusMessage: 'Unlock is temporarily unavailable.' })
  const now = Date.now()
  if (attempt?.locked_until && Date.parse(attempt.locked_until) > now)
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many attempts. Try again in 15 minutes.',
    })

  if (!(await verifyMeetingPin(event, body.data.pin))) {
    const recent = attempt && now - Date.parse(attempt.window_started_at) < 15 * 60 * 1000
    const attempts = recent ? attempt.attempts + 1 : 1
    const lockedUntil = attempts >= 5 ? new Date(now + 15 * 60 * 1000).toISOString() : null
    const { error } = await client.from('meeting_admin_attempts').upsert({
      rate_key: rateKey,
      attempts,
      window_started_at: recent ? attempt.window_started_at : new Date(now).toISOString(),
      locked_until: lockedUntil,
      updated_at: new Date(now).toISOString(),
    })
    if (error)
      throw createError({ statusCode: 503, statusMessage: 'Unlock is temporarily unavailable.' })
    throw createError({
      statusCode: lockedUntil ? 429 : 401,
      statusMessage: lockedUntil
        ? 'Too many attempts. Try again in 15 minutes.'
        : 'That PIN is not correct.',
    })
  }
  await client.from('meeting_admin_attempts').delete().eq('rate_key', rateKey)
  await createMeetingSession(event)
  return { ok: true }
})
