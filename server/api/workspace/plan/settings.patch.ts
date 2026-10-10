import { z } from 'zod'
import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../../utils/workspace-auth'
import { workspaceStorage, workspaceBody, workspaceResult } from '../../../utils/workspace-storage'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceMember(event)
  const input = await workspaceBody(
    event,
    z.object({ capacityHours: z.number().min(0).max(168).nullable() }).strict(),
  )
  workspaceResult(
    await workspaceStorage(event)
      .from('dashboard_settings')
      .upsert({ user_id: member.userId, capacity_hours: input.capacityHours }),
  )
  return input
})
