import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../../utils/workspace-auth'
import { workspaceStorage, workspaceResult, workspaceId } from '../../../utils/workspace-storage'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceMember(event)
  workspaceResult(
    await workspaceStorage(event)
      .from('outreach_saves')
      .delete()
      .eq('user_id', member.userId)
      .eq('target_id', workspaceId(event)),
  )
  return { saved: false }
})
