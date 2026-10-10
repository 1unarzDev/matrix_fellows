import { requireWorkspaceMember } from '../../../utils/workspace-auth'
import { workspaceStorage, workspaceResult } from '../../../utils/workspace-storage'
import { referenceFromRow } from '../../../utils/dashboard-opportunity-storage'
export default defineEventHandler(async (event) => {
  const member = await requireWorkspaceMember(event)
  return {
    references: workspaceResult(
      await workspaceStorage(event)
        .from('dashboard_opportunity_references')
        .select('*')
        .eq('user_id', member.userId)
        .order('created_at', { ascending: false }),
    ).map(referenceFromRow),
  }
})
