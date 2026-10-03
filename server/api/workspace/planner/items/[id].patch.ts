import { requireWorkspaceOfficer, assertWorkspaceOrigin } from '../../../../utils/workspace-auth'
import {
  workspaceStorage,
  workspaceBody,
  workspaceResult,
  workspaceId,
} from '../../../../utils/workspace-storage'
import { outreachPlannerSchema } from '#shared/utils/outreach'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceOfficer(event)
  const value = await workspaceBody(event, outreachPlannerSchema)
  const db = workspaceStorage(event)
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
      .update({
        title: value.title,
        target_id: value.targetId,
        profile_id: value.profileId,
        opportunity_id: value.opportunityId,
        due_at: value.dueAt,
        notes: value.notes,
        completed: value.completed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspaceId(event))
      .eq('user_id', member.userId)
      .select()
      .single(),
  )
})
