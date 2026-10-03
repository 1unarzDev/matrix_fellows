import { z } from 'zod'
import {
  assertWorkspaceOrigin,
  openWorkspace,
  workspaceConfig,
  validateWorkspaceUser,
  writeWorkspaceSession,
  WORKSPACE_FLOW_COOKIE,
} from '../../../utils/workspace-auth'
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  assertWorkspaceOrigin(event)
  const config = workspaceConfig(event)
  const body = z
    .object({ email: z.string().email().max(254), token: z.string().regex(/^\d{6,8}$/) })
    .parse(await readBody(event))
  let flow: { email?: string; expires: number }
  try {
    flow = await openWorkspace(
      getCookie(event, WORKSPACE_FLOW_COOKIE) || '',
      config.workspaceSessionSecret,
      WORKSPACE_FLOW_COOKIE,
    )
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Request a new sign-in email.' })
  }
  if (flow.expires < Date.now() || flow.email !== body.email.toLowerCase())
    throw createError({ statusCode: 401, statusMessage: 'Request a new sign-in email.' })
  const response = await fetch(`${config.public.supabaseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: config.public.supabaseAnonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: flow.email, token: body.token, type: 'email' }),
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok)
    throw createError({ statusCode: 401, statusMessage: 'The sign-in code is invalid or expired.' })
  const tokens = (await response.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
  }
  await validateWorkspaceUser(event, tokens.access_token)
  await writeWorkspaceSession(event, tokens)
  deleteCookie(event, WORKSPACE_FLOW_COOKIE, { path: '/api/workspace' })
  return { ok: true }
})
