// Explicit publication of the human-researched catalog; normal monitoring never
// calls this script. Existing listings/owner overrides are not overwritten.
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { catalogSeeds } from '../workers/catalog.ts'
import { officialProfiles } from '../workers/official-sources.ts'
import { opportunitySchema } from '../shared/utils/validation.ts'
const ref = 'xlnjzzbsxzadrvbrggau'
const keys = JSON.parse(
  execFileSync(
    'npx',
    ['--yes', 'supabase', 'projects', 'api-keys', '--project-ref', ref, '-o', 'json'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ),
)
const key = keys.find((key) => key.name === 'service_role')?.api_key
if (!key || key.includes('***')) throw new Error('Supabase service credential unavailable')
const client = createClient(`https://${ref}.supabase.co`, key, { auth: { persistSession: false } })
const checked = new Date().toISOString()
for (const { item, sources } of catalogSeeds) {
  const future = item.milestones.filter((m) => m.date.slice(0, 10) >= checked.slice(0, 10))
  const data = opportunitySchema.parse({
    ...item,
    deadline: future.find((m) => m.kind === 'deadline')?.date || null,
    eventDate: future.find((m) => m.kind === 'event')?.date || null,
    timezone: future.find((m) => m.kind === 'deadline')?.timezone || null,
  })
  const result = await client
    .from('opportunities')
    .upsert(
      {
        id: data.id,
        source_id: data.sourceId,
        external_id: data.externalId,
        canonical_url: data.url,
        data,
        published: true,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    )
  if (result.error) throw new Error(`${data.title}: ${result.error.message}`)
  // Prefer explicit calendar/eligibility URLs over a marketing homepage.
  const monitor = await client
    .from('opportunity_monitors')
    .upsert(
      {
        id: data.id,
        url: sources[1] || sources[0],
        seed: { ...data, sourceUrls: sources },
        last_success_at: checked,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    )
  if (monitor.error) throw new Error(monitor.error.message)
}
for (const profile of officialProfiles) {
  const row = await client
    .from('opportunities')
    .select('data')
    .eq('id', `${profile.id}:main`)
    .single()
  if (row.error) throw new Error('Approved original opportunity missing')
  const data = opportunitySchema.parse({
    ...row.data.data,
    title: profile.name.replace(/\s+20\d{2}/g, ''),
    edition: String(profile.year),
  })
  const result = await client
    .from('opportunity_monitors')
    .upsert(
      {
        id: data.id,
        url: profile.url,
        seed: { ...data, sourceUrls: [profile.url] },
        last_success_at: data.verifiedAt,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    )
  if (result.error) throw new Error(result.error.message)
}
// Stop the old edition-specific adapter from racing the new annual monitor.
const disabled = await client
  .from('import_sources')
  .update({ enabled: false })
  .in(
    'id',
    officialProfiles.map((p) => p.id),
  )
if (disabled.error) throw new Error(disabled.error.message)
// Keep the generic JSHS discovery link recoverable, with the researched record replacing it.
await client
  .from('opportunities')
  .update({ published: false, suppressed: true })
  .eq('id', 'jshs')
  .eq('source_id', 'curated')
console.log(
  `Published ${catalogSeeds.length} researched opportunities; registered ${catalogSeeds.length + officialProfiles.length} annual monitors. Existing owner data preserved.`,
)
