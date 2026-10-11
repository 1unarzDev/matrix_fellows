import {
  requireWorkspaceOfficer,
  workspaceConfig,
  workspaceAuthStorage,
  openWorkspace,
} from '../../../utils/workspace-auth'
import {
  mailProviderConfig,
  mailboxTokenRequest,
  verifyMailboxIdentity,
  protectMailboxToken,
  type MailProvider,
} from '../../../utils/workspace-mail'
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const cookie = getCookie(event, 'matrix-mailbox-flow') || ''
  deleteCookie(event, 'matrix-mailbox-flow', { path: '/api/workspace' })
  try {
    const officer = await requireWorkspaceOfficer(event)
    const flow = await openWorkspace<{
      state: string
      verifier: string
      provider: MailProvider
      userId: string
      expires: number
    }>(cookie, workspaceConfig(event).workspaceSessionSecret, 'matrix-mailbox-flow')
    const query = getQuery(event)
    if (
      flow.userId !== officer.userId ||
      flow.expires < Date.now() ||
      query.state !== flow.state ||
      typeof query.code !== 'string' ||
      query.code.length > 4000 ||
      !['gmail', 'outlook'].includes(flow.provider)
    )
      throw new Error('Invalid OAuth flow')
    const config = mailProviderConfig(event, flow.provider)
    const tokens = await mailboxTokenRequest(config, flow.provider, {
      grant_type: 'authorization_code',
      code: query.code,
      code_verifier: flow.verifier,
      redirect_uri: config.redirect,
    })
    if (!tokens.refresh_token) throw new Error('No offline grant')
    const scope = tokens.scope || ''
    if (
      flow.provider === 'gmail' &&
      !scope.split(' ').includes('https://www.googleapis.com/auth/gmail.send')
    )
      throw new Error('Missing send grant')
    if (
      flow.provider === 'outlook' &&
      !scope
        .toLowerCase()
        .split(' ')
        .some((x) => x === 'mail.send' || x === 'https://graph.microsoft.com/mail.send')
    )
      throw new Error('Missing send grant')
    const email = await verifyMailboxIdentity(flow.provider, tokens.access_token)
    const client = workspaceAuthStorage(event)
    const { data: existing, error: readError } = await client
      .from('outreach_mailboxes')
      .select('id')
      .eq('owner_id', officer.userId)
      .eq('provider', flow.provider)
      .eq('email', email)
      .maybeSingle()
    if (readError) throw new Error('Could not load connection')
    const id = existing?.id || crypto.randomUUID()
    const { error } = await client.from('outreach_mailboxes').upsert(
      {
        id,
        owner_id: officer.userId,
        provider: flow.provider,
        email,
        enabled: true,
        access_token_encrypted: await protectMailboxToken(
          tokens.access_token,
          config.encryptionKey,
          id,
          'access',
        ),
        refresh_token_encrypted: await protectMailboxToken(
          tokens.refresh_token,
          config.encryptionKey,
          id,
          'refresh',
        ),
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      },
      { onConflict: 'id' },
    )
    if (error) throw new Error('Could not save connection')
    return sendRedirect(event, '/workspace?mailbox=connected', 303)
  } catch {
    return sendRedirect(event, '/workspace?mailbox=failed', 303)
  }
})
