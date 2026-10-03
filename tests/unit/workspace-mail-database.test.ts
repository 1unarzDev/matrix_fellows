import { beforeAll, afterAll, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
let db: PGlite
const user = '11111111-1111-4111-8111-111111111111',
  other = '22222222-2222-4222-8222-222222222222'
const target = '33333333-3333-4333-8333-333333333333',
  mailbox = '44444444-4444-4444-8444-444444444444',
  proposal = '55555555-5555-4555-8555-555555555555',
  fingerprint = 'a'.repeat(64)
beforeAll(async () => {
  db = new PGlite()
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select null::uuid$$;insert into auth.users values('${user}'),('${other}');`,
  )
  for (const file of ['023_outreach_workspace.sql', '024_outreach_mail.sql'])
    await db.exec(
      await readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), 'utf8'),
    )
  await db.exec(
    `insert into outreach_members(user_id,email) values('${user}','officer@example.com');insert into outreach_targets(id,name,kind,canonical_url,status,contact_email) values('${target}','Professor','pi','https://example.edu/lab','ready','researcher@example.edu');insert into outreach_mailboxes(id,owner_id,email) values('${mailbox}','${user}','officer@example.com');insert into outreach_proposals(id,target_id,kind,recipient,subject,body,mailbox_id) values('${proposal}','${target}','society','researcher@example.edu','Subject','Body','${mailbox}');`,
  )
})
afterAll(async () => {
  await db?.close()
})
const approve = () =>
  db.query(
    `select * from outreach_approve_email($1,1,$2,$3,'researcher@example.edu','Subject','Body','officer@example.com')`,
    [proposal, fingerprint, user],
  )
const claim = () =>
  db.query(`select * from outreach_claim_send($1,1,$2,$3,$4)`, [
    proposal,
    fingerprint,
    mailbox,
    user,
  ])
it('invalidates target-context approvals while allowing independent acquisition refreshes', async () => {
  const targetId = crypto.randomUUID(),
    proposalId = crypto.randomUUID()
  await db.query(
    "insert into outreach_targets(id,name,kind,canonical_url,status,contact_email) values($1,'Context lab','lab','https://example.edu/context-lab','ready','context@example.edu')",
    [targetId],
  )
  await db.query(
    "insert into outreach_proposals(id,target_id,kind,recipient,subject,body,mailbox_id) values($1,$2,'society','context@example.edu','Context subject','Context body',$3)",
    [proposalId, targetId, mailbox],
  )
  await db.query(
    "select * from outreach_approve_email($1,1,$2,$3,'context@example.edu','Context subject','Context body','officer@example.com')",
    [proposalId, fingerprint, user],
  )
  await db.query(
    "update outreach_targets set dossier=jsonb_set(dossier,'{acquisition}','{\"pages\":[]}'::jsonb) where id=$1",
    [targetId],
  )
  expect(
    (
      await db.query<{ status: string }>('select status from outreach_proposals where id=$1', [
        proposalId,
      ])
    ).rows[0]!.status,
  ).toBe('approved')
  await db.query("update outreach_targets set organization='Changed institution' where id=$1", [
    targetId,
  ])
  expect(
    (
      await db.query<{ status: string }>('select status from outreach_proposals where id=$1', [
        proposalId,
      ])
    ).rows[0]!.status,
  ).toBe('draft')
})
it('rejects outsiders and unapproved send attempts', async () => {
  await expect(
    db.query(
      `select * from outreach_approve_email($1,1,$2,$3,'researcher@example.edu','Subject','Body','officer@example.com')`,
      [proposal, fingerprint, other],
    ),
  ).rejects.toThrow(/Officer/)
  await expect(claim()).rejects.toThrow(/Approve/)
})
it('atomically claims one immutable approved snapshot and never retries uncertain sends', async () => {
  await approve()
  const first = (await claim()).rows[0] as { id: string; claim_token: string; body: string }
  expect(first.body).toBe('Body')
  await expect(claim()).rejects.toThrow(/already sending/)
  await expect(
    db.exec(`update outreach_proposals set body='Edited' where id='${proposal}'`),
  ).rejects.toThrow(/Resolve/)
  expect(
    (
      await db.query('select outreach_finish_send($1,$2,$3,null,null) ok', [
        first.id,
        first.claim_token,
        'uncertain',
      ])
    ).rows[0],
  ).toEqual({ ok: true })
  await expect(claim()).rejects.toThrow(/already sending/)
  await expect(approve()).rejects.toThrow(/prior sending outcome/)
})
it('keeps private email data inaccessible to anonymous visitors', async () => {
  await db.exec('set role anon')
  await expect(db.query('select * from outreach_mailboxes')).rejects.toThrow(/permission denied/)
  await expect(db.query('select * from outreach_outbox')).rejects.toThrow(/permission denied/)
  await expect(approve()).rejects.toThrow(/permission denied/)
  await db.exec('reset role')
})
it('requires manual Sent-mail reconciliation and invalidates society context approvals', async () => {
  const item = (await db.query(`select id from outreach_outbox where proposal_id=$1`, [proposal]))
    .rows[0] as { id: string }
  await expect(
    db.query('select outreach_reconcile_send($1,$2,$3,$4)', [
      item.id,
      other,
      'not_sent',
      'Checked Sent mail and no message was submitted.',
    ]),
  ).rejects.toThrow(/Officer/)
  await db.query('select outreach_reconcile_send($1,$2,$3,$4)', [
    item.id,
    user,
    'not_sent',
    'Checked Sent mail and no message was submitted.',
  ])
  await approve()
  await db.exec(
    "update outreach_society set description='New reviewed society facts' where id=true",
  )
  expect(
    (
      await db.query('select status,approved_fingerprint from outreach_proposals where id=$1', [
        proposal,
      ])
    ).rows[0],
  ).toEqual({ status: 'draft', approved_fingerprint: null })
  await expect(claim()).rejects.toThrow(/Approve/)
})
it('blocks parallel approaches to the same contact and review placeholders', async () => {
  await approve()
  const next = '66666666-6666-4666-8666-666666666666'
  await db.exec(
    `insert into outreach_proposals(id,target_id,kind,recipient,subject,body,mailbox_id) values('${next}','${target}','society','researcher@example.edu','Subject','Body','${mailbox}')`,
  )
  await expect(
    db.query(
      `select * from outreach_approve_email($1,1,$2,$3,'researcher@example.edu','Subject','Body','officer@example.com')`,
      [next, fingerprint, user],
    ),
  ).rejects.toThrow(/conversation already exists/)
  await db.exec(
    `update outreach_proposals set body='[REVIEW: actual research contribution]' where id='${next}'`,
  )
  await expect(
    db.query(
      `select * from outreach_approve_email($1,2,$2,$3,'researcher@example.edu','Subject','[REVIEW: actual research contribution]','officer@example.com')`,
      [next, fingerprint, user],
    ),
  ).rejects.toThrow(/placeholders/)
})
it('invalidates approved student messages when consent or skills change', async () => {
  const person = '77777777-7777-4777-8777-777777777777'
  const studentProposal = '88888888-8888-4888-8888-888888888888'
  const studentTarget = '99999999-9999-4999-8999-999999999999'
  await db.exec(
    `insert into outreach_profiles(id,full_name,consent_to_share,created_by) values('${person}','Student',true,'${user}');insert into outreach_targets(id,name,kind,canonical_url,status,contact_email) values('${studentTarget}','Second Professor','pi','https://example.edu/other','ready','second@example.edu');insert into outreach_proposals(id,target_id,profile_id,kind,recipient,subject,body,mailbox_id,created_by) values('${studentProposal}','${studentTarget}','${person}','student','second@example.edu','Subject','Body','${mailbox}','${user}');`,
  )
  await db.query(
    `select * from outreach_approve_email($1,1,$2,$3,'second@example.edu','Subject','Body','officer@example.com')`,
    [studentProposal, fingerprint, user],
  )
  await db.exec(`update outreach_profiles set consent_to_share=false where id='${person}'`)
  expect(
    (
      await db.query('select status,approved_by from outreach_proposals where id=$1', [
        studentProposal,
      ])
    ).rows[0],
  ).toEqual({ status: 'draft', approved_by: null })
  await expect(
    db.query(
      `select * from outreach_approve_email($1,1,$2,$3,'second@example.edu','Subject','Body','officer@example.com')`,
      [studentProposal, fingerprint, user],
    ),
  ).rejects.toThrow(/consented/)
})
it('honors rejected-contact suppression even if a target is later marked ready', async () => {
  await db.exec(
    `update outreach_targets set status='rejected' where id='${target}';update outreach_targets set status='ready' where id='${target}';`,
  )
  await expect(claim()).rejects.toThrow(/suppressed/)
})
