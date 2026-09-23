// Narrow, idempotent corrections for routes whose official participation
// requirements were reviewed on 2026-09-22. This does not reseed records,
// alter visibility, touch owner overrides, or refresh unrelated deadline facts.
import { execFileSync } from 'node:child_process'
import { isDeepStrictEqual } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import { opportunitySchema } from '../shared/utils/validation.ts'

const apply = process.argv.includes('--apply')
const observedAt = '2026-09-22T00:00:00Z'
const patches = {
  'queer-ai-neurips-2026:main': {
    location: 'Sydney · Paris · Atlanta · virtual',
    costs: {
      submission:
        'A workshop contribution submission was required; the call does not state a submission fee.',
      registration:
        'NeurIPS uses paid in-person and virtual registration categories; confirm the category required for this workshop.',
      travel:
        'Travel and lodging may be needed for in-person sessions in Sydney, Paris, or Atlanta; workshop funding was not stated.',
    },
    participationModes: ['in-person', 'hybrid', 'remote-presentation'],
    evidence: [
      {
        field: 'costs.submission',
        url: 'https://www.queerinai.com/neurips-2026',
        quote: 'Final submission deadline: September 10, 2026 AoE',
      },
      {
        field: 'costs.registration',
        url: 'https://neurips.cc/Conferences/2026/Pricing',
        quote:
          "Virtual Only Pass The virtual only pass includes virtual-only access to the entire conference's live streams and the ability to interact using Rocket Chat.",
      },
      {
        field: 'costs.travel',
        url: 'https://www.queerinai.com/neurips-2026',
        quote:
          'Sydney, Australia: Dec 06-12 Paris, France: Dec 09-13 Atlanta, Georgia, USA: Dec 09-13',
      },
      {
        field: 'participationModes',
        url: 'https://www.queerinai.com/neurips-2026',
        quote: 'Affinity poster session (in-person) Social (in-person) Full-day workshop (hybrid)',
      },
    ],
    monitorUrls: [
      'https://www.queerinai.com/neurips-2026',
      'https://neurips.cc/Conferences/2026/Pricing',
      'https://neurips.cc/Conferences/2026/Hotels',
    ],
  },
  'icra-2027:main': {
    location: 'COEX, Seoul, South Korea · in person',
    costs: {
      submission:
        'A complete paper submission is required; the inspected call does not state a submission fee.',
      registration:
        'On-site presenters and student attendees must register; the 2027 amount was not yet published.',
      travel:
        'An on-site presenter is required in Seoul, so travel and lodging may be necessary; support was not verified.',
    },
    participationModes: ['in-person'],
    evidence: [
      {
        field: 'costs.submission',
        url: 'https://2027.ieee-icra.org/contribute/call-for-icra-2027-papers-now-accepting-submissions/',
        quote:
          'The page limit is 8 pages for the complete paper (text, figures, tables, acknowledgement, bibliography/references).',
      },
      {
        field: 'costs.registration',
        url: 'https://2027.ieee-icra.org/contribute/call-for-icra-2027-papers-now-accepting-submissions/',
        quote:
          'All onsite student attendees (for workshops/tutorials) must register either for the workshops or for the entire conference to gain access.',
      },
      {
        field: 'costs.travel',
        url: 'https://2027.ieee-icra.org/contribute/call-for-icra-2027-papers-now-accepting-submissions/',
        quote:
          'ICRA 2027 will be an on-site conference. There will be no option to present a paper online.',
      },
    ],
    monitorUrls: [
      'https://2027.ieee-icra.org/contribute/call-for-icra-2027-papers-now-accepting-submissions/',
      'https://2027.ieee-icra.org/',
    ],
  },
  'cvpr-2027:main': {
    location: 'Seattle, Washington · in person',
    costs: {
      submission:
        'Paper registration and full-paper submission are separate required steps; no submission fee was stated on the dates page.',
      travel:
        'In-person attendance in Seattle may require travel and lodging; organizer coverage was not verified.',
    },
    participationModes: ['in-person'],
    evidence: [
      {
        field: 'costs.submission',
        url: 'https://cvpr.thecvf.com/Conferences/2027/Dates',
        quote:
          "Paper Registration Deadline Nov 10 '26 (Anywhere on Earth) Submission Deadline Nov 16 '26 (Anywhere on Earth)",
      },
      {
        field: 'costs.travel',
        url: 'https://cvpr.thecvf.com/Conferences/2027',
        quote: 'CVPR 2027 Seattle WA June 20–25, 2027',
      },
    ],
    monitorUrls: [
      'https://cvpr.thecvf.com/Conferences/2027/Dates',
      'https://cvpr.thecvf.com/Conferences/2027',
    ],
  },
  'catalog:iscas-2027-live-demonstration': {
    costs: {
      submission:
        'A one-page live-demonstration description is required; the call does not state a submission fee.',
    },
    evidence: [
      {
        field: 'costs.submission',
        url: 'https://2027.ieee-iscas.org/call-for-papers',
        quote:
          'The one-page demo description needs to be based on either an already published paper (as a demo for the first time) or a new paper submitted to ISCAS 2027.',
      },
    ],
  },
}

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

let changed = 0
for (const [id, patch] of Object.entries(patches)) {
  const row = await client
    .from('opportunities')
    .select('data,updated_at')
    .eq('id', id)
    .maybeSingle()
  if (row.error) throw new Error(`${id}: ${row.error.message}`)
  if (!row.data) continue
  const current = row.data.data
  const costs = { ...(current.costs || {}) }
  for (const [field, value] of Object.entries(patch.costs || {})) {
    if (!costs[field]) costs[field] = value
  }
  const evidence = [...(current.fieldEvidence || [])]
  for (const entry of patch.evidence || []) {
    if (!evidence.some((existing) => existing.field === entry.field && existing.url === entry.url))
      evidence.push({ ...entry, observedAt, confirmedAt: observedAt })
  }
  const data = opportunitySchema.parse({
    ...current,
    costs,
    location:
      !current.location || /see official|not stated/i.test(current.location)
        ? patch.location || current.location
        : current.location,
    participationModes: [
      ...new Set([...(current.participationModes || []), ...(patch.participationModes || [])]),
    ],
    fieldEvidence: evidence,
  })
  if (isDeepStrictEqual(data, current)) continue
  changed++
  if (!apply) continue
  const result = await client
    .from('opportunities')
    .update({ data })
    .eq('id', id)
    .eq('updated_at', row.data.updated_at)
  if (result.error) throw new Error(`${id}: ${result.error.message}`)

  if (patch.monitorUrls?.length) {
    const monitor = await client
      .from('opportunity_monitors')
      .select('seed')
      .eq('id', id)
      .maybeSingle()
    if (monitor.error) throw new Error(`${id} monitor: ${monitor.error.message}`)
    if (monitor.data) {
      const seed = monitor.data.seed
      const sourceUrls = [...new Set([...(seed.sourceUrls || []), ...patch.monitorUrls])]
      const saved = await client
        .from('opportunity_monitors')
        .update({ seed: { ...seed, sourceUrls } })
        .eq('id', id)
      if (saved.error) throw new Error(`${id} monitor: ${saved.error.message}`)
    }
  }
}

console.log(`${apply ? 'Applied' : 'Dry run:'} ${changed} participation corrections.`)
