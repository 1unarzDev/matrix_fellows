import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../../utils/workspace-auth'
import { workspaceStorage, workspaceResult, workspaceId } from '../../../utils/workspace-storage'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceMember(event)
  workspaceResult(
    await workspaceStorage(event)
      .from('outreach_profiles')
      .delete()
      .eq('id', workspaceId(event))
      .eq('created_by', member.userId),
  )
  return { deleted: true }
})
