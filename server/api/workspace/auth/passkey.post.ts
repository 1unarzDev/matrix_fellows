import { z } from 'zod'
import {
  assertWorkspaceOrigin,
  decodeBase64,
  requireWorkspaceSecurity,
  validateWorkspaceUser,
  writeWorkspaceSession,
} from '../../../utils/workspace-auth'
import {
  authRequest,
  writeCredentialFlow,
  readCredentialFlow,
  PASSKEY_COOKIE,
  clearCredentialFlows,
} from '../../../utils/workspace-credentials'

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('signin-options') }),
  z.object({ action: z.literal('register-options') }),
  z.object({
    action: z.enum(['signin-verify', 'register-verify']),
    credential: z.object({
      id: z.string().max(2048),
      rawId: z.string().max(2048),
      type: z.literal('public-key'),
      response: z.record(z.string(), z.unknown()),
      clientExtensionResults: z.record(z.string(), z.unknown()).optional(),
      authenticatorAttachment: z.string().nullable().optional(),
    }),
  }),
  z.object({
    action: z.literal('rename'),
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
  }),
  z.object({ action: z.literal('delete'), id: z.string().uuid() }),
])
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  assertWorkspaceOrigin(event)
  const raw = await readBody(event)
  if (JSON.stringify(raw).length > 65536)
    throw createError({ statusCode: 413, statusMessage: 'Credential response is too large.' })
  const parsed = schema.safeParse(raw)
  if (!parsed.success)
    throw createError({ statusCode: 400, statusMessage: 'Invalid passkey request.' })
  const body = parsed.data
  const registration = body.action.startsWith('register')
  const security = body.action.startsWith('signin') ? null : await requireWorkspaceSecurity(event)
  if (body.action.endsWith('-options')) {
    const result = await authRequest(
      event,
      `passkeys/${registration ? 'registration' : 'authentication'}/options`,
      {},
      security?.tokens.access_token,
    )
    await writeCredentialFlow(event, PASSKEY_COOKIE, {
      challenge: result.challenge_id,
      registration,
      user: security?.member.userId,
    })
    return { options: result.options }
  }
  if ('credential' in body) {
    const flow = await readCredentialFlow<{
      expires: number
      challenge: string
      registration: boolean
      user?: string
    }>(event, PASSKEY_COOKIE)
    deleteCookie(event, PASSKEY_COOKIE, { path: '/api/workspace' })
    if (
      flow.registration !== registration ||
      (registration && flow.user !== security?.member.userId)
    )
      throw createError({ statusCode: 403, statusMessage: 'Start a new passkey request.' })
    if (!registration) {
      // The UV bit lives in signed authenticator data (WebAuthn flags byte 32).
      // Require it server-side too: a caller must not bypass the browser's
      // userVerification requirement. The provider then verifies the signature.
      let verified = false
      try {
        const encoded = body.credential.response.authenticatorData
        if (typeof encoded === 'string') {
          const data = decodeBase64(encoded)
          verified = data.length >= 37 && (data[32]! & 0x04) !== 0
        }
      } catch {
        /* Invalid wire data fails closed. */
      }
      if (!verified)
        throw createError({
          statusCode: 400,
          statusMessage: 'Verify this passkey with your device PIN or biometrics, then try again.',
        })
    }
    const result = await authRequest(
      event,
      `passkeys/${registration ? 'registration' : 'authentication'}/verify`,
      { challenge_id: flow.challenge, credential: body.credential },
      security?.tokens.access_token,
    )
    if (!registration) {
      await validateWorkspaceUser(event, result.access_token)
      clearCredentialFlows(event)
      await writeWorkspaceSession(event, result)
    }
    return { ok: true }
  }
  if ('id' in body) {
    await authRequest(
      event,
      `passkeys/${body.id}`,
      body.action === 'rename' ? { friendly_name: body.name } : undefined,
      security!.tokens.access_token,
      body.action === 'rename' ? 'PATCH' : 'DELETE',
    )
    return { ok: true }
  }
})
