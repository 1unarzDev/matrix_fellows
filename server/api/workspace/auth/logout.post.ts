import {
  assertWorkspaceOrigin,
  clearWorkspaceSession,
  workspaceConfig,
  openWorkspace,
  WORKSPACE_COOKIE,
  type WorkspaceTokens,
} from '../../../utils/workspace-auth'
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  assertWorkspaceOrigin(event)
  const config = workspaceConfig(event)
  const token = getCookie(event, WORKSPACE_COOKIE) || ''
  clearWorkspaceSession(event)
  deleteCookie(event, 'matrix-workspace-flow', { path: '/api/workspace' })
  try {
    const tokens = await openWorkspace<WorkspaceTokens>(
      token,
      config.workspaceSessionSecret,
      WORKSPACE_COOKIE,
    )
    await fetch(`${config.public.supabaseUrl}/auth/v1/logout?scope=local`, {
      method: 'POST',
      headers: {
        apikey: config.public.supabaseAnonKey,
        Authorization: `Bearer ${tokens.access_token}`,
      },
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    /* Local logout succeeds even when provider is unavailable. */
  }
  return { ok: true }
})
