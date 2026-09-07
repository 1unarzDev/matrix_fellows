import { afterEach, expect, it, vi } from 'vitest'
import worker from '../../workers/import'
const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test',
  AGENT_INGEST_TOKEN: 'test-token',
  AI: { run: vi.fn() },
}
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})
it('does not let anonymous callers run agents or submit discoveries', async () => {
  for (const path of ['/agent/run', '/agent/discover']) {
    const response = await worker.fetch(
      new Request(`https://worker.example${path}`, { method: 'POST' }),
      env,
    )
    expect(response.status).toBe(401)
  }
  expect(env.AI.run).not.toHaveBeenCalled()
})
it('awaits a bounded one-job manual run instead of abandoning request background work', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json([]))
  vi.stubGlobal('fetch', fetch)
  const response = await worker.fetch(
    new Request('https://worker.example/agent/run', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
    }),
    env,
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ results: [] })
  expect(JSON.parse(fetch.mock.calls[0]![1].body)).toEqual({ batch_size: 1 })
})
it('rejects agent-supplied URLs outside reviewed official hosts before fetching', async () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  const response = await worker.fetch(
    new Request('https://worker.example/agent/discover', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
      body: JSON.stringify({ url: 'https://attacker.example/data' }),
    }),
    env,
  )
  expect(response.status).toBe(400)
  expect(fetch).not.toHaveBeenCalled()
})
