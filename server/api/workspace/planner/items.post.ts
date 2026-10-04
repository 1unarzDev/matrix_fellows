import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../../utils/workspace-auth'
import { workspaceStorage, workspaceBody, workspaceResult } from '../../../utils/workspace-storage'
import { outreachPlannerSchema } from '#shared/utils/outreach'
import { assertWorkspaceTarget, assertWorkspaceOpportunity } from '../../../utils/workspace-access'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceMember(event)
  const value = await workspaceBody(event, outreachPlannerSchema)
  const db = workspaceStorage(event)
  if (value.targetId) await assertWorkspaceTarget(event, member, value.targetId)
  await assertWorkspaceOpportunity(event, value.opportunityId)
  if (value.targetId && member.role === 'member') {
    const target = workspaceResult(
      await db.from('outreach_targets').select('status').eq('id', value.targetId).single(),
    )
    if (target.status !== 'ready')
      throw createError({ statusCode: 403, statusMessage: 'Choose a reviewed connection.' })
  }
  if (value.profileId)
    workspaceResult(
      await db
        .from('outreach_profiles')
        .select('id')
        .eq('id', value.profileId)
        .eq('created_by', member.userId)
        .single(),
    )
  return workspaceResult(
    await db
      .from('outreach_planner_items')
      .insert({
        user_id: member.userId,
        title: value.title,
        target_id: value.targetId,
        profile_id: value.profileId,
        opportunity_id: value.opportunityId,
        due_at: value.dueAt,
        notes: value.notes,
        completed: value.completed,
      })
      .select()
      .single(),
  )
})
