import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
let db: PGlite
const owner = '11111111-1111-4111-8111-111111111111',
  other = '22222222-2222-4222-8222-222222222222'
beforeAll(async () => {
  db = new PGlite()
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;create table outreach_members(user_id uuid primary key,enabled boolean default true);insert into outreach_members(user_id)values('${owner}'),('${other}');grant select on outreach_members to authenticated;create function outreach_is_member() returns boolean language sql stable as $$select exists(select 1 from outreach_members where user_id=auth.uid() and enabled)$$;create table opportunities(id text primary key,published boolean,suppressed boolean);insert into opportunities values('catalog:stars',true,false),('catalog:hidden',false,false);`,
  )
  await db.exec(
    await readFile(
      new URL(
        '../../supabase/migrations/20261008010345_dashboard_opportunity_decisions.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  )
}, 20000)
afterAll(async () => {
  await db?.close()
})
it('records a pass and undo without modifying catalog or creating obligations', async () => {
  const pass = (
    await db.query<{ decision: any }>(
      'select dashboard_decide_opportunity($1,$2,$3,$4,$5) decision',
      [owner, 'catalog:stars', 'pass', 'Cannot travel', 0],
    )
  ).rows[0]!.decision
  expect(pass).toMatchObject({
    opportunity_id: 'catalog:stars',
    decision: 'pass',
    reason: 'Cannot travel',
    version: 1,
  })
  const clear = (
    await db.query<{ decision: any }>(
      'select dashboard_decide_opportunity($1,$2,$3,$4,$5) decision',
      [owner, 'catalog:stars', 'clear', 'ignored', 1],
    )
  ).rows[0]!.decision
  expect(clear).toMatchObject({ decision: 'clear', reason: '', version: 2 })
  expect(
    (await db.query('select * from opportunities where id=$1', ['catalog:stars'])).rows[0],
  ).toEqual({ id: 'catalog:stars', published: true, suppressed: false })
})
it('rejects stale changes and hidden catalog records', async () => {
  await expect(
    db.query('select dashboard_decide_opportunity($1,$2,$3,$4,$5)', [
      owner,
      'catalog:stars',
      'pass',
      'Stale',
      1,
    ]),
  ).rejects.toThrow(/changed elsewhere/)
  await expect(
    db.query('select dashboard_decide_opportunity($1,$2,$3,$4,$5)', [
      owner,
      'catalog:hidden',
      'pass',
      'Hidden',
      0,
    ]),
  ).rejects.toThrow(/Published opportunity/)
})
it('keeps reasons and captured references private with no direct browser mutation', async () => {
  await db.query(
    'insert into dashboard_opportunity_references(user_id,url,title) values($1,$2,$3)',
    [owner, 'https://example.edu/link', 'Unverified'],
  )
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${other}'`)
  expect((await db.query('select * from dashboard_opportunity_decisions')).rows).toHaveLength(0)
  expect((await db.query('select * from dashboard_opportunity_references')).rows).toHaveLength(0)
  await expect(
    db.query('select dashboard_decide_opportunity($1,$2,$3,$4,$5)', [
      owner,
      'catalog:stars',
      'clear',
      '',
      2,
    ]),
  ).rejects.toThrow(/permission denied/)
  await expect(db.query('delete from dashboard_opportunity_references')).rejects.toThrow(
    /permission denied/,
  )
  await db.exec('reset role')
})
it('deduplicates references by member/URL without merging different members', async () => {
  await expect(
    db.query('insert into dashboard_opportunity_references(user_id,url,title) values($1,$2,$3)', [
      owner,
      'https://example.edu/link',
      'Duplicate',
    ]),
  ).rejects.toThrow(/unique/)
  await db.query(
    'insert into dashboard_opportunity_references(user_id,url,title) values($1,$2,$3)',
    [other, 'https://example.edu/link', 'Other private reference'],
  )
  expect((await db.query('select * from dashboard_opportunity_references')).rows).toHaveLength(2)
})
it('allows undo when a catalog source subsequently becomes unavailable', async () => {
  await db.query('select dashboard_decide_opportunity($1,$2,$3,$4,$5)', [
    owner,
    'catalog:stars',
    'pass',
    'Cannot travel',
    2,
  ])
  await db.query('update opportunities set suppressed=true where id=$1', ['catalog:stars'])
  const clear = (
    await db.query<{ decision: any }>(
      'select dashboard_decide_opportunity($1,$2,$3,$4,$5) decision',
      [owner, 'catalog:stars', 'clear', '', 3],
    )
  ).rows[0]!.decision
  expect(clear).toMatchObject({ decision: 'clear', version: 4 })
})
