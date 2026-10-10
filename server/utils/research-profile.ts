import { createError, type H3Event } from 'h3'
import type { WorkspaceMember } from './workspace-auth'
import { hashText, requireWorkspaceOfficer } from './workspace-auth'
import { workspaceStorage, workspaceResult } from './workspace-storage'
import { stableResearchTopics } from '#shared/utils/research-topics'
import type { ResearchProfilePacket } from '#shared/types/research'

/** Identity is supplied only by the verified authentication path, never request data. */
export async function ensureMemberResearchProfile(event: H3Event, member: WorkspaceMember) {
  const id = workspaceResult(await workspaceStorage(event).rpc('ensure_member_research_profile', {
    p_user_id: member.userId, p_email: member.email,
  })) as string
  return { id }
}
export async function researchProfilePacket(event: H3Event, profileId: string, ownerId?: string): Promise<ResearchProfilePacket> {
  const db = workspaceStorage(event)
  let query = db.from('outreach_profiles').select('id,subject_user_id,full_name,interests,goals,availability,location,consent_to_share').eq('id', profileId)
  if (ownerId) query = query.eq('subject_user_id', ownerId)
  else query = query.eq('consent_to_share', true).not('subject_user_id', 'is', null)
  const profile = workspaceResult(await query.maybeSingle())
  if (!profile) throw createError({ statusCode: 404, statusMessage: 'A shared research profile is unavailable.' })
  let claimsQuery = db.from('research_claims').select('id,statement,origin,support_state,snapshot_id').eq('profile_id', profileId).eq('adoption', 'accepted').is('withdrawn_at', null).order('created_at').limit(100)
  if (!ownerId) claimsQuery = claimsQuery.eq('sharing_scope', 'officer')
  const claims = workspaceResult(await claimsQuery)
  return { schemaVersion: 'research-context-v1', profileId, subjectUserId: profile.subject_user_id, displayName: profile.full_name, declaredInterests: profile.interests, topicIds: stableResearchTopics(profile.interests), goals: profile.goals, availability: profile.availability, location: profile.location, claims: claims.map(c => ({ id: c.id, statement: c.statement, origin: c.origin, support: c.support_state, snapshotId: c.snapshot_id })), providerEligibility: 'local-only' }
}
/** Caller must first requireWorkspaceOfficer. A packet is local private context, never unpaid model input. */
export async function shareableResearchProfile(event: H3Event, profileId: string) {
  await requireWorkspaceOfficer(event)
  const packet = await researchProfilePacket(event, profileId)
  const inputHash = await hashText(JSON.stringify(packet))
  const db = workspaceStorage(event)
  const existing = workspaceResult(await db.from('research_profile_versions').select('id').eq('profile_id', profileId).eq('projection_kind', 'officer').eq('input_hash', inputHash).maybeSingle())
  const versionId = existing?.id || workspaceResult(await db.from('research_profile_versions').insert({ profile_id: profileId, owner_id: packet.subjectUserId, projection_kind: 'officer', input_hash: inputHash, claim_ids: packet.claims.map(c => c.id), packet }).select('id').single()).id
  return { ...packet, versionId }
}
