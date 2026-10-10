import { z } from 'zod'
import { assertWorkspaceOrigin, requireWorkspaceOfficer, hashText } from '../../utils/workspace-auth'
import { shareableResearchProfile, draftProfileProjection } from '../../utils/research-profile'
import { workspaceStorage, workspaceBody, workspaceResult, targetFromRow } from '../../utils/workspace-storage'
import { buildContributionPlan } from '#shared/utils/research-plan'
import { explainResearchFit } from '#shared/utils/research-fit'
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
  const aliases=workspaceResult(await db.from('outreach_relationship_aliases').select('identity_key,relationship_id').limit(10000))
  const relationships=workspaceResult(await db.from('outreach_relationships').select('id,owner_id,stage,suppressed').limit(10000))
  const related=(row:any)=>relationships.filter(r=>aliases.some(a=>a.relationship_id===r.id && [row.canonical_url,row.dossier?.labUrl,row.contact_email?.toLowerCase()].includes(a.identity_key)))
  const targets = workspaceResult(await query).filter(t=>!related(t).some(r=>r.suppressed || aliases.some(a=>a.relationship_id===r.id && suppressions.some(s=>s.canonical_url===a.identity_key)))).filter(t=>!suppressions.some(s=>s.canonical_url===t.canonical_url || s.canonical_url===t.dossier?.labUrl))
  const topics = new Set(packet?.topicIds || [])
  const subjectId = packet?.subjectUserId || actor.userId
  const preference = workspaceResult(await db.from('research_preferences').select('lens,reachable_locations').eq('user_id',subjectId).maybeSingle())
  const preferences = {lens:preference?.lens || 'nearby',reachableLocations:preference?.reachable_locations || ['Arlington'],interests:packet?.declaredInterests || []}
  const ranked = targets.map(row=>({target:targetFromRow(row),fit:explainResearchFit(targetFromRow(row),preferences),overlap:stableResearchTopics(row.discipline || []).filter(t=>topics.has(t)).length}))
    .filter(item=>item.fit.access!=='outside-preference')
    .sort((a,b)=>b.overlap-a.overlap || Number(a.fit.access==='unconfirmed')-Number(b.fit.access==='unconfirmed')).slice(0,5)
  const items=[]
  for(const {target,overlap,fit} of ranked){
    const plan=buildContributionPlan(target,profile,input.contributionOption)
    const inputVersions={target:target.updatedAt,profile:packet?.versionId || null,project:input.projectId || null,option:input.contributionOption ?? null,preferences,schema:'match-v1'}
    const workKey=await hashText(JSON.stringify({targetId:target.id,profileId:packet?.profileId || null,...inputVersions}))
    const match=workspaceResult(await db.from('outreach_matches').upsert({target_id:target.id,profile_id:packet?.profileId || null,created_by:actor.userId,input_versions:inputVersions,plan,work_key:workKey},{onConflict:'created_by,work_key'}).select('id').single())
    items.push({coordination:related(targets.find(t=>t.id===target.id)).map(r=>({id:r.id,ownerId:r.owner_id,stage:r.stage})),historyStatus:aliases.length===10000 || relationships.length===10000?'partial':'resolved-aliases-only',id:match.id,targetId:target.id,targetName:target.name,profileId:packet?.profileId || null,projectId:input.projectId || null,plan,access:fit,topicOverlap:overlap?'Declared topics overlap; contribution still needs separate evidence.':'Specific technical overlap needs review.'})
  }
  return {items,notice:'Preliminary matches require officer review of contact, access and evidence before drafting. No acceptance probability is inferred.'}
})
