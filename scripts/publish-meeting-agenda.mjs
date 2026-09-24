// Idempotently publish only the first-meeting agenda. This deliberately leaves
// schedule, location, RSVP URL, projects, links, and unrelated owner edits alone.
// Run with: npx tsx scripts/publish-meeting-agenda.mjs
import { execFileSync } from 'node:child_process'
import { defaultContent } from '../shared/data/defaults.ts'
import { contentSchema } from '../shared/utils/validation.ts'

contentSchema.parse(defaultContent)
const topics = `'${JSON.stringify(defaultContent.meeting.topics).replaceAll("'", "''")}'::jsonb`
const query = `
update public.site_content
set data = jsonb_set(data, '{meeting,topics}', ${topics}, true),
    draft = jsonb_set(coalesce(draft, data), '{meeting,topics}', ${topics}, true)
where id = 'main'
returning id, published, data->'meeting'->'topics' as meeting_topics,
  draft->'meeting'->'topics' as draft_meeting_topics;
`

const result = execFileSync(
  'npx',
  ['--yes', 'supabase', 'db', 'query', '--linked', '--project-ref', 'xlnjzzbsxzadrvbrggau', query],
  { encoding: 'utf8', env: { ...process.env, npm_config_loglevel: 'error' } },
)
console.log(result)
