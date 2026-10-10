import { afterAll, beforeAll, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
let db: PGlite
const a = '11111111-1111-4111-8111-111111111111',
  b = '22222222-2222-4222-8222-222222222222',
  m = '33333333-3333-4333-8333-333333333333'
let proposal: string
beforeAll(async () => {
  db = new PGlite()
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid()returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid()to authenticated;create table public.opportunities(id text primary key);insert into auth.users values('${a}','a@example.com',now()),('${b}','b@example.com',now()),('${m}','m@example.com',now());`,
  )
  for (const f of [
    '023_outreach_workspace.sql',
    '024_outreach_mail.sql',
    '028_member_dashboard.sql',
    '20261008005351_dashboard_canonical_plan.sql',
    '20261008010345_dashboard_opportunity_decisions.sql',
    '20261009170000_research_profiles.sql',
    '20261009172000_officer_relationships.sql',
    '20261010015431_research_execution.sql',
    '20261010020426_research_evidence_approval_guard.sql',
    '20261010020659_research_matches_and_projection_guards.sql',
    '20261010021349_research_project_enrichment.sql',
    '20261010023000_research_preferences.sql',
    '20261010024500_relationship_alias_duplicate_guard.sql',
    '20261010025500_selected_society_context.sql',
    '20261010030000_officer_voice_preferences.sql',
  ])
    await db.exec(
      await readFile(new URL('../../supabase/migrations/' + f, import.meta.url), 'utf8'),
    )
  await db.exec(
    `insert into outreach_members(user_id,email,role)values('${a}','a@example.com','officer'),('${b}','b@example.com','officer'),('${m}','m@example.com','member');insert into outreach_mailboxes(owner_id,email)values('${a}','a@example.com')`,
  )
  const target = (
    await db.query<{ id: string }>(
      "insert into outreach_targets(name,kind,canonical_url,status,contact_email)values('Lab','lab','https://uta.edu/voice-test','ready','pi@uta.edu')returning id",
    )
  ).rows[0]!.id
  const mailbox = (await db.query<{ id: string }>('select id from outreach_mailboxes')).rows[0]!.id
  proposal = (
    await db.query<{ id: string }>(
      "insert into outreach_proposals(target_id,kind,recipient,subject,body,mailbox_id,created_by)values($1,'society','pi@uta.edu','Question','Hello Lab, would you recommend a public resource?',$2,$3)returning id",
      [target, mailbox, a],
    )
  ).rows[0]!.id
  await db.query(
    "update outreach_proposals set body='Hi Lab, could you suggest a public benchmark to start with? Thanks.' where id=$1",
    [proposal],
  )
  await db.query(
    "select outreach_approve_email($1,2,$2,$3,'pi@uta.edu','Question','Hi Lab, could you suggest a public benchmark to start with? Thanks.','a@example.com')",
    [proposal, 'a'.repeat(64), a],
  )
})
afterAll(async () => db?.close())
it('records immutable features once per exact approval without storing text', async () => {
  const record = () =>
    db.query<{ recorded: boolean }>('select outreach_record_approved_voice($1,$2,2)recorded', [
      a,
      proposal,
    ])
  const results = await Promise.all([record(), record()])
  expect(results.map((result) => result.rows[0]!.recorded).sort()).toEqual([false, true])
  const observations = (
    await db.query<Record<string, unknown>>('select * from officer_voice_observations')
  ).rows
  expect(observations).toHaveLength(1)
  expect(observations[0]).toMatchObject({
    origin: 'approved_edit',
    opening: 'greeting',
    request_style: 'tentative',
  })
  expect(JSON.stringify(observations)).not.toContain('benchmark')
  expect(Object.keys(observations[0]!)).not.toContain('body')
  await expect(
    db.query('select outreach_record_approved_voice($1,$2,1)', [a, proposal]),
  ).rejects.toThrow('Exact')
  await expect(
    db.query('select outreach_record_approved_voice($1,$2,2)', [b, proposal]),
  ).rejects.toThrow('Exact')
})
it('keeps settings and observations officer-private under RLS and live demotion', async () => {
  await db.query('select outreach_set_officer_voice($1,$2)', [a, { length: 'short' }])
  await expect(
    db.query('select outreach_set_officer_voice($1,$2)', [a, { body: 'private' }]),
  ).rejects.toThrow('Invalid')
  await expect(
    db.query('select outreach_set_officer_voice($1,$2)', [a, { length: null }]),
  ).rejects.toThrow('Invalid')
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${a}'`)
  expect((await db.query('select * from officer_voice_observations')).rows).toHaveLength(1)
  await expect(db.query('select outreach_set_officer_voice($1,$2)', [a, {}])).rejects.toThrow(
    'permission denied',
  )
  await db.exec(`set request.jwt.claim.sub='${b}'`)
  expect((await db.query('select * from officer_voice_observations')).rows).toHaveLength(0)
  expect((await db.query('select * from officer_voice_settings')).rows).toHaveLength(0)
  await db.exec('reset role')
  await db.query("update outreach_members set role='member' where user_id=$1", [a])
  await expect(
    db.query('select outreach_record_approved_voice($1,$2,2)', [a, proposal]),
  ).rejects.toThrow('Officer')
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${a}'`)
  expect((await db.query('select * from officer_voice_observations')).rows).toHaveLength(0)
  await db.exec('reset role')
  await expect(db.query('select outreach_set_officer_voice($1,$2)', [m, {}])).rejects.toThrow(
    'Officer',
  )
})
it('records unchanged generated text without treating it as an authored edit', async () => {
  await db.query("update outreach_members set role='officer' where user_id=$1", [a])
  const target = (
    await db.query<{ id: string }>(
      "insert into outreach_targets(name,kind,canonical_url,status,contact_email)values('Other lab','lab','https://uta.edu/voice-unchanged','ready','other@uta.edu')returning id",
    )
  ).rows[0]!.id
  const mailbox = (
    await db.query<{ id: string }>('select id from outreach_mailboxes where owner_id=$1', [a])
  ).rows[0]!.id
  const id = (
    await db.query<{ id: string }>(
      "insert into outreach_proposals(target_id,kind,recipient,subject,body,mailbox_id,created_by)values($1,'society','other@uta.edu','Question','Hello Lab, could you recommend a resource?',$2,$3)returning id",
      [target, mailbox, a],
    )
  ).rows[0]!.id
  await db.query(
    "select outreach_approve_email($1,1,$2,$3,'other@uta.edu','Question','Hello Lab, could you recommend a resource?','a@example.com')",
    [id, 'b'.repeat(64), a],
  )
  await db.query('select outreach_record_approved_voice($1,$2,1)', [a, id])
  expect(
    (
      await db.query<{ origin: string }>(
        'select origin from officer_voice_observations where proposal_id=$1',
        [id],
      )
    ).rows[0]!.origin,
  ).toBe('unchanged_or_unattributed')
  await expect(
    db.query('update officer_voice_observations set word_count=1 where proposal_id=$1', [id]),
  ).rejects.toThrow('immutable')
})
