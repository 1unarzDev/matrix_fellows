import { opportunitySchema } from '#shared/utils/validation'
import { assertMeetingSession, meetingStorage } from '../../utils/meeting-admin'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  await assertMeetingSession(event)
  const client = meetingStorage(event)
  const [opportunityRows, selectionRows] = await Promise.all([
    client
      .from('opportunities')
      .select('id,data,overrides,published,suppressed')
      .eq('published', true)
      .eq('suppressed', false)
      .limit(1000),
    client.from('calendar_opportunity_selections').select('*').limit(1000),
  ])
  if (opportunityRows.error || selectionRows.error)
    throw createError({ statusCode: 503, statusMessage: 'Could not load calendar opportunities.' })

  const selected = new Map((selectionRows.data || []).map((row) => [row.opportunity_id, row]))
  const opportunities = (opportunityRows.data || []).flatMap((row) => {
    const parsed = opportunitySchema.safeParse({
      ...row.data,
      ...row.overrides,
      id: row.id,
      published: row.published && !row.suppressed,
    })
    if (!parsed.success) return []
    const selection = selected.get(row.id)
    return [{
      opportunity: parsed.data,
      selection: {
        opportunityId: row.id,
        enabled: selection?.enabled ?? false,
        includeDeadlines: selection?.include_deadlines ?? true,
        includeEvents: selection?.include_events ?? true,
        priority: selection?.priority ?? parsed.data.priority,
      },
    }]
  })
  opportunities.sort((a, b) =>
    Number(b.selection.enabled) - Number(a.selection.enabled) ||
    b.selection.priority - a.selection.priority ||
    a.opportunity.title.localeCompare(b.opportunity.title),
  )
  return { opportunities }
})
