import { z } from 'zod'
import { requireWorkspaceMember } from '../../utils/workspace-auth'
import { workspaceStorage, workspaceResult } from '../../utils/workspace-storage'
import { opportunitySchema } from '#shared/utils/validation'
import type { Opportunity } from '#shared/types/content'
import { parseOpportunitySearch } from '../../utils/opportunity-search'
import { matchesOpportunityFilters } from '#shared/utils/opportunity-filters'
const querySchema = z.object({
  idsOnly: z.enum(['1']).optional(),
  q: z.string().trim().max(200).default(''),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(24),
})
const SAVE_LIMIT = 500
/** Independent saved collection, not an intersection with the public search page.
 * Cap is explicit so a very large legacy collection cannot become an unbounded
 * read. Filtering and pagination apply to the newest SAVE_LIMIT saved records. */
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const member = await requireWorkspaceMember(event)
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, statusMessage: 'Check the saved-opportunity search.' })
  const { q, page, pageSize } = parsed.data,
    db = workspaceStorage(event)
  let filters
  try {
    filters = parseOpportunitySearch(event)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Check the saved-opportunity filters.' })
  }
  const savedResult = await db
    .from('outreach_catalog_saves')
    .select('opportunity_id,created_at', { count: 'exact' })
    .eq('user_id', member.userId)
    .order('created_at', { ascending: false })
    .order('opportunity_id', { ascending: true })
    .limit(SAVE_LIMIT)
  const saves = workspaceResult(savedResult)
  const ids = [...new Set(saves.map((s) => s.opportunity_id as string))],
    byId = new Map<string, Opportunity>()
  if (parsed.data.idsOnly) return { opportunityIds: ids }
  // Keep PostgREST URL sizes and concurrency bounded even for long TEXT IDs.
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += 20) chunks.push(ids.slice(i, i + 20))
  for (let offset = 0; offset < chunks.length; offset += 4) {
    const results = await Promise.all(
      chunks
        .slice(offset, offset + 4)
        .map((chunk) =>
          db
            .from('opportunities')
            .select('id,data,overrides')
            .eq('published', true)
            .eq('suppressed', false)
            .in('id', chunk),
        ),
    )
    for (const result of results)
      for (const row of workspaceResult(result)) {
        const item = opportunitySchema.safeParse({
          ...row.data,
          ...row.overrides,
          id: row.id,
          published: true,
        })
        if (item.success) byId.set(row.id, item.data)
      }
  }
  for (let offset = 0; offset < chunks.length; offset += 4) {
    const results = await Promise.all(
      chunks.slice(offset, offset + 4).map((chunk) =>
        db.from('dashboard_personal_opportunities').select('id,data').eq('user_id', member.userId).in('id', chunk),
      ),
    )
    for (const result of results)
      for (const row of workspaceResult(result)) {
        const item = opportunitySchema.safeParse({ ...row.data, id: row.id, published: true })
        if (item.success) byId.set(row.id, item.data)
      }
  }
  const needle = q.toLocaleLowerCase('en-US')
  const items = ids
    .map((id) => byId.get(id))
    .filter((item): item is Opportunity => !!item)
    .filter((item) => matchesOpportunityFilters(item, filters))
    .filter(
      (item) =>
        !needle ||
        `${item.title} ${item.description} ${item.discipline} ${(item.disciplines || []).join(' ')} ${(item.aliases || []).join(' ')} ${(item.topics || []).join(' ')} ${item.organizer || ''}`
          .toLocaleLowerCase('en-US')
          .includes(needle),
    )
  const total = items.length,
    pageCount = Math.max(1, Math.ceil(total / pageSize))
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    pageCount,
    total,
    savedTotal: savedResult.count ?? saves.length,
    limit: SAVE_LIMIT,
    capped: (savedResult.count ?? saves.length) > SAVE_LIMIT,
    unavailableCount: ids.length - byId.size,
  }
})
