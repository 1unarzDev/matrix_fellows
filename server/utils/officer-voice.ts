import { createError, type H3Event } from 'h3'
import type { OutreachMember } from '#shared/types/outreach'
import {
  officerVoiceRecommendations,
  type OfficerVoiceObservation,
} from '#shared/utils/officer-voice'
import { requireWorkspaceOfficer } from './workspace-auth'
import { workspaceStorage, workspaceResult } from './workspace-storage'
async function ownOfficer(event: H3Event, actor: OutreachMember | string) {
  const officer = await requireWorkspaceOfficer(event)
  const id = typeof actor === 'string' ? actor : actor.userId
  if (officer.userId !== id)
    throw createError({
      statusCode: 403,
      statusMessage: 'Voice preferences belong to their officer.',
    })
  return id
}
/** Called after exact approval. Raw body is compared locally and never stored again. */
export async function recordApprovedVoice(
  event: H3Event,
  actor: OutreachMember | string,
  proposalId: string,
  revision: number,
  body: string,
) {
  const id = await ownOfficer(event, actor)
  const db = workspaceStorage(event)
  const proposal = workspaceResult(
    await db
      .from('outreach_proposals')
      .select('body,revision,status,approved_by')
      .eq('id', proposalId)
      .eq('current_owner_id', id)
      .maybeSingle(),
  )
  if (
    !proposal ||
    proposal.body !== body ||
    proposal.revision !== revision ||
    proposal.status !== 'approved' ||
    proposal.approved_by !== id
  )
    throw createError({
      statusCode: 409,
      statusMessage: 'Only the exact approved revision can inform voice suggestions.',
    })
  return workspaceResult(
    await db.rpc('outreach_record_approved_voice', {
      p_actor: id,
      p_proposal: proposalId,
      p_revision: revision,
    }),
  )
}
export async function loadOfficerVoice(event: H3Event, actor: OutreachMember | string) {
  const id = await ownOfficer(event, actor)
  const db = workspaceStorage(event)
  const [samples, settings] = await Promise.all([
    db
      .from('officer_voice_observations')
      .select('proposal_id,revision,origin,word_count,formality,opening,request_style')
      .eq('actor_id', id)
      .order('created_at', { ascending: false })
      .limit(100),
    db.from('officer_voice_settings').select('preferences').eq('actor_id', id).maybeSingle(),
  ])
  return officerVoiceRecommendations(
    workspaceResult(samples) as OfficerVoiceObservation[],
    workspaceResult(settings)?.preferences || {},
  )
}
