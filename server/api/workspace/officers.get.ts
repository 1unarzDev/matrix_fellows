import { requireWorkspaceOfficer } from '../../utils/workspace-auth'
import { workspaceStorage, workspaceResult } from '../../utils/workspace-storage'
export default defineEventHandler(async event => {
 await requireWorkspaceOfficer(event)
 const rows = workspaceResult(await workspaceStorage(event).from('outreach_members').select('user_id,email,role').eq('enabled',true).in('role',['officer','admin']).order('email').limit(100))
 return { officers: rows.map(row=>({id:row.user_id,label:row.email})) }
})
