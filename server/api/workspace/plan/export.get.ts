import { requireWorkspaceMember } from '../../../utils/workspace-auth'
import { workspaceStorage } from '../../../utils/workspace-storage'
import { readDashboardPlan } from '../../../utils/dashboard-storage'
import { planCalendar } from '#shared/utils/dashboard-planning'
export default defineEventHandler(async (event) => {
  const member = await requireWorkspaceMember(event)
  setHeader(event, 'Content-Type', 'text/calendar; charset=utf-8')
  setHeader(event, 'Content-Disposition', 'attachment; filename="matrix-fellows-plan.ics"')
  return planCalendar(await readDashboardPlan(workspaceStorage(event), member.userId))
})
