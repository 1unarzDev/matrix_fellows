import { z } from 'zod'
import { proposeLocalDraftRevision } from '#shared/utils/draft-revisions'
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
  const result = proposeLocalDraftRevision({body:p.body,action:input.action,claimId:input.claimId,supports:p.proposal_plan?.sentenceSupports})
  return { baseRevision: p.revision, subject: p.subject, body: result.body, notices: ['Local editing. Review this preview before replacing your saved revision.', ...result.notices], mode: 'local' }
})
