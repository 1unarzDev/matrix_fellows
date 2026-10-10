import { expect, it, vi } from 'vitest'
import {
  CuratedDiscoveryProvider,
  ReviewedSourceReader,
  PublicGeminiResearchModel,
} from '../../workers/research-providers'

it('uses only permitted curated identities, distributes by explicit interest, and respects budgets/cancellation', async () => {
  const chemistry = 'https://www.uta.edu/chemistry',
    robotics = 'https://www.uta.edu/robotics'
  const provider = new CuratedDiscoveryProvider([
    { url: robotics, hosts: ['www.uta.edu'], fields: ['Robotics'] },
    { url: chemistry, hosts: ['www.uta.edu'], fields: ['Chemistry'] },
    { url: 'https://127.0.0.1/private', hosts: ['127.0.0.1'], fields: ['Chemistry'] },
  ])
  const input = {
    interests: ['Chemistry'],
    permittedSources: [robotics, chemistry, 'https://127.0.0.1/private'],
    limit: 1,
    signal: new AbortController().signal,
  }
  expect(await provider.discover(input)).toEqual([chemistry])
  const controller = new AbortController()
  controller.abort()
  await expect(provider.discover({ ...input, signal: controller.signal })).rejects.toThrow()
})
it('source reader rejects private-network URLs before any request and follows no redirects', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response('', { status: 302, headers: { location: 'http://localhost' } }))
  const reader = new ReviewedSourceReader(fetcher)
  await expect(
    reader.read('https://127.0.0.1/private', ['127.0.0.1'], new AbortController().signal),
  ).rejects.toThrow('policy')
  expect(fetcher).not.toHaveBeenCalled()
  await expect(
    reader.read('https://www.uta.edu/research', ['www.uta.edu'], new AbortController().signal),
  ).rejects.toThrow('no redirect')
})
it('keys alone do not activate a model without confirmed provider terms and mode', async () => {
  const fetcher = vi.fn()
  const model = new PublicGeminiResearchModel({
    key: 'synthetic-key',
    model: 'gemini-2.5-flash',
    termsConfirmed: false,
    mode: 'unpaid_public',
    projectModeConfirmed: true,
    fetcher,
  })
  expect(model.status().state).toBe('unavailable')
  await expect(
    model.analyze({
      approvedPublicExcerpt: 'Public excerpt',
      schemaVersion: 'public-research-v1',
      promptVersion: 'bounded-contribution-v1',
      signal: new AbortController().signal,
    }),
  ).rejects.toThrow('terms')
  expect(fetcher).not.toHaveBeenCalled()
})
