import { requireWorkspaceMember } from '../../../utils/workspace-auth'
import { workspaceStorage } from '../../../utils/workspace-storage'
import { readDashboardPlan } from '../../../utils/dashboard-storage'
export default defineEventHandler(async (event) => {
  const member = await requireWorkspaceMember(event)
  return readDashboardPlan(workspaceStorage(event), member.userId)
})
