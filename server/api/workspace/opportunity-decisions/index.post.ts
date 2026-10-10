import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../../utils/workspace-auth'
import { workspaceStorage, workspaceBody, workspaceResult } from '../../../utils/workspace-storage'
import { decisionFromRow } from '../../../utils/dashboard-opportunity-storage'
import { opportunityDecisionSchema } from '#shared/utils/dashboard-opportunities'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceMember(event)
  const input = await workspaceBody(event, opportunityDecisionSchema)
  const result = await workspaceStorage(event).rpc('dashboard_decide_opportunity', {
    p_user_id: member.userId,
    p_opportunity_id: input.opportunityId,
    p_decision: input.decision,
    p_reason: input.reason,
    p_expected_version: input.expectedVersion,
  })
  if (result.error?.message.includes('Decision changed elsewhere'))
    throw createError({
      statusCode: 409,
      statusMessage: 'This decision changed elsewhere. Reload it before changing it.',
    })
  if (result.error?.message.includes('Published opportunity required'))
    throw createError({ statusCode: 403, statusMessage: 'Choose a published opportunity.' })
  return decisionFromRow(workspaceResult(result))
})
