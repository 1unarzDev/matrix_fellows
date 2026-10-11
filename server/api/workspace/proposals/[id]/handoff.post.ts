import { z } from 'zod'
import { requireWorkspaceOfficer, assertWorkspaceOrigin } from '../../../../utils/workspace-auth'
import {
  workspaceBody,
  workspaceId,
  workspaceResult,
  workspaceStorage,
} from '../../../../utils/workspace-storage'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const actor = await requireWorkspaceOfficer(event)
  const input = await workspaceBody(event, z.object({ ownerId: z.string().uuid() }).strict())
  workspaceResult(
    await workspaceStorage(event).rpc('outreach_handoff', {
      p_proposal_id: workspaceId(event),
      p_actor: actor.userId,
      p_owner: input.ownerId,
    }),
  )
  return { ok: true, requiresApproval: true }
})
