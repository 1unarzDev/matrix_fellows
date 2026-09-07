import { createClient, type SupabaseClient } from '@supabase/supabase-js'
let client: SupabaseClient | undefined

export function getAdminClient(url: string, key: string): SupabaseClient {
  client ??= createClient(url, key)
  return client
}
