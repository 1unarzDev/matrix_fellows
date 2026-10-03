import { beforeEach, expect, it, vi } from 'vitest'
import { createError } from 'h3'

const state = vi.hoisted(() => ({
  body: {} as any,
  previous: {} as any,
  write: vi.fn(),
  conflict: false,
}))
vi.mock('../../server/utils/workspace-auth', () => ({
  requireWorkspaceOfficer: async () => ({ userId: 'officer' }),
  assertWorkspaceOrigin: () => {},
}))
vi.mock('../../server/utils/workspace-storage', () => ({
  workspaceStorage: () => ({
    from: () => {
      let writing = false
      const query: any = {
        select: () => query,
        eq: () => query,
        single: async () => ({ data: state.previous, error: null }),
        update: (row: any) => {
          writing = true
          state.write(row)
          return query
        },
        maybeSingle: async () => ({
          data: writing && state.conflict ? null : state.previous,
          error: null,
        }),
      }
      return query
    },
  }),
  workspaceBody: async (_event: unknown, schema: any) => schema.parse(state.body),
  workspaceId: () => 'target',
  workspaceResult: (result: any) => result.data,
  targetFromRow: (row: any) => row,
  targetToRow: (value: any) => value,
}))
vi.stubGlobal('defineEventHandler', (handler: any) => handler)
vi.stubGlobal('createError', createError)
const handler = (await import('../../server/api/workspace/targets/[id].patch')).default
beforeEach(() => {
  state.write.mockReset()
  state.conflict = false
  state.previous = {
    id: 'target',
    name: 'Robotics Lab',
    kind: 'lab',
    organization: 'UTA',
    disciplines: ['Robotics'],
    canonicalUrl: 'https://uta.edu/lab',
    contactEmail: null,
    location: 'Arlington',
    mode: 'unknown',
    status: 'needs_review',
    scope: 'both',
    description: 'Research group',
    dossier: { evidence: [], acquisition: { pages: [{ text: 'Worker evidence' }] } },
    assessment: {},
    createdAt: '2026-10-03T00:00:00Z',
    updatedAt: '2026-10-03T01:00:00Z',
  }
  state.body = { expectedUpdatedAt: state.previous.updatedAt, description: 'Officer update' }
})
it('rejects an already-open stale editor before overwriting another officer', async () => {
  state.body.expectedUpdatedAt = '2026-10-03T00:00:00Z'
  await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 409 })
  expect(state.write).not.toHaveBeenCalled()
})
it('preserves worker-owned acquisition on a current officer edit', async () => {
  await handler({} as never)
  expect(state.write).toHaveBeenCalledWith(
    expect.objectContaining({
      description: 'Officer update',
      dossier: expect.objectContaining({ acquisition: state.previous.dossier.acquisition }),
    }),
  )
})
it('accepts the microsecond UTC-offset timestamps returned by PostgREST', async () => {
  state.previous.updatedAt = '2026-10-03T01:00:00.123456+00:00'
  state.body.expectedUpdatedAt = state.previous.updatedAt
  await handler({} as never)
  expect(state.write).toHaveBeenCalled()
})
it('rejects a change between version validation and database write', async () => {
  state.conflict = true
  await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 409 })
})
it('does not attach old acquired evidence to a newly edited target identity', async () => {
  state.body.canonicalUrl = 'https://uta.edu/new-lab'
  await handler({} as never)
  expect(state.write.mock.calls[0]![0].dossier.acquisition).toBeUndefined()
})
