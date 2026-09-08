import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

export function joinStorage(event: H3Event) {
  const config = useRuntimeConfig(event)
  if (!config.public.supabaseUrl || !config.supabaseServiceRoleKey)
    throw createError({
      statusCode: 503,
      statusMessage: 'Joining is temporarily unavailable. Please email contact@matrixfellows.com.',
    })
  return createClient(config.public.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
    },
  })
}
