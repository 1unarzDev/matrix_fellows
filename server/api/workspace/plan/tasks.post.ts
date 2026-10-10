import { z } from 'zod'
import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../../utils/workspace-auth'
import { workspaceStorage, workspaceBody, workspaceResult } from '../../../utils/workspace-storage'
import { taskFromRow } from '../../../utils/dashboard-storage'
import { taskInputSchema, taskToRow } from '#shared/utils/dashboard-planning'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceMember(event)
  const v = await workspaceBody(
    event,
    z
      .object({
        task: taskInputSchema,
        pursuitId: z.string().uuid().nullable().default(null),
        activityId: z.string().uuid().nullable().default(null),
      })
      .strict()
      .refine((v) => !(v.pursuitId && v.activityId), 'Choose one parent.'),
  )
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
          pursuit_id: v.pursuitId,
          activity_id: v.activityId,
        })
        .select()
        .single(),
    ),
  )
})
