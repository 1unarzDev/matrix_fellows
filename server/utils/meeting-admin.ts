import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { meetingEventSchema } from '#shared/utils/validation'
import type { MeetingEvent } from '#shared/types/content'

const COOKIE = 'matrix-meeting-admin'
const encoder = new TextEncoder()

const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

const digest = async (value: string) =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))

const equalSecret = async (left: string, right: string) => {
  const [a, b] = await Promise.all([digest(left), digest(right)])
  return a.reduce((difference, byte, index) => difference | (byte ^ b[index]!), 0) === 0
}

const sign = async (value: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return bytesToBase64Url(
    new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))),
  )
}

const configFor = (event: H3Event) => {
  const config = useRuntimeConfig(event)
  if (
    !config.public.supabaseUrl ||
    !config.supabaseServiceRoleKey ||
    !/^\d{8}$/.test(config.meetingAdminPin) ||
    config.meetingAdminSessionSecret.length < 32
  )
    throw createError({ statusCode: 503, statusMessage: 'Meeting editing is not configured.' })
  return config
}

export const meetingStorage = (event: H3Event) => {
  const config = configFor(event)
  return createClient(config.public.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
    },
  })
}

export const assertMeetingOrigin = (event: H3Event) => {
  const expected = new URL(useRuntimeConfig(event).public.siteUrl).origin
  const supplied = getHeader(event, 'origin')
  if (!supplied || supplied !== expected)
    throw createError({ statusCode: 403, statusMessage: 'Open the editor from Matrix Fellows.' })
}

export const createMeetingSession = async (event: H3Event) => {
  const config = configFor(event)
  const payload = bytesToBase64Url(
    encoder.encode(
      JSON.stringify({ exp: Date.now() + 2 * 60 * 60 * 1000, nonce: crypto.randomUUID() }),
    ),
  )
  const signature = await sign(payload, config.meetingAdminSessionSecret)
  setCookie(event, COOKIE, `${payload}.${signature}`, {
    httpOnly: true,
    secure: config.public.siteUrl.startsWith('https://'),
    sameSite: 'strict',
    path: '/',
    maxAge: 2 * 60 * 60,
  })
}

export const clearMeetingSession = (event: H3Event) => deleteCookie(event, COOKIE, { path: '/' })

export const assertMeetingSession = async (event: H3Event) => {
  const config = configFor(event)
  const token = getCookie(event, COOKIE) || ''
  const [payload, supplied, extra] = token.split('.')
  if (!payload || !supplied || extra)
    throw createError({ statusCode: 401, statusMessage: 'Unlock meeting editing again.' })
  const expected = await sign(payload, config.meetingAdminSessionSecret)
  if (!(await equalSecret(expected, supplied)))
    throw createError({ statusCode: 401, statusMessage: 'Unlock meeting editing again.' })
  try {
    const unpadded = payload.replaceAll('-', '+').replaceAll('_', '/')
    const normalized = unpadded.padEnd(Math.ceil(unpadded.length / 4) * 4, '=')
    const binary = atob(normalized)
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    const data = JSON.parse(new TextDecoder().decode(bytes)) as { exp?: number }
    if (!data.exp || data.exp < Date.now()) throw new Error('expired')
  } catch {
    clearMeetingSession(event)
    throw createError({ statusCode: 401, statusMessage: 'Unlock meeting editing again.' })
  }
}

export const verifyMeetingPin = async (event: H3Event, supplied: string) => {
  const config = configFor(event)
  return equalSecret(config.meetingAdminPin, supplied)
}

export const meetingRateKey = async (event: H3Event) => {
  const config = configFor(event)
  const ip = getHeader(event, 'cf-connecting-ip') || getHeader(event, 'x-forwarded-for') || 'local'
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(config.meetingAdminSessionSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const value = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(ip)))
  return [...value].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export const rowToMeeting = (row: Record<string, unknown>): MeetingEvent =>
  meetingEventSchema.parse({
    id: row.id,
    title: row.title,
    summary: row.summary,
    date: row.meeting_date,
    time: row.time_label,
    timezone: row.timezone,
    location: row.location,
    state: row.status,
    topics: row.topics,
    resources: row.resources,
    url: row.url,
    published: row.published,
  })

export const meetingToRow = (meeting: MeetingEvent) => ({
  id: meeting.id,
  title: meeting.title,
  summary: meeting.summary,
  meeting_date: meeting.date,
  time_label: meeting.time,
  timezone: meeting.timezone,
  location: meeting.location,
  status: meeting.state,
  topics: meeting.topics,
  resources: meeting.resources,
  url: meeting.url,
  published: meeting.published ?? true,
})
