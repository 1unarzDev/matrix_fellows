import { z } from 'zod'
import { requireWorkspaceOfficer, assertWorkspaceOrigin } from '../../utils/workspace-auth'
import { workspaceStorage, workspaceBody, workspaceResult } from '../../utils/workspace-storage'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceOfficer(event)
  const body = await workspaceBody(
    event,
    z.object({ opportunityIds: z.array(z.string().regex(/^[a-z0-9-]{1,160}$/)).max(500) }).strict(),
  )
  const db = workspaceStorage(event)
  const ids = [...new Set(body.opportunityIds)]
  if (ids.length) {
    const valid = workspaceResult(await db.from('opportunities').select('id').in('id', ids))
    workspaceResult(
      await db.from('outreach_catalog_saves').upsert(
        valid.map((row) => ({ user_id: member.userId, opportunity_id: row.id })),
        { onConflict: 'user_id,opportunity_id', ignoreDuplicates: true },
      ),
    )
  }
  return {
    opportunityIds: workspaceResult(
      await db.from('outreach_catalog_saves').select('opportunity_id').eq('user_id', member.userId),
    ).map((row) => row.opportunity_id),
  }
})
