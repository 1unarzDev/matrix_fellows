import { beforeEach, expect, it, vi } from 'vitest'
import { createError } from 'h3'
const state = vi.hoisted(() => ({
  query: {} as any,
  authorized: true,
  saves: [] as any[],
  opportunities: [] as any[],
  count: 0,
  filters: [] as any[],
}))
vi.mock('../../server/utils/workspace-auth', () => ({
  requireWorkspaceMember: async () => {
    if (!state.authorized) throw Object.assign(new Error('Sign in'), { statusCode: 401 })
    return { userId: 'member' }
  },
}))
vi.mock('../../server/utils/workspace-storage', () => ({
  workspaceResult: (r: any) => r.data,
  workspaceStorage: () => ({
    from: (table: string) => {
      const filters: Record<string, any> = {}
      const query: any = {
        select: () => query,
        eq: (key: string, value: any) => {
          filters[key] = value
          state.filters.push([table, key, value])
          return query
        },
        order: () => query,
        limit: async (limit: number) => ({
          data: state.saves.filter((row) => row.user_id === filters.user_id).slice(0, limit),
          count: state.count,
          error: null,
        }),
        in: async (_key: string, ids: string[]) => ({
          data: state.opportunities.filter(
            (row) =>
              ids.includes(row.id) &&
              row.published === filters.published &&
              row.suppressed === filters.suppressed,
          ),
          error: null,
        }),
      }
      return query
    },
  }),
}))
vi.stubGlobal('defineEventHandler', (h: any) => h)
vi.stubGlobal('setHeader', vi.fn())
vi.stubGlobal('getQuery', () => state.query)
vi.stubGlobal('createError', createError)
const handler = (await import('../../server/api/workspace/catalog-saves.get')).default
it('lightweight owned IDs include unavailable saves without reading the catalog', async () => {
  state.authorized = true
  state.query = { idsOnly: '1' }
  state.saves = [
    { user_id: 'member', opportunity_id: 'catalog:unavailable' },
    { user_id: 'other', opportunity_id: 'catalog:private' },
  ]
  state.filters = []
  const result = await handler({} as any)
  expect(result).toEqual({ opportunityIds: ['catalog:unavailable'] })
  expect(state.filters.some(([table]) => table === 'opportunities')).toBe(false)
})
const row = (id: string, title: string, overrides: Record<string, unknown> = {}) => ({
  id,
  published: true,
  suppressed: false,
  overrides,
  data: {
    sourceId: 'catalog',
    externalId: id,
    title,
    kind: 'Program',
    discipline: 'Chemistry',
    description: 'A source-backed program',
    eventDate: null,
    deadline: null,
    timezone: null,
    location: 'Arlington',
    eligibility: 'Check current intake',
    url: `https://example.edu/${id.replace(':', '-')}`,
    verifiedAt: '2026-10-01',
    priority: 10,
    published: true,
  },
})
beforeEach(() => {
  state.query = {}
  state.authorized = true
  state.count = 3
  state.filters = []
  state.saves = [
    { user_id: 'member', opportunity_id: 'catalog:a' },
    { user_id: 'member', opportunity_id: 'catalog:b' },
    { user_id: 'other', opportunity_id: 'catalog:private' },
    { user_id: 'member', opportunity_id: 'catalog:hidden' },
  ]
  state.opportunities = [
    row('catalog:a', 'Physics'),
    row('catalog:b', 'Biology', { title: 'Reviewed chemistry' }),
    row('catalog:private', 'Other member'),
    { ...row('catalog:hidden', 'Hidden'), suppressed: true },
  ]
})
it('reads the entire private saved collection independently from public search results', async () => {
  const result = await handler({} as any)
  expect(result.items.map((item: any) => item.id)).toEqual(['catalog:a', 'catalog:b'])
  expect(result.total).toBe(2)
  expect(result.unavailableCount).toBe(1)
  expect(state.filters).toContainEqual(['outreach_catalog_saves', 'user_id', 'member'])
  expect(state.filters).toContainEqual(['opportunities', 'published', true])
  expect(state.filters).toContainEqual(['opportunities', 'suppressed', false])
})
it('applies shared catalog facets before pagination in the owned collection', async () => {
  state.opportunities[1].overrides = {
    discipline: 'Biology',
    participationModes: ['remote-participation'],
    costs: { compensation: 'Paid stipend', application: 'No application fee' },
  }
  state.query = {
    discipline: 'Biology',
    mode: 'remote-participation',
    funding: 'paid',
    free: 'true',
    pageSize: '1',
  }
  const result = await handler({} as any)
  expect(result.total).toBe(1)
  expect(result.items.map((item: any) => item.id)).toEqual(['catalog:b'])
  state.query = { ...state.query, discipline: 'Chemistry' }
  expect((await handler({} as any)).total).toBe(0)
})
it('filters validated data plus overrides and pages without losing saved ownership', async () => {
  state.query = { q: 'Reviewed', page: 1, pageSize: 1 }
  const result = await handler({} as any)
  expect(result.items.map((item: any) => item.title)).toEqual(['Reviewed chemistry'])
  expect(result.total).toBe(1)
  expect(result.pageCount).toBe(1)
  state.query = { page: 2, pageSize: 1 }
  expect((await handler({} as any)).items[0]?.id).toBe('catalog:b')
})
it('reports the cap explicitly and rejects unauthenticated or excessive query inputs', async () => {
  state.count = 700
  expect(await handler({} as any)).toMatchObject({ savedTotal: 700, capped: true, limit: 500 })
  state.query = { pageSize: 1000 }
  await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 400 })
  state.query = {}
  state.authorized = false
  await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 401 })
})
