import { afterAll, beforeAll, expect, it } from 'vitest'
import { PostgresSupabaseTransport } from '../helpers/postgres-supabase-transport'
const transport = new PostgresSupabaseTransport()
const user = '11111111-1111-4111-8111-111111111111'
beforeAll(async () => {
  await transport.initialize()
  // Match production prerequisites without granting unrestricted Auth reads.
  await transport.db.exec("grant usage on schema auth to service_role;grant select on join_responses to service_role;alter table auth.users add column encrypted_password text;")
  await transport.addIdentity(user, 'member@example.com', 'fixture')
  await transport.db.exec('set role service_role')
})
afterAll(async () => { await transport.db.exec('reset role'); await transport.db.close() })
it('application service role can verify and bootstrap a profile without reading passwords', async () => {
  const result = await transport.db.query<{id:string}>('select ensure_member_research_profile($1,$2) id', [user, 'member@example.com'])
  expect(result.rows[0]?.id).toMatch(/^[0-9a-f-]{36}$/)
  expect((await transport.db.query<{id:string}>('select ensure_member_research_profile($1,$2) id', [user, 'member@example.com'])).rows[0]?.id).toBe(result.rows[0]?.id)
  await expect(transport.db.query('select encrypted_password from auth.users')).rejects.toThrow(/permission denied/)
  await expect(transport.db.query('select ensure_member_research_profile($1,$2)', [user, 'another@example.com'])).rejects.toThrow(/Verified account required/)
})
