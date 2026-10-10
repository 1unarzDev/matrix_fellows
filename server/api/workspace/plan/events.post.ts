import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../../utils/workspace-auth'
import { workspaceStorage, workspaceBody, workspaceResult } from '../../../utils/workspace-storage'
import { eventFromRow } from '../../../utils/dashboard-storage'
import { eventInputSchema } from '#shared/utils/dashboard-planning'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceMember(event)
  const v = await workspaceBody(event, eventInputSchema)
  return eventFromRow(
    workspaceResult(
      await workspaceStorage(event)
        .from('dashboard_events')
        .insert({
          user_id: member.userId,
          title: v.title,
          type: v.type,
          starts_at: v.start,
          ends_at: v.end,
          task_id: null,
        })
        .select()
        .single(),
    ),
  )
})
