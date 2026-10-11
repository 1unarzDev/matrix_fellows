import { z } from 'zod'
import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../../utils/workspace-auth'
import { workspaceStorage, workspaceResult, workspaceBody } from '../../../utils/workspace-storage'
export default defineEventHandler(async event => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceMember(event)
  const body = await workspaceBody(event, z.object({ claimId: z.uuid(), action: z.enum(['edit', 'interest', 'wrong_attribution', 'exclude', 'share', 'accept', 'reject']), statement: z.string().trim().min(1).max(1500).optional() }).strict())
  const db = workspaceStorage(event)
  const claim = workspaceResult(await db.from('research_claims').select('*').eq('id', body.claimId).eq('owner_id', member.userId).is('withdrawn_at', null).maybeSingle())
  if (!claim) throw createError({ statusCode: 404, statusMessage: 'Research claim unavailable.' })
  const update = body.action === 'accept' ? { adoption: 'accepted' } : body.action === 'reject' ? { adoption: 'rejected', withdrawn_at: new Date().toISOString(), sharing_scope: 'private' } : body.action === 'share' ? { sharing_scope: 'officer', adoption: 'accepted' } : body.action === 'exclude' ? { sharing_scope: 'private' } : { withdrawn_at: new Date().toISOString(), adoption: 'superseded', sharing_scope: 'private' }
  workspaceResult(await db.from('research_claims').update(update).eq('id', claim.id).eq('owner_id', member.userId))
  if (body.action === 'edit' || body.action === 'interest') workspaceResult(await db.from('research_claims').insert({ profile_id: claim.profile_id, owner_id: member.userId, project_id: claim.project_id, artifact_id: claim.artifact_id, statement: body.statement || claim.statement, predicate: body.action === 'interest' ? 'interest' : claim.predicate, origin: 'member', support_state: 'self_reported', adoption: 'accepted', supersedes: claim.id, version: claim.version + 1, provenance: { actorId: member.userId, correction: body.action, supersedes: claim.id } }))
  return { ok: true }
})
