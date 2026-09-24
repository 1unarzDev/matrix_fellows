// Idempotently publish only the public “Room to grow” benefits. This leaves
// meeting details, projects, links, opportunities, and other owner edits alone.
// Run with: npx tsx scripts/publish-benefits.mjs
import { execFileSync } from 'node:child_process'
import { defaultContent } from '../shared/data/defaults.ts'
import { contentSchema } from '../shared/utils/validation.ts'

contentSchema.parse(defaultContent)
const benefits = `'${JSON.stringify(defaultContent.benefits).replaceAll("'", "''")}'::jsonb`
const query = `
update public.site_content
set data = jsonb_set(data, '{benefits}', ${benefits}, true),
    draft = jsonb_set(coalesce(draft, data), '{benefits}', ${benefits}, true)
where id = 'main'
returning id, published, data->'benefits' as benefits,
  draft->'benefits' as draft_benefits;
`

const result = execFileSync(
  'npx',
  ['--yes', 'supabase', 'db', 'query', '--linked', '--project-ref', 'xlnjzzbsxzadrvbrggau', query],
  { encoding: 'utf8', env: { ...process.env, npm_config_loglevel: 'error' } },
)
console.log(result)
