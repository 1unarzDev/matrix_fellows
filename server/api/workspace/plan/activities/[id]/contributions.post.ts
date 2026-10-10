import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../../../../utils/workspace-auth'
import {
  workspaceStorage,
  workspaceBody,
  workspaceResult,
  workspaceId,
} from '../../../../../utils/workspace-storage'
import { activityFromRow, planVersionUpdate } from '../../../../../utils/dashboard-storage'
import { contributionSchema } from '#shared/utils/dashboard-planning'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceMember(event)
  const input = await workspaceBody(event, contributionSchema)
  const db = workspaceStorage(event),
    id = workspaceId(event)
  const row = workspaceResult(
    await db
      .from('dashboard_activities')
      .select('contributions')
      .eq('id', id)
      .eq('user_id', member.userId)
      .single(),
  )
  const contribution = {
    id: crypto.randomUUID(),
    description: input.description,
    learned: input.learned,
    artifactUrl: input.artifactUrl,
    createdAt: new Date().toISOString(),
  }
  return activityFromRow(
    await planVersionUpdate(db, 'dashboard_activities', member.userId, id, input.expectedVersion, {
      contributions: [...row.contributions, contribution],
    }),
  )
})
