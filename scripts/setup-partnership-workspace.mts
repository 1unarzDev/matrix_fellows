// Explicit operator setup; never contacts researchers or creates mail approvals.
// Credentials stay in memory. Repeat runs preserve reviewed records.
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { outreachSeeds } from '../shared/data/outreach-seeds'
import { outreachTargetSchema, canonicalizeOutreachUrl } from '../shared/utils/outreach'
import { targetToRow } from '../server/utils/workspace-storage'
import { starterOutreachSources } from '../shared/data/outreach-sources'

const project = 'xlnjzzbsxzadrvbrggau'
const owner = '91590702-908e-43a9-a930-c258b2996fb8'
const keys = JSON.parse(
  execFileSync(
    'npx',
    [
      '--no-install',
      'supabase',
      'projects',
      'api-keys',
      '--project-ref',
      project,
      '--reveal',
      '--output',
      'json',
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ),
)
const key = keys.find((item: any) => item.name === 'service_role')?.api_key
if (!key) throw new Error('Missing linked-project service credential')
const db = createClient(`https://${project}.supabase.co`, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})
async function checked(result: any) {
  if (result.error) throw new Error('Setup failed; inspect project permissions and schema')
  return result.data
}
const membership = await checked(
  await db.from('outreach_members').select('role,enabled').eq('user_id', owner).single(),
)
if (!membership.enabled || membership.role !== 'admin')
  throw new Error('Existing named administrator must be enrolled first')
const sources = starterOutreachSources()
await checked(
  await db.from('outreach_sources').upsert(sources, { onConflict: 'id', ignoreDuplicates: true }),
)
await checked(
  await db.from('outreach_targets').upsert(
    outreachSeeds.map((seed) => {
      const value = outreachTargetSchema.parse(seed)
      value.canonicalUrl = canonicalizeOutreachUrl(value.canonicalUrl)
      return { ...targetToRow(value), created_by: owner }
    }),
    { onConflict: 'canonical_url', ignoreDuplicates: true },
  ),
)
console.log(
  `Installed ${sources.length} reviewed starter routes/candidates; existing records preserved. Research remains controlled by dashboard pause settings.`,
)
