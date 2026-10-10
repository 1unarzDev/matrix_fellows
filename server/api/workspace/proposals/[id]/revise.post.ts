import { z } from 'zod'
import { requireWorkspaceOfficer, assertWorkspaceOrigin } from '../../../../utils/workspace-auth'
import { workspaceBody, workspaceId, workspaceStorage } from '../../../../utils/workspace-storage'
/** Proposed local edits only. The normal optimistic save creates the next revision. */
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const actor = await requireWorkspaceOfficer(event)
  const input = await workspaceBody(
    event,
    z
      .object({
        revision: z.number().int().positive(),
        action: z.enum(['shorten', 'smaller_ask', 'direct', 'remove_claim']),
        claimId: z.string().uuid().optional(),
      })
      .strict(),
  )
  const { data: p, error } = await workspaceStorage(event)
    .from('outreach_proposals')
    .select('revision,subject,body,status,proposal_plan')
    .eq('id', workspaceId(event))
    .eq('current_owner_id', actor.userId)
    .maybeSingle()
  if (error || !p || p.revision !== input.revision || p.status === 'sent')
    throw createError({
      statusCode: 409,
      statusMessage: 'Draft changed; reload before proposing a revision.',
    })
  let body: string = p.body
  const notices: string[] = [
    'Local editing. Review the proposed text before saving; your approval will reset when you save.',
  ]
  if (input.action === 'shorten') {
    body = body
      .replace(/\bI (?:am|would be) (?:very |particularly )?excited (?:about|by) [^.]+\.\s*/gi, '')
      .replace(
        /\b(?:I hope this (?:email|message) finds you well|Thank you (?:very much )?for your time and consideration)\.\s*/gi,
        '',
      )
    if (body === p.body)
      notices.push(
        'No filler was safely removable. Keep the research connection and supporting evidence while editing.',
      )
  } else if (input.action === 'smaller_ask') {
    body = body.replace(
      /Would you be (?:open|available) [^?]+\?/i,
      'Would you be open to one brief question by email?',
    )
    if (body === p.body)
      notices.push(
        'No explicit ask was recognized. Select the request in the editor and replace it with a brief question.',
      )
  } else if (input.action === 'direct') {
    body = body
      .replace(/I was wondering (?:if|whether) you (?:might|would) /gi, 'Would you ')
      .replace(/I would like to (?:ask|inquire) (?:if|whether) /gi, '')
  } else {
    // A claim can span multiple sentences. Never guess which text a claim supports.
    notices.push(
      'Select and remove the supported sentence in the editor. Automatic deletion needs an exact sentence-to-claim map.',
    )
  }
  return { baseRevision: p.revision, subject: p.subject, body, notices, mode: 'local' }
})
