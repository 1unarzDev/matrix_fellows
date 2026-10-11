import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { opportunitySchema } from '../../shared/utils/validation'
import type { Opportunity } from '../../shared/types/content'

export function publicSupabase(event: H3Event): SupabaseClient {
  const config = useRuntimeConfig(event)
  const { supabaseUrl, supabaseAnonKey } = config.public
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('Content storage is not configured')
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(6000) }),
    },
  })
}

export function parsePublicOpportunity(
  row: Record<string, any>,
  health: Array<{
    id: string
    last_checked_at?: string | null
    last_success_at?: string | null
    issue?: boolean
  }> = [],
): Opportunity | null {
  const item = { ...(row.data || row.item || {}), ...(row.overrides || {}) }
  const monitor = health.find((entry) => entry.id === row.id)
  const parsed = opportunitySchema.safeParse({
    ...item,
    id: row.id,
    ...(row.slug ? { slug: row.slug } : {}),
    published: row.published !== false && row.suppressed !== true,
    ...(monitor
      ? {
          monitoring: {
            lastCheckedAt: monitor.last_checked_at || null,
            lastSuccessAt: monitor.last_success_at || null,
            issue: Boolean(monitor.issue),
          },
        }
      : {}),
  })
  return parsed.success ? parsed.data : null
}

export function setPublicCacheHeaders(event: H3Event, etag: string, maxAge = 30) {
  setHeader(
    event,
    'Cache-Control',
    `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=120`,
  )
  setHeader(event, 'CDN-Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=120`)
  setHeader(event, 'ETag', etag)
  setHeader(event, 'Vary', 'Accept-Encoding')
}

export function isNotModified(event: H3Event, etag: string): boolean {
  const supplied = getHeader(event, 'if-none-match')
  if (!supplied) return false
  if (
    !supplied
      .split(',')
      .map((value) => value.trim())
      .some((value) => value.replace(/^W\//, '') === etag || value === '*')
  )
    return false
  setResponseStatus(event, 304)
  return true
}
