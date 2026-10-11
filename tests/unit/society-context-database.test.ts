import { afterAll, beforeAll, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'

let db: PGlite
const actor = '11111111-1111-4111-8111-111111111111'

beforeAll(async () => {
  db = new PGlite()
  await db.exec(
    `create role anon; create role authenticated; create role service_role bypassrls;
     create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
     create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
     insert into auth.users values('${actor}','officer@example.com',now());`,
  )
  for (const name of ['023_outreach_workspace.sql', '20261010110000_society_context_cloud.sql', '20261011114508_society_source_date_ranges.sql'])
    await db.exec(await readFile(new URL('../../supabase/migrations/' + name, import.meta.url), 'utf8'))
  await db.exec(`set role service_role; insert into outreach_members(user_id,email,role)values('${actor}','officer@example.com','officer'); reset role`)
})

afterAll(async () => db?.close())

it('claims a queued source, creates structured context, and keeps raw sources behind service role', async () => {
  await db.exec('set role service_role')
  const source = (
    await db.query<{ id: string }>(
      `insert into outreach_society_sources(submitted_by,kind,title,content_text,source_date)
       values($1,'text','UTA introduction','From: Dr. Ada Lovelace <ada@uta.edu>\nWe would be happy to connect about this project. https://github.com/matrix/project','2026-10-10') returning id`,
      [actor],
    )
  ).rows[0]!.id
  await db.query('insert into outreach_society_context_jobs(source_id) values($1)', [source])
  await db.query("update outreach_society_sources set source_end_date='2026-10-12' where id=$1", [source])
  expect((await db.query('select source_date,source_end_date from outreach_society_sources where id=$1', [source])).rows[0]).toEqual({ source_date: new Date('2026-10-10T00:00:00.000Z'), source_end_date: new Date('2026-10-12T00:00:00.000Z') })
  const job = (await db.query<{ id: string; claim_token: string }>("select * from outreach_claim_society_context_jobs('test',1)")).rows[0]!
  expect(job.id).toBeDefined()
  expect((await db.query('select outreach_finish_society_context_job($1,$2,$3)', [job.id, job.claim_token, { entries: [{ kind: 'connection', title: 'UTA introduction', summary: 'A dated introduction.', organization: 'UTA', personName: 'Dr. Ada Lovelace', connectionDate: '2026-10-10', projectUrl: 'https://github.com/matrix/project', status: 'introduced', confidence: 'unreviewed' }] }])).rows[0]).toBeDefined()
  expect((await db.query('select title,organization,status from outreach_society_context_entries')).rows).toEqual([
    { title: 'UTA introduction', organization: 'UTA', status: 'introduced' },
  ])
  await db.exec('reset role')
  await db.exec('set role authenticated')
  await expect(db.query('select * from outreach_society_sources')).rejects.toThrow('permission denied')
  await db.exec('reset role')
})
