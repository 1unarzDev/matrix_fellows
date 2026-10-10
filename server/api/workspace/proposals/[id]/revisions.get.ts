import { requireWorkspaceMember } from '../../../../utils/workspace-auth'
import { workspaceId, workspaceResult, workspaceStorage } from '../../../../utils/workspace-storage'

export default defineEventHandler(async (event) => {
  const member = await requireWorkspaceMember(event)
  const db = workspaceStorage(event)
  const id = workspaceId(event)
  const owner = workspaceResult(
    await db
      .from('outreach_proposals')
      .select('id')
      .eq('id', id)
      .eq('created_by', member.userId)
      .maybeSingle(),
  )
  if (!owner) throw createError({ statusCode: 404, statusMessage: 'Draft not found.' })
  return {
    items: workspaceResult(
      await db
        .from('outreach_proposal_revisions')
        .select('revision,recipient,subject,body,mailbox_id,created_at')
        .eq('proposal_id', id)
        .order('revision', { ascending: false })
        .limit(50),
    ),
  }
})
