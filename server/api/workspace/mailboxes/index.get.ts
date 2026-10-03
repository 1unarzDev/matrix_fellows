import { requireWorkspaceOfficer, workspaceAuthStorage } from '../../../utils/workspace-auth'
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const officer = await requireWorkspaceOfficer(event)
  const { data, error } = await workspaceAuthStorage(event)
    .from('outreach_mailboxes')
    .select('id,provider,email,enabled,expires_at')
    .eq('owner_id', officer.userId)
    .order('email')
  if (error)
    throw createError({ statusCode: 503, statusMessage: 'Could not load connected mailboxes.' })
  const config = useRuntimeConfig(event)
  const encrypted = config.workspaceMailboxEncryptionKey.length >= 32
  return {
    items: data || [],
    providers: {
      gmail: Boolean(encrypted && config.googleOAuthClientId && config.googleOAuthClientSecret),
      outlook: Boolean(
        encrypted && config.microsoftOAuthClientId && config.microsoftOAuthClientSecret,
      ),
    },
  }
})
