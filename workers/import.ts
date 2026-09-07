import { createClient } from '@supabase/supabase-js'
import { fetchSource } from './adapters'
import { sourceSchema } from '../shared/utils/validation'
import { runMonitoring, discoverFromHubs, discoverUrl, type AiBinding } from './monitoring'
import { approvedSource } from './catalog'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  AI?: AiBinding
  AGENT_INGEST_TOKEN?: string
}

function database(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
    },
  })
}

export async function runImports(env: Env) {
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
    },
  })
  const { data, error } = await client
    .from('import_sources')
    .select('id,name,kind,url,enabled')
    .eq('enabled', true)
  if (error) throw new Error('Could not load import sources')
  // Sequential bounded requests avoid overwhelming small upstream sources.
  for (const row of data || []) {
    let count = 0,
      failure: string | null = null
    try {
      const source = sourceSchema.parse(row)
      const items = await fetchSource(source)
      // Official web-page changes are proposals, never autonomous edits to
      // public deadlines. Trusted curated feeds retain their existing behavior.
      const result = await client.rpc(
        source.kind === 'official' ? 'stage_import' : 'apply_import',
        { items },
      )
      if (result.error) throw new Error('Database import failed; previous data retained')
      count = result.data || 0
    } catch (err) {
      failure = err instanceof Error ? err.message.slice(0, 500) : 'Unknown import failure'
    }
    const status = await client
      .from('import_sources')
      .update({ last_run: new Date().toISOString(), last_error: failure, last_count: count })
      .eq('id', row.id)
    if (status.error) console.error('Could not record source status', row.id)
    if (failure) console.error('Import failed', row.id, failure)
  }
}

export default {
  async scheduled(_controller: unknown, env: Env) {
    await runImports(env)
    if (!env.AI) throw new Error('Workers AI binding missing; monitoring cannot run')
    const client = database(env)
    console.log('Monitor results', await runMonitoring(client, env.AI))
    // Weekly discovery is bounded to reviewed official hosts and three links.
    if (new Date().getUTCDay() === 0 && new Date().getUTCHours() === 11)
      await discoverFromHubs(client, env.AI)
  },
  async fetch(request: Request, env: Env) {
    const path = new URL(request.url).pathname
    if (request.method !== 'POST' || !['/agent/run', '/agent/discover'].includes(path))
      return new Response('Not found', { status: 404 })
    if (
      !env.AGENT_INGEST_TOKEN ||
      request.headers.get('authorization') !== `Bearer ${env.AGENT_INGEST_TOKEN}`
    )
      return new Response('Unauthorized', { status: 401 })
    if (!env.AI) return new Response('Monitoring unavailable', { status: 503 })
    const client = database(env)
    if (path === '/agent/run') {
      // Keep the request alive; request waitUntil cannot own a long AI batch.
      return Response.json({ results: await runMonitoring(client, env.AI, 1) })
    }
    const body = await request.text()
    if (body.length > 2000) return new Response('Request too large', { status: 413 })
    try {
      const { url } = JSON.parse(body)
      if (typeof url !== 'string' || !approvedSource(url))
        return new Response('Unapproved official host', { status: 400 })
      const count = await client
        .from('opportunity_monitors')
        .select('id', { count: 'exact', head: true })
        .eq('discovered', true)
        .gte('created_at', new Date(Date.now() - 86400000).toISOString())
      if (count.error || (count.count || 0) >= 3)
        return new Response('Daily discovery budget reached', { status: 429 })
      return Response.json(await discoverUrl(client, env.AI, url), { status: 202 })
    } catch {
      return new Response('Discovery could not be verified', { status: 422 })
    }
  },
}
