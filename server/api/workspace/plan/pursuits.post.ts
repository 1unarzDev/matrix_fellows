import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../../utils/workspace-auth'
import { workspaceStorage, workspaceBody, workspaceResult } from '../../../utils/workspace-storage'
import { pursuitFromRow } from '../../../utils/dashboard-storage'
import { assertWorkspaceOpportunity } from '../../../utils/workspace-access'
import { pursueSchema } from '#shared/utils/dashboard-planning'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceMember(event)
  const input = await workspaceBody(event, pursueSchema)
  await assertWorkspaceOpportunity(event, input.opportunityId)
  return pursuitFromRow(
    workspaceResult(
      await workspaceStorage(event).rpc('dashboard_pursue', {
        p_user_id: member.userId,
        p_input: input,
      }),
    ),
  )
})
