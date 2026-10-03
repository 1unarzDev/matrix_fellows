import { z } from 'zod'
import {
  assertWorkspaceOrigin,
  workspaceConfig,
  workspaceAuthStorage,
  randomToken,
  hashText,
  sealWorkspace,
  workspaceCookieOptions,
  WORKSPACE_FLOW_COOKIE,
} from '../../../utils/workspace-auth'
const schema = z.object({
  provider: z.enum(['google', 'azure', 'email']),
  email: z.string().email().max(254).optional(),
})
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  assertWorkspaceOrigin(event)
  const config = workspaceConfig(event)
  const { provider, email } = schema.parse(await readBody(event))
  const verifier = randomToken()
  const challenge = await hashText(verifier)
  const redirect = `${new URL(config.public.siteUrl).origin}/api/workspace/auth/callback`
  if (provider === 'email') {
    if (!email)
      throw createError({ statusCode: 400, statusMessage: 'Enter your invited email address.' })
    const normalized = email.trim().toLowerCase()
    const { data: invited, error } = await workspaceAuthStorage(event)
      .from('outreach_members')
      .select('user_id')
      .eq('email', normalized)
      .eq('enabled', true)
      .maybeSingle()
    if (error)
      throw createError({ statusCode: 503, statusMessage: 'Sign-in is temporarily unavailable.' })
    // Do not enumerate organizer identities. Auth's configured OTP rate limits remain active.
    if (!invited) return { sent: true }
    setCookie(
      event,
      WORKSPACE_FLOW_COOKIE,
      await sealWorkspace(
        { verifier, email: normalized, expires: Date.now() + 10 * 60000 },
        config.workspaceSessionSecret,
        WORKSPACE_FLOW_COOKIE,
      ),
      workspaceCookieOptions(event, 600),
    )
    const response = await fetch(
      `${config.public.supabaseUrl}/auth/v1/otp?redirect_to=${encodeURIComponent(redirect)}`,
      {
        method: 'POST',
        headers: { apikey: config.public.supabaseAnonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalized,
          create_user: false,
          code_challenge: challenge,
          code_challenge_method: 's256',
        }),
        signal: AbortSignal.timeout(10000),
      },
    )
    if (!response.ok)
      throw createError({
        statusCode: response.status === 429 ? 429 : 503,
        statusMessage: 'Could not send the sign-in link. Wait a moment and try again.',
      })
    return { sent: true }
  }
  setCookie(
    event,
    WORKSPACE_FLOW_COOKIE,
    await sealWorkspace(
      { verifier, expires: Date.now() + 10 * 60000 },
      config.workspaceSessionSecret,
      WORKSPACE_FLOW_COOKIE,
    ),
    workspaceCookieOptions(event, 600),
  )
  const url = new URL(`${config.public.supabaseUrl}/auth/v1/authorize`)
  for (const [key, value] of Object.entries({
    provider,
    redirect_to: redirect,
    code_challenge: challenge,
    code_challenge_method: 's256',
    ...(provider === 'azure' ? { scopes: 'email' } : {}),
  }))
    url.searchParams.set(key, value)
  return { url: url.toString() }
})
