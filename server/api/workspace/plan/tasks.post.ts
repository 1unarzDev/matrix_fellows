import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../../utils/workspace-auth'
import { workspaceStorage, workspaceBody, workspaceResult } from '../../../utils/workspace-storage'
import { taskFromRow } from '../../../utils/dashboard-storage'
import { taskCreateSchema, taskToRow } from '#shared/utils/dashboard-planning'
import { assertWorkspaceOpportunity } from '../../../utils/workspace-access'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceMember(event)
  const v = await workspaceBody(event, taskCreateSchema)
  await assertWorkspaceOpportunity(event, v.opportunityId)
  const db = workspaceStorage(event)
  if (v.task.dependsOn.length)
    workspaceResult(
      await db
        .from('dashboard_tasks')
        .select('id')
        .eq('user_id', member.userId)
        .in('id', v.task.dependsOn),
    ).length === v.task.dependsOn.length ||
      (() => {
        throw createError({
          statusCode: 400,
          statusMessage: 'Choose your own existing dependencies.',
        })
      })()
  return taskFromRow(
    workspaceResult(
      await db
        .from('dashboard_tasks')
        .insert({
          ...taskToRow(v.task),
          user_id: member.userId,
          pursuit_id: v.pursuitId || null,
          activity_id: v.activityId || null,
          opportunity_id: v.opportunityId || null,
          milestone_key: v.milestoneKey || null,
        })
        .select()
        .single(),
    ),
  )
})
