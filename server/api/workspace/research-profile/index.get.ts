import { requireWorkspaceMember } from '../../../utils/workspace-auth'
import { ensureMemberResearchProfile, researchProfilePacket } from '../../../utils/research-profile'
import { processResearchArtifact } from '../../../utils/research-artifact-storage'
import { workspaceStorage, workspaceResult } from '../../../utils/workspace-storage'
export default defineEventHandler(async event => {
  const member = await requireWorkspaceMember(event)
  const { id } = await ensureMemberResearchProfile(event, member)
  const db = workspaceStorage(event)
  // Resume at most one interrupted local stage per view; the database fences competing requests.
  const recoverable = workspaceResult(await db.from('research_artifacts').select('id').eq('owner_id', member.userId).or(`state.eq.pending,and(state.eq.processing,lease_expires_at.lt.${new Date().toISOString()})`).order('created_at').limit(1))
  if (recoverable[0]) {
    const work = processResearchArtifact(event, recoverable[0].id, member.userId)
    const runtime = event.context.cloudflare as { context?: { waitUntil(promise: Promise<unknown>): void } } | undefined
    if (runtime?.context?.waitUntil) runtime.context.waitUntil(work); else await work
  }
  const [packet, artifacts, claims] = await Promise.all([
    researchProfilePacket(event, id, member.userId),
    db.from('research_artifacts').select('id,canonical_url,kind,relationship,contribution,state,summary,error_code,project_id').eq('profile_id', id).eq('owner_id', member.userId).order('created_at', { ascending: false }).limit(50),
    db.from('research_claims').select('id,statement,predicate,origin,support_state,adoption,snapshot_id,sharing_scope,withdrawn_at').eq('profile_id', id).eq('owner_id', member.userId).order('created_at', { ascending: false }).limit(100),
  ])
  return { profile: packet, artifacts: workspaceResult(artifacts), claims: workspaceResult(claims), providerStatus: 'Local metadata; model enrichment needs reviewed eligible source excerpts.' }
})
