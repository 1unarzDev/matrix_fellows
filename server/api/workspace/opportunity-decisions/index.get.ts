import { requireWorkspaceMember } from '../../../utils/workspace-auth'
import { workspaceStorage, workspaceResult } from '../../../utils/workspace-storage'
import { decisionFromRow } from '../../../utils/dashboard-opportunity-storage'
export default defineEventHandler(async (event) => {
  const member = await requireWorkspaceMember(event)
  return {
    decisions: workspaceResult(
      await workspaceStorage(event)
        .from('dashboard_opportunity_decisions')
        .select('*')
        .eq('user_id', member.userId),
    ).map(decisionFromRow),
  }
})
