import { afterAll, beforeAll, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import { extractProjectFacts } from '../../server/utils/research-project-extraction'
let db:PGlite
const user='11111111-1111-4111-8111-111111111111'
let profile:string, artifact:string
beforeAll(async()=>{
 db=new PGlite()
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid()returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid()to authenticated;insert into auth.users values('${user}','member@example.com',now());create table public.opportunities(id text primary key,published boolean,suppressed boolean);`)
 for(const file of ['023_outreach_workspace.sql','024_outreach_mail.sql','028_member_dashboard.sql','20261008005351_dashboard_canonical_plan.sql','20261008010345_dashboard_opportunity_decisions.sql','20261009170000_research_profiles.sql','20261009172000_officer_relationships.sql','20261010015431_research_execution.sql','20261010020426_research_evidence_approval_guard.sql','20261010020659_research_matches_and_projection_guards.sql','20261010021349_research_project_enrichment.sql','20261010023000_research_preferences.sql','20261010024500_relationship_alias_duplicate_guard.sql','20261010025500_selected_society_context.sql','20261010030000_officer_voice_preferences.sql','20261010031000_provider_retry_metadata.sql','20261010033444_research_immutable_search_path.sql',
    '20261010034959_research_bootstrap_auth_fields.sql'])await db.exec(await readFile(new URL('../../supabase/migrations/'+file,import.meta.url),'utf8'))
 await db.query('select outreach_enroll_member($1,$2)',[user,'member@example.com'])
 profile=(await db.query<any>('select ensure_member_research_profile($1,$2) id',[user,'member@example.com'])).rows[0].id
 artifact=(await db.query<any>("select research_add_artifact($1,$2,'https://github.com/team/enrichment','repository','interest','') id",[user,profile])).rows[0].id
})
afterAll(async()=>db?.close())
async function complete(text:string,hash:string,facts=extractProjectFacts(text,'README.md')){
 const claim=(await db.query<any>('select research_claim_artifact($1,$2) claim',[user,artifact])).rows[0].claim
 return db.query<any>('select research_complete_enriched_artifact($1,$2,$3,$4) result',[user,artifact,claim.claim_token,JSON.stringify({state:'ready',title:'Team project',summary:'Metadata saved',text,contentHash:hash,metadata:{readmePath:'README.md',readmeVersion:hash},facts})])
}
it('source-to-project facts persist with literal spans as unadopted project-only claims',async()=>{
 const text='🔬 Team project. We use PyTorch to evaluate a public benchmark. Our goal is to compare failure modes.'
 expect((await complete(text,'one')).rows[0].result).toBe(true)
 const claims=(await db.query<any>("select * from research_claims where artifact_id=$1 and predicate like 'project_%'order by predicate",[artifact])).rows
 expect(claims).toHaveLength(2)
 for(const claim of claims){expect(claim).toMatchObject({origin:'source',support_state:'supported',adoption:'candidate',sharing_scope:'private'});expect(claim.project_id).toBeTruthy();expect(claim.provenance.attribution).toBe('project_only');expect(Array.from(text).slice(claim.provenance.start,claim.provenance.end).join('')).toBe(claim.statement)}
 expect((await db.query("select * from research_claims where artifact_id=$1 and predicate='contribution'",[artifact])).rows).toHaveLength(0)
})
it('rejected candidates stay rejected across unchanged and changed source refreshes',async()=>{
 const method=(await db.query<any>("select id from research_claims where artifact_id=$1 and predicate='project_method'",[artifact])).rows[0].id
 await db.query("update research_claims set adoption='rejected',withdrawn_at=now()where id=$1",[method])
 await db.query("update research_artifacts set state='pending',attempts=0 where id=$1",[artifact])
 await complete('🔬 Team project. We use PyTorch to evaluate a public benchmark. Our goal is to compare failure modes.','one')
 await db.query("update research_artifacts set state='pending',attempts=0 where id=$1",[artifact])
 await complete('An updated overview. We use PyTorch to evaluate a public benchmark. Our goal is to compare failure modes.','two')
 const methods=(await db.query<any>("select adoption,withdrawn_at from research_claims where artifact_id=$1 and predicate='project_method'",[artifact])).rows
 expect(methods).toHaveLength(1);expect(methods[0].adoption).toBe('rejected');expect(methods[0].withdrawn_at).toBeTruthy()
 expect((await db.query('select * from research_source_snapshots where artifact_id=$1',[artifact])).rows).toHaveLength(2)
})
it('forged literal spans roll back artifact completion and source insertion atomically',async()=>{
 await db.query("update research_artifacts set state='pending',attempts=0 where id=$1",[artifact])
 await expect(complete('We use an open simulator.','forged',[{predicate:'project_method',quote:'We use a private database.',start:0,end:26,section:'README.md'}])).rejects.toThrow(/source span/)
 expect((await db.query<any>('select state from research_artifacts where id=$1',[artifact])).rows[0].state).toBe('processing')
 expect((await db.query("select * from research_source_snapshots where artifact_id=$1 and content_hash='forged'",[artifact])).rows).toHaveLength(0)
})
