import { requireWorkspaceOfficer, assertWorkspaceOrigin } from '../../utils/workspace-auth'
import {
  workspaceStorage,
  workspaceResult,
  workspaceBody,
  societyFromRow,
} from '../../utils/workspace-storage'
import { outreachSocietySchema } from '#shared/utils/outreach'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  await requireWorkspaceOfficer(event)
  const body = await workspaceBody(event, outreachSocietySchema)
  return societyFromRow(
    workspaceResult(
      await workspaceStorage(event)
        .from('outreach_society')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', true)
        .select()
        .single(),
    ),
  )
})
