import { afterAll, beforeAll, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'

let db: PGlite
const owner = '11111111-1111-4111-8111-111111111111'
const outsider = '22222222-2222-4222-8222-222222222222'

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
    insert into auth.users values ('${owner}'),('${outsider}');
  `)
  for (const migration of ['001_matrix_fellows.sql', '020_calendar_opportunity_selections.sql'])
    await db.exec(await readFile(new URL(`../../supabase/migrations/${migration}`, import.meta.url), 'utf8'))
  await db.exec(`insert into public.editors values ('${owner}')`)
})
afterAll(async () => db?.close())

it('seeds selections idempotently and exposes only enabled settings publicly', async () => {
  await db.exec(await readFile(new URL('../../supabase/migrations/020_calendar_opportunity_selections.sql', import.meta.url), 'utf8'))
  await db.exec(`set role service_role; update public.calendar_opportunity_selections set enabled=false where opportunity_id='catalog:rsi'; reset role; set role anon`)
  const rows = (await db.query(`select opportunity_id from public.calendar_opportunity_selections order by opportunity_id`)).rows
  expect(rows.length).toBeGreaterThan(10)
  expect(rows).not.toContainEqual({ opportunity_id: 'catalog:rsi' })
  await expect(db.query(`update public.calendar_opportunity_selections set enabled=false`)).rejects.toThrow(/permission denied/)
  await db.exec('reset role')
})

it('allows editor and service-role changes but not other authenticated users', async () => {
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${outsider}'`)
  expect((await db.query(`select * from public.calendar_opportunity_selections`)).rows).toHaveLength(0)
  expect((await db.query(`update public.calendar_opportunity_selections set priority=1`)).affectedRows).toBe(0)
  await db.exec(`set request.jwt.claim.sub='${owner}'`)
  await db.query(`update public.calendar_opportunity_selections set include_events=false where opportunity_id='catalog:rsi'`)
  expect((await db.query(`select include_events from public.calendar_opportunity_selections where opportunity_id='catalog:rsi'`)).rows[0]).toEqual({ include_events: false })
  await db.exec('reset role')
})
