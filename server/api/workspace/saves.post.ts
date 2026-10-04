import { z } from 'zod'
import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../utils/workspace-auth'
import { workspaceStorage, workspaceResult, workspaceBody } from '../../utils/workspace-storage'
import { assertWorkspaceTarget } from '../../utils/workspace-access'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceMember(event)
  const body = await workspaceBody(event, z.object({ targetId: z.string().uuid() }).strict())
  await assertWorkspaceTarget(event, member, body.targetId)
  if (member.role === 'member') {
    const target = workspaceResult(
      await workspaceStorage(event)
        .from('outreach_targets')
        .select('status')
        .eq('id', body.targetId)
        .single(),
    )
    if (target.status !== 'ready')
      throw createError({
        statusCode: 403,
        statusMessage: 'Only reviewed connections can be saved.',
      })
  }
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
