// Additive, idempotent catalog enrichment. Existing keys, owner overrides,
// publication choices, suppression and monitor history are never replaced.
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { catalogAdditions } from '../shared/data/opportunity-catalog-additions.ts'
import { catalogExpansion } from '../shared/data/opportunity-catalog-expansion.ts'
import {
  CATALOG_ENRICHMENT_VERSION,
  catalogEnrichment,
} from '../shared/data/opportunity-catalog-enrichment.ts'
import { opportunitySchema } from '../shared/utils/validation.ts'
import { reviewedSources } from '../workers/source-registry.ts'

const apply = process.argv.includes('--apply')
const project = 'xlnjzzbsxzadrvbrggau'
const keys = JSON.parse(
  execFileSync(
    'npx',
    ['--yes', 'supabase', 'projects', 'api-keys', '--project-ref', project, '-o', 'json'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ),
)
const key = keys.find((entry) => entry.name === 'service_role')?.api_key
if (!key || key.includes('***')) throw new Error('Supabase service credential unavailable')
const client = createClient(`https://${project}.supabase.co`, key, {
  auth: { persistSession: false },
})
const { data: rows, error } = await client.from('opportunities').select('id,data,updated_at')
if (error) throw new Error(error.message)

const discipline = (text) => {
  const value = text.toLowerCase(),
    found = []
  const add = (name, pattern) => {
    if (pattern.test(value)) found.push(name)
  }
  add('Biomedical engineering', /biomed|health|medical|bioengineer/)
  add('Robotics', /robot|autonom|manipulat|control/)
  add('Electrical engineering', /electrical|circuit|signal|sensor|electronics/)
  add('Mechanical engineering', /mechanical|manufactur|thermal|fluid|materials|design/)
  add('Biology', /biology|genom|cell|life science|bioinformatics/)
  add('Chemistry', /chemi/)
  add('AI & machine learning', /machine learning|artificial intelligence|\bai\b/)
  add('Computer science', /computer|software|computing|programming/)
  add('Mathematics', /math/)
  add('Physics', /physic|astronom|quantum/)
  add('Materials science', /material|nano/)
  add('Environmental science', /climate|environment|earth science/)
  return [...new Set(found)]
}
const aliases = (title) => {
  const values = []
  for (const token of [
    'NeurIPS',
    'ICML',
    'ICLR',
    'IROS',
    'ICRA',
    'CVPR',
    'CoRL',
    'ML4H',
    'ML4PS',
    'JSHS',
    'TXSEF',
    'FWRSEF',
    'ISEF',
    'USACO',
    'USABO',
    'PROMYS',
    'PRIMES',
    'JOSS',
    'arXiv',
  ])
    if (new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(title))
      values.push(token)
  return values
}
const policy = (eligibility) => {
  const value = eligibility.toLowerCase()
  if (/high.school students? (?:are )?(?:not eligible|excluded)|undergraduate.only/.test(value))
    return 'excluded'
  if (
    !/no school.year restriction|confirm minor|not a high.school program/.test(value) &&
    /high.school (?:students|seniors|juniors|teams)|students? in grades?|secondary.school students?|ages? 1[3-8]/.test(
      value,
    )
  )
    return 'supported'
  return 'not-stated'
}
const routeType = {
  Competition: 'competition',
  Program: 'program',
  Publication: 'publication',
  Workshop: 'workshop-contribution',
  Conference: 'paper',
  Internship: 'internship',
  'Summer program': 'summer-program',
}
const stage = (item, hs) => {
  if (item.kind === 'Publication') return ['completed-research']
  if (item.kind === 'Workshop' || item.kind === 'Conference')
    return ['preliminary-results', 'completed-research']
  if (item.kind === 'Program') return ['learning-team-practice']
  if (hs === 'supported') return ['idea', 'prototype', 'preliminary-results', 'completed-research']
  return ['completed-research']
}
const curatedPatches = {
  'catalog:machine-learning-health': {
    disciplines: ['AI & machine learning', 'Biomedical engineering'],
    topics: ['machine learning', 'healthcare', 'medical imaging', 'clinical data'],
  },
  'catalog:corl-workshops': {
    disciplines: ['Robotics', 'AI & machine learning'],
    topics: ['robot learning', 'robotic manipulation', 'controls', 'autonomy'],
  },
}
let changed = 0
for (const row of rows || []) {
  const item = row.data
  const hs = item.highSchoolPolicy || policy(item.eligibility || '')
  const inferred = {
    canonicalId: item.id,
    aliases: aliases(item.title || ''),
    disciplines: discipline(`${item.discipline || ''} ${item.description || ''}`),
    topics: [],
    highSchoolPolicy: hs,
    highSchoolEvidence:
      hs === 'not-stated'
        ? 'No explicit high-school inclusion or exclusion was verified in the approved record.'
        : item.eligibility,
    preparationStages: stage(item, hs),
    prerequisites: item.effort ? [item.effort] : [],
    costs: { submission: null, registration: null, travel: null, aid: null },
    outcomes: [],
    participationModes: /\bin person\b/i.test(item.location || '')
      ? ['in-person']
      : /online|virtual/i.test(item.location || '')
        ? ['remote-submission']
        : [],
    archival: null,
    routeType: routeType[item.kind],
    searchVersion: 1,
  }
  const catalogId = row.id.startsWith('catalog:') ? row.id.slice('catalog:'.length) : row.id
  const legacyReviewed = curatedPatches[row.id] || {}
  const versionedReviewed = catalogEnrichment[catalogId]
  const shouldUpgrade =
    Boolean(versionedReviewed) && Number(item.searchVersion || 0) < CATALOG_ENRICHMENT_VERSION
  const patch = {
    ...Object.fromEntries(Object.entries(inferred).filter(([name]) => item[name] === undefined)),
    ...Object.fromEntries(
      Object.entries(legacyReviewed).filter(
        ([name]) =>
          item[name] === undefined ||
          (item.searchVersion === 1 && Array.isArray(item[name]) && item[name].length === 0),
      ),
    ),
    ...(shouldUpgrade
      ? Object.fromEntries(
          Object.entries(versionedReviewed).filter(([name]) => name !== 'searchVersion'),
        )
      : {}),
    ...(shouldUpgrade ? { searchVersion: CATALOG_ENRICHMENT_VERSION } : {}),
  }
  if (!Object.keys(patch).length) continue
  changed++
  if (apply) {
    const result = await client
      .from('opportunities')
      .update({ data: { ...item, ...patch } })
      .eq('id', row.id)
      .eq('updated_at', row.updated_at)
    if (result.error) throw new Error(`${row.id}: ${result.error.message}`)
  }
}
const curatedRoutes = [...catalogAdditions, ...catalogExpansion]
for (const item of curatedRoutes) {
  opportunitySchema.parse(item)
  if (apply) {
    const result = await client.from('opportunities').upsert(
      {
        id: item.id,
        source_id: item.sourceId,
        external_id: item.externalId,
        canonical_url: item.url,
        data: item,
        published: true,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    )
    if (result.error) throw new Error(`${item.id}: ${result.error.message}`)
  }
}
if (apply) {
  for (const source of reviewedSources) {
    const result = await client.from('opportunity_source_registry').upsert(
      {
        id: source.id,
        name: source.name,
        authoritative_hub: source.authoritativeHub,
        permitted_host: source.permittedHost,
        permitted_path_prefix: source.permittedPathPrefix,
        source_type: source.sourceType,
        parent_id: source.parentId || null,
        discovery_method: source.discoveryMethod,
        parser_version: source.parserVersion,
        scope: source.scope,
        publication_policy: source.publicationPolicy,
        reviewed_at: source.reviewedAt,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    )
    if (result.error) throw new Error(`${source.id}: ${result.error.message}`)
  }
}
console.log(
  `${apply ? 'Applied' : 'Dry run:'} ${changed} existing records need additive metadata; ${curatedRoutes.length} curated routes and ${reviewedSources.length} reviewed sources are ready. Existing keys and overrides are preserved.`,
)
