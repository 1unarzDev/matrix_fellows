import { z } from 'zod'
import {
  requireWorkspaceOfficer,
  assertWorkspaceOrigin,
  workspaceAuthStorage,
} from '../../../../utils/workspace-auth'
import { approvedEmailFingerprint, validateApprovedEmail } from '../../../../utils/workspace-mail'
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  assertWorkspaceOrigin(event)
  const officer = await requireWorkspaceOfficer(event)
  const id = z.string().uuid().parse(getRouterParam(event, 'id'))
  const { revision } = z
    .object({ revision: z.number().int().positive() })
    .parse(await readBody(event))
  const client = workspaceAuthStorage(event)
  const { data: proposal, error } = await client
    .from('outreach_proposals')
    .select('id,revision,recipient,subject,body,mailbox_id')
    .eq('id', id)
    .maybeSingle()
  if (error) throw createError({ statusCode: 503, statusMessage: 'Proposal could not be loaded.' })
  if (!proposal || proposal.revision !== revision)
    throw createError({
      statusCode: 409,
      statusMessage: 'Proposal changed; reload before approving.',
    })
  if (/\[REVIEW:/i.test(proposal.subject + '\n' + proposal.body))
    throw createError({
      statusCode: 400,
      statusMessage: 'Resolve every review placeholder before approving.',
    })
  const { data: mailbox } = await client
    .from('outreach_mailboxes')
    .select('id,email')
    .eq('id', proposal.mailbox_id)
    .eq('owner_id', officer.userId)
    .eq('enabled', true)
    .maybeSingle()
  if (!mailbox)
    throw createError({
      statusCode: 403,
      statusMessage: 'Select your connected mailbox before approval.',
    })
  try {
    validateApprovedEmail({
      recipient: proposal.recipient,
      subject: proposal.subject,
      body: proposal.body,
      sender: mailbox.email,
      correlationId: id,
    })
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: 'Check the recipient, subject, and message before approving.',
    })
  }
  const fingerprint = await approvedEmailFingerprint({
    proposalId: id,
    revision,
    mailboxId: mailbox.id,
    sender: mailbox.email,
    recipient: proposal.recipient,
    subject: proposal.subject,
    body: proposal.body,
  })
  const { data: outbox, error: approvalError } = await client.rpc('outreach_approve_email', {
    p_proposal_id: id,
    p_revision: revision,
    p_fingerprint: fingerprint,
    p_user_id: officer.userId,
    p_recipient: proposal.recipient,
    p_subject: proposal.subject,
    p_body: proposal.body,
    p_sender_email: mailbox.email,
  })
  if (approvalError)
    throw createError({
      statusCode: 409,
      statusMessage:
        'Approval failed. Ensure the target is reviewed and ready, with a consented profile for individual outreach.',
    })
  return { ok: true, outboxId: outbox.id, revision, fingerprint }
})
