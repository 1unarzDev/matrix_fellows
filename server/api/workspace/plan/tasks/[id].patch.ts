import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../../../utils/workspace-auth'
import {
  workspaceStorage,
  workspaceBody,
  workspaceId,
  workspaceResult,
} from '../../../../utils/workspace-storage'
import { taskFromRow, planVersionUpdate } from '../../../../utils/dashboard-storage'
import { taskPatchSchema, taskToRow } from '#shared/utils/dashboard-planning'
import { assertWorkspaceOpportunity } from '../../../../utils/workspace-access'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceMember(event)
  const v = await workspaceBody(event, taskPatchSchema)
  const id = workspaceId(event),
    db = workspaceStorage(event)
  const connections: Record<string, unknown> = {}
  if (v.opportunityId !== undefined) {
    await assertWorkspaceOpportunity(event, v.opportunityId)
    connections.opportunity_id = v.opportunityId
    connections.pursuit_id = v.pursuitId
    connections.activity_id = v.activityId
    connections.milestone_key = v.milestoneKey || null
  } else if (v.milestoneKey !== undefined) connections.milestone_key = v.milestoneKey
  const dependencies = workspaceResult(
    await db.from('dashboard_tasks').select('id,depends_on').eq('user_id', member.userId),
  )
  const graph = new Map(dependencies.map((t) => [t.id, t.depends_on as string[]]))
  graph.set(id, v.task.dependsOn)
  const visits = new Set<string>(),
    stack = new Set<string>()
  const cycle = (key: string): boolean => {
    if (stack.has(key)) return true
    if (visits.has(key)) return false
    visits.add(key)
    stack.add(key)
    for (const dep of graph.get(key) || []) if (cycle(dep)) return true
    stack.delete(key)
    return false
  }
  if (v.task.dependsOn.some((d) => !graph.has(d)) || cycle(id))
    throw createError({
      statusCode: 400,
      statusMessage: 'Choose existing dependencies without a cycle.',
    })
  return taskFromRow(
    await planVersionUpdate(db, 'dashboard_tasks', member.userId, id, v.expectedVersion, {
      ...taskToRow(v.task),
      ...connections,
    }),
  )
})
