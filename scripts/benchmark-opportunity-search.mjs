import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const judgments = JSON.parse(
  await readFile(
    new URL('../tests/fixtures/opportunity-search-judgments.json', import.meta.url),
    'utf8',
  ),
)
const project = 'xlnjzzbsxzadrvbrggau'
const keys = JSON.parse(
  execFileSync(
    'npx',
    ['--yes', 'supabase', 'projects', 'api-keys', '--project-ref', project, '-o', 'json'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ),
)
const anon =
  keys.find((entry) => entry.name === 'anon')?.api_key ||
  keys.find((entry) => entry.name === 'publishable')?.api_key
if (!anon || anon.includes('***')) throw new Error('Public Supabase credential unavailable')
const client = createClient(`https://${project}.supabase.co`, anon, {
  auth: { persistSession: false },
})
const all = await client.rpc('search_opportunities', { p_query: '', p_limit: 50, p_offset: 0 })
if (all.error) throw new Error(all.error.message)
const baseline = (query) =>
  all.data
    .filter((row) => row.item.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5)
    .map((row) => row.id)
const stats = {
  baseline: { hit: 0, rr: 0 },
  lexical: { hit: 0, rr: 0 },
  negative: 0,
  latencies: [],
}
const failures = []
for (const judgment of judgments) {
  const start = performance.now()
  const filters = judgment.filters || {}
  const result = await client.rpc('search_opportunities', {
    p_query: judgment.query,
    p_limit: 5,
    p_offset: 0,
    p_high_school: filters.highSchool || [],
    p_disciplines: filters.disciplines || [],
    p_modes: filters.modes || [],
    p_free_submission: Boolean(filters.free),
  })
  stats.latencies.push(performance.now() - start)
  if (result.error) throw new Error(`${judgment.query}: ${result.error.message}`)
  const ids = result.data.map((row) => row.id)
  for (const row of result.data) {
    if (filters.highSchool?.length && !filters.highSchool.includes(row.item.highSchoolPolicy))
      throw new Error(`Hard-filter violation: ${judgment.query}`)
    if (
      filters.disciplines?.length &&
      !row.item.disciplines?.some((value) => filters.disciplines.includes(value))
    )
      throw new Error(`Discipline-filter violation: ${judgment.query}`)
    if (
      filters.modes?.length &&
      !row.item.participationModes?.some((value) => filters.modes.includes(value))
    )
      throw new Error(`Mode-filter violation: ${judgment.query}`)
  }
  const score = (list) => {
    if (!judgment.expected.length) return list.length ? 0 : 1
    const rank = list.findIndex((id) => judgment.expected.includes(id))
    return rank < 0 ? 0 : 1 / (rank + 1)
  }
  const b = score(baseline(judgment.query)),
    l = score(ids)
  stats.baseline.hit += Number(b > 0)
  stats.baseline.rr += b
  stats.lexical.hit += Number(l > 0)
  stats.lexical.rr += l
  if (!judgment.expected.length && !ids.length) stats.negative++
  if (!l) failures.push({ query: judgment.query, expected: judgment.expected, actual: ids })
}
stats.latencies.sort((a, b) => a - b)
const n = judgments.length,
  p95 = stats.latencies[Math.ceil(n * 0.95) - 1]
console.log(
  JSON.stringify(
    {
      queries: n,
      baseline: { recallAt5: stats.baseline.hit / n, mrr: stats.baseline.rr / n },
      lexicalFuzzy: {
        recallAt5: stats.lexical.hit / n,
        mrr: stats.lexical.rr / n,
        p95Ms: Number(p95.toFixed(1)),
      },
      semantic: 'feature-flagged off; no embedding calls',
      failures,
    },
    null,
    2,
  ),
)
