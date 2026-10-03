import { requireWorkspaceOfficer, assertWorkspaceOrigin } from '../../../utils/workspace-auth'
import { workspaceStorage, workspaceResult } from '../../../utils/workspace-storage'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceOfficer(event)
  const id = getRouterParam(event, 'id') || ''
  if (!/^[a-z0-9-]{1,160}$/.test(id))
    throw createError({ statusCode: 400, statusMessage: 'Invalid opportunity.' })
  workspaceResult(
    await workspaceStorage(event)
      .from('outreach_catalog_saves')
      .delete()
      .eq('user_id', member.userId)
      .eq('opportunity_id', id),
  )
  return { saved: false }
})
