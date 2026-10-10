import { afterAll, beforeAll, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
let db: PGlite
const a = '11111111-1111-4111-8111-111111111111',
  b = '22222222-2222-4222-8222-222222222222',
  m = '33333333-3333-4333-8333-333333333333'
beforeAll(async () => {
  db = new PGlite()
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid()returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid()to authenticated;insert into auth.users values('${a}','a@example.com',now()),('${b}','b@example.com',now()),('${m}','m@example.com',now());`,
  )
  for (const f of [
    '023_outreach_workspace.sql',
    '024_outreach_mail.sql',
    '028_member_dashboard.sql',
    '20261008005351_dashboard_canonical_plan.sql',
    '20261009170000_research_profiles.sql',
    '20261009172000_officer_relationships.sql',
    '20261010015431_research_execution.sql',
    '20261010020426_research_evidence_approval_guard.sql',
    '20261010020659_research_matches_and_projection_guards.sql','20261010023000_research_preferences.sql','20261010024500_relationship_alias_duplicate_guard.sql','20261010025500_selected_society_context.sql','20261010030000_officer_voice_preferences.sql',
  ])
    await db.exec(
      await readFile(new URL('../../supabase/migrations/' + f, import.meta.url), 'utf8'),
    )
  await db.exec(
    `insert into outreach_members(user_id,email,role)values('${a}','a@example.com','officer'),('${b}','b@example.com','officer'),('${m}','m@example.com','member');insert into outreach_targets(name,kind,canonical_url,status,contact_email)values('Lab','lab','https://uta.edu/lab','ready','pi@example.com');`,
  )
})
afterAll(async () => db?.close())
it('rejects member creation even through privileged mediation and hides private officer drafts', async () => {
  await expect(
    db.exec(
      `insert into outreach_proposals(target_id,kind,recipient,subject,body,created_by)select id,'society','pi@example.com','Test','Body','${m}'from outreach_targets`,
    ),
  ).rejects.toThrow(/Officer/)
  await db.exec(
    `insert into outreach_proposals(target_id,kind,recipient,subject,body,created_by)select id,'society','pi@example.com','Test','Body','${a}'from outreach_targets;set role authenticated;set request.jwt.claim.sub='${m}'`,
  )
  expect((await db.query('select * from outreach_proposals')).rows).toHaveLength(0)
  expect((await db.query('select * from outreach_proposal_revisions')).rows).toHaveLength(0)
  await db.exec(`set request.jwt.claim.sub='${b}'`)
  expect((await db.query('select * from outreach_proposals')).rows).toHaveLength(0)
  await db.exec('reset role')
})
it('records manual outcome and promised canonical task then hands off without changing authorship', async () => {
  const target: any = (await db.query('select id from outreach_targets')).rows[0]
  const result: any = (
    await db.query('select outreach_record_relationship($1,$2,$3,$4,now(),$5) id', [
      target.id,
      a,
      'promise',
      'Review the project next week',
      '2026-10-16',
    ])
  ).rows[0]
  expect((await db.query('select * from dashboard_tasks where user_id=$1', [a])).rows).toHaveLength(
    1,
  )
  const proposal: any = (await db.query('select id from outreach_proposals')).rows[0]
  await db.query('select outreach_handoff($1,$2,$3)', [proposal.id, a, b])
  expect(
    (
      await db.query(
        'select created_by,current_owner_id,mailbox_id,approved_by from outreach_proposals',
      )
    ).rows[0],
  ).toEqual({ created_by: a, current_owner_id: b, mailbox_id: null, approved_by: null })
  expect(
    (await db.query('select owner_id from outreach_relationships where id=$1', [result.id]))
      .rows[0],
  ).toEqual({ owner_id: b })
  await expect(db.query('select outreach_handoff($1,$2,$3)', [proposal.id, a, m])).rejects.toThrow(
    /Officer owner/,
  )
  await db.exec(`update outreach_members set role='member' where user_id='${b}'`)
  await expect(
    db.query(
      "select outreach_approve_email($1,1,$2,$3,'pi@example.com','Test','Body','b@example.com')",
      [proposal.id, 'a'.repeat(64), b],
    ),
  ).rejects.toThrow(/Officer/)
})
it('permits an owned explicit follow-up while rejecting competing cold outreach and unknown relationship references', async () => {
  await db.exec(
    `update outreach_members set role='officer'where user_id='${a}';update outreach_members set role='officer'where user_id='${b}';insert into outreach_mailboxes(owner_id,email)values('${b}','b@example.com');`,
  )
  const mailbox: any = (await db.query('select id from outreach_mailboxes where owner_id=$1', [b]))
    .rows[0]
  const old: any = (await db.query('select * from outreach_proposals limit 1')).rows[0]
  await db.query('update outreach_proposals set mailbox_id=$1 where id=$2', [mailbox.id, old.id])
  const revised: any = (
    await db.query('select revision from outreach_proposals where id=$1', [old.id])
  ).rows[0]
  const fp = 'd'.repeat(64)
  const box: any = (
    await db.query(
      "select * from outreach_approve_email($1,$2,$3,$4,'pi@example.com','Test','Body','b@example.com')",
      [old.id, revised.revision, fp, b],
    )
  ).rows[0]
  const claimed: any = (
    await db.query('select * from outreach_claim_send($1,$2,$3,$4,$5)', [
      old.id,
      revised.revision,
      fp,
      mailbox.id,
      b,
    ])
  ).rows[0]
  await db.query("select outreach_finish_send($1,$2,'sent','provider-test',null)", [
    box.id,
    claimed.claim_token,
  ])
  const follow: any = (
    await db.query(
      "insert into outreach_proposals(target_id,kind,recipient,subject,body,created_by,mailbox_id,relationship_id,message_kind)values($1,'society','pi@example.com','Follow-up','One question',$2,$3,$4,'follow_up')returning id",
      [old.target_id, b, mailbox.id, old.relationship_id],
    )
  ).rows[0]
  await db.query(
    "select outreach_approve_email($1,1,$2,$3,'pi@example.com','Follow-up','One question','b@example.com')",
    [follow.id, 'e'.repeat(64), b],
  )
  const cold: any = (
    await db.query(
      "insert into outreach_proposals(target_id,kind,recipient,subject,body,created_by,mailbox_id)values($1,'society','pi@example.com','Cold','Another approach',$2,$3)returning id",
      [old.target_id, b, mailbox.id],
    )
  ).rows[0]
  await expect(
    db.query(
      "select outreach_approve_email($1,1,$2,$3,'pi@example.com','Cold','Another approach','b@example.com')",
      [cold.id, 'f'.repeat(64), b],
    ),
  ).rejects.toThrow(/conversation already exists/)
  const aliasTarget:any=(await db.query("insert into outreach_targets(name,kind,canonical_url,status,contact_email)values('Changed URL lab','lab','https://uta.edu/changed-lab','ready','changed@example.com')returning id")).rows[0]
  await db.query("insert into outreach_relationship_aliases(relationship_id,identity_key)values($1,'https://uta.edu/changed-lab'),($1,'changed@example.com')",[old.relationship_id])
  for(const supplied of [null,old.relationship_id]) {
    const aliasCold:any=(await db.query("insert into outreach_proposals(target_id,kind,recipient,subject,body,created_by,mailbox_id,relationship_id)values($1,'society','changed@example.com','Cold','Alias approach',$2,$3,$4)returning id",[aliasTarget.id,b,mailbox.id,supplied])).rows[0]
    await expect(db.query("select outreach_approve_email($1,1,$2,$3,'changed@example.com','Cold','Alias approach','b@example.com')",[aliasCold.id,'a'.repeat(64),b])).rejects.toThrow(/conversation already exists/)
  }
  await db.query("update outreach_proposals set message_kind='follow_up' where id=$1", [cold.id])
  await expect(
    db.query(
      "select outreach_approve_email($1,2,$2,$3,'pi@example.com','Cold','Another approach','b@example.com')",
      [cold.id, 'f'.repeat(64), b],
    ),
  ).rejects.toThrow(/relationship owner/)
  await db.query('update outreach_relationships set suppressed=true where id=$1', [
    old.relationship_id,
  ])
  await expect(
    db.query('select outreach_claim_send($1,1,$2,$3,$4)', [
      follow.id,
      'e'.repeat(64),
      mailbox.id,
      b,
    ]),
  ).rejects.toThrow(/relationship owner|suppressed/)
})
