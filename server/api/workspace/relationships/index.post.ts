import { z } from 'zod'
import { requireWorkspaceOfficer, assertWorkspaceOrigin } from '../../../utils/workspace-auth'
import { workspaceBody, workspaceResult, workspaceStorage } from '../../../utils/workspace-storage'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const actor = await requireWorkspaceOfficer(event)
  const input = await workspaceBody(
    event,
    z
      .object({
        targetId: z.string().uuid(),
        kind: z.enum([
          'external_email',
          'reply',
          'call',
          'meeting',
          'decline',
          'invitation',
          'introduction',
          'promise',
        ]),
        note: z.string().trim().min(1).max(3000),
        occurredAt: z.string().datetime(),
        dueDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .optional(),
      })
      .strict(),
  )
  const id = workspaceResult(
    await workspaceStorage(event).rpc('outreach_record_relationship', {
      p_target: input.targetId,
      p_actor: actor.userId,
      p_kind: input.kind,
      p_note: input.note,
      p_occurred: input.occurredAt,
      p_due: input.dueDate || null,
    }),
  )
  return { id, replyReading: false }
})
