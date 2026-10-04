import { workspaceConfig } from '../../../utils/workspace-auth'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const config = workspaceConfig(event)
  const response = await fetch(`${config.public.supabaseUrl}/auth/v1/settings`, {
    headers: { apikey: config.public.supabaseAnonKey },
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok)
    throw createError({ statusCode: 503, statusMessage: 'Sign-in providers are unavailable.' })
  const settings = (await response.json()) as { external?: Record<string, boolean> }
  return { google: settings.external?.google === true, azure: settings.external?.azure === true }
})
