import { z } from 'zod'
import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../../../utils/workspace-auth'
import { workspaceStorage, workspaceBody, workspaceId } from '../../../../utils/workspace-storage'
import { activityFromRow, planVersionUpdate } from '../../../../utils/dashboard-storage'
import { activityInputSchema } from '#shared/utils/dashboard-planning'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceMember(event)
  const input = await workspaceBody(
    event,
    z
      .object({ expectedVersion: z.number().int().positive(), activity: activityInputSchema })
      .strict(),
  )
  return activityFromRow(
    await planVersionUpdate(
      workspaceStorage(event),
      'dashboard_activities',
      member.userId,
      workspaceId(event),
      input.expectedVersion,
      input.activity,
    ),
  )
})
