import { z } from 'zod'
import {
  requireWorkspaceOfficer,
  assertWorkspaceOrigin,
  workspaceAuthStorage,
} from '../../utils/workspace-auth'
import {
  mailboxAccessToken,
  approvedEmailFingerprint,
  sendApprovedEmail,
  UncertainSendError,
  type WorkspaceMailbox,
} from '../../utils/workspace-mail'
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  assertWorkspaceOrigin(event)
  const officer = await requireWorkspaceOfficer(event)
  const body = z
    .object({
      proposalId: z.string().uuid(),
      revision: z.number().int().positive(),
      fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
      mailboxId: z.string().uuid(),
    })
    .parse(await readBody(event))
  const client = workspaceAuthStorage(event)
  const { data: mailbox, error } = await client
    .from('outreach_mailboxes')
    .select('*')
    .eq('id', body.mailboxId)
    .eq('owner_id', officer.userId)
    .eq('enabled', true)
    .maybeSingle()
  if (error || !mailbox)
    throw createError({
      statusCode: 403,
      statusMessage: 'Only the connected mailbox owner can send.',
    })
  // Resolve credentials before claiming so a missing connection never consumes approval.
  const token = await mailboxAccessToken(event, mailbox as WorkspaceMailbox, officer)
  const { data: item, error: claimError } = await client.rpc('outreach_claim_send', {
    p_proposal_id: body.proposalId,
    p_revision: body.revision,
    p_fingerprint: body.fingerprint,
    p_mailbox_id: body.mailboxId,
    p_user_id: officer.userId,
  })
  if (claimError || !item)
    throw createError({
      statusCode: 409,
      statusMessage: 'The email changed, is already sending, or requires approval/reconciliation.',
    })
  let status: 'sent' | 'uncertain' | 'failed' = 'failed',
    providerId: string | null = null,
    message: string | null = null
  try {
    const expected = await approvedEmailFingerprint({
      proposalId: body.proposalId,
      revision: body.revision,
      mailboxId: body.mailboxId,
      sender: mailbox.email,
      recipient: item.recipient,
      subject: item.subject,
      body: item.body,
    })
    if (expected !== body.fingerprint || item.sender_email !== mailbox.email)
      throw new Error('The approved sender or content no longer matches.')
    const result = await sendApprovedEmail(mailbox.provider, token, {
      recipient: item.recipient,
      subject: item.subject,
      body: item.body,
      sender: mailbox.email,
      correlationId: item.id,
    })
    status = 'sent'
    providerId = result.providerMessageId
  } catch (cause) {
    status = cause instanceof UncertainSendError ? 'uncertain' : 'failed'
    message = cause instanceof Error ? cause.message : 'Sending failed.'
  }
  const { data: finished, error: finishError } = await client.rpc('outreach_finish_send', {
    p_id: item.id,
    p_claim_token: item.claim_token,
    p_status: status,
    p_provider_message_id: providerId,
    p_error: message,
  })
  if (finishError || !finished)
    throw createError({
      statusCode: 503,
      statusMessage:
        'Sending outcome could not be recorded. Do not resend; check Sent mail and ask an organizer to reconcile.',
    })
  return {
    ok: status === 'sent',
    status: status === 'sent' ? 'accepted' : status,
    providerMessageId: providerId,
    message,
  }
})
