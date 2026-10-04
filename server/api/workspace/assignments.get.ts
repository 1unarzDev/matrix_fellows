import { z } from 'zod'
import { requireWorkspaceOfficer } from '../../utils/workspace-auth'
import { workspaceStorage, workspaceResult } from '../../utils/workspace-storage'
export default defineEventHandler(async (event) => {
  await requireWorkspaceOfficer(event)
  const targetId = z.string().uuid().parse(getQuery(event).targetId)
  const rows = workspaceResult(
    await workspaceStorage(event)
      .from('outreach_assignments')
      .select(
        'target_id,user_id,created_at,outreach_members!outreach_assignments_user_id_fkey(email)',
      )
      .eq('target_id', targetId),
  )
  return {
    assignments: rows.map((row: any) => ({
      targetId: row.target_id,
      userId: row.user_id,
      email: row.outreach_members.email,
      createdAt: row.created_at,
    })),
  }
})
