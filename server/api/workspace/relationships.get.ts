import { requireWorkspaceMember } from '../../utils/workspace-auth'
import { workspaceResult, workspaceStorage } from '../../utils/workspace-storage'

/** Coordination metadata only; never disclose other members' draft/reply bodies. */
export default defineEventHandler(async (event) => {
  const member = await requireWorkspaceMember(event)
  const db = workspaceStorage(event)
  let assigned =
    member.role === 'member'
      ? workspaceResult(
          await db.from('outreach_assignments').select('target_id').eq('user_id', member.userId),
        ).map((r) => r.target_id)
      : null
  if (assigned?.length) {
    const checks = await Promise.all(
      assigned.map(async (id) => {
        const result = await db.rpc('outreach_member_target_access', {
          p_user_id: member.userId,
          p_target_id: id,
        })
        return !result.error && result.data ? id : null
      }),
    )
    assigned = checks.filter((id): id is string => Boolean(id))
  }
  if (assigned && !assigned.length) return { items: [], replyReading: false }
  let query = db.from('outreach_proposals').select('id,target_id,created_by').limit(500)
  if (assigned) query = query.in('target_id', assigned)
  const proposals = workspaceResult(await query)
  if (!proposals.length) return { items: [], replyReading: false }
  const rows = workspaceResult(
    await db
      .from('outreach_outbox')
      .select('proposal_id,status,created_by,updated_at')
      .in(
        'proposal_id',
        proposals.map((p) => p.id),
      )
      .in('status', ['queued', 'sending', 'sent', 'uncertain'])
      .limit(500),
  )
  if (!rows.length) return { items: [], replyReading: false }
  const owners = workspaceResult(
    await db
      .from('outreach_members')
      .select('user_id,email')
      .in('user_id', [...new Set(rows.map((r) => r.created_by))]),
  )
  return {
    replyReading: false,
    items: rows.map((r) => ({
      targetId: proposals.find((p) => p.id === r.proposal_id)?.target_id,
      ownerId: r.created_by,
      owner: owners.find((o) => o.user_id === r.created_by)?.email || 'Society member',
      status: r.status === 'sent' ? 'provider_accepted' : r.status,
      updatedAt: r.updated_at,
    })),
  }
})
