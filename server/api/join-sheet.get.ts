import { joinStorage } from '../utils/join-storage'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const expected = useRuntimeConfig(event).sheetsSyncToken
  const supplied = getHeader(event, 'authorization')?.replace(/^Bearer /, '') || ''
  const hash = async (value: string) =>
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
  const [a, b] = await Promise.all([hash(expected), hash(supplied)])
  if (!expected || !supplied || a.reduce((diff, byte, i) => diff | (byte ^ b[i]!), 0))
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const after = Number(getQuery(event).after || 0)
  if (!Number.isSafeInteger(after) || after < 0)
    throw createError({ statusCode: 400, statusMessage: 'Invalid cursor' })
  const { data, error } = await joinStorage(event)
    .from('join_responses')
    .select('id,created_at,name,email,grade,interests,goals,stage,consent_version,note')
    .gt('id', after)
    .order('id')
    .limit(200)
  if (error) throw createError({ statusCode: 503, statusMessage: 'Sync temporarily unavailable' })
  return { responses: data, nextCursor: data?.at(-1)?.id ?? after, hasMore: data.length === 200 }
})
