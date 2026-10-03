import { z } from 'zod'
import {
  requireWorkspaceOfficer,
  assertWorkspaceOrigin,
  workspaceAuthStorage,
} from '../../../utils/workspace-auth'
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  assertWorkspaceOrigin(event)
  const officer = await requireWorkspaceOfficer(event)
  const body = z
    .object({
      outboxId: z.string().uuid(),
      outcome: z.enum(['sent', 'not_sent']),
      note: z.string().trim().min(15).max(1000),
    })
    .parse(await readBody(event))
  const { data, error } = await workspaceAuthStorage(event).rpc('outreach_reconcile_send', {
    p_id: body.outboxId,
    p_user_id: officer.userId,
    p_outcome: body.outcome,
    p_note: body.note,
  })
  if (error || !data)
    throw createError({
      statusCode: 409,
      statusMessage:
        'Reconciliation failed. Only the mailbox owner can resolve an uncertain or stale sending request after checking Sent mail.',
    })
  return { ok: true, status: body.outcome === 'sent' ? 'accepted' : 'failed' }
})
