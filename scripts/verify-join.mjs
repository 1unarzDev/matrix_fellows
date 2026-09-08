import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

process.loadEnvFile('.env.join')
const site = 'https://matrixfellows.com'
const keys = JSON.parse(execFileSync('npx', ['supabase', 'projects', 'api-keys', '--project-ref', 'xlnjzzbsxzadrvbrggau', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))
const serviceKey = keys.find(item => item.name === 'service_role')?.api_key
const anonKey = keys.find(item => item.name === 'anon')?.api_key
assert(serviceKey && anonKey)
const url = 'https://xlnjzzbsxzadrvbrggau.supabase.co'
const db = createClient(url, serviceKey, { auth: { persistSession: false } })
const anon = createClient(url, anonKey, { auth: { persistSession: false } })
const requestId = randomUUID()
const response = { requestId, name: 'Synthetic deployment verification', email: `verification-${requestId}@example.invalid`, grade: 'Other / not in high school', interests: ['Still exploring'], goals: ['Learn research skills'], stage: 'No experience yet', consent: true, website: '' }
try {
  assert.equal((await fetch(`${site}/api/join-sheet`)).status, 401)
  assert.equal((await fetch(`${site}/api/join`, { method: 'POST', headers: { Origin: 'https://unrelated.example', 'Content-Type': 'application/json' }, body: JSON.stringify(response) })).status, 403)
  assert.equal((await fetch(`${site}/api/join`, { method: 'POST', headers: { Origin: site, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...response, consent: false }) })).status, 400)
  for (let i = 0; i < 2; i++) {
    const result = await fetch(`${site}/api/join`, { method: 'POST', headers: { Origin: site, 'Content-Type': 'application/json' }, body: JSON.stringify(response) })
    assert.equal(result.status, 200, `Submission HTTP ${result.status}`)
    assert.equal((await result.json()).ok, true)
  }
  const { data, error } = await db.from('join_responses').select('id,grade').eq('request_id', requestId)
  assert.equal(error, null)
  assert.equal(data.length, 1)
  assert.equal(data[0].grade, response.grade)
  const sheet = await fetch(`${site}/api/join-sheet?after=${data[0].id - 1}`, { headers: { Authorization: `Bearer ${process.env.NUXT_SHEETS_SYNC_TOKEN}` } })
  assert.equal(sheet.status, 200)
  assert.equal((await sheet.json()).responses.some(row => row.id === data[0].id), true)
  assert((await anon.from('join_responses').select('id')).error)
  assert((await anon.rpc('join_response_analytics')).error)
  console.log('PASS: live capture, retry deduplication, grade storage, sync endpoint, origin/consent checks, and private-data access controls.')
} finally {
  const { error } = await db.from('join_responses').delete().eq('request_id', requestId)
  if (error) throw new Error(`Could not remove synthetic response ${requestId}; delete it from admin.`)
  console.log('Synthetic verification response removed; real responses were untouched.')
}
