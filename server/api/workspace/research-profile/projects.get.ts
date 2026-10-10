import { z } from 'zod'
import { shareableResearchProfile } from '../../../utils/research-profile'
import { workspaceStorage, workspaceResult } from '../../../utils/workspace-storage'
export default defineEventHandler(async event => {
 const input=z.object({profileId:z.uuid()}).safeParse(getQuery(event))
 if(!input.success) throw createError({statusCode:400,statusMessage:'Choose a shared profile.'})
 const packet=await shareableResearchProfile(event,input.data.profileId)
 const db=workspaceStorage(event)
 const claims=packet.claims.length?workspaceResult(await db.from('research_claims').select('project_id').in('id',packet.claims.map(c=>c.id)).eq('predicate','contribution')):[]
 const ids=[...new Set(claims.flatMap(c=>c.project_id?[c.project_id]:[]))]
 return {projects:ids.length?workspaceResult(await db.from('research_projects').select('id,title').in('id',ids)):[]}
})
