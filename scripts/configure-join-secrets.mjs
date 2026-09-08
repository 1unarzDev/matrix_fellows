import { execFileSync, spawnSync } from 'node:child_process'

// Credentials travel through subprocess stdin, never console output or argv.
process.loadEnvFile('.env.join')
const token = process.env.NUXT_SHEETS_SYNC_TOKEN
if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new Error('Missing valid .env.join sync token')
const output = execFileSync('npx', ['supabase', 'projects', 'api-keys', '--project-ref', 'xlnjzzbsxzadrvbrggau', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const keys = JSON.parse(output)
const key = keys.find(item => item.name === 'service_role')?.api_key
if (!key || !key.startsWith('eyJ')) throw new Error('Could not retrieve the Matrix Fellows service credential')
for (const [name, value] of Object.entries({ NUXT_SUPABASE_SERVICE_ROLE_KEY: key, NUXT_SHEETS_SYNC_TOKEN: token })) {
  const result = spawnSync('npx', ['wrangler', 'secret', 'put', name, '--name', 'matrix-fellows'], { input: value, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
  if (result.status !== 0) throw new Error(`Could not install ${name}; check Cloudflare authentication.`)
  console.log(`Installed ${name} on matrix-fellows.`)
}
