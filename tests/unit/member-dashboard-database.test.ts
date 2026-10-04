import { afterAll, beforeAll, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
let db: PGlite
const member = '11111111-1111-4111-8111-111111111111',
  other = '22222222-2222-4222-8222-222222222222'
beforeAll(async () => {
  db = new PGlite()
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid()returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid()to authenticated;insert into auth.users values('${member}','member@example.com',now()),('${other}','other@example.com',now());`,
  )
  for (const file of [
    '023_outreach_workspace.sql',
    '024_outreach_mail.sql',
    '028_member_dashboard.sql',
  ])
    await db.exec(
      await readFile(new URL('../../supabase/migrations/' + file, import.meta.url), 'utf8'),
    )
  await db.query('select outreach_enroll_member($1,$2)', [member, 'member@example.com'])
  await db.query('select outreach_enroll_member($1,$2)', [other, 'other@example.com'])
})
afterAll(async () => db?.close())
it('enrolls at minimum privilege and never revives disabled membership', async () => {
  expect(
    (await db.query('select role from outreach_members where user_id=$1', [member])).rows[0],
  ).toEqual({ role: 'member' })
  await db.query('update outreach_members set enabled=false where user_id=$1', [other])
  await expect(
    db.query('select outreach_enroll_member($1,$2)', [other, 'other@example.com']),
  ).rejects.toThrow(/disabled/)
  await expect(
    db.query('select outreach_enroll_member($1,$2)', [member, 'forged@example.com']),
  ).rejects.toThrow(/Verified/)
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${member}'`)
  await expect(
    db.query('select outreach_enroll_member($1,$2)', [member, 'member@example.com']),
  ).rejects.toThrow(/permission denied/)
  expect((await db.query('select outreach_is_officer() result')).rows[0]).toEqual({ result: false })
  await db.exec('reset role')
})
it('hides other drafts/profiles and raw discovery while projecting ready targets', async () => {
  await db.query('update outreach_members set enabled=true where user_id=$1', [other])
  await db.exec(
    `insert into outreach_profiles(full_name,created_by,consent_to_share)values('Mine','${member}',true),('Other','${other}',true);insert into outreach_targets(name,kind,canonical_url,status)values('Ready','lab','https://uta.edu/ready','ready'),('Raw','lab','https://uta.edu/raw','needs_review');`,
  )
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${member}'`)
  expect((await db.query('select * from outreach_ready_targets')).rows).toHaveLength(0)
  await expect(
    db.exec(
      `insert into outreach_assignments(target_id,user_id,assigned_by)select id,'${member}','${member}'from outreach_targets`,
    ),
  ).rejects.toThrow(/permission denied/)
  await db.exec('reset role')
  await db.exec(
    `insert into outreach_assignments(target_id,user_id,assigned_by)select id,'${other}','${member}'from outreach_targets where status='ready';set role authenticated;set request.jwt.claim.sub='${member}'`,
  )
  expect((await db.query('select * from outreach_ready_targets')).rows).toHaveLength(0)
  await db.exec('reset role')
  await expect(
    db.exec(
      `insert into outreach_proposals(target_id,profile_id,kind,recipient,subject,body,created_by)select t.id,p.id,'student','pi@example.com','Subject','Body','${member}'from outreach_targets t,outreach_profiles p where t.status='ready' and p.created_by='${member}'`,
    ),
  ).rejects.toThrow(/Assigned personal/)
  await db.exec(
    `insert into outreach_assignments(target_id,user_id,assigned_by)select id,'${member}','${member}'from outreach_targets where status='ready'`,
  )
  await expect(
    db.exec(
      `insert into outreach_proposals(target_id,kind,recipient,subject,body,created_by)select id,'society','pi@example.com','Subject','Body','${member}'from outreach_targets where status='ready'`,
    ),
  ).rejects.toThrow(/Assigned personal/)
  await db.exec(
    `insert into outreach_proposals(target_id,profile_id,kind,recipient,subject,body,created_by)select t.id,p.id,'student','pi@example.com','Subject','Body','${member}'from outreach_targets t,outreach_profiles p where t.status='ready' and p.created_by='${member}';insert into outreach_proposals(target_id,profile_id,kind,recipient,subject,body,created_by)select t.id,p.id,'student','pi@example.com','Other','Private','${other}'from outreach_targets t,outreach_profiles p where t.status='ready' and p.created_by='${other}';set role authenticated;set request.jwt.claim.sub='${member}'`,
  )
  expect((await db.query('select full_name from outreach_profiles')).rows).toEqual([
    { full_name: 'Mine' },
  ])
  expect((await db.query('select subject from outreach_proposals')).rows).toEqual([
    { subject: 'Subject' },
  ])
  expect((await db.query('select * from outreach_targets')).rows).toHaveLength(0)
  expect((await db.query('select name from outreach_ready_targets')).rows).toEqual([
    { name: 'Ready' },
  ])
  expect((await db.query('select * from outreach_sources')).rows).toHaveLength(0)
  await expect(db.query("update outreach_society set name='Fake'")).rejects.toThrow(
    /permission denied/,
  )
  await db.exec('reset role')
})
it('rejects approving somebody else’s draft even through service RPC', async () => {
  const target = (
    await db.query<{ id: string }>("select id from outreach_targets where status='ready'")
  ).rows[0]!.id
  await db.query("update outreach_targets set contact_email='pi@example.com'where id=$1", [target])
  const mailbox = (
    await db.query<{ id: string }>(
      "insert into outreach_mailboxes(owner_id,email)values($1,'member@example.com')returning id",
      [member],
    )
  ).rows[0]!.id
  const proposal = (
    await db.query<{ id: string }>('select id from outreach_proposals where created_by=$1', [other])
  ).rows[0]!.id
  await db.query('update outreach_proposals set mailbox_id=$1 where id=$2', [mailbox, proposal])
  await expect(
    db.query(
      "select outreach_approve_email($1,2,$2,$3,'pi@example.com','Other','Private','member@example.com')",
      [proposal, 'a'.repeat(64), member],
    ),
  ).rejects.toThrow(/own consented student|own proposal/)
})
it('blocks approving an own society draft after officer privileges are removed', async () => {
  await db.query("update outreach_members set role='officer'where user_id=$1", [member])
  const target = (
    await db.query<{ id: string }>(
      "insert into outreach_targets(name,kind,canonical_url,status,contact_email)values('Society','lab','https://uta.edu/society','ready','society@example.com')returning id",
    )
  ).rows[0]!.id
  const mailbox = (
    await db.query<{ id: string }>('select id from outreach_mailboxes where owner_id=$1', [member])
  ).rows[0]!.id
  const proposal = (
    await db.query<{ id: string }>(
      "insert into outreach_proposals(target_id,kind,recipient,subject,body,created_by,mailbox_id)values($1,'society','society@example.com','Society','Body',$2,$3)returning id",
      [target, member, mailbox],
    )
  ).rows[0]!.id
  await db.query("update outreach_members set role='member'where user_id=$1", [member])
  await expect(
    db.query(
      "select outreach_approve_email($1,1,$2,$3,'society@example.com','Society','Body','member@example.com')",
      [proposal, 'c'.repeat(64), member],
    ),
  ).rejects.toThrow(/Assigned personal/)
})
it('permits member approval and send claims only for their own exact draft and mailbox', async () => {
  const proposal = (
    await db.query<{ id: string }>(
      "select id from outreach_proposals where created_by=$1 and kind='student'",
      [member],
    )
  ).rows[0]!.id
  const mailbox = (
    await db.query<{ id: string }>('select id from outreach_mailboxes where owner_id=$1', [member])
  ).rows[0]!.id
  await db.query('update outreach_proposals set mailbox_id=$1 where id=$2', [mailbox, proposal])
  await db.query(
    "select outreach_approve_email($1,2,$2,$3,'pi@example.com','Subject','Body','member@example.com')",
    [proposal, 'b'.repeat(64), member],
  )
  const target = (
    await db.query<{ target_id: string }>('select target_id from outreach_proposals where id=$1', [
      proposal,
    ])
  ).rows[0]!.target_id
  await db.query('delete from outreach_assignments where target_id=$1 and user_id=$2', [
    target,
    member,
  ])
  await expect(
    db.query(
      "select outreach_approve_email($1,2,$2,$3,'pi@example.com','Subject','Body','member@example.com')",
      [proposal, 'b'.repeat(64), member],
    ),
  ).rejects.toThrow(/Assigned personal/)
  await expect(
    db.query('select outreach_claim_send($1,2,$2,$3,$4)', [
      proposal,
      'b'.repeat(64),
      mailbox,
      member,
    ]),
  ).rejects.toThrow(/Assigned personal/)
  await db.query(
    'insert into outreach_assignments(target_id,user_id,assigned_by)values($1,$2,$2)',
    [target, member],
  )
  expect(
    (
      await db.query<{ status: string }>('select * from outreach_claim_send($1,2,$2,$3,$4)', [
        proposal,
        'b'.repeat(64),
        mailbox,
        member,
      ])
    ).rows[0]!.status,
  ).toBe('sending')
  await db.query('update outreach_members set enabled=false where user_id=$1', [member])
  await expect(
    db.query('select outreach_claim_send($1,2,$2,$3,$4)', [
      proposal,
      'b'.repeat(64),
      mailbox,
      member,
    ]),
  ).rejects.toThrow(/access required/)
})
