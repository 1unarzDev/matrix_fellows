import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../../utils/workspace-auth'
import { workspaceStorage, workspaceBody, workspaceResult } from '../../../utils/workspace-storage'
import { referenceFromRow } from '../../../utils/dashboard-opportunity-storage'
import { referenceInputSchema } from '#shared/utils/dashboard-opportunities'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceMember(event)
  const v = await workspaceBody(event, referenceInputSchema)
  const db = workspaceStorage(event)
  workspaceResult(
    await db
      .from('dashboard_opportunity_references')
      .upsert(
        { user_id: member.userId, url: v.url, title: v.title },
        { onConflict: 'user_id,url', ignoreDuplicates: true },
      ),
  )
  return referenceFromRow(
    workspaceResult(
      await db
        .from('dashboard_opportunity_references')
        .select('*')
        .eq('user_id', member.userId)
        .eq('url', v.url)
        .single(),
    ),
  )
})
