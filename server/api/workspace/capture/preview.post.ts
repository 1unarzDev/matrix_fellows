import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../../utils/workspace-auth'
import { workspaceBody } from '../../../utils/workspace-storage'
import { previewCapturedOpportunity } from '../../../utils/dashboard-opportunity-storage'
import { captureInputSchema } from '#shared/utils/dashboard-opportunities'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  await requireWorkspaceMember(event)
  const input = await workspaceBody(event, captureInputSchema)
  return previewCapturedOpportunity(event, input.url)
})
