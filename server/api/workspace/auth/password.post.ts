import { z } from 'zod'
import {
  assertWorkspaceOrigin,
  workspaceConfig,
  randomToken,
  hashText,
  WORKSPACE_FLOW_COOKIE,
  validateWorkspaceUser,
  writeWorkspaceSession,
  requireWorkspaceSecurity,
  clearWorkspaceSession,
} from '../../../utils/workspace-auth'
import {
  authRequest,
  newPassword,
  writeCredentialFlow,
  readCredentialFlow,
  RECOVERY_COOKIE,
  clearCredentialFlows,
  type RecoveryFlow,
} from '../../../utils/workspace-credentials'

const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('signin'),
    email: z.string().email().max(254),
    password: z.string().min(1).max(128),
  }),
  z.object({
    action: z.literal('signup'),
    email: z.string().email().max(254),
    password: newPassword,
  }),
  z.object({ action: z.literal('recover'), email: z.string().email().max(254) }),
  z.object({ action: z.literal('reset'), password: newPassword }),
  z.object({ action: z.literal('change'), password: newPassword }),
])
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  assertWorkspaceOrigin(event)
  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success)
    throw createError({
      statusCode: 400,
      statusMessage: 'Enter a valid email and password. New passwords need 12–128 characters.',
    })
  const body = parsed.data
  if (body.action === 'signin') {
    const tokens = await authRequest(event, 'token?grant_type=password', {
      email: body.email.toLowerCase(),
      password: body.password,
    })
    await validateWorkspaceUser(event, tokens.access_token)
    clearCredentialFlows(event)
    await writeWorkspaceSession(event, tokens)
    return { ok: true }
  }
  if (body.action === 'change' || body.action === 'reset') {
    const tokens =
      body.action === 'change'
        ? (await requireWorkspaceSecurity(event)).tokens
        : (await readCredentialFlow<RecoveryFlow>(event, RECOVERY_COOKIE)).tokens
    await validateWorkspaceUser(event, tokens.access_token)
    await authRequest(event, 'user', { password: body.password }, tokens.access_token, 'PUT')
    // Password changes terminate this dashboard session and revoke refresh tokens.
    // Existing provider access JWTs retain their provider expiry.
    await authRequest(event, 'logout?scope=global', undefined, tokens.access_token).catch(
      () => undefined,
    )
    clearWorkspaceSession(event)
    clearCredentialFlows(event)
    return { ok: true, signInRequired: true }
  }
  const config = workspaceConfig(event)
  const verifier = randomToken()
  const kind = body.action === 'recover' ? 'recovery' : 'signup'
  const redirect = `${new URL(config.public.siteUrl).origin}/api/workspace/auth/callback`
  // PKCE binds the emailed link to the requesting browser; no password in cookies.
  await writeCredentialFlow(
    event,
    WORKSPACE_FLOW_COOKIE,
    { verifier, email: body.email.toLowerCase(), kind },
    3600,
  )
  await authRequest(
    event,
    `${body.action === 'recover' ? 'recover' : 'signup'}?redirect_to=${encodeURIComponent(redirect)}`,
    {
      email: body.email.toLowerCase(),
      ...(body.action === 'signup' ? { password: body.password } : {}),
      code_challenge: await hashText(verifier),
      code_challenge_method: 's256',
    },
  )
  return { sent: true }
})
