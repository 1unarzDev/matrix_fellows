import { requireWorkspaceOfficer, assertWorkspaceOrigin } from '../../utils/workspace-auth'
import {
  workspaceStorage,
  workspaceResult,
  workspaceBody,
  proposalFromRow,
  proposalToRow,
} from '../../utils/workspace-storage'
import { outreachProposalSchema } from '#shared/utils/outreach'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceOfficer(event)
  const body = await workspaceBody(event, outreachProposalSchema)
  const db = workspaceStorage(event)
  const target = workspaceResult(
    await db.from('outreach_targets').select('status').eq('id', body.targetId).single(),
  )
  if (body.kind === 'student') {
    if (!body.profileId)
      throw createError({ statusCode: 422, statusMessage: 'Choose a student profile.' })
    const profile = workspaceResult(
      await db
        .from('outreach_profiles')
        .select('consent_to_share')
        .eq('id', body.profileId)
        .eq('created_by', member.userId)
        .single(),
    )
    if (!profile.consent_to_share)
      throw createError({ statusCode: 422, statusMessage: 'Student consent is required.' })
  } else if (body.profileId)
    throw createError({
      statusCode: 400,
      statusMessage: 'Society proposals cannot include a private student profile.',
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
