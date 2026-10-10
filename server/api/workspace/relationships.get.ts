import { requireWorkspaceOfficer } from '../../utils/workspace-auth'
import { workspaceResult, workspaceStorage } from '../../utils/workspace-storage'
/** Shared coordination metadata, never unrelated private correspondence. */
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const actor = await requireWorkspaceOfficer(event)
  const db = workspaceStorage(event)
  const queryInput = getQuery(event)
  const page = Math.max(0, Number(getQuery(event).page) || 0)
  let query = db
    .from('outreach_relationships')
    .select('*')
    .order('updated_at', { ascending: false })
  if (typeof queryInput.targetId === 'string') {
    const target = workspaceResult(
      await db
        .from('outreach_targets')
        .select('canonical_url,contact_email,dossier')
        .eq('id', queryInput.targetId)
        .maybeSingle(),
    )
    if (target) {
      const aliases = workspaceResult(
        await db
          .from('outreach_relationship_aliases')
          .select('relationship_id')
          .in(
            'identity_key',
            [
              target.canonical_url,
              target.dossier?.labUrl,
              target.contact_email?.toLowerCase(),
            ].filter(Boolean),
          ),
      )
      if (!aliases.length)
        return {
          relationships: [],
          events: [],
          items: [],
          hasMore: false,
          replyReading: false,
          historyStatus: 'no-resolved-relationship',
          notice: 'Historical unresolved approaches may still require coordination review.',
        }
      query = query.in(
        'id',
        aliases.map((a) => a.relationship_id),
      )
    }
  }
  const relationships = workspaceResult(await query.range(page * 50, page * 50 + 50))
  const visible = relationships.slice(0, 50)
  const ids = visible.filter((r) => r.owner_id === actor.userId).map((r) => r.id)
  const events = ids.length
    ? workspaceResult(
        await db
          .from('outreach_relationship_events')
          .select('*')
          .in('relationship_id', ids)
          .order('occurred_at', { ascending: false })
          .limit(200),
      )
    : []
  return {
    relationships: visible,
    events,
    hasMore: relationships.length > 50,
    replyReading: false,
    items: visible.map((r) => ({
      targetId: r.target_id,
      ownerId: r.owner_id,
      owner: 'Assigned officer',
      status: r.stage,
      updatedAt: r.updated_at,
    })),
  }
})
