// Read-only checks against the public deployment; no credentials required.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parse } from 'node-html-parser'
import { officialProfiles } from '../workers/official-sources.ts'
import { catalogSeeds } from '../workers/catalog.ts'
import { opportunitySchema } from '../shared/utils/validation.ts'

const origin = 'https://matrixfellows.com'
for (const agent of ['facebookexternalhit/1.1', 'Twitterbot/1.0', 'Discordbot/2.0']) {
  const response = await fetch(origin, {
    headers: { 'user-agent': agent },
    signal: AbortSignal.timeout(15000),
  })
  assert.equal(response.status, 200)
  const html = parse(await response.text())
  const meta = (key) =>
    html.querySelector(`meta[property="${key}"],meta[name="${key}"]`)?.getAttribute('content')
  assert.equal(meta('og:url'), `${origin}/`)
  assert.equal(meta('og:image'), `${origin}/social-card.png?v=horizon-2`)
  assert.equal(meta('twitter:card'), 'summary_large_image')
  assert.equal(meta('twitter:image'), meta('og:image'))
  assert.ok(meta('og:title')?.includes('Matrix Fellows'))
  const image = await fetch(meta('og:image'), {
    headers: { 'user-agent': agent },
    signal: AbortSignal.timeout(15000),
  })
  assert.equal(image.status, 200)
  assert.ok(image.headers.get('content-type')?.includes('image/png'))
  const bytes = Buffer.from(await image.arrayBuffer())
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.equal(bytes.readUInt32BE(16), 1200)
  assert.equal(bytes.readUInt32BE(20), 630)
  assert.deepEqual(
    bytes,
    await readFile(new URL('../public/social-card.png', import.meta.url)),
    'Live preview differs from committed artwork',
  )
  console.log(`${agent}: server-rendered metadata and 1200×630 PNG OK`)
}
const response = await fetch(`${origin}/api/content?verification=${Date.now()}`, {
  signal: AbortSignal.timeout(15000),
})
assert.equal(response.status, 200)
const data = await response.json()
assert.equal(data.configured, true)
assert.ok(
  !data.unavailable,
  'Database unavailable; fallback content is not a successful live check',
)
for (const profile of officialProfiles) {
  const item = opportunitySchema.parse(
    data.opportunities.find((item) => item.sourceId === profile.id),
  )
  assert.equal(item.published, true)
  assert.equal(item.provenance?.url, profile.url)
  assert.ok(
    item.milestones?.length || profile.parser === 'davidson',
    `${profile.id}: missing date evidence`,
  )
  console.log(`${profile.name}: published with source provenance`)
}
for (const { item: expected } of catalogSeeds) {
  const item = opportunitySchema.parse(data.opportunities.find((item) => item.id === expected.id))
  assert.equal(item.published, true)
  assert.ok(item.monitoring, 'Annual monitoring health missing from public record')
  console.log(`${item.title}: catalog + timeline + monitoring health OK`)
}
