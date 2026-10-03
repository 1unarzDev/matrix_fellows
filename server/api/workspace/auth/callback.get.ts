import {
  openWorkspace,
  workspaceConfig,
  validateWorkspaceUser,
  writeWorkspaceSession,
  WORKSPACE_FLOW_COOKIE,
} from '../../../utils/workspace-auth'
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const config = workspaceConfig(event)
  const token = getCookie(event, WORKSPACE_FLOW_COOKIE) || ''
  deleteCookie(event, WORKSPACE_FLOW_COOKIE, { path: '/api/workspace' })
  try {
    const flow = await openWorkspace<{ verifier: string; expires: number }>(
      token,
      config.workspaceSessionSecret,
      WORKSPACE_FLOW_COOKIE,
    )
    const query = getQuery(event)
    if (flow.expires < Date.now() || typeof query.code !== 'string' || query.code.length > 2000)
      throw new Error('Expired flow')
    const response = await fetch(`${config.public.supabaseUrl}/auth/v1/token?grant_type=pkce`, {
      method: 'POST',
      headers: { apikey: config.public.supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_code: query.code, code_verifier: flow.verifier }),
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) throw new Error('Invalid auth code')
    const tokens = (await response.json()) as {
      access_token: string
      refresh_token: string
      expires_in: number
    }
    await validateWorkspaceUser(event, tokens.access_token)
    await writeWorkspaceSession(event, tokens)
    return sendRedirect(event, '/workspace', 303)
  } catch {
    return sendRedirect(event, '/workspace?auth=failed', 303)
  }
})
