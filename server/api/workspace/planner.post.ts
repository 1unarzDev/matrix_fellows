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
import { shareableResearchProfile } from '../../utils/research-profile'
import { assertWorkspaceTarget } from '../../utils/workspace-access'

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
    // A public artifact title never proves authorship. Only accepted, attributable
    // contribution statements enter the work-sample projection.
    const contributions = packet.claims.length
      ? workspaceResult(
          await db
            .from('research_claims')
            .select('id,statement,origin,support_state,artifact_id')
            .in(
              'id',
              packet.claims.map((c) => c.id),
            )
            .eq('predicate', 'contribution')
            .in('support_state', ['supported', 'self_reported']),
        )
      : []
    const artifacts = contributions.length
      ? workspaceResult(
          await db
            .from('research_artifacts')
            .select('id,canonical_url,summary')
            .in('id', contributions.map((c) => c.artifact_id).filter(Boolean)),
        )
      : []
    const workSamples = contributions.flatMap((c) => {
      const artifact = artifacts.find((a) => a.id === c.artifact_id)
      return artifact
        ? [
            {
              title: artifact.summary || 'Shared research work',
              url: artifact.canonical_url,
              contribution: c.statement,
            },
          ]
        : []
    })
    profile = {
      id: packet.profileId,
      fullName: packet.displayName,
      interests: packet.declaredInterests,
      goals: packet.goals,
      availability: packet.availability,
      location: packet.location,
      consentToShare: true,
      skills: [],
      workSamples,
      education: '',
      experience: '',
      notes: '',
    } as unknown as OutreachProfile
  }
  const plan = buildContributionPlan(target, profile)
  const draft = tailorOutreachDraft({
    plan,
    target,
    society,
    profile,
    senderName: member.email,
    kind: input.kind,
    style: input.style,
  })
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
            profileVersionId,
            memberClaims: consumedClaims,
            targetVersion: target.updatedAt,
            societyVersion: society.revision || society.updatedAt,
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
