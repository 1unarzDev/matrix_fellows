import { afterAll, beforeAll, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import { acquireResearchArtifact, classifyResearchLink } from '../../server/utils/research-artifacts'
let db: PGlite
const member = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222'
beforeAll(async () => {
 db = new PGlite()
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid()returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid()to authenticated;insert into auth.users values('${member}','member@example.com',now()),('${other}','other@example.com',now());create table join_responses(id bigint primary key,email text,name text,interests text[],goals text[],stage text,interest_other text,student_id text,parent_email text,note text);insert into join_responses values(1,'member@example.com','Research Member',array['Robotics & engineering'],array['Learn research methods'],'No experience yet','', 'PRIVATE-ID','parent@example.com','PRIVATE-FEEDBACK');`)
 for(const file of ['023_outreach_workspace.sql','024_outreach_mail.sql','028_member_dashboard.sql','20261009170000_research_profiles.sql']) await db.exec(await readFile(new URL('../../supabase/migrations/'+file,import.meta.url),'utf8'))
 await db.query('select outreach_enroll_member($1,$2)',[member,'member@example.com']); await db.query('select outreach_enroll_member($1,$2)',[other,'other@example.com'])
})
afterAll(async () => db?.close())
it('bootstrap converges, preserves legacy author records and excludes private join administration', async () => {
 await db.query("insert into outreach_profiles(full_name,created_by)values('Another represented person',$1)",[member])
 const calls = await Promise.all([db.query<{id:string}>('select ensure_member_research_profile($1,$2) id',[member,'member@example.com']),db.query<{id:string}>('select ensure_member_research_profile($1,$2) id',[member,'member@example.com'])])
 expect(calls[0]!.rows[0]!.id).toBe(calls[1]!.rows[0]!.id)
 const rows = (await db.query<any>('select full_name,subject_user_id,interests,goals from outreach_profiles order by created_at')).rows
 expect(rows).toHaveLength(2);expect(rows[0].subject_user_id).toBeNull();expect(rows[1]).toMatchObject({full_name:'Research Member',subject_user_id:member,interests:['Robotics & engineering']})
 const provenance = JSON.stringify((await db.query('select captured_fields from research_profile_imports')).rows)
 expect(provenance).not.toMatch(/PRIVATE|parent|student_id|note|email/)
 await db.query("update outreach_profiles set full_name='Edited'where subject_user_id=$1",[member])
 await db.query('select ensure_member_research_profile($1,$2)',[member,'member@example.com'])
 expect((await db.query<any>('select full_name from outreach_profiles where subject_user_id=$1',[member])).rows[0].full_name).toBe('Edited')
})
it('rejects forged identity and supports accounts without a join response',async()=>{
 await expect(db.query('select ensure_member_research_profile($1,$2)',[member,'other@example.com'])).rejects.toThrow(/Verified/)
 const id = (await db.query<any>('select ensure_member_research_profile($1,$2) id',[other,'other@example.com'])).rows[0].id
 expect((await db.query<any>('select full_name from outreach_profiles where id=$1',[id])).rows[0].full_name).toBe('other')
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${member}'`)
 await expect(db.query('select ensure_member_research_profile($1,$2)',[other,'other@example.com'])).rejects.toThrow(/permission denied/)
 await db.exec('reset role')
})
it('immutable snapshots remain private to their account',async()=>{
 const profile = (await db.query<any>('select id from outreach_profiles where subject_user_id=$1',[member])).rows[0].id
 const artifact = (await db.query<any>("insert into research_artifacts(profile_id,owner_id,canonical_url,kind)values($1,$2,'https://github.com/team/repo','repository')returning id",[profile,member])).rows[0].id
 const snapshot = (await db.query<any>("insert into research_source_snapshots(artifact_id,owner_id,content_hash,text_content)values($1,$2,'hash','Technical evidence')returning id",[artifact,member])).rows[0].id
 await expect(db.query("update research_source_snapshots set text_content='Changed'where id=$1",[snapshot])).rejects.toThrow(/immutable/)
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${other}'`)
 expect((await db.query('select * from research_source_snapshots')).rows).toHaveLength(0)
 await db.exec('reset role')
})
it('repository metadata records facts without inventing member authorship',async()=>{
 const result = await acquireResearchArtifact('https://github.com/team/repo',async()=>new Response(JSON.stringify({full_name:'team/repo',description:'A robotics simulator',default_branch:'main',language:'C++'})))
 expect(result.summary).toBe('A robotics simulator');expect(result.metadata.attribution).toMatch(/does not establish/)
 expect(result.text).not.toMatch(/member|expert|created by/)
})
it('unsupported and internal links never trigger an acquisition',async()=>{
 for(const link of ['https://127.0.0.1/a','https://localhost/a','http://github.com/team/repo','https://user:pass@github.com/team/repo','https://example.internal/a'])expect(()=>classifyResearchLink(link)).toThrow()
 let called=false
 expect((await acquireResearchArtifact('https://portfolio.example/project',async()=>{called=true;return new Response('content')})).state).toBe('reference')
 expect(called).toBe(false)
})
it('publication metadata preserves title field provenance and uncertain attribution',async()=>{
 const result=await acquireResearchArtifact('https://doi.org/10.1234/test',async()=>new Response(JSON.stringify({message:{title:['A paper'],published:{'date-parts':[[2020,1]]}}})))
 expect(result.metadata).toMatchObject({adapter:'crossref-v1',field:'title'});expect(result.summary).toMatch(/unconfirmed/)
})
it('repairs a missing canonical link and rejects another account subject',async()=>{
 const original=(await db.query<any>('select primary_profile_id from outreach_members where user_id=$1',[member])).rows[0].primary_profile_id
 await db.query('update outreach_members set primary_profile_id=null where user_id=$1',[member])
 const repaired=(await db.query<any>('select ensure_member_research_profile($1,$2) id',[member,'member@example.com'])).rows[0].id
 expect(repaired).toBe(original)
 await expect(db.query('update outreach_members set primary_profile_id=$1 where user_id=$2',[original,other])).rejects.toThrow(/represent/)
 await expect(db.query('update outreach_profiles set subject_user_id=$1 where id=$2',[other,original])).rejects.toThrow(/immutable/)
})
it('refuses ambiguous case-normalized historical joins',async()=>{
 await db.query("insert into join_responses(id,email,name,interests,goals,stage)values(2,'OTHER@example.com','Other One','{}','{}','Exploring'),(3,'other@example.com','Other Two','{}','{}','Exploring')")
 await db.query('update outreach_members set primary_profile_id=null where user_id=$1',[other])
 // A previously established subject remains pinned despite changed email/join history.
 await expect(db.query('select ensure_member_research_profile($1,$2)',[other,'other@example.com'])).resolves.toBeTruthy()
 const fresh='33333333-3333-4333-8333-333333333333'
 await db.query("insert into auth.users values($1,'ambiguous@example.com',now())",[fresh]);await db.query('select outreach_enroll_member($1,$2)',[fresh,'ambiguous@example.com'])
 await db.query("insert into join_responses(id,email,name,interests,goals,stage)values(4,'AMBIGUOUS@example.com','One','{}','{}','Exploring'),(5,'ambiguous@example.com','Two','{}','{}','Exploring')")
 await expect(db.query('select ensure_member_research_profile($1,$2)',[fresh,'ambiguous@example.com'])).rejects.toThrow(/Ambiguous/)
})
it('fences expired artifact results, bounds requests atomically and retains evidence on retries',async()=>{
 const profile=(await db.query<any>('select primary_profile_id from outreach_members where user_id=$1',[member])).rows[0].primary_profile_id
 const aid=(await db.query<any>("select research_add_artifact($1,$2,'https://github.com/test/first','repository','interest','') id",[member,profile])).rows[0].id
 const duplicate=(await db.query<any>("select research_add_artifact($1,$2,'https://github.com/test/first','repository','interest','') id",[member,profile])).rows[0].id
 expect(duplicate).toBe(aid)
 const first=(await db.query<any>('select research_claim_artifact($1,$2) claim',[member,aid])).rows[0].claim
 expect(first.claim_token).toBeTruthy()
 expect((await db.query<any>('select research_claim_artifact($1,$2) claim',[member,aid])).rows[0].claim).toBeNull()
 await db.query("update research_artifacts set lease_expires_at=now()-interval '1 second'where id=$1",[aid])
 const second=(await db.query<any>('select research_claim_artifact($1,$2) claim',[member,aid])).rows[0].claim
 const result={state:'ready',title:'A project',summary:'Metadata saved',text:'A project',contentHash:'abc',metadata:{adapter:'github-metadata-v1'}}
 expect((await db.query<any>('select research_complete_artifact($1,$2,$3,$4) result',[member,aid,first.claim_token,JSON.stringify(result)])).rows[0].result).toBe(false)
 expect((await db.query<any>('select research_complete_artifact($1,$2,$3,$4) result',[member,aid,second.claim_token,JSON.stringify(result)])).rows[0].result).toBe(true)
 expect((await db.query('select * from research_source_snapshots where artifact_id=$1',[aid])).rows).toHaveLength(1)
 await db.query('update research_acquisition_usage set requests=25 where owner_id=$1',[member])
 const next=(await db.query<any>("select research_add_artifact($1,$2,'https://doi.org/10.1234/test','publication','interest','') id",[member,profile])).rows[0].id
 expect((await db.query<any>('select research_claim_artifact($1,$2) claim',[member,next])).rows[0].claim).toEqual({quotaWaiting:true})
})
it('disabled membership cannot apply already acquired artifact context',async()=>{
 const profile=(await db.query<any>('select primary_profile_id from outreach_members where user_id=$1',[other])).rows[0].primary_profile_id
 const aid=(await db.query<any>("select research_add_artifact($1,$2,'https://doi.org/10.1234/other','publication','interest','') id",[other,profile])).rows[0].id
 const claim=(await db.query<any>('select research_claim_artifact($1,$2) claim',[other,aid])).rows[0].claim
 await db.query('update outreach_members set enabled=false where user_id=$1',[other])
 expect((await db.query<any>('select research_complete_artifact($1,$2,$3,$4) result',[other,aid,claim.claim_token,JSON.stringify({state:'ready',title:'A paper',summary:'Saved',text:'A paper',contentHash:'x',metadata:{}})])).rows[0].result).toBe(false)
 await db.query('update outreach_members set enabled=true where user_id=$1',[other])
})
it('links only still-active member contribution claims to acquired shared projects',async()=>{
 await db.query('update research_acquisition_usage set requests=0 where owner_id=$1',[member])
 const profile=(await db.query<any>('select primary_profile_id from outreach_members where user_id=$1',[member])).rows[0].primary_profile_id
 const aid=(await db.query<any>("select research_add_artifact($1,$2,'https://github.com/test/contribution','repository','contributed','I wrote the simulation tests') id",[member,profile])).rows[0].id
 const claim=(await db.query<any>('select research_claim_artifact($1,$2) claim',[member,aid])).rows[0].claim
 await db.query('select research_complete_artifact($1,$2,$3,$4)',[member,aid,claim.claim_token,JSON.stringify({state:'ready',title:'Simulation',summary:'Saved',text:'Simulation',contentHash:'contribution',metadata:{}})])
 const contribution=(await db.query<any>("select project_id,origin,support_state,adoption from research_claims where artifact_id=$1 and predicate='contribution'",[aid])).rows[0]
 expect(contribution.project_id).toBeTruthy();expect(contribution).toMatchObject({origin:'member',support_state:'self_reported',adoption:'accepted'})
})
it('interrupted final attempts become an honest failure rather than a stranded processing state',async()=>{
 const profile=(await db.query<any>('select primary_profile_id from outreach_members where user_id=$1',[member])).rows[0].primary_profile_id
 const aid=(await db.query<any>("select research_add_artifact($1,$2,'https://github.com/test/interrupted','repository','interest','') id",[member,profile])).rows[0].id
 await db.query("update research_artifacts set state='processing',attempts=3,lease_expires_at=now()-interval '1 minute'where id=$1",[aid])
 expect((await db.query<any>('select research_claim_artifact($1,$2) claim',[member,aid])).rows[0].claim).toBeNull()
 expect((await db.query<any>('select state,error_code from research_artifacts where id=$1',[aid])).rows[0]).toEqual({state:'failed',error_code:'attempts_exhausted'})
})
it('privacy withdrawal succeeds while an already submitted immutable outcome remains uncertain',async()=>{
 await db.query("update outreach_members set role='officer'where user_id=$1",[member])
 const profile=(await db.query<any>('select primary_profile_id from outreach_members where user_id=$1',[member])).rows[0].primary_profile_id
 await db.query('update outreach_profiles set consent_to_share=true where id=$1',[profile])
 const claim=(await db.query<any>("insert into research_claims(profile_id,owner_id,statement,predicate,origin,support_state,adoption,sharing_scope)values($1,$2,'I contributed tests','contribution','member','self_reported','accepted','officer')returning id",[profile,member])).rows[0].id
 const target=(await db.query<any>("insert into outreach_targets(name,kind,canonical_url,status,contact_email)values('Lab','lab','https://uta.edu/privacy','ready','pi@example.com')returning id")).rows[0].id
 const mailbox=(await db.query<any>("insert into outreach_mailboxes(owner_id,email)values($1,'member@example.com')returning id",[member])).rows[0].id
 const proposal=(await db.query<any>("insert into outreach_proposals(target_id,profile_id,kind,recipient,subject,body,mailbox_id,created_by,evidence_claim_ids)values($1,$2,'student','pi@example.com','Subject','Body',$3,$4,array[$5::uuid])returning id",[target,profile,mailbox,member,claim])).rows[0].id
 await db.query("update outreach_proposals set status='approved',approved_by=$1,approved_revision=1,approved_fingerprint='hash'where id=$2",[member,proposal])
 await db.query("insert into outreach_outbox(proposal_id,revision,fingerprint,mailbox_id,status,created_by)values($1,1,'hash',$2,'uncertain',$3)",[proposal,mailbox,member])
 await expect(db.query('update outreach_profiles set consent_to_share=false where id=$1',[profile])).resolves.toBeTruthy()
 expect((await db.query<any>('select withdrawn_at,sharing_scope from research_claims where id=$1',[claim])).rows[0].withdrawn_at).toBeTruthy()
 expect((await db.query<any>('select status from outreach_outbox where proposal_id=$1',[proposal])).rows[0].status).toBe('uncertain')
})
