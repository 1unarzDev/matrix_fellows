// Node 22.18+ supports the type-only TypeScript imports in the seed data.
import { createClient } from '@supabase/supabase-js'
import { defaultContent, defaultOpportunities } from '../shared/data/defaults.ts'

const url = process.env.NUXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key)
  throw new Error(
    'Set NUXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to seed your Supabase project.',
  )
const client = createClient(url, key, { auth: { persistSession: false } })
const content = await client
  .from('site_content')
  .upsert(
    { id: 'main', data: defaultContent, draft: defaultContent, published: true },
    { onConflict: 'id', ignoreDuplicates: true },
  )
if (content.error) throw content.error
const listings = await client.from('opportunities').upsert(
  defaultOpportunities.map((item) => ({
    id: item.id,
    source_id: item.sourceId,
    external_id: item.externalId,
    canonical_url: item.url.replace(/\/$/, ''),
    data: item,
    published: true,
  })),
  { onConflict: 'id', ignoreDuplicates: true },
)
if (listings.error) throw listings.error
console.log(
  'Initial content and official discovery links inserted. Existing records were preserved. No import sources were enabled.',
)
