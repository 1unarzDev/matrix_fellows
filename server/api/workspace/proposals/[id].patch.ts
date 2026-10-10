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
  const result = await db
    .from('outreach_proposals')
    .update(proposalToRow(body))
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
