import { loadOfficerVoice } from '../../utils/officer-voice'
import { z } from 'zod'
import { requireWorkspaceOfficer, assertWorkspaceOrigin } from '../../utils/workspace-auth'
import {
  workspaceStorage,
  workspaceResult,
  workspaceBody,
  targetFromRow,
  societyFromRow,
  proposalFromRow,
} from '../../utils/workspace-storage'
import type { OutreachProfile } from '#shared/types/outreach'
import { proposalStyles, tailorOutreachDraft } from '#shared/utils/outreach-tailoring'
import { buildContributionPlan } from '#shared/utils/research-plan'
import { shareableResearchProfile, draftProfileProjection } from '../../utils/research-profile'
import { assertWorkspaceTarget } from '../../utils/workspace-access'

async function loadSocietySignals(db: ReturnType<typeof workspaceStorage>) {
  const result = await db
    .from('outreach_society_context_entries')
    .select('id,kind,title,summary,organization,chapter,connection_date,project_url,status,confidence,updated_at')
    .eq('society_id', true)
    .in('status', ['introduced', 'connected', 'active'])
    .order('updated_at', { ascending: false })
    .limit(24)
  // Keep a rollout with the additive migration pending usable. Once the
  // migration exists this path is replaced by the real society context.
  if (result.error && /outreach_society_context_entries|relation .* does not exist/i.test(String(result.error.message || result.error)))
    return []
  return workspaceResult(result)
}

export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceOfficer(event)
  const input = await workspaceBody(
    event,
    z
      .object({
        targetId: z.string().uuid(),
        profileId: z.string().uuid().nullable().optional(),
        kind: z.enum(['society', 'student']),
        relationshipId: z.string().uuid().nullable().optional(),
        messageKind: z.enum(['cold', 'follow_up']).default('cold'),
        matchId: z.uuid().optional(),
        projectId: z.uuid().optional(),
        contributionOption: z.number().int().min(0).max(10).optional(),
        style: z.enum(proposalStyles).default('conversation'),
      })
      .strict(),
  )
  const db = workspaceStorage(event)
  await assertWorkspaceTarget(event, member, input.targetId, input.kind)
  const target = targetFromRow(
    workspaceResult(
      await db.from('outreach_targets').select('*').eq('id', input.targetId).single(),
    ),
  )
  if (
    target.status !== 'ready' &&
    !(input.messageKind === 'follow_up' && target.status === 'contacted')
  )
    throw createError({
      statusCode: 403,
      statusMessage: 'Choose a reviewed, ready research connection.',
    })
  if (['rejected', 'deferred'].includes(target.status))
    throw createError({
      statusCode: 409,
      statusMessage: 'Return this candidate to review before drafting.',
    })
  if (!target.contactEmail)
    throw createError({
      statusCode: 422,
      statusMessage: 'Verify a public contact email before drafting a proposal.',
    })
  const society = societyFromRow(
    workspaceResult(await db.from('outreach_society').select('*').eq('id', true).single()),
  )
  const societySignals = await loadSocietySignals(db)
  let profile: OutreachProfile | undefined
  let profileVersionId: string | null = null
  let consumedClaims: { id: string; statement: string; origin: string; support: string }[] = []
  if (input.kind === 'student') {
    if (!input.profileId)
      throw createError({
        statusCode: 422,
        statusMessage: 'Choose a member profile for an individual research proposal.',
      })
    const packet = await shareableResearchProfile(event, input.profileId)
    profileVersionId = packet.versionId
    consumedClaims = packet.claims
    profile = await draftProfileProjection(event, packet, input.projectId)

  }
  let plan = buildContributionPlan(target, profile, input.contributionOption)
  if (input.matchId) {
    const match = workspaceResult(await db.from('outreach_matches').select('*').eq('id',input.matchId).eq('created_by',member.userId).maybeSingle())
    if (!match || match.target_id !== target.id || match.profile_id !== (input.kind === 'student' ? input.profileId : null) || match.input_versions?.target !== target.updatedAt || match.input_versions?.profile !== profileVersionId || (match.input_versions?.project || null) !== (input.projectId || null))
      throw createError({statusCode:409,statusMessage:'Match context changed. Review the connection again.'})
    plan = match.plan
  }
  const voice = await loadOfficerVoice(event, member.userId)
  const draft = tailorOutreachDraft({
    voice:voice.preferences,
    plan,
    target,
    society,
    profile,
    senderName: member.email,
    kind: input.kind,
    style: input.style,
  })
  consumedClaims = consumedClaims.filter(claim => draft.body.includes(claim.statement))
  const proposal = proposalFromRow(
    workspaceResult(
      await db
        .from('outreach_proposals')
        .insert({
          target_id: target.id,
          profile_id: input.kind === 'student' ? input.profileId || null : null,
          kind: input.kind,
          recipient: target.contactEmail,
          subject: draft.subject,
          body: draft.body,
          created_by: member.userId,
          current_owner_id: member.userId,
          relationship_id: input.relationshipId || null,
          message_kind: input.messageKind,
          profile_version_id: profileVersionId,
          evidence_claim_ids: consumedClaims.map((c) => c.id),
          proposal_plan: {
            ...plan,
            contextVersion: 'proposal-context-v1',
            matchId: input.matchId || null,
            projectId: input.projectId || null,
            profileVersionId,
            memberClaims: consumedClaims,
            targetVersion: target.updatedAt,
            societyVersion: society.revision || society.updatedAt,
            societySignals,
            voice:voice.preferences,
            societyContext: {name:society.name,accomplishments:society.accomplishments.filter(a=>draft.body.includes(a.description) && draft.body.includes(a.url || ''))},
            sentenceSupports: draft.body
              .split(/\n\n/)
              .map((sentence) => ({
                sentence,
                claimIds: consumedClaims
                  .filter((c) => sentence.includes(c.statement))
                  .map((c) => c.id),
                sources: plan.evidence.filter((e) => sentence.includes(e.quote)),
                classification:
                  sentence.includes('shared an interest') ||
                  sentence.includes('describe their contribution')
                    ? 'self-reported'
                    : sentence.includes('possible starting point') || sentence.endsWith('?')
                      ? 'proposal'
                      : plan.evidence.some((e) => sentence.includes(e.quote))
                        ? 'source-supported'
                        : 'officer-identity-or-courtesy',
              })),
            reviewIssues: plan.unknowns,
          },
        })
        .select()
        .single(),
    ),
  )
  return {
    proposal,
    notices: draft.notices,
  }
})
