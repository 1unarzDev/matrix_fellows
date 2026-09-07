// Explicit, scoped content publication. Does not replace links, benefits,
// meeting topics/RSVP URLs, opportunities, or unrelated owner drafts.
// Run with: npx tsx scripts/publish-research-content.mjs
import { execFileSync } from 'node:child_process'
import { defaultContent } from '../shared/data/defaults.ts'
import { contentSchema } from '../shared/utils/validation.ts'

contentSchema.parse(defaultContent)
const { title, date, time, timezone, location } = defaultContent.meeting
const literal = (value) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`
const meeting = literal({ title, date, time, timezone, location })
const projects = literal(defaultContent.projects)
const query = `
insert into public.site_content(id, data, draft, published)
values ('main', ${literal(defaultContent)}, ${literal(defaultContent)}, true)
on conflict (id) do update
set data = jsonb_set(jsonb_set(data, '{meeting}', coalesce(data->'meeting','{}'::jsonb) || ${meeting}), '{projects}', ${projects}),
    draft = jsonb_set(jsonb_set(coalesce(draft,data), '{meeting}', coalesce(coalesce(draft,data)->'meeting','{}'::jsonb) || ${meeting}), '{projects}', ${projects})
returning id, published, data->'meeting'->>'date' as meeting_date, jsonb_array_length(data->'projects') as project_count;
`
const result = execFileSync(
  'npx',
  ['--yes', 'supabase', 'db', 'query', '--project-ref', 'xlnjzzbsxzadrvbrggau', query],
  { encoding: 'utf8' },
)
console.log(result)
