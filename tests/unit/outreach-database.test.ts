import { afterAll, beforeAll, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
let db: PGlite
const officer = '11111111-1111-4111-8111-111111111111',
  outsider = '22222222-2222-4222-8222-222222222222'
beforeAll(async () => {
  db = new PGlite()
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;insert into auth.users values('${officer}'),('${outsider}');`,
  )
  await db.exec(
    await readFile(
      new URL('../../supabase/migrations/023_outreach_workspace.sql', import.meta.url),
      'utf8',
    ),
  )
  await db.exec(
    `insert into outreach_members(user_id,email) values('${officer}','officer@example.edu');`,
  )
})
afterAll(async () => {
  await db?.close()
})
it('keeps the workspace private and prevents self-enrolment or direct approval bypass', async () => {
  await db.exec('set role anon')
  await expect(db.query('select * from outreach_targets')).rejects.toThrow(/permission denied/)
  await db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${outsider}'`)
  expect((await db.query('select * from outreach_society')).rows).toHaveLength(0)
  await expect(
    db.query(
      `insert into outreach_members(user_id,email) values('${outsider}','outsider@example.edu')`,
    ),
  ).rejects.toThrow(/permission denied/)
  await db.exec(`set request.jwt.claim.sub='${officer}'`)
  expect((await db.query('select * from outreach_society')).rows).toHaveLength(1)
  await expect(db.query("update outreach_society set name='hijacked'")).rejects.toThrow(
    /permission denied/,
  )
  await expect(db.query("select outreach_claim_jobs('untrusted',2)")).rejects.toThrow(
    /permission denied/,
  )
  await db.exec('reset role')
})
it('invalidates approvals on edits, snapshots revisions and protects uncertain sends', async () => {
  const target = (
    await db.query<{ id: string }>(
      "insert into outreach_targets(name,kind,canonical_url) values('Lab','lab','https://example.edu/lab') returning id",
    )
  ).rows[0]!.id
  const mailbox = (
    await db.query<{ id: string }>(
      `insert into outreach_mailboxes(owner_id,email) values('${officer}','officer@example.edu') returning id`,
    )
  ).rows[0]!.id
  const proposal = (
    await db.query<{ id: string }>(
      "insert into outreach_proposals(target_id,kind,recipient,subject,body,mailbox_id) values($1,'society','pi@example.edu','Research inquiry','A concrete invitation.',$2) returning id",
      [target, mailbox],
    )
  ).rows[0]!.id
  await db.query(
    "update outreach_proposals set status='approved',approved_revision=1,approved_fingerprint='abc' where id=$1",
    [proposal],
  )
  await db.query("update outreach_proposals set body='A changed invitation.' where id=$1", [
    proposal,
  ])
  expect(
    (
      await db.query(
        'select revision,status,approved_fingerprint from outreach_proposals where id=$1',
        [proposal],
      )
    ).rows[0],
  ).toEqual({ revision: 2, status: 'draft', approved_fingerprint: null })
  expect(
    (await db.query('select * from outreach_proposal_revisions where proposal_id=$1', [proposal]))
      .rows,
  ).toHaveLength(2)
  await db.query(
    "insert into outreach_outbox(proposal_id,revision,fingerprint,mailbox_id,status) values($1,2,'abc',$2,'uncertain')",
    [proposal, mailbox],
  )
  await expect(
    db.query("update outreach_proposals set subject='Changed' where id=$1", [proposal]),
  ).rejects.toThrow(/Resolve the sending outcome/)
})
it('admits atomically with weekly, queue and suppression limits and bounded worker leases', async () => {
  await db.exec('update outreach_settings set paused=false,weekly_limit=2,queue_limit=5')
  const payload = (name: string) => ({
    batch_key: 'unit-test-batch',
    name,
    kind: 'lab',
    canonical_url: `https://example.edu/${name}`,
  })
  expect(
    (
      await db.query<{ result: any }>('select outreach_admit_target($1::jsonb) result', [
        JSON.stringify(payload('one')),
      ])
    ).rows[0]!.result.admitted,
  ).toBe(true)
  expect(
    (
      await db.query<{ result: any }>('select outreach_admit_target($1::jsonb) result', [
        JSON.stringify(payload('one')),
      ])
    ).rows[0]!.result.reason,
  ).toBe('duplicate')
  await db.exec(
    "insert into outreach_suppressions values('https://example.edu/no','Do not contact',null,now())",
  )
  expect(
    (
      await db.query<{ result: any }>('select outreach_admit_target($1::jsonb) result', [
        JSON.stringify(payload('no')),
      ])
    ).rows[0]!.result.reason,
  ).toBe('suppressed')
  await db.query('select outreach_admit_target($1::jsonb)', [JSON.stringify(payload('two'))])
  expect(
    (
      await db.query<{ result: any }>('select outreach_admit_target($1::jsonb) result', [
        JSON.stringify(payload('three')),
      ])
    ).rows[0]!.result.reason,
  ).toBe('weekly_limit')
  await db.exec(
    "insert into outreach_sources(id,url,allowed_hosts,kind) values('directory','https://example.edu',array['example.edu'],'directory');insert into outreach_jobs(work_key,kind,source_id) values('a','discover','directory'),('b','discover','directory'),('c','discover','directory')",
  )
  const jobs = (
    await db.query<{ id: string; claim_token: string }>(
      "select * from outreach_claim_jobs('first',2)",
    )
  ).rows
  expect(jobs).toHaveLength(2)
  expect((await db.query("select * from outreach_claim_jobs('second',2)")).rows).toHaveLength(0)
  expect(
    (
      await db.query<{ result: boolean }>(
        'select outreach_complete_job($1,$2,$3::jsonb,null) result',
        [jobs[0]!.id, crypto.randomUUID(), '{}'],
      )
    ).rows[0]!.result,
  ).toBe(false)
  expect(
    (
      await db.query<{ result: boolean }>(
        'select outreach_complete_job($1,$2,$3::jsonb,null) result',
        [jobs[0]!.id, jobs[0]!.claim_token, '{}'],
      )
    ).rows[0]!.result,
  ).toBe(true)
  expect((await db.query("select * from outreach_claim_jobs('second',2)")).rows).toHaveLength(1)
})

