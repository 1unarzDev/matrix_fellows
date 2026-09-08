import { beforeAll, afterAll, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
let db: PGlite
const owner = '11111111-1111-4111-8111-111111111111'
const response = {
  requestId: owner,
  name: 'Test Fellow',
  email: 'test@example.org',
  grade: '11th grade',
  interests: ['Still exploring'],
  goals: ['Find research partners'],
  stage: 'No experience yet',
  note: 'More hands-on robotics workshops, please.',
}
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
    insert into auth.users values ('${owner}');`)
  for (const file of [
    '001_matrix_fellows.sql',
    '004_join_responses.sql',
    '005_lean_join_form.sql',
    '006_shared_network_join_limit.sql',
    '007_join_feedback.sql',
  ])
    await db.exec(
      await readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), 'utf8'),
    )
  await db.exec(`insert into public.editors values ('${owner}')`)
})
afterAll(async () => {
  await db?.close()
})
it('only the server can capture responses and retries are idempotent', async () => {
  await db.exec('set role service_role')
  await db.query('select public.submit_join_response($1,$2)', [JSON.stringify(response), 'hash'])
  await db.query('select public.submit_join_response($1,$2)', [JSON.stringify(response), 'hash'])
  expect((await db.query('select * from public.join_responses')).rows).toHaveLength(1)
  expect((await db.query<{ note: string }>('select note from public.join_responses')).rows[0]!.note).toBe(response.note)
  await db.exec('set role anon')
  await expect(db.query('select * from public.join_responses')).rejects.toThrow(/permission denied/)
  await expect(
    db.query('select public.submit_join_response($1,$2)', [JSON.stringify(response), 'other']),
  ).rejects.toThrow(/permission denied/)
  await db.exec('reset role')
})
it('outsiders cannot read responses or analytics; editors can', async () => {
  await db.exec(
    "set role authenticated; set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222'",
  )
  expect((await db.query('select * from public.join_responses')).rows).toHaveLength(0)
  await expect(db.query('select public.join_response_analytics()')).rejects.toThrow(/Unauthorized/)
  await db.exec(`set request.jwt.claim.sub='${owner}'`)
  expect((await db.query('select * from public.join_responses')).rows).toHaveLength(1)
  const stats = (
    await db.query<{ stats: { total: number; interests: unknown[] } }>(
      'select public.join_response_analytics() as stats',
    )
  ).rows[0]!.stats
  expect(stats.total).toBe(1)
  expect(stats.interests).toEqual([{ label: 'Still exploring', count: 1 }])
  await db.exec('reset role')
})
it('limits repeated submissions in the database', async () => {
  await db.exec('set role service_role')
  for (let i = 0; i < 120; i++)
    await db.query('select public.submit_join_response($1,$2)', [
      JSON.stringify(response),
      'limited',
    ])
  await expect(
    db.query('select public.submit_join_response($1,$2)', [JSON.stringify(response), 'limited']),
  ).rejects.toThrow(/try again later/)
  await db.exec('reset role')
})
