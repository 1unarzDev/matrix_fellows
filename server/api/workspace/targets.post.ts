import { requireWorkspaceOfficer, assertWorkspaceOrigin } from '../../utils/workspace-auth'
import {
  workspaceStorage,
  workspaceResult,
  workspaceBody,
  targetFromRow,
  targetToRow,
} from '../../utils/workspace-storage'
import { canonicalizeOutreachUrl, outreachTargetSchema } from '#shared/utils/outreach'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceOfficer(event)
  const body = await workspaceBody(event, outreachTargetSchema)
  body.canonicalUrl = canonicalizeOutreachUrl(body.canonicalUrl)
  return targetFromRow(
    workspaceResult(
      await workspaceStorage(event)
        .from('outreach_targets')
        .insert({ ...targetToRow(body), created_by: member.userId })
        .select()
        .single(),
    ),
  )
})
