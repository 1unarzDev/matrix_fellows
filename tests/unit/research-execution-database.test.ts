import { afterAll, beforeAll, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
let db: PGlite
let job: string, claim: string
beforeAll(async () => {
  db = new PGlite()
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`,
  )
  for (const name of [
    '023_outreach_workspace.sql',
    '024_outreach_mail.sql',
    '028_member_dashboard.sql',
    '20261008005351_dashboard_canonical_plan.sql',
    '20261009170000_research_profiles.sql',
    '20261009172000_officer_relationships.sql',
    '20261010015431_research_execution.sql',
    '20261010020426_research_evidence_approval_guard.sql',
    '20261010020659_research_matches_and_projection_guards.sql',
  ])
    await db.exec(
      await readFile(new URL('../../supabase/migrations/' + name, import.meta.url), 'utf8'),
    )
  await db.exec(
    `update outreach_settings set paused=false,source_request_limit=1;insert into outreach_sources(id,url,allowed_hosts,kind) values('source','https://uta.edu/research',array['uta.edu'],'directory');insert into outreach_jobs(work_key,kind,source_id) values('case','discover','source');`,
  )
  const result = await db.query<{ id: string; claim_token: string }>(
    `select * from outreach_claim_jobs('test',1)`,
  )
  job = result.rows[0]!.id
  claim = result.rows[0]!.claim_token
})
afterAll(async () => db?.close())
const reserve = (stage: string, key: string, token = claim) =>
  db.query<{ value: any }>("select outreach_reserve_stage($1,$2,$3,$4,'source') value", [
    job,
    token,
    stage,
    key,
  ])
it('reservations are atomic, caches survive retries, and stale claims cannot apply results', async () => {
  const results = await Promise.allSettled([reserve('acquire', 'url'), reserve('related', 'url2')])
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
  expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
  const usage = await db.query<{ source_requests: number }>(
    'select source_requests from research_resource_usage',
  )
  expect(usage.rows[0]!.source_requests).toBe(1)
  const completed = results.find(
    (result) => result.status === 'fulfilled',
  ) as PromiseFulfilledResult<any>
  const id = completed.value.rows[0].value.id
  expect(
    (
      await db.query<{ ok: boolean }>('select outreach_finish_stage($1,$2,$3,$4) ok', [
        id,
        job,
        claim,
        { hash: 'a'.repeat(64) },
      ])
    ).rows[0]!.ok,
  ).toBe(true)
  const row = (
    await db.query<{ stage: string; input_key: string }>(
      'select stage,input_key from research_stage_runs where id=$1',
      [id],
    )
  ).rows[0]!
  expect((await reserve(row.stage, row.input_key)).rows[0]!.value.cached).toBe(true)
  await expect(reserve('stale', 'x', crypto.randomUUID())).rejects.toThrow('lease expired')
  expect(
    (
      await db.query<{ ok: boolean }>('select outreach_finish_stage($1,$2,$3,$4) ok', [
        id,
        job,
        crypto.randomUUID(),
        {},
      ])
    ).rows[0]!.ok,
  ).toBe(false)
})
it('stage results and quota totals are inaccessible to members and mutation RPCs are service-only', async () => {
  await db.exec('set role authenticated')
  expect((await db.query('select * from research_stage_runs')).rows).toHaveLength(0)
  await expect(reserve('forged', 'private')).rejects.toThrow('permission denied')
  await db.exec('reset role')
})
it('bounds queued refresh jobs without charging idempotent duplicate work', async () => {
  await db.exec('update outreach_settings set job_queue_limit=2')
  await db.exec(
    "insert into outreach_jobs(work_key,kind,source_id)values('second','discover','source')",
  )
  await expect(
    db.exec(
      "insert into outreach_jobs(work_key,kind,source_id)values('third','discover','source')",
    ),
  ).rejects.toThrow('capacity')
  await db.exec(
    "insert into outreach_jobs(work_key,kind,source_id)values('second','discover','source') on conflict(work_key) do nothing",
  )
  expect((await db.query('select id from outreach_jobs')).rows).toHaveLength(2)
})
it('quota waits preserve completed evidence and admin retry retains charges with a fresh stage attempt', async () => {
  const actor = '11111111-1111-4111-8111-111111111111'
  await db.exec(
    `insert into auth.users(id,email,email_confirmed_at)values('${actor}','admin@example.com',now());insert into outreach_members(user_id,email,role)values('${actor}','admin@example.com','admin');`,
  )
  await db.exec('update outreach_settings set model_request_limit=10,model_token_limit=100000')
  const reservation = (
    await db.query<{ value: any }>(
      "select outreach_reserve_stage($1,$2,'analyze','hash','model') value",
      [job, claim],
    )
  ).rows[0]!.value
  await db.query(
    "select outreach_finish_stage($1,$2,$3,'{}','Free model quota exhausted; no paid fallback')",
    [reservation.id, job, claim],
  )
  expect(
    (
      await db.query<{ status: string }>('select status from research_stage_runs where id=$1', [
        reservation.id,
      ])
    ).rows[0]!.status,
  ).toBe('waiting_quota')
  await db.query(
    "select outreach_complete_job($1,$2,'{}','Free model quota exhausted; no paid fallback')",
    [job, claim],
  )
  expect(
    (
      await db.query<{ failure_kind: string }>(
        'select failure_kind from outreach_jobs where id=$1',
        [job],
      )
    ).rows[0]!.failure_kind,
  ).toBe('quota_wait')
  const before = (await db.query('select model_requests from research_resource_usage')).rows
  await expect(
    db.query('select outreach_retry_job($1,$2)', [job, crypto.randomUUID()]),
  ).rejects.toThrow('Administrator')
  await db.query('select outreach_retry_job($1,$2)', [job, actor])
  expect((await db.query('select model_requests from research_resource_usage')).rows).toEqual(
    before,
  )
  const claimed = (
    await db.query<{ claim_token: string }>("select * from outreach_claim_jobs('retry',1)")
  ).rows[0]!
  const next = (
    await db.query<{ value: any }>(
      "select outreach_reserve_stage($1,$2,'analyze','hash','model') value",
      [job, claimed.claim_token],
    )
  ).rows[0]!.value
  expect(next.resumed).toBe(false)
  expect(
    (
      await db.query<{ attempt: number }>('select attempt from research_stage_runs where id=$1', [
        next.id,
      ])
    ).rows[0]!.attempt,
  ).toBe(2)
})
