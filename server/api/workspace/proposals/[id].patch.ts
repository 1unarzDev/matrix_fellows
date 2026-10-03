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
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceOfficer(event)
  const body = await workspaceBody(
    event,
    outreachProposalSchema.extend({ revision: z.number().int().positive() }),
  )
  const db = workspaceStorage(event)
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
  const result = await db
    .from('outreach_proposals')
    .update(proposalToRow(body))
    .eq('id', workspaceId(event))
    .eq('revision', body.revision)
    .eq('created_by', member.userId)
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
