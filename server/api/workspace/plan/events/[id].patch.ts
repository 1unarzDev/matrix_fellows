import { z } from 'zod'
import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../../../utils/workspace-auth'
import {
  workspaceStorage,
  workspaceBody,
  workspaceId,
  workspaceResult,
} from '../../../../utils/workspace-storage'
import { eventFromRow } from '../../../../utils/dashboard-storage'
import { eventInputSchema } from '#shared/utils/dashboard-planning'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceMember(event)
  const v = await workspaceBody(
    event,
    z.object({ expectedVersion: z.number().int().positive(), event: eventInputSchema }).strict(),
  )
  const row = workspaceResult(
    await workspaceStorage(event)
      .from('dashboard_events')
      .update({
        title: v.event.title,
        type: v.event.type,
        starts_at: v.event.start,
        ends_at: v.event.end,
        version: v.expectedVersion + 1,
      })
      .eq('id', workspaceId(event))
      .eq('user_id', member.userId)
      .eq('version', v.expectedVersion)
      .select()
      .maybeSingle(),
  )
  if (!row)
    throw createError({
      statusCode: 409,
      statusMessage: 'This event changed elsewhere. Reload before saving.',
    })
  return eventFromRow(row)
})
