import { z } from 'zod'
import { requireWorkspaceOfficer, assertWorkspaceOrigin } from '../../utils/workspace-auth'
import { workspaceStorage, workspaceResult, workspaceBody } from '../../utils/workspace-storage'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const officer = await requireWorkspaceOfficer(event)
  const body = await workspaceBody(
    event,
    z
      .object({
        targetId: z.string().uuid(),
        email: z.string().email().max(254),
        action: z.enum(['assign', 'revoke']),
      })
      .strict(),
  )
  const db = workspaceStorage(event)
  const member = workspaceResult(
    await db
      .from('outreach_members')
      .select('user_id,enabled')
      .eq('email', body.email.trim().toLowerCase())
      .maybeSingle(),
  )
  if (!member)
    throw createError({
      statusCode: 404,
      statusMessage: 'Ask this member to verify their email and sign in first.',
    })
  if (body.action === 'assign') {
    const { data: identity, error: identityError } = await db.auth.admin.getUserById(member.user_id)
    if (
      identityError ||
      !identity.user?.email_confirmed_at ||
      identity.user.email?.toLowerCase() !== body.email.trim().toLowerCase()
    )
      throw createError({
        statusCode: 403,
        statusMessage: 'A current verified member identity is required.',
      })
    if (!member.enabled)
      throw createError({ statusCode: 403, statusMessage: 'This account is disabled.' })
    const target = workspaceResult(
      await db.from('outreach_targets').select('status').eq('id', body.targetId).maybeSingle(),
    )
    if (target?.status !== 'ready')
      throw createError({
        statusCode: 409,
        statusMessage: 'Review and mark this contact ready before assigning it.',
      })
    workspaceResult(
      await db
        .from('outreach_assignments')
        .upsert(
          { target_id: body.targetId, user_id: member.user_id, assigned_by: officer.userId },
          { onConflict: 'target_id,user_id' },
        ),
    )
  } else
    workspaceResult(
      await db
        .from('outreach_assignments')
        .delete()
        .eq('target_id', body.targetId)
        .eq('user_id', member.user_id),
    )
  return { ok: true }
})
