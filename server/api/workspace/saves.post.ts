import { z } from 'zod'
import { requireWorkspaceOfficer, assertWorkspaceOrigin } from '../../utils/workspace-auth'
import { workspaceStorage, workspaceResult, workspaceBody } from '../../utils/workspace-storage'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceOfficer(event)
  const body = await workspaceBody(event, z.object({ targetId: z.string().uuid() }).strict())
  workspaceResult(
    await workspaceStorage(event)
      .from('outreach_saves')
      .upsert(
        { user_id: member.userId, target_id: body.targetId },
        { onConflict: 'user_id,target_id' },
      ),
  )
  return { saved: true }
})
