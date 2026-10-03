import { z } from 'zod'
import { requireWorkspaceOfficer, assertWorkspaceOrigin } from '../../utils/workspace-auth'
import {
  workspaceStorage,
  workspaceResult,
  workspaceBody,
  profileFromRow,
  targetFromRow,
  societyFromRow,
  proposalFromRow,
} from '../../utils/workspace-storage'
import type { OutreachProfile } from '#shared/types/outreach'
import { proposalStyles, tailorOutreachDraft } from '#shared/utils/outreach-tailoring'

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
        style: z.enum(proposalStyles).default('conversation'),
      })
      .strict(),
  )
  const db = workspaceStorage(event)
  const target = targetFromRow(
    workspaceResult(
      await db.from('outreach_targets').select('*').eq('id', input.targetId).single(),
    ),
  )
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
  if (input.kind === 'student') {
    if (!input.profileId)
      throw createError({
        statusCode: 422,
        statusMessage: 'Choose a student profile for an individual research proposal.',
      })
    profile = profileFromRow(
      workspaceResult(
        await db
          .from('outreach_profiles')
          .select('*')
          .eq('id', input.profileId)
          .eq('created_by', member.userId)
          .single(),
      ),
    )
    if (!profile.consentToShare)
      throw createError({
        statusCode: 422,
        statusMessage: 'The student must consent before their profile can be included in outreach.',
      })
    const sample = profile.workSamples[0]
    if (!sample)
      throw createError({
        statusCode: 422,
        statusMessage: 'Add a relevant work sample and contribution statement before drafting.',
      })
  }
  const draft = tailorOutreachDraft({
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