it('does not run disabled sources or revive deferred targets and rejects stale leases', async () => {
  await db.exec(
    "update outreach_jobs set status='completed'; update outreach_sources set enabled=false where id='directory'; insert into outreach_jobs(work_key,kind,source_id) values('disabled-source','discover','directory')",
  )
  expect((await db.query("select * from outreach_claim_jobs('test',2)")).rows).toHaveLength(0)
  const target = (
    await db.query<{ id: string }>(
      "insert into outreach_targets(name,kind,canonical_url,status) values('Deferred','lab','https://example.edu/deferred','deferred') returning id",
    )
  ).rows[0]!.id
  await db.query(
    "insert into outreach_jobs(work_key,kind,target_id) values('deferred-target','research',$1)",
    [target],
  )
  expect((await db.query("select * from outreach_claim_jobs('test',2)")).rows).toHaveLength(0)
  await db.query("update outreach_targets set status='needs_review' where id=$1", [target])
  const job = (
    await db.query<{ id: string; claim_token: string }>(
      "select * from outreach_claim_jobs('test',2)",
    )
  ).rows[0]!
  await db.query("update outreach_jobs set lease_until=now()-interval '1 second' where id=$1", [
    job.id,
  ])
  expect(
    (
      await db.query<{ result: boolean }>(
        'select outreach_complete_job($1,$2,$3::jsonb,null) result',
        [job.id, job.claim_token, '{}'],
      )
    ).rows[0]!.result,
  ).toBe(false)
  await db.query("select * from outreach_claim_jobs('next',2)")
  expect(
    (await db.query<{ status: string }>('select status from outreach_jobs where id=$1', [job.id]))
      .rows[0]!.status,
  ).toBe('queued')
})

it('research completion retains an officer decision made while work is running', async () => {
  const target = (
    await db.query<{ id: string }>(
      "insert into outreach_targets(name,kind,canonical_url) values('Reviewed','lab','https://example.edu/reviewed') returning id",
    )
  ).rows[0]!.id
  await db.query(
    "insert into outreach_jobs(work_key,kind,target_id) values('human-decision','research',$1)",
    [target],
  )
  const job = (
    await db.query<{ id: string; claim_token: string }>(
      "select * from outreach_claim_jobs('research',2)",
    )
  ).rows.find((row) => row.id)!
  await db.query("update outreach_targets set status='rejected' where id=$1", [target])
  await db.query('select outreach_complete_job($1,$2,$3::jsonb,null)', [
    job.id,
    job.claim_token,
    JSON.stringify({ acquisition: { pages: [{ text: 'New worker output' }] } }),
  ])
  const row = (
    await db.query<{ status: string; dossier: any }>(
      'select status,dossier from outreach_targets where id=$1',
      [target],
    )
  ).rows[0]!
  expect(row.status).toBe('rejected')
  expect(row.dossier).toEqual({ evidence: [] })
})

