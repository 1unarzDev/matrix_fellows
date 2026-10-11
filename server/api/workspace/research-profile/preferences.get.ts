import { requireWorkspaceMember } from '../../../utils/workspace-auth'
import { workspaceStorage, workspaceResult } from '../../../utils/workspace-storage'
export default defineEventHandler(async event => {
 const actor = await requireWorkspaceMember(event)
 const row = workspaceResult(await workspaceStorage(event).from('research_preferences').select('lens,reachable_locations').eq('user_id',actor.userId).maybeSingle())
 return { lens: row?.lens || 'nearby', reachableLocations: row?.reachable_locations || ['Arlington'] }
})
