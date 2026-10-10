import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../../utils/workspace-auth'
import {
  workspaceStorage,
  workspaceResult,
  workspaceBody,
  workspaceId,
  profileFromRow,
  profileToRow,
} from '../../../utils/workspace-storage'
import { outreachProfileSchema } from '#shared/utils/outreach'
import { z } from 'zod'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceMember(event)
  const body = await workspaceBody(
    event,
    outreachProfileSchema.extend({ expectedUpdatedAt: z.iso.datetime({ offset: true }) }),
  )
  const row = workspaceResult(
    await workspaceStorage(event)
      .from('outreach_profiles')
      .update(profileToRow(body))
      .eq('id', workspaceId(event))
      .eq('created_by', member.userId)
      .eq('updated_at', body.expectedUpdatedAt)
      .select()
      .maybeSingle(),
  )
  if (!row)
    throw createError({
      statusCode: 409,
      statusMessage:
        'Your profile changed elsewhere. Copy your edits before reloading; they were not overwritten.',
    })
  return profileFromRow(row)
})
