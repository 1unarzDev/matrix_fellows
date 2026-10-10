import { requireWorkspaceMember } from '../../../utils/workspace-auth'
import { ensureMemberResearchProfile, researchProfilePacket } from '../../../utils/research-profile'
import { workspaceStorage, workspaceResult } from '../../../utils/workspace-storage'
export default defineEventHandler(async event => {
  const member = await requireWorkspaceMember(event)
  const { id } = await ensureMemberResearchProfile(event, member)
  const db = workspaceStorage(event)
  const [packet, artifacts, claims] = await Promise.all([
    researchProfilePacket(event, id, member.userId),
    db.from('research_artifacts').select('id,canonical_url,kind,relationship,contribution,state,summary,error_code,project_id').eq('profile_id', id).eq('owner_id', member.userId).order('created_at', { ascending: false }).limit(50),
    db.from('research_claims').select('id,statement,predicate,origin,support_state,adoption,snapshot_id,sharing_scope,withdrawn_at').eq('profile_id', id).eq('owner_id', member.userId).order('created_at', { ascending: false }).limit(100),
  ])
  return { profile: packet, artifacts: workspaceResult(artifacts), claims: workspaceResult(claims), providerStatus: 'Local metadata; model enrichment needs reviewed eligible source excerpts.' }
})
