import { createError, getCookie, setCookie, deleteCookie, type H3Event } from 'h3'
import { z } from 'zod'
import {
  workspaceConfig,
  workspaceCookieOptions,
  sealWorkspace,
  openWorkspace,
  type WorkspaceTokens,
} from './workspace-auth'

export const RECOVERY_COOKIE = 'matrix-workspace-recovery'
export const PASSKEY_COOKIE = 'matrix-workspace-passkey'
export const newPassword = z.string().min(12, 'Use at least 12 characters.').max(128)

// Only provider-returned messages explicitly mapped here reach the browser.
// Never echo credentials, provider payloads, or account existence.
export async function authRequest(
  event: H3Event,
  path: string,
  body?: unknown,
  accessToken?: string,
  method = 'POST',
) {
  const config = workspaceConfig(event)
  const response = await fetch(`${config.public.supabaseUrl}/auth/v1/${path}`, {
    method,
    headers: {
      apikey: config.public.supabaseAnonKey,
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(10000),
  })
  const result = response.status === 204 ? {} : await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      response.status === 429
        ? 'Too many attempts. Wait a moment and try again.'
        : result.code === 'passkey_disabled'
          ? 'Passkeys are not enabled yet. Use another sign-in method.'
          : result.code === 'weak_password'
            ? 'Choose a stronger password with at least 12 characters.'
            : result.code === 'reauthentication_needed'
              ? 'Sign in again before changing your password.'
              : response.status >= 500
                ? 'Account services are temporarily unavailable. Try again.'
                : 'This request could not be verified. Check your details or request a new link.'
    throw createError({
      statusCode: response.status === 429 ? 429 : response.status >= 500 ? 503 : 400,
      statusMessage: message,
    })
  }
  return result
}

export async function writeCredentialFlow(
  event: H3Event,
  name: string,
  value: object,
  seconds = 300,
) {
  setCookie(
    event,
    name,
    await sealWorkspace(
      { ...value, expires: Date.now() + seconds * 1000 },
      workspaceConfig(event).workspaceSessionSecret,
      name,
    ),
    workspaceCookieOptions(event, seconds),
  )
}
export async function readCredentialFlow<T extends { expires: number }>(
  event: H3Event,
  name: string,
): Promise<T> {
  try {
    const flow = await openWorkspace<T>(
      getCookie(event, name) || '',
      workspaceConfig(event).workspaceSessionSecret,
      name,
    )
    if (flow.expires <= Date.now()) throw new Error('Expired')
    return flow
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'This request expired. Start again.' })
  }
}
export function clearCredentialFlows(event: H3Event) {
  for (const name of [RECOVERY_COOKIE, PASSKEY_COOKIE])
    deleteCookie(event, name, { path: '/api/workspace' })
}
export type RecoveryFlow = { expires: number; tokens: WorkspaceTokens }
