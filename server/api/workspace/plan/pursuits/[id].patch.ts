import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../../../utils/workspace-auth'
import { workspaceStorage, workspaceBody, workspaceId } from '../../../../utils/workspace-storage'
import { pursuitFromRow, planVersionUpdate } from '../../../../utils/dashboard-storage'
import { pursuitPatchSchema } from '#shared/utils/dashboard-planning'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceMember(event)
  const v = await workspaceBody(event, pursuitPatchSchema)
  return pursuitFromRow(
    await planVersionUpdate(
      workspaceStorage(event),
      'dashboard_pursuits',
      member.userId,
      workspaceId(event),
      v.expectedVersion,
      { status: v.status, outcome: v.outcome, submission_receipt: v.submissionReceipt },
    ),
  )
})
