import { requireWorkspaceSecurity } from '../../../utils/workspace-auth'
import {
  authRequest,
  readCredentialFlow,
  RECOVERY_COOKIE,
  type RecoveryFlow,
} from '../../../utils/workspace-credentials'
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  if (getQuery(event).recovery === '1') {
    await readCredentialFlow<RecoveryFlow>(event, RECOVERY_COOKIE)
    return { recovery: true }
  }
  const { tokens } = await requireWorkspaceSecurity(event, false)
  let passkeys: {
    id: string
    friendly_name?: string
    created_at: string
    last_used_at?: string
  }[] = []
  let passkeyAvailable = true
  try {
    passkeys = await authRequest(event, 'passkeys', undefined, tokens.access_token, 'GET')
  } catch {
    passkeyAvailable = false
  }
  return {
    passkeys,
    passkeyAvailable,
    fresh: !!tokens.authenticated_at && Date.now() - tokens.authenticated_at <= 5 * 60000,
  }
})
