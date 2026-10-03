import { requireWorkspaceOfficer, workspaceAuthStorage } from '../../../utils/workspace-auth'
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const officer = await requireWorkspaceOfficer(event)
  const client = workspaceAuthStorage(event)
  const { data: mailboxes, error: mailError } = await client
    .from('outreach_mailboxes')
    .select('id')
    .eq('owner_id', officer.userId)
  if (mailError)
    throw createError({ statusCode: 503, statusMessage: 'Could not load your outbox.' })
  if (!mailboxes?.length) return { items: [] }
  const { data, error } = await client
    .from('outreach_outbox')
    .select(
      'id,proposal_id,revision,mailbox_id,status,recipient,subject,provider_message_id,error,claimed_at,created_at,updated_at',
    )
    .in(
      'mailbox_id',
      mailboxes.map((row) => row.id),
    )
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw createError({ statusCode: 503, statusMessage: 'Could not load your outbox.' })
  return {
    items: (data || []).map((row) => ({
      ...row,
      status: row.status === 'sent' ? 'accepted' : row.status,
      canReconcile:
        row.status === 'uncertain' ||
        (row.status === 'sending' && Date.parse(row.claimed_at) < Date.now() - 120000),
    })),
  }
})
