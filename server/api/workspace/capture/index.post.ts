import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../../utils/workspace-auth'
import { workspaceBody } from '../../../utils/workspace-storage'
import { captureOpportunity } from '../../../utils/dashboard-opportunity-storage'
import { captureInputSchema } from '#shared/utils/dashboard-opportunities'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceMember(event)
  const v = await workspaceBody(event, captureInputSchema)
  return captureOpportunity(event, member.userId, v.url)
})
