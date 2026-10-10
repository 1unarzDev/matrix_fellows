import { z } from 'zod'
import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../../utils/workspace-auth'
import { workspaceStorage, workspaceResult, workspaceBody } from '../../../utils/workspace-storage'
export default defineEventHandler(async event => {
 assertWorkspaceOrigin(event)
 const actor = await requireWorkspaceMember(event)
 const input = await workspaceBody(event,z.object({lens:z.enum(['nearby','remote','travel']),reachableLocations:z.array(z.string().trim().min(1).max(100)).max(20)}).strict())
 workspaceResult(await workspaceStorage(event).from('research_preferences').upsert({user_id:actor.userId,lens:input.lens,reachable_locations:[...new Set(input.reachableLocations)],updated_at:new Date().toISOString()}))
 return input
})
