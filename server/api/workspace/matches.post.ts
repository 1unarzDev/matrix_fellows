import { z } from 'zod'
import { assertWorkspaceOrigin, requireWorkspaceOfficer, hashText } from '../../utils/workspace-auth'
import { shareableResearchProfile, draftProfileProjection } from '../../utils/research-profile'
import { workspaceStorage, workspaceBody, workspaceResult, targetFromRow } from '../../utils/workspace-storage'
import { buildContributionPlan } from '#shared/utils/research-plan'
import { stableResearchTopics } from '#shared/utils/research-topics'

/** Pre-review relational matching; private profile data stays in the application. */
export default defineEventHandler(async event => {
  assertWorkspaceOrigin(event)
  const actor = await requireWorkspaceOfficer(event)
  const input = await workspaceBody(event, z.object({profileId:z.uuid().optional(),projectId:z.uuid().optional(),targetId:z.uuid().optional(),contributionOption:z.number().int().min(0).max(10).optional()}).strict())
  const db = workspaceStorage(event)
  const packet = input.profileId ? await shareableResearchProfile(event,input.profileId) : null
  const profile = packet ? await draftProfileProjection(event,packet,input.projectId) : undefined
  let query = db.from('outreach_targets').select('*').in('status',['needs_review','ready','contacted']).order('updated_at',{ascending:false}).limit(100)
  if (input.targetId) query=query.eq('id',input.targetId)
  const suppressions = workspaceResult(await db.from('outreach_suppressions').select('canonical_url'))
  const targets = workspaceResult(await query).filter(t=>!suppressions.some(s=>s.canonical_url===t.canonical_url || s.canonical_url===t.dossier?.labUrl))
  const topics = new Set(packet?.topicIds || [])
  const ranked = targets.map(row=>({target:targetFromRow(row),overlap:stableResearchTopics(row.discipline || []).filter(t=>topics.has(t)).length}))
    .sort((a,b)=>b.overlap-a.overlap || (a.target.mode==='remote'?1:0)-(b.target.mode==='remote'?1:0)).slice(0,5)
  const items=[]
  for(const {target,overlap} of ranked){
    const plan=buildContributionPlan(target,profile,input.contributionOption)
    const inputVersions={target:target.updatedAt,profile:packet?.versionId || null,project:input.projectId || null,option:input.contributionOption ?? null,schema:'match-v1'}
    const workKey=await hashText(JSON.stringify({targetId:target.id,profileId:packet?.profileId || null,...inputVersions}))
    const match=workspaceResult(await db.from('outreach_matches').upsert({target_id:target.id,profile_id:packet?.profileId || null,created_by:actor.userId,input_versions:inputVersions,plan,work_key:workKey},{onConflict:'created_by,work_key'}).select('id').single())
    items.push({id:match.id,targetId:target.id,targetName:target.name,profileId:packet?.profileId || null,projectId:input.projectId || null,plan,topicOverlap:overlap?'Declared topics overlap; contribution still needs separate evidence.':'Specific technical overlap needs review.'})
  }
  return {items,notice:'Preliminary matches require officer review of contact, access and evidence before drafting. No acceptance probability is inferred.'}
})
