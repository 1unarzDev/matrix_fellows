import { shareableResearchProfile } from '../../utils/research-profile'
import { requireWorkspaceOfficer, assertWorkspaceOrigin } from '../../utils/workspace-auth'
import {
  workspaceStorage,
  workspaceResult,
  workspaceBody,
  proposalFromRow,
  proposalToRow,
} from '../../utils/workspace-storage'
import { outreachProposalSchema } from '#shared/utils/outreach'
import { assertWorkspaceTarget } from '../../utils/workspace-access'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceOfficer(event)
  const body = await workspaceBody(event, outreachProposalSchema)
  const db = workspaceStorage(event)
  await assertWorkspaceTarget(event, member, body.targetId, body.kind)
  const target = workspaceResult(
    await db.from('outreach_targets').select('status').eq('id', body.targetId).single(),
  )
  if (target.status !== 'ready')
    throw createError({
      statusCode: 403,
      statusMessage: 'Choose a reviewed, ready research connection.',
    })
  if (body.kind === 'student') {
    if (!body.profileId)
      throw createError({ statusCode: 422, statusMessage: 'Choose a member profile.' })
    await shareableResearchProfile(event, body.profileId)
  } else if (body.profileId)
    throw createError({
      statusCode: 400,
      statusMessage: 'Society proposals cannot include a private member profile.',
    })
  if (['rejected', 'deferred'].includes(target.status))
    throw createError({
      statusCode: 409,
      statusMessage: 'Return this candidate to review before drafting.',
    })
  return proposalFromRow(
    workspaceResult(
      await db
        .from('outreach_proposals')
        .insert({ ...proposalToRow(body), created_by: member.userId })
        .select()
        .single(),
    ),
  )
})
