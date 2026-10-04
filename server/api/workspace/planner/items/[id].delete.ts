import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../../../utils/workspace-auth'
import { workspaceStorage, workspaceResult, workspaceId } from '../../../../utils/workspace-storage'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceMember(event)
  workspaceResult(
    await workspaceStorage(event)
      .from('outreach_planner_items')
      .delete()
      .eq('id', workspaceId(event))
      .eq('user_id', member.userId),
  )
  return { deleted: true }
})
