import { createClient } from '@supabase/supabase-js'
import { fetchSource } from './adapters'
import { sourceSchema } from '../shared/utils/validation'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
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
  },
  fetch() {
    return new Response('Not found', { status: 404 })
  },
}