it('adds acquired evidence without reverting concurrent officer research or assessments', async () => {
  await db.exec(
    "update outreach_jobs set status='completed';update outreach_settings set paused=false",
  )
  const target = (
    await db.query<{ id: string }>(
      "insert into outreach_targets(name,kind,canonical_url) values('Concurrent','lab','https://example.edu/concurrent') returning id",
    )
  ).rows[0]!.id
  await db.query(
    "insert into outreach_jobs(work_key,kind,target_id) values('concurrent','research',$1)",
    [target],
  )
  const job = (
    await db.query<{ id: string; claim_token: string }>(
      "select * from outreach_claim_jobs('research',1)",
    )
  ).rows[0]!
  await db.query('update outreach_targets set dossier=$2::jsonb,assessment=$3::jsonb where id=$1', [
    target,
    JSON.stringify({
      research: 'Officer-reviewed research',
      evidence: [{ claim: 'Human evidence' }],
    }),
    JSON.stringify({ fit: 30 }),
  ])
  await db.query('select outreach_complete_job($1,$2,$3::jsonb,null)', [
    job.id,
    job.claim_token,
    JSON.stringify({
      acquisition: {
        pages: [{ url: 'https://example.edu/concurrent', text: 'Acquired evidence' }],
      },
      assessment: { fit: 5 },
      dossier: { research: 'Stale snapshot' },
    }),
  ])
  const row = (
    await db.query<{ dossier: any; assessment: any }>(
      'select dossier,assessment from outreach_targets where id=$1',
      [target],
    )
  ).rows[0]!
  expect(row.dossier.research).toBe('Officer-reviewed research')
  expect(row.dossier.evidence).toEqual([{ claim: 'Human evidence' }])
  expect(row.dossier.acquisition.pages[0].text).toBe('Acquired evidence')
  expect(row.assessment.fit).toBe(30)
})

it('rejects discovery admission after its originating job lease is revoked', async () => {
  await db.exec(
    "update outreach_jobs set status='completed';update outreach_settings set paused=false,weekly_limit=100,queue_limit=100",
  )
  await db.exec("insert into outreach_jobs(work_key,kind) values('lease-admission','discover')")
  const job = (
    await db.query<{ id: string; claim_token: string }>(
      "select * from outreach_claim_jobs('research',1)",
    )
  ).rows[0]!
  await db.query("update outreach_jobs set lease_until=now()-interval '1 second' where id=$1", [
    job.id,
  ])
  const result = (
    await db.query<{ result: any }>('select outreach_admit_target($1::jsonb) result', [
      JSON.stringify({
        job_id: job.id,
        claim_token: job.claim_token,
        batch_key: job.id,
        name: 'Stale admission',
        kind: 'lab',
        canonical_url: 'https://example.edu/stale',
      }),
    ])
  ).rows[0]!.result
  expect(result.reason).toBe('stale_lease')
})
it('rejects a primary identity change atomically at acquisition completion', async () => {
  await db.exec(
    "update outreach_jobs set status='completed';update outreach_settings set paused=false",
  )
  const target = (
    await db.query<{ id: string }>(
      "insert into outreach_targets(name,kind,canonical_url) values('Identity race','lab','https://example.edu/old-identity') returning id",
    )
  ).rows[0]!.id
  await db.query(
    "insert into outreach_jobs(work_key,kind,target_id) values('identity-race','research',$1)",
    [target],
  )
  const job = (
    await db.query<{ id: string; claim_token: string }>(
      "select * from outreach_claim_jobs('research',1)",
    )
  ).rows[0]!
  await db.query(
    "update outreach_targets set canonical_url='https://example.edu/new-identity' where id=$1",
    [target],
  )
  const result = (
    await db.query<{ result: boolean }>(
      'select outreach_complete_job($1,$2,$3::jsonb,null) result',
      [
        job.id,
        job.claim_token,
        JSON.stringify({
          acquisition: {
            pages: [{ url: 'https://example.edu/old-identity', text: 'Stale evidence' }],
          },
        }),
      ],
    )
  ).rows[0]!.result
  expect(result).toBe(false)
  expect(
    (await db.query<{ dossier: any }>('select dossier from outreach_targets where id=$1', [target]))
      .rows[0]!.dossier.acquisition,
  ).toBeUndefined()
})
