import { requireWorkspaceOfficer } from '../../utils/workspace-auth'
import { workspaceResult, workspaceStorage } from '../../utils/workspace-storage'
/** Shared coordination metadata, never unrelated private correspondence. */
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const actor = await requireWorkspaceOfficer(event)
  const db = workspaceStorage(event)
  const queryInput = getQuery(event)
  const page = Math.max(0, Math.min(10000, Math.floor(Number(queryInput.page) || 0)))
  const eventPage = Math.max(0, Math.min(10000, Math.floor(Number(queryInput.eventPage) || 0)))
  const relationshipId = queryInput.relationshipId
  if (
    relationshipId !== undefined &&
    (typeof relationshipId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(relationshipId))
  )
    throw createError({ statusCode: 400, statusMessage: 'Choose a valid relationship.' })
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
          actorId: actor.userId,
          relationships: [],
          events: [],
          eventPage,
          eventPageSize: 50,
          eventHasMore: false,
          eventCoverage: 'no-resolved-relationship',
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
  // Resolve the selected identity independently of the relationship list page.
  // Shared coordination metadata never grants access to private event notes.
  const selected =
    typeof relationshipId === 'string'
      ? workspaceResult(
          await db
            .from('outreach_relationships')
            .select('id,owner_id')
            .eq('id', relationshipId)
            .maybeSingle(),
        )
      : null
  const ids = relationshipId
    ? selected?.owner_id === actor.userId
      ? [selected.id]
      : []
    : visible.filter((r) => r.owner_id === actor.userId).map((r) => r.id)
  const pageSize = relationshipId ? 50 : 200
  const offset = relationshipId ? eventPage * pageSize : 0
  const eventRows = ids.length
    ? workspaceResult(
        await db
          .from('outreach_relationship_events')
          .select('*')
          .in('relationship_id', ids)
          .order('occurred_at', { ascending: false })
          .order('id', { ascending: false })
          .range(offset, offset + pageSize),
      )
    : []
  const events = eventRows.slice(0, pageSize)
  return {
    actorId: actor.userId,
    relationships: visible,
    events,
    eventPage: relationshipId ? eventPage : 0,
    eventPageSize: pageSize,
    eventHasMore: eventRows.length > pageSize,
    eventCoverage: relationshipId
      ? selected?.owner_id === actor.userId
        ? 'selected-relationship'
        : 'private-or-unavailable'
      : 'bounded-overview',
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
