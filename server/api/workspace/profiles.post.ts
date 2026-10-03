import { requireWorkspaceOfficer, assertWorkspaceOrigin } from '../../utils/workspace-auth'
import {
  workspaceStorage,
  workspaceResult,
  workspaceBody,
  profileFromRow,
  profileToRow,
} from '../../utils/workspace-storage'
import { outreachProfileSchema } from '#shared/utils/outreach'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceOfficer(event)
  const body = await workspaceBody(event, outreachProfileSchema)
  return profileFromRow(
    workspaceResult(
      await workspaceStorage(event)
        .from('outreach_profiles')
        .insert({ ...profileToRow(body), created_by: member.userId })
        .select()
        .single(),
    ),
  )
})
