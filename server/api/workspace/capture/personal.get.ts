import { requireWorkspaceMember } from '../../../utils/workspace-auth'
import { workspaceStorage, workspaceResult } from '../../../utils/workspace-storage'
import { personalOpportunityFromRow } from '../../../utils/dashboard-opportunity-storage'
export default defineEventHandler(async (event) => {
  const member = await requireWorkspaceMember(event)
  const q = String(getQuery(event).q || '').trim().toLocaleLowerCase('en-US').slice(0, 200)
  const rows = workspaceResult(await workspaceStorage(event).from('dashboard_personal_opportunities').select('id,intake_id,url,data').eq('user_id', member.userId).order('created_at', { ascending: false }).limit(100))
  const items = rows.map(personalOpportunityFromRow).filter((item) => !q || `${item.title} ${item.description} ${item.discipline}`.toLocaleLowerCase('en-US').includes(q))
  return { items, total: items.length, page: 1, pageCount: 1 }
})
