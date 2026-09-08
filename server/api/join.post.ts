import { joinSchema } from '#shared/utils/join'
import { joinStorage } from '../utils/join-storage'
import { getRequestWebStream } from 'h3'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const config = useRuntimeConfig(event)
  const origin = getHeader(event, 'origin')
  if (!origin || origin !== new URL(config.public.siteUrl).origin)
    throw createError({
      statusCode: 403,
      statusMessage: 'Please submit from the Matrix Fellows website.',
    })
  const reader = getRequestWebStream(event)?.getReader()
  if (!reader) throw createError({ statusCode: 400, statusMessage: 'Missing form response' })
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > 8192) {
      await reader.cancel()
      throw createError({ statusCode: 413, statusMessage: 'Form response is too large' })
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  let body: unknown
  try {
    body = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid form response' })
  }
  const parsed = joinSchema.safeParse(body)
  if (!parsed.success)
    throw createError({
      statusCode: 400,
      statusMessage: 'Please check your form fields and consent.',
    })
  if (parsed.data.website) return { ok: true }
  const client = joinStorage(event)
  // Cloudflare overwrites this header at the edge. Never store raw IP addresses.
  const ip = getHeader(event, 'cf-connecting-ip') || 'local'
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(config.supabaseServiceRoleKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip))
  const rateKey = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
  const { error } = await client.rpc('submit_join_response', {
    payload: parsed.data,
    rate_key: rateKey,
  })
  if (error)
    throw createError({
      statusCode: error.code === 'P0001' ? 429 : 503,
      statusMessage:
        error.code === 'P0001'
          ? 'Too many submissions. Please try again in an hour.'
          : 'We could not save your response. Please try again.',
    })
  return { ok: true }
})
