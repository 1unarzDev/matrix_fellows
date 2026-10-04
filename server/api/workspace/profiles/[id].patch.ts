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
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceMember(event)
  const body = await workspaceBody(event, outreachProfileSchema)
  return profileFromRow(
    workspaceResult(
      await workspaceStorage(event)
        .from('outreach_profiles')
        .update(profileToRow(body))
        .eq('id', workspaceId(event))
        .eq('created_by', member.userId)
        .select()
        .single(),
    ),
  )
})
