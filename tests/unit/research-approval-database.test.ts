import { afterAll, beforeAll, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
let db: PGlite
const officer = '11111111-1111-4111-8111-111111111111', member = '22222222-2222-4222-8222-222222222222'
beforeAll(async () => {
 db = new PGlite()
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid()returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;insert into auth.users values('${officer}','officer@example.com',now()),('${member}','member@example.com',now());`)
 for (const name of ['023_outreach_workspace.sql','024_outreach_mail.sql','028_member_dashboard.sql','20261008005351_dashboard_canonical_plan.sql','20261009170000_research_profiles.sql','20261009172000_officer_relationships.sql','20261010015431_research_execution.sql','20261010020426_research_evidence_approval_guard.sql']) await db.exec(await readFile(new URL('../../supabase/migrations/'+name,import.meta.url),'utf8'))
 await db.exec(`insert into outreach_members(user_id,email,role)values('${officer}','officer@example.com','officer'),('${member}','member@example.com','member');`)
})
afterAll(async()=>db?.close())
async function fixture() {
 const profile = (await db.query<{id:string}>("select ensure_member_research_profile($1,'member@example.com') id",[member])).rows[0]!.id
 await db.query('update outreach_profiles set consent_to_share=true where id=$1',[profile])
 const claim = (await db.query<{id:string}>("insert into research_claims(profile_id,owner_id,statement,predicate,origin,support_state,adoption,sharing_scope)values($1,$2,'Implemented the analysis','contribution','member','self_reported','accepted','officer')returning id",[profile,member])).rows[0]!.id
 const target = (await db.query<{id:string}>("insert into outreach_targets(name,kind,canonical_url,status,contact_email)values('Lab','lab',$1,'ready','pi@example.edu')returning id",['https://uta.edu/'+crypto.randomUUID()])).rows[0]!.id
 const mailbox = (await db.query<{id:string}>("insert into outreach_mailboxes(owner_id,email)values($1,$2)returning id",[officer,crypto.randomUUID()+'@example.com'])).rows[0]!.id
 const email = (await db.query<{email:string}>('select email from outreach_mailboxes where id=$1',[mailbox])).rows[0]!.email
 const proposal = (await db.query<{id:string}>("insert into outreach_proposals(target_id,profile_id,kind,recipient,subject,body,mailbox_id,created_by,evidence_claim_ids)values($1,$2,'student','pi@example.edu','Subject','Body',$3,$4,array[$5]::uuid[])returning id",[target,profile,mailbox,officer,claim])).rows[0]!.id
 return {claim,proposal,mailbox,approve:()=>db.query("select outreach_approve_email($1,1,$2,$3,'pi@example.edu','Subject','Body',$4)",[proposal,'a'.repeat(64),officer,email]),send:()=>db.query('select outreach_claim_send($1,1,$2,$3,$4)',[proposal,'a'.repeat(64),mailbox,officer])}
}
it('withdrawal cannot be bypassed by approving the same evidence again',async()=>{
 const f=await fixture();await f.approve();await db.query("update research_claims set sharing_scope='private' where id=$1",[f.claim])
 expect((await db.query<{status:string}>('select status from outreach_proposals where id=$1',[f.proposal])).rows[0]!.status).toBe('draft')
 await expect(f.approve()).rejects.toThrow(/evidence is no longer valid/)
})
it('superseded attribution and disabled subjects are rejected at the transactional boundary',async()=>{
 const f=await fixture();await f.approve();await db.query("update research_claims set adoption='superseded' where id=$1",[f.claim]);await expect(f.send()).rejects.toThrow(/evidence is no longer valid/)
 const g=await fixture();await g.approve();await db.query('update outreach_members set enabled=false where user_id=$1',[member]);await expect(g.send()).rejects.toThrow(/inactive/);await db.query('update outreach_members set enabled=true where user_id=$1',[member])
})
