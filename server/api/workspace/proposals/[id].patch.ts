import { pruneRemovedDraftEvidence } from '#shared/utils/draft-evidence'
import { shareableResearchProfile } from '../../../utils/research-profile'
import { z } from 'zod'
import { requireWorkspaceOfficer, assertWorkspaceOrigin } from '../../../utils/workspace-auth'
import {
  workspaceStorage,
  workspaceResult,
  workspaceBody,
  workspaceId,
  proposalFromRow,
  proposalToRow,
} from '../../../utils/workspace-storage'
import { outreachProposalSchema } from '#shared/utils/outreach'
import { assertWorkspaceTarget } from '../../../utils/workspace-access'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceOfficer(event)
  const body = await workspaceBody(
    event,
    outreachProposalSchema.extend({ revision: z.number().int().positive() }),
  )
  const db = workspaceStorage(event)
  await assertWorkspaceTarget(event, member, body.targetId, body.kind)
  if (body.kind === 'student') {
    if (!body.profileId)
      throw createError({ statusCode: 422, statusMessage: 'Choose a member profile.' })
    await shareableResearchProfile(event, body.profileId)
  } else if (body.profileId)
    throw createError({
      statusCode: 400,
      statusMessage: 'Society proposals cannot include a private member profile.',
    })
  const current = workspaceResult(await db.from('outreach_proposals').select('body,evidence_claim_ids,proposal_plan,profile_id,target_id').eq('id',workspaceId(event)).eq('current_owner_id',member.userId).eq('revision',body.revision).maybeSingle())
  if (!current) throw createError({statusCode:409,statusMessage:'This draft changed. Reload before editing.'})
  if(current.profile_id !== (body.profileId || null) || current.target_id !== body.targetId)
    throw createError({statusCode:409,statusMessage:'Rebuild the proposal to change its represented profile or target.'})
  const evidence=pruneRemovedDraftEvidence(current.body,body.body,current.evidence_claim_ids || [],current.proposal_plan)
  const result = await db
    .from('outreach_proposals')
    .update({...proposalToRow(body),...evidence})
    .eq('id', workspaceId(event))
    .eq('revision', body.revision)
    .eq('current_owner_id', member.userId)
    .select()
    .maybeSingle()
  if (result.error)
    throw createError({
      statusCode: 409,
      statusMessage: 'This proposal cannot be edited while sending or after it was sent.',
    })
  if (!result.data)
    throw createError({
      statusCode: 409,
      statusMessage: 'This draft changed in another session. Reload before editing.',
    })
  return proposalFromRow(workspaceResult(result))
})
