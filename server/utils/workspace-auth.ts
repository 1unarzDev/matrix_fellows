import { createClient } from '@supabase/supabase-js'
import { createError, getCookie, setCookie, deleteCookie, getHeader, type H3Event } from 'h3'

export const WORKSPACE_COOKIE = 'matrix-workspace'
export const WORKSPACE_FLOW_COOKIE = 'matrix-workspace-flow'
const encoder = new TextEncoder()
export const encodeBase64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
export const decodeBase64 = (value: string) =>
  Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0))
export const randomToken = () => encodeBase64(crypto.getRandomValues(new Uint8Array(32)))
export async function hashText(value: string) {
  return encodeBase64(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))))
}

export async function sealWorkspace(value: unknown, secret: string, purpose: string) {
  if (secret.length < 32)
    throw createError({ statusCode: 503, statusMessage: 'Workspace security is not configured.' })
  const key = await crypto.subtle.importKey(
    'raw',
    await crypto.subtle.digest('SHA-256', encoder.encode(secret)),
    'AES-GCM',
    false,
    ['encrypt'],
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(purpose) },
    key,
    encoder.encode(JSON.stringify(value)),
  )
  return `${encodeBase64(iv)}.${encodeBase64(new Uint8Array(encrypted))}`
}
export async function openWorkspace<T>(token: string, secret: string, purpose: string): Promise<T> {
  const [iv, body, extra] = token.split('.')
  if (!iv || !body || extra || secret.length < 32) throw new Error('Invalid protected value')
  const key = await crypto.subtle.importKey(
    'raw',
    await crypto.subtle.digest('SHA-256', encoder.encode(secret)),
    'AES-GCM',
    false,
    ['decrypt'],
  )
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: decodeBase64(iv), additionalData: encoder.encode(purpose) },
    key,
    decodeBase64(body),
  )
  return JSON.parse(new TextDecoder().decode(plain)) as T
}
export function workspaceConfig(event: H3Event) {
  const config = useRuntimeConfig(event)
  if (
    !config.public.supabaseUrl ||
    !config.public.supabaseAnonKey ||
    !config.supabaseServiceRoleKey ||
    config.workspaceSessionSecret.length < 32
  )
    throw createError({ statusCode: 503, statusMessage: 'Officer workspace is not configured.' })
  return config
}
export function workspaceAuthStorage(event: H3Event) {
  const config = workspaceConfig(event)
  return createClient(config.public.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
    },
  })
}
export function assertWorkspaceOrigin(event: H3Event) {
  if (getHeader(event, 'origin') !== new URL(useRuntimeConfig(event).public.siteUrl).origin)
    throw createError({ statusCode: 403, statusMessage: 'Open this action from Matrix Fellows.' })
}
export function workspaceCookieOptions(event: H3Event, maxAge: number) {
  return {
    httpOnly: true,
    secure: useRuntimeConfig(event).public.siteUrl.startsWith('https:'),
    sameSite: 'lax' as const,
    path: '/api/workspace',
    maxAge,
  }
}
export interface WorkspaceTokens {
  access_token: string
  refresh_token: string
  expires_at: number
}
export async function writeWorkspaceSession(
  event: H3Event,
  token: { access_token: string; refresh_token: string; expires_in?: number },
) {
  const value: WorkspaceTokens = {
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: Date.now() + (token.expires_in || 3600) * 1000,
  }
  setCookie(
    event,
    WORKSPACE_COOKIE,
    await sealWorkspace(value, workspaceConfig(event).workspaceSessionSecret, WORKSPACE_COOKIE),
    workspaceCookieOptions(event, 7 * 86400),
  )
}
export function clearWorkspaceSession(event: H3Event) {
  deleteCookie(event, WORKSPACE_COOKIE, { path: '/api/workspace' })
}
export interface WorkspaceOfficer {
  userId: string
  email: string
  role: 'officer' | 'admin'
  supabaseUrl: string
  serviceKey: string
}

export async function requireWorkspaceOfficer(event: H3Event): Promise<WorkspaceOfficer> {
  const config = workspaceConfig(event)
  let tokens: WorkspaceTokens
  try {
    tokens = await openWorkspace<WorkspaceTokens>(
      getCookie(event, WORKSPACE_COOKIE) || '',
      config.workspaceSessionSecret,
      WORKSPACE_COOKIE,
    )
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Sign in to the officer workspace.' })
  }
  if (tokens.expires_at < Date.now() + 30000) {
    const response = await fetch(
      `${config.public.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
      {
        method: 'POST',
        headers: { apikey: config.public.supabaseAnonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: tokens.refresh_token }),
        signal: AbortSignal.timeout(10000),
      },
    )
    if (!response.ok) {
      clearWorkspaceSession(event)
      throw createError({ statusCode: 401, statusMessage: 'Sign in again.' })
    }
    const refreshed = (await response.json()) as {
      access_token: string
      refresh_token: string
      expires_in: number
    }
    await writeWorkspaceSession(event, refreshed)
    tokens = { ...refreshed, expires_at: Date.now() + refreshed.expires_in * 1000 }
  }
  return validateWorkspaceUser(event, tokens.access_token)
}
export async function validateWorkspaceUser(
  event: H3Event,
  accessToken: string,
): Promise<WorkspaceOfficer> {
  const config = workspaceConfig(event)
  // The provider validates the token; a decoded JWT or client-side session is not authorization.
  const response = await fetch(`${config.public.supabaseUrl}/auth/v1/user`, {
    headers: { apikey: config.public.supabaseAnonKey, Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) {
    clearWorkspaceSession(event)
    throw createError({ statusCode: 401, statusMessage: 'Sign in again.' })
  }
  const user = (await response.json()) as {
    id: string
    email?: string
    email_confirmed_at?: string
  }
  const { data: member, error } = await workspaceAuthStorage(event)
    .from('outreach_members')
    .select('user_id,email,role,enabled')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error)
    throw createError({
      statusCode: 503,
      statusMessage: 'Workspace membership check is unavailable.',
    })
  if (
    !user.email_confirmed_at ||
    !member?.enabled ||
    member.email.toLowerCase() !== user.email?.toLowerCase() ||
    !['officer', 'admin'].includes(member.role)
  )
    throw createError({ statusCode: 403, statusMessage: 'This workspace is invitation-only.' })
  event.context.workspaceActor = { userId: user.id, role: member.role }
  return {
    userId: user.id,
    email: member.email,
    role: member.role,
    supabaseUrl: config.public.supabaseUrl,
    serviceKey: config.supabaseServiceRoleKey,
  }
}
