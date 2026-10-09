import { createRequire } from 'node:module'
import { mkdtempSync, writeFileSync, chmodSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// Provider-only settings, not users, roles, SMTP, OAuth secrets, or templates.
const project = 'xlnjzzbsxzadrvbrggau'
const changes = {
  passkey_enabled: true,
  webauthn_rp_display_name: 'Matrix Fellows',
  webauthn_rp_id: 'matrixfellows.com',
  webauthn_rp_origins: 'https://matrixfellows.com',
  password_min_length: 12,
}
let token = process.env.SUPABASE_ACCESS_TOKEN
if (!token && process.env.SUPABASE_KEYRING_MODULE) {
  const { Entry } = createRequire(import.meta.url)(process.env.SUPABASE_KEYRING_MODULE)
  token = new Entry('Supabase CLI', 'supabase').getPassword()
  if (token?.startsWith('go-keyring-base64:'))
    token = Buffer.from(token.slice('go-keyring-base64:'.length), 'base64').toString('utf8')
}
if (!token)
  throw new Error('Set a scoped SUPABASE_ACCESS_TOKEN in your secret environment, not in source.')
async function request(method = 'GET', body) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${project}/config/auth`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`Auth configuration HTTP ${response.status}`)
  return response.json()
}
const before = await request()
if (before.webauthn_rp_id && before.webauthn_rp_id !== changes.webauthn_rp_id)
  throw new Error('Refusing an RP ID change that would invalidate existing passkeys.')
console.log(
  JSON.stringify({
    project,
    current: Object.fromEntries(Object.keys(changes).map((key) => [key, before[key]])),
    proposed: changes,
  }),
)
if (!process.argv.includes('--apply')) {
  console.log('Preflight only. --apply performs this bounded update.')
  process.exit(0)
}
const backup = mkdtempSync(join(tmpdir(), 'matrix-account-auth-backup.'))
chmodSync(backup, 0o700)
writeFileSync(
  join(backup, 'settings-before.json'),
  JSON.stringify(
    Object.fromEntries(Object.keys(changes).map((key) => [key, before[key]])),
    null,
    2,
  ),
  { mode: 0o600 },
)
await request('PATCH', changes)
const after = await request()
if (Object.entries(changes).some(([key, value]) => after[key] !== value))
  throw new Error('Configuration readback mismatch')
const altered = Object.keys(before).filter(
  (key) =>
    !Object.hasOwn(changes, key) && JSON.stringify(before[key]) !== JSON.stringify(after[key]),
)
if (altered.length) throw new Error(`Unexpected settings changed: ${altered.join(', ')}`)
console.log(
  JSON.stringify({
    verified: true,
    at: new Date().toISOString(),
    unrelatedSettingsUnchanged: true,
    backup,
  }),
)
