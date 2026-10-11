import { beforeEach, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'
const mocked = vi.hoisted(() => ({
  limit: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  in: vi.fn(),
  from: vi.fn(),
}))
vi.mock('../../server/utils/workspace-storage', () => ({
  workspaceStorage: () => ({ from: mocked.from }),
  workspaceResult: (r: any) => {
    if (r.error) throw new Error('Storage failed')
    return r.data
  },
}))
import { previewCapturedOpportunity } from '../../server/utils/dashboard-opportunity-storage'
const event = {} as H3Event
beforeEach(() => {
  vi.clearAllMocks()
  mocked.from.mockReturnValue(mocked)
  mocked.select.mockReturnValue(mocked)
  mocked.eq.mockReturnValue(mocked)
  mocked.in.mockReturnValue(mocked)
})
it('fetches a bounded public page and classifies a personal opportunity', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(
      new Response(
        '<html><title>Arlington Math Sprint</title><body>Register for a 90-minute local mathematics contest for grades 9-12. One Saturday.</body></html>',
        { status: 200, headers: { 'content-type': 'text/html' } },
      ),
    )
  mocked.limit.mockResolvedValue({ data: [], error: null })
  const preview = await previewCapturedOpportunity(event, 'https://example.edu/unknown')
  expect(preview.kind).toBe('personal')
  expect(preview.disposition).toBe('personal')
  expect(preview.item?.title).toBe('Arlington Math Sprint')
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(mocked.eq).toHaveBeenCalledWith('published', true)
  expect(mocked.eq).toHaveBeenCalledWith('suppressed', false)
  fetcher.mockRestore()
})
it('returns typed existing source data without fresh verification or unsafe acquisition', async () => {
  const item = {
    sourceId: 'institution',
    externalId: 'program',
    title: 'Old cycle',
    kind: 'Program',
    discipline: 'Chemistry',
    description: 'Published requirements',
    eventDate: '2024-06-01',
    deadline: '2024-01-01',
    timezone: null,
    location: 'Arlington',
    eligibility: 'Review source',
    url: 'https://example.edu/program',
    verifiedAt: '2024-01-01',
    priority: 10,
    published: true,
    edition: '2024',
  }
  mocked.limit.mockResolvedValue({
    data: [
      {
        id: 'catalog:program',
        canonical_url: item.url,
        data: item,
        overrides: { title: 'Reviewed title' },
        updated_at: '2026-10-07T00:00:00Z',
      },
    ],
    error: null,
  })
  const preview = await previewCapturedOpportunity(event, item.url)
  expect(preview.kind).toBe('catalog')
  expect(preview.item?.title).toBe('Reviewed title')
  expect(preview.item?.id).toBe('catalog:program')
  expect(preview.item?.verifiedAt).toBe('2024-01-01')
  expect(preview.source.retrievedAt).toBe('2026-10-07T00:00:00Z')
})
