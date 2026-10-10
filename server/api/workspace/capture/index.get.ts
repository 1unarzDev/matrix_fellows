import { requireWorkspaceMember } from '../../../utils/workspace-auth'
import { workspaceStorage, workspaceResult } from '../../../utils/workspace-storage'
import { personalOpportunityFromRow, referenceFromRow } from '../../../utils/dashboard-opportunity-storage'
export default defineEventHandler(async (event) => {
  const member = await requireWorkspaceMember(event)
  const db = workspaceStorage(event)
  const references = workspaceResult(
      await db
        .from('dashboard_opportunity_references')
        .select('*')
        .eq('user_id', member.userId)
        .order('created_at', { ascending: false }),
    ).map(referenceFromRow)
  const personal = workspaceResult(await db.from('dashboard_personal_opportunities').select('id,intake_id,url,data').eq('user_id', member.userId).order('created_at', { ascending: false }))
  return { references, personal: personal.map(personalOpportunityFromRow) }
})
