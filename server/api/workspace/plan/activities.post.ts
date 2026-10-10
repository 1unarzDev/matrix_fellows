import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../../utils/workspace-auth'
import { workspaceStorage, workspaceBody, workspaceResult } from '../../../utils/workspace-storage'
import { activityFromRow } from '../../../utils/dashboard-storage'
import { activityInputSchema } from '#shared/utils/dashboard-planning'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceMember(event)
  const input = await workspaceBody(event, activityInputSchema)
  return activityFromRow(
    workspaceResult(
      await workspaceStorage(event)
        .from('dashboard_activities')
        .insert({ ...input, user_id: member.userId })
        .select()
        .single(),
    ),
  )
})
