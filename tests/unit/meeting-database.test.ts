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
  for (const migration of ['001_matrix_fellows.sql', '019_meeting_management.sql'])
    await db.exec(
      await readFile(new URL(`../../supabase/migrations/${migration}`, import.meta.url), 'utf8'),
    )
  await db.exec(`insert into public.editors values ('${owner}')`)
})

afterAll(async () => db?.close())

it('backfills the schedule without duplicating it and exposes only published meetings', async () => {
  await db.exec(
    await readFile(
      new URL('../../supabase/migrations/019_meeting_management.sql', import.meta.url),
      'utf8',
    ),
  )
  await db.exec('set role anon')
  expect(
    (await db.query('select id,status from public.meetings order by meeting_date')).rows,
  ).toEqual([
    { id: 'first-exchange-2026-09-25', status: 'confirmed' },
    { id: 'isef-pathway-2026-10-09', status: 'tentative' },
  ])
  await expect(db.query('select created_at from public.meetings')).rejects.toThrow(
    /permission denied/,
  )
  await expect(
    db.query("delete from public.meetings where id='first-exchange-2026-09-25'"),
  ).rejects.toThrow(/permission denied/)
  await db.exec('reset role')
})

it('allows only editors or the server to mutate meetings and keeps lockout state server-only', async () => {
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${outsider}'`)
  expect((await db.query('select id from public.meetings')).rows).toHaveLength(0)
  expect(
    (
      await db.query(
        "update public.meetings set status='confirmed' where id='isef-pathway-2026-10-09'",
      )
    ).affectedRows,
  ).toBe(0)
  await expect(db.query('select * from public.meeting_admin_attempts')).rejects.toThrow(
    /permission denied/,
  )

  await db.exec(`set request.jwt.claim.sub='${owner}'`)
  await db.query(
    "update public.meetings set status='confirmed', location='Martin HS · 186C' where id='isef-pathway-2026-10-09'",
  )
  expect(
    (
      await db.query(
        "select status,location from public.meetings where id='isef-pathway-2026-10-09'",
      )
    ).rows[0],
  ).toEqual({
    status: 'confirmed',
    location: 'Martin HS · 186C',
  })

  await db.exec('reset role; set role service_role')
  await db.query('insert into public.meeting_admin_attempts(rate_key,attempts) values ($1,1)', [
    'a'.repeat(64),
  ])
  expect((await db.query('select attempts from public.meeting_admin_attempts')).rows).toEqual([
    { attempts: 1 },
  ])
  await db.exec('reset role')
})
